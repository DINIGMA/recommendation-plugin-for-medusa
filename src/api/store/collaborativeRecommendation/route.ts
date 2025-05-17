import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { collaborativeFiltering } from "../../../workflows/recommendation/collabRecommendations";

interface RecommendationRequest {
  customer_id: string;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as RecommendationRequest;
    // Получаем данные из тела запроса
    const { customer_id } = body;

    // Валидация входных данных
    if (!customer_id) {
      return res.status(400).json({
        message: "Missing required field: customer_id",
      });
    }

    // Запуск коллаборативной фильтрации
    const { result: collabRecommendations } = await collaborativeFiltering(
      req.scope
    ).run({
      input: { customerId: customer_id },
    });

    res.json({
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
