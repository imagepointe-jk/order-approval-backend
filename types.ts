import { z } from "zod";
import { wooCommerceOrderDataSchema } from "./sharedTypes";

export const numberInString = z.string().transform((val, ctx) => {
  const parsed = +val;
  if (isNaN(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Not a number",
    });

    return z.NEVER;
  }
  return parsed;
});

//Represents any operation done by the server that might result in an error.
//Useful for returning from a function where something might go wrong, and keeping track of what went wrong.
export type ServerOperationResult = {
  statusCode: number;
  message: string;
};

export type WooCommerceOrderData = z.infer<typeof wooCommerceOrderDataSchema>;
