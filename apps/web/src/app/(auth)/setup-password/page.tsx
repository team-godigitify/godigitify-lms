"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useSetupPassword } from "@/hooks/useAuthMutations";
import { cn } from "@/lib/utils";

function SetupForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const setupPassword = useSetupPassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600 font-medium text-sm">
          This setup link is invalid or has expired.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Contact your administrator for a new link.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (newPassword.length < 8)
      newErrors["newPassword"] = "Minimum 8 characters";
    if (!/[A-Z]/.test(newPassword))
      newErrors["newPassword"] = "Add an uppercase letter";
    if (!/[0-9]/.test(newPassword)) newErrors["newPassword"] = "Add a number";
    if (!/[^A-Za-z0-9]/.test(newPassword))
      newErrors["newPassword"] = "Add a special character";
    if (newPassword !== confirmPassword)
      newErrors["confirmPassword"] = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await setupPassword.mutateAsync({ token, newPassword });
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Set up your account
          </h2>
          <p className="text-xs text-gray-500">
            Create a secure password to get started
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a strong password"
              className={cn(
                "w-full px-4 py-2.5 pr-10 rounded-lg border text-sm outline-none",
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
        </div>

        {/* Requirements */}
        <div className="p-3 bg-surface-50 rounded-lg grid grid-cols-2 gap-1.5">
          {[
            { label: "8+ characters", met: newPassword.length >= 8 },
            { label: "Uppercase", met: /[A-Z]/.test(newPassword) },
            { label: "Lowercase", met: /[a-z]/.test(newPassword) },
            { label: "Number", met: /[0-9]/.test(newPassword) },
            { label: "Special char", met: /[^A-Za-z0-9]/.test(newPassword) },
          ].map((req) => (
            <div key={req.label} className="flex items-center gap-1.5">
              <CheckCircle2
                size={11}
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
                "w-full px-4 py-2.5 pr-10 rounded-lg border text-sm outline-none",
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
          disabled={setupPassword.isPending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-800 transition-colors disabled:opacity-50"
        >
          {setupPassword.isPending ? "Setting up..." : "Activate account"}
        </button>
      </form>
    </>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-8">
      <Suspense
        fallback={
          <p className="text-center text-sm text-gray-500">Loading...</p>
        }
      >
        <SetupForm />
      </Suspense>
    </div>
  );
}
