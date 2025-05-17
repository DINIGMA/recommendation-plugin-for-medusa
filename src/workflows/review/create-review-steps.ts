import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PRODUCT_REVIEW_MODULE } from "../../modules/review";
import ProductReviewModuleService from "../../modules/review/service";
import { Modules } from "@medusajs/framework/utils";
import { MedusaError } from "@medusajs/framework/utils";

export type BaseCreateReviewStepInput = {
  title?: string;
  content: string;
  rating: number;
  product_id: string;
  customer_id?: string;
  first_name: string;
  status?: "pending" | "approved" | "rejected";
};

export type CreateReviewStepInput = BaseCreateReviewStepInput[];

export const createReviewStep = createStep(
  "create-review",
  async (input: CreateReviewStepInput, { container }) => {
    const reviewModuleService: ProductReviewModuleService = container.resolve(
      PRODUCT_REVIEW_MODULE
    );

    const review = await reviewModuleService.createReviews(input);

    return new StepResponse(review);
  },
  async (reviewId, { container }) => {
    if (!reviewId) {
      return;
    }

    const reviewModuleService: ProductReviewModuleService = container.resolve(
      PRODUCT_REVIEW_MODULE
    );

    await reviewModuleService.deleteReviews(reviewId);
  }
);

// export const validateCustomerStep = createStep(
//   "validate-customer",
//   async (customerId: string | undefined, { container }) => {
//     if (!customerId) return new StepResponse(null);

//     const customerService = container.resolve(Modules.CUSTOMER);
//     try {
//       const customer = await customerService.retrieveCustomer(customerId);
//       return new StepResponse(customer);
//     } catch (e) {
//       throw new MedusaError(
//         MedusaError.Types.INVALID_DATA,
//         `Customer with id ${customerId} not found`
//       );
//     }
//   }
// );

export const validateCustomersStep = createStep(
  "validate-customers",
  async (customerIds: string[], { container }) => {
    if (customerIds.length === 0) {
      return new StepResponse([]);
    }

    const customerService = container.resolve(Modules.CUSTOMER);

    try {
      const customers = await customerService.listCustomers({
        id: customerIds,
      });
      const foundIds = customers.map((c) => c.id);
      const missingIds = customerIds.filter((id) => !foundIds.includes(id));

      if (missingIds.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Customers with ids ${missingIds.join(", ")} not found`
        );
      }

      return new StepResponse(foundIds);
    } catch (error) {
      throw error;
    }
  }
);

export const validateProductsStep = createStep(
  "validate-products",
  async (productIds: string[], { container }) => {
    if (productIds.length === 0) {
      return new StepResponse([]);
    }

    const productService = container.resolve(Modules.PRODUCT);

    try {
      const products = await productService.listProducts({ id: productIds });
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));

      if (missingIds.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Products with ids ${missingIds.join(", ")} not found`
        );
      }

      return new StepResponse(foundIds);
    } catch (error) {
      throw error;
    }
  }
);
