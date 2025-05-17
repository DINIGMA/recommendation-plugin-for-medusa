import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { contentFiltering as recommendation } from "../../../../workflows/recommendation/contentRecommendation";
import { collaborativeFiltering } from "../../../../workflows/recommendation/collabRecommendations";

interface RecommendationRequest {
  customer_id: string;
  product_ids: string[];
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as RecommendationRequest;
    // Получаем данные из тела запроса
    const { product_ids, customer_id } = body;

    // Валидация входных данных
    if (!customer_id) {
      return res.status(400).json({
        message: "Missing required field: customer_id",
      });
    }

    if (!Array.isArray(product_ids)) {
      return res.status(400).json({
        message: "product_ids must be an array",
      });
    }

    // Запуск workflow рекомендаций по контенту
    const { result: contentRecommendations } = await recommendation(
      req.scope
    ).run({
      input: {
        productIds: [
          "prod_01JSC50QEZSPXPSKMQ4ARM7Y13",
          "prod_01JSC50QEZ6B9NGMX8MXQC546S",
          "prod_01JSC50QFK17TM7ZK9BM1W4RR2",
          "prod_01JSC5V7GPWW9898ZSE0X34V3D",
          "prod_01JSC50QEZCVD4Q3XDR7XYDJXV",
        ],
      },
    });

    // Запуск коллаборативной фильтрации
    const { result: collabRecommendations } = await collaborativeFiltering(
      req.scope
    ).run({
      input: { customerId: customer_id },
    });

    res.json({
      content_recommendations: contentRecommendations,
      collaborative_recommendations: collabRecommendations,
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
