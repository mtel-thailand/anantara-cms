import z from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter your email address."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
