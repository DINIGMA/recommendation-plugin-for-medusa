import { defineLink } from "@medusajs/framework/utils";
import ProductReviewModule from "../modules/review";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(
  {
    linkable: ProductReviewModule.linkable.review,
    field: "customer_id",
    isList: false,
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
);
