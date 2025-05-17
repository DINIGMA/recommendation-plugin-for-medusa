import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { hybridFiltering } from "../../../workflows/recommendation/hybridRecommendation";

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

    console.log(body);
    console.log(product_ids);
    console.log(customer_id);

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
    const { result: hybridRecommendations } = await hybridFiltering(
      req.scope
    ).run({
      input: {
        productIds: product_ids,
        customerId: customer_id,
      },
    });

    res.json({
      hybridRecommendations: hybridRecommendations,
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
