import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { contentFiltering } from "../../../workflows/recommendation/contentRecommendation";

interface RecommendationRequest {
  product_ids: string[];
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as RecommendationRequest;

    const { product_ids } = body;

    if (!Array.isArray(product_ids)) {
      return res.status(400).json({
        message: "product_ids must be an array",
      });
    }

    // Запуск workflow рекомендаций по контенту
    const { result: contentRecommendations } = await contentFiltering(
      req.scope
    ).run({
      input: {
        productIds: product_ids,
      },
    });

    res.json({
      content_recommendations: contentRecommendations,
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.stack
            : undefined
          : undefined,
    });
  }
}
