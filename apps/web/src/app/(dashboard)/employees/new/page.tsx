"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateUser } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth";
import { AuthGuard } from "@/components/AuthGuard";
import { Role } from "@lms/types";

export default function NewUserPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createUser = useCreateUser();
  const { data: branches } = useBranches();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "EMPLOYEE",
    branchId: "",
    sendSetupLink: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedBranchId = form.branchId || user?.branchId || "";

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs["name"] = "Name is required";
    if (!form.email.trim()) errs["email"] = "Email is required";
    if (!selectedBranchId) errs["branchId"] = "Branch is required";
    if (!form.sendSetupLink) {
      if (!form.password) errs["password"] = "Password is required";
      else if (form.password.length < 8) errs["password"] = "Password must be at least 8 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      role: form.role,
      branchId: selectedBranchId,
      sendSetupLink: form.sendSetupLink,
    };
    if (!form.sendSetupLink && form.password) {
      payload["password"] = form.password;
    }
    const result = await createUser.mutateAsync(payload);
    if (result) router.push("/employees");
  }

  const availableRoles =
    user?.role === Role.ADMIN
      ? ["EMPLOYEE", "SUB_ADMIN", "ADMIN"]
      : ["EMPLOYEE"];

  return (
    <AuthGuard allowedRoles={[Role.ADMIN, Role.SUB_ADMIN]}>
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Add Employee</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new user account</p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="bg-white border border-surface-200 rounded-xl p-5 space-y-4"
      >
        <Input
          label="Full Name"
          required
          placeholder="Employee full name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          error={errors["name"]}
        />
        <Input
          label="Work Email"
          type="email"
          required
          placeholder="employee@godigitify.com"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          error={errors["email"]}
        />
        <Input
          label="Phone Number"
          placeholder="10-digit mobile number"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          maxLength={10}
          inputMode="numeric"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Role
          </label>
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            aria-label="Role"
            title="Role"
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r === "SUB_ADMIN"
                  ? "Sub Admin"
                  : r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Branch <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) =>
              setForm((p) => ({ ...p, branchId: e.target.value }))
            }
            aria-label="Branch"
            title="Branch"
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
          >
            <option value="">Select branch</option>
            {(
              branches as
                | Array<{ id: string; name: string; city?: string }>
                | undefined
            )?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.city}
              </option>
            ))}
          </select>
          {errors["branchId"] && (
            <p className="text-xs text-red-500 mt-1">{errors["branchId"]}</p>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface-50 rounded-lg">
          <input
            type="checkbox"
            checked={form.sendSetupLink}
            onChange={(e) =>
              setForm((p) => ({ ...p, sendSetupLink: e.target.checked, password: "" }))
            }
            className="accent-primary w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">
              Send setup link via email
            </p>
            <p className="text-xs text-gray-500">
              Employee will receive an email to set their own password
            </p>
          </div>
        </label>

        {!form.sendSetupLink && (
          <Input
            label="Password"
            type="password"
            required
            placeholder="Minimum 8 characters"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            error={errors["password"]}
            helperText={!errors["password"] ? "You are setting the password manually — share it securely with the employee" : undefined}
          />
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createUser.isPending}
            className="flex-1"
          >
            Create Account
          </Button>
        </div>
      </form>
    </div>
    </AuthGuard>
  );
}
