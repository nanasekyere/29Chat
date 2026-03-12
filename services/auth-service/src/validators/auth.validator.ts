import { z } from "zod";

export const authSchema = z.object({
  email: z.email(),
  name: z.string().min(2).max(50).optional(),
  password: z.string().min(8),
});

export type AuthSchema = z.infer<typeof authSchema>;
