import z from "zod";

export const signInSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(2),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
