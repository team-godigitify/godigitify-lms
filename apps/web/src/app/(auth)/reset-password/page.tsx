"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useResetPassword } from "@/hooks/useAuthMutations";
import { ResetPasswordSchema } from "@lms/types";
import { cn } from "@/lib/utils";

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = [
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-blue-400",
    "bg-primary",
  ];
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= score ? colors[score - 1] : "bg-surface-200",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{labels[score - 1] ?? "Too weak"}</p>
    </div>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPassword = useResetPassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600 font-medium">Invalid reset link.</p>
        <Link
          href="/forgot-password"
          className="text-sm text-primary mt-4 block"
        >
          Request a new one
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = ResetPasswordSchema.safeParse({ token, newPassword });
    const newErrors: Record<string, string> = {};

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field) newErrors[field] = issue.message;
      });
    }

    if (newPassword !== confirmPassword) {
      newErrors["confirmPassword"] = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await resetPassword.mutateAsync({ token, newPassword });
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Set new password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Choose a strong password for your account.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className={cn(
                "w-full px-4 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors",
                errors["newPassword"]
                  ? "border-red-300 bg-red-50"
                  : "border-surface-200 focus:border-primary",
              )}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors["newPassword"] && (
            <p className="text-xs text-red-500 mt-1">{errors["newPassword"]}</p>
          )}
          <PasswordStrengthBar password={newPassword} />
        </div>

        {/* Password requirements */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "8+ characters", met: newPassword.length >= 8 },
            { label: "Uppercase letter", met: /[A-Z]/.test(newPassword) },
            { label: "Lowercase letter", met: /[a-z]/.test(newPassword) },
            { label: "Number", met: /[0-9]/.test(newPassword) },
            {
              label: "Special character",
              met: /[^A-Za-z0-9]/.test(newPassword),
            },
          ].map((req) => (
            <div key={req.label} className="flex items-center gap-1.5">
              <CheckCircle2
                size={12}
                className={req.met ? "text-primary" : "text-surface-300"}
              />
              <span
                className={cn(
                  "text-xs",
                  req.met ? "text-gray-600" : "text-gray-400",
                )}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className={cn(
                "w-full px-4 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors",
                errors["confirmPassword"]
                  ? "border-red-300 bg-red-50"
                  : "border-surface-200 focus:border-primary",
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors["confirmPassword"] && (
            <p className="text-xs text-red-500 mt-1">
              {errors["confirmPassword"]}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={resetPassword.isPending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-800 transition-colors disabled:opacity-50"
        >
          {resetPassword.isPending ? "Updating..." : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-8">
      <Suspense
        fallback={
          <p className="text-center text-sm text-gray-500">Loading...</p>
        }
      >
        <ResetForm />
      </Suspense>
    </div>
  );
}
