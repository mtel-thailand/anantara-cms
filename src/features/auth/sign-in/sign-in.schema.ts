import { Translator } from "@/src/types/translation";
import z from "zod";

function getSignInSchema(t: Translator) {
  const signInSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(2),
  });

  return signInSchema;
}

export { getSignInSchema };
