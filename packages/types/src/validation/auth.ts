import { z } from "zod";
import { validEmail, strongPassword } from "./common";

export const LoginSchema = z.object({
  email: validEmail,
  password: z.string().min(1, { message: "Password is required" }),
});

export const ForgotPasswordSchema = z.object({
  email: validEmail,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  newPassword: strongPassword,
});

export const SetupPasswordSchema = z
  .object({
    token: z.string().min(1, { message: "Setup token is required" }),
    newPassword: strongPassword,
    confirmPassword: strongPassword,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const AdminResetPasswordSchema = z.object({
  newPassword: strongPassword,
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type SetupPasswordInput = z.infer<typeof SetupPasswordSchema>;
export type AdminResetPasswordInput = z.infer<typeof AdminResetPasswordSchema>;
