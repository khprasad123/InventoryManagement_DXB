"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { createOrgUser } from "./actions";

type Role = { id: string; name: string };

interface AddUserDialogProps {
  roles: Role[];
  currentUserIsSuperAdmin?: boolean;
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "Something went wrong.";
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (String(o.digest ?? "").startsWith("NEXT_REDIRECT")) return "Redirecting...";
    if (Array.isArray(o._form) && o._form[0]) return String(o._form[0]);
    if (Array.isArray(o.email) && o.email[0]) return String(o.email[0]);
    if (Array.isArray(o.password) && o.password[0]) return String(o.password[0]);
    if (Array.isArray(o.roleId) && o.roleId[0]) return String(o.roleId[0]);
    if (o.message) return String(o.message);
  }
  return "Something went wrong.";
}

export function AddUserDialog({ roles, currentUserIsSuperAdmin }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData();
      formData.set("email", (form.elements.namedItem("email") as HTMLInputElement)?.value ?? "");
      formData.set("password", (form.elements.namedItem("password") as HTMLInputElement)?.value ?? "");
      formData.set("roleId", (form.elements.namedItem("roleId") as HTMLSelectElement)?.value ?? "");
      formData.set("name", (form.elements.namedItem("name") as HTMLInputElement)?.value ?? "");
      const isSuperAdminEl = form.elements.namedItem("isSuperAdmin") as HTMLInputElement | null;
      if (isSuperAdminEl?.checked) formData.set("isSuperAdmin", "true");
      const result = await createOrgUser(formData);
      if (result?.error) {
        setError(getErrorMessage(result.error));
        return;
      }
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add organization user</DialogTitle>
          <DialogDescription>
            Create a new user or add an existing user (by email) to your organization with a role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" name="name" placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Min 6 characters (only used for new users)"
            />
            <p className="text-xs text-muted-foreground">
              If the email already exists, password is ignored and they are only added to this org.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleId">Role *</Label>
            <select
              id="roleId"
              name="roleId"
              required
              defaultValue={roles.length === 1 ? roles[0].id : ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {roles.length === 0 && (
              <p className="text-xs text-destructive">No roles found. Create roles in Settings first.</p>
            )}
          </div>
          {currentUserIsSuperAdmin && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSuperAdmin"
                name="isSuperAdmin"
                value="true"
                className="rounded border-input"
              />
              <Label htmlFor="isSuperAdmin" className="font-normal cursor-pointer">
                Add as organization super admin
              </Label>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add user"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
