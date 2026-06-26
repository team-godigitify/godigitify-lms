"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { getInitials } from "@/lib/utils";
import { Role } from "@lms/types";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError } from "@/lib/utils";

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.SUB_ADMIN]: "Sub Admin",
  [Role.EMPLOYEE]: "Employee",
};

export default function ProfilePage() {
  const { user, clearAuth } = useAuthStore();
  const { success, error } = useNotifications();
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      error("Passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      success("Password changed successfully");
      setChangingPassword(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (e) {
      error("Failed to change password", extractApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    clearAuth();
    window.location.href = "/login";
  }

  if (!user) return null;

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Profile card */}
      <div className="bg-white border border-surface-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {getInitials(user.name)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="primary">{ROLE_LABEL[user.role]}</Badge>
              <span className="text-xs text-gray-400">{user.branch?.name}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-surface-100 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Branch</span>
            <span className="font-medium text-gray-800">
              {user.branch?.name} — {user.branch?.city}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Role</span>
            <span className="font-medium text-gray-800">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white border border-surface-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Password</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChangingPassword(!changingPassword)}
          >
            {changingPassword ? "Cancel" : "Change Password"}
          </Button>
        </div>

        {changingPassword && (
          <form
            onSubmit={(e) => void handlePasswordChange(e)}
            className="space-y-3"
          >
            <Input
              label="Current Password"
              type="password"
              value={passwords.current}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, current: e.target.value }))
              }
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwords.new}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, new: e.target.value }))
              }
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords((p) => ({ ...p, confirm: e.target.value }))
              }
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Update Password
            </Button>
          </form>
        )}
      </div>

      {/* Logout */}
      <Button
        variant="danger"
        className="w-full"
        onClick={() => void handleLogout()}
      >
        Sign Out
      </Button>
    </div>
  );
}
