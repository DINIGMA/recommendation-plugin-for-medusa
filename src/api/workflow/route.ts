import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createCustomersWorkflow } from "@medusajs/medusa/core-flows";
import { CreateCustomersWorkflowInput } from "@medusajs/medusa/core-flows";
import { CreateCustomerDTO } from "@medusajs/types";
import { isArray } from "class-validator";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  let body = req.body as CreateCustomerDTO[];

  if (!isArray(body)) {
    throw new Error("Request body must be an array of customers");
  }

  const { result } = await createCustomersWorkflow(req.scope).run({
    input: {
      customersData: body,
    },
  });

  res.send(result);
}
