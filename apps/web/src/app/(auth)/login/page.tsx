"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertTriangle, Lock } from "lucide-react";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { useLogin } from "@/hooks/useAuthMutations";
import { useAuthStore } from "@/store/auth";
import { LoginSchema } from "@lms/types";
import { cn } from "@/lib/utils";

const MAX_ATTEMPTS = 5;
const LOCKOUT_KEY = "lms_login_attempts";

type AttemptData = {
  count: number;
  lastAttempt: number;
};

function getAttemptData(): AttemptData {
  if (typeof window === "undefined") return { count: 0, lastAttempt: 0 };
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { count: 0, lastAttempt: 0 };
    return JSON.parse(raw) as AttemptData;
  } catch {
    return { count: 0, lastAttempt: 0 };
  }
}

function saveAttemptData(data: AttemptData): void {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
}

function clearAttemptData(): void {
  localStorage.removeItem(LOCKOUT_KEY);
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Initialize deterministically for SSR to avoid hydration mismatch.
  // Populate from localStorage after mount.
  const [attempts, setAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);

  useEffect(() => {
    try {
      const data = getAttemptData();
      const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
      if (data.lastAttempt < fifteenMinsAgo) {
        setAttempts(0);
        setIsLockedOut(false);
      } else {
        setAttempts(data.count);
        setIsLockedOut(data.count >= MAX_ATTEMPTS);
      }
    } catch {
      setAttempts(0);
      setIsLockedOut(false);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  // If stored attempt data is expired, clear it from localStorage.
  // State is initialized from storage so we don't call setState synchronously here.
  useEffect(() => {
    const data = getAttemptData();
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

    if (data.lastAttempt < fifteenMinsAgo) {
      clearAttemptData();
    }
  }, []);

  function validateForm(): boolean {
    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLockedOut) return;
    if (!validateForm()) return;

    try {
      await login.mutateAsync({ email, password });
      clearAttemptData();
    } catch (error) {
      // Count only credential/rate-limit failures toward lockout.
      if (isAxiosError(error) && error.response?.status !== 401) {
        toast.error("Unable to sign in right now. Please try again.");
        return;
      }

      const data = getAttemptData();
      const newCount = data.count + 1;
      saveAttemptData({ count: newCount, lastAttempt: Date.now() });
      setAttempts(newCount);

      if (newCount >= MAX_ATTEMPTS) {
        setIsLockedOut(true);
        toast.error("Too many failed attempts. Try again in 15 minutes.");
      } else {
        const remaining = MAX_ATTEMPTS - newCount;
        toast.error(
          `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        );
      }
    }
  }

  const remaining = MAX_ATTEMPTS - attempts;

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
          <div className="absolute bottom-20 right-10 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="bg-white rounded-2xl p-4 mb-8 shadow-xl">
            <Image
              src="/logo.png"
              alt="Future Education"
              width={200}
              height={80}
              className="object-contain"
              priority
            />
          </div>

          <h2 className="text-3xl font-bold text-white mb-3">
            Lead Management System
          </h2>
          <p className="text-primary-100 text-base max-w-xs leading-relaxed">
            Track, manage, and convert digital marketing leads into
            long-term clients
          </p>

          {/* Stats decoration */}
          <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-xs">
            {[
              { label: "Active Leads", value: "2.3K+" },
              { label: "Confirmed", value: "340+" },
              { label: "Counsellors", value: "12" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-primary-200 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Login Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-white rounded-2xl p-3">
              <Image
                src="/logo.png"
                alt="Future Education"
                width={140}
                height={56}
                className="object-contain"
              />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to your account to continue
            </p>
          </div>

          {/* Lockout warning */}
          {isLockedOut && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <Lock size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Account temporarily locked
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Too many failed attempts. Please try again after 15 minutes or
                  contact your administrator.
                </p>
              </div>
            </div>
          )}

          {/* Attempt warning */}
          {!isLockedOut && attempts >= 2 && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">
                {remaining} attempt{remaining === 1 ? "" : "s"} remaining before
                your account is temporarily locked
              </p>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLockedOut || login.isPending}
                placeholder="you@futureeducation.in"
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors",
                  "placeholder:text-gray-400 disabled:bg-surface-100 disabled:cursor-not-allowed",
                  errors["email"]
                    ? "border-red-300 focus:border-red-400 bg-red-50"
                    : "border-surface-200 focus:border-primary",
                )}
              />
              {errors["email"] && (
                <p className="text-xs text-red-500 mt-1">{errors["email"]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary-800 font-medium"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLockedOut || login.isPending}
                  placeholder="Enter your password"
                  className={cn(
                    "w-full px-4 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors",
                    "placeholder:text-gray-400 disabled:bg-surface-100 disabled:cursor-not-allowed",
                    errors["password"]
                      ? "border-red-300 focus:border-red-400 bg-red-50"
                      : "border-surface-200 focus:border-primary",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors["password"] && (
                <p className="text-xs text-red-500 mt-1">
                  {errors["password"]}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLockedOut || login.isPending}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-primary hover:bg-primary-800 active:bg-primary-900",
              )}
            >
              {login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Future Education Trust · Bokaro Steel City
          </p>
        </div>
      </div>
    </div>
  );
}
