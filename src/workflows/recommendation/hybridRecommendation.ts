import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import { PRODUCT_REVIEW_MODULE } from "../../modules/review";
import { contentFiltering } from "./contentRecommendation";
import { collaborativeFiltering } from "./collabRecommendations";

type WorkflowInput = {
  customerId: string;
  productIds: string[];
};

type CombinedRecommendation = {
  product: any;
  combinedScore: number;
  collabScore?: number;
  contentScore?: number;
};

type WorkflowStepInput = {
  recommendation: {
    rec: any[];
  };
  collabRec: {
    recommendations: any[];
  };
  customer_id: string;
};

const getHybridFiltering = createStep(
  "get-hybrid-rec",
  async (input: WorkflowStepInput, { container }) => {
    const reviewModuleService: any = container.resolve(PRODUCT_REVIEW_MODULE);

    const normalizeScores = (
      items: any[],
      scoreKey: string,
      isCollab: boolean
    ) => {
      return items.map((item) => {
        let score = item[scoreKey] || 0;

        // Для коллаборативных оценок (1-5)
        if (isCollab) {
          score = (Math.min(5, Math.max(1, score)) - 1) / 4;
        }

        return {
          ...item,
          normalizedScore: score,
        };
      });
    };

    const collabItems = normalizeScores(
      input.collabRec?.recommendations || [],
      "prediction",
      true
    );

    const contentItems = input.recommendation.rec;

    const combinedMap = new Map<string, CombinedRecommendation>();

    const userReviews = await reviewModuleService.listReviews({
      customer_id: [input.customer_id],
    });

    //Дефолтное соотношение

    const WEIGHTS = { COLLAB: 0.3, CONTENT: 0.7 };

    // Для более активных юзеров
    if (userReviews.length >= 3) {
      WEIGHTS.COLLAB = 0.5;
      WEIGHTS.CONTENT = 0.5;
    }

    if (userReviews.length >= 5) {
      WEIGHTS.COLLAB = 0.7;
      WEIGHTS.CONTENT = 0.3;
    }

    collabItems.forEach((item) => {
      combinedMap.set(item.product.id, {
        product: item.product,
        combinedScore: item.normalizedScore * WEIGHTS.COLLAB,
        collabScore: item.normalizedScore,
      });
    });

    contentItems.forEach((item) => {
      const existing = combinedMap.get(item.product.id);
      const contentScore = item.sim * WEIGHTS.CONTENT;

      if (existing) {
        existing.combinedScore += contentScore;
        existing.contentScore = item.sim;
      } else {
        combinedMap.set(item.product.id, {
          product: item.product,
          combinedScore: contentScore,
          contentScore: item.sim,
        });
      }
    });

    const sortedResults = Array.from(combinedMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 100);

    return new StepResponse({
      recommendations: sortedResults,
      stats: {
        totalCombined: combinedMap.size,
        collabCount: collabItems.length,
        contentCount: contentItems.length,
      },
    });
  }
);

export const hybridFiltering = createWorkflow(
  "hybridRec",
  function (input: WorkflowInput) {
    const { recommendation } = contentFiltering.runAsStep({
      input: {
        productIds: input.productIds,
      },
    });

    const { collabRec } = collaborativeFiltering.runAsStep({
      input: {
        customerId: input.customerId,
      },
    });
    const hybridRec = getHybridFiltering({
      recommendation: recommendation,
      collabRec: collabRec,
      customer_id: input.customerId,
    });
    return new WorkflowResponse({
      hybridRec: hybridRec,
    });
  }
);
