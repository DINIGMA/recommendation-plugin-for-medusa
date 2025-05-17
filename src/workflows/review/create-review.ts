import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform,
  parallelize,
} from "@medusajs/framework/workflows-sdk";

import { MedusaError, Modules, isDefined } from "@medusajs/utils";
import {
  createReviewStep,
  validateCustomersStep,
  validateProductsStep,
} from "./create-review-steps";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";

type CreateReviewInput1 = {
  title?: string;
  content: string;
  rating: number;
  product_id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  status?: "pending" | "approved" | "rejected";
};

// export const createReviewWorkflow = createWorkflow(
//   "create-review",
//   (input: CreateReviewInput) => {
//     // Check product exists
//     //@ts-ignore
//     useQueryGraphStep({
//       entity: "product",
//       fields: ["id"],

//       filters: {
//         id: input.product_id,
//       },
//       options: {
//         throwIfKeyNotFound: true,
//       },
//     });

//     // const customer = when(input, (data) => isDefined(data.customer_id)).then(
//     //   () => validateCustomerStep(input.customer_id)
//     // );

//     // Create the review
//     const review = createReviewStep(input);

//     // @ts-ignore
//     return new WorkflowResponse({
//       review,
//     });
//   }
// );

type CreateReviewInput = {
  title?: string;
  content: string;
  rating: number;
  product_id: string;
  customer_id?: string;
  first_name: string;
  status?: "pending" | "approved" | "rejected";
};

export const createReviewWorkflow = createWorkflow(
  "create-review",
  // Явно указываем тип массива
  (input: CreateReviewInput[]) => {
    const normalizedInput = transform({ input }, ({ input }) => {
      // Дополнительная проверка при необходимости
      if (!Array.isArray(input)) {
        throw new Error("Input must be an array");
      }
      return input;
    });

    const productIds = transform({ normalizedInput }, ({ normalizedInput }) => {
      return [...new Set(normalizedInput.map((item) => item.product_id))];
    });

    const customerIds = transform(
      { normalizedInput },
      ({ normalizedInput }) => {
        const ids = normalizedInput
          .map((item) => item.customer_id)
          .filter(isDefined);
        return [...new Set(ids)];
      }
    );

    const productValidation = validateProductsStep(productIds);

    const customerValidation = validateCustomersStep(customerIds);

    parallelize(productValidation, customerValidation);

    const reviews = createReviewStep(normalizedInput);

    return new WorkflowResponse(reviews);
  }
);
