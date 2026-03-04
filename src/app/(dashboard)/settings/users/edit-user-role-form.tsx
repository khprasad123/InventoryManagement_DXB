"use client";

import { useTransition } from "react";
import { updateOrgUser } from "./actions";

interface EditUserRoleFormProps {
  userOrgId: string;
  currentRoleId: string;
  roles: { id: string; name: string }[];
  disabled: boolean;
}

export function EditUserRoleForm({
  userOrgId,
  currentRoleId,
  roles,
  disabled,
}: EditUserRoleFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const roleId = e.target.value;
    if (roleId === currentRoleId) return;
    startTransition(() => {
      const formData = new FormData();
      formData.set("roleId", roleId);
      updateOrgUser(userOrgId, formData);
    });
  }

  return (
    <select
      value={currentRoleId}
      onChange={handleChange}
      disabled={disabled || isPending}
      className="flex h-9 w-full max-w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50"
    >
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
