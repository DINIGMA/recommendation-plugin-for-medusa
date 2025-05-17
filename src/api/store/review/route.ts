import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { createReviewWorkflow } from "../../../workflows/review/create-review";

import { z } from "zod";

export const PostStoreReviewSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  rating: z.preprocess((val) => {
    if (val && typeof val === "string") {
      return parseInt(val);
    }
    return val;
  }, z.number().min(1).max(5)),
  product_id: z.string(),
  customer_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
});

type PostStoreReviewReq = z.infer<typeof PostStoreReviewSchema>;

type CreateReviewInput = {
  title?: string;
  content: string;
  rating: number;
  product_id: string;
  customer_id?: string;
  first_name: string;
  status?: "pending" | "approved" | "rejected";
};

export const POST = async (
  req: MedusaRequest<CreateReviewInput[]>,
  res: MedusaResponse
) => {
  const input = req.body;

  const { result } = await createReviewWorkflow(req.scope).run({
    input: input,
  });

  res.json(result);
};
