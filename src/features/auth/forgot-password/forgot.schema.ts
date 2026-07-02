import { Translator } from "@/src/types/translation";
import z from "zod";

function getForgotPasswordSchema(t: Translator) {
  const forgetPasswordSchema = z.object({
    email: z.email("Please enter your email address."),
  });
  return forgetPasswordSchema;
}

export { getForgotPasswordSchema };
