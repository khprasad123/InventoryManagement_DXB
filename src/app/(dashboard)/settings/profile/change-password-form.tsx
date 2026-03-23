"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPassword } from "./actions";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await changeOwnPassword(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    form.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Password updated successfully.</p>}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password *</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          placeholder="Your current password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password *</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={6}
          placeholder="Min 6 characters"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password *</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          placeholder="Repeat new password"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Updating..." : "Change PassWord"}
      </Button>
    </form>
  );
}
