"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { EditUserRoleForm } from "./edit-user-role-form";
import { RemoveUserButton } from "./remove-user-button";
import { SetSuperAdminButton } from "./set-super-admin-button";
import { ResetPasswordButton } from "./reset-password-button";

type OrgUser = {
  id: string;
  isSuperAdmin: boolean;
  user: { id: string; email: string; name: string | null };
  role: { id: string; name: string };
};

type Role = { id: string; name: string };

interface UsersTableProps {
  orgUsers: OrgUser[];
  roles: Role[];
  currentUserIsSuperAdmin: boolean;
  currentUserId?: string;
}

export function UsersTable({
  orgUsers,
  roles,
  currentUserIsSuperAdmin,
  currentUserId,
}: UsersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[120px]">Super admin</TableHead>
            <TableHead className="w-[220px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No users yet. Add a user to get started.
              </TableCell>
            </TableRow>
          ) : (
            orgUsers.map((ou) => (
              <TableRow key={ou.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{ou.user.name || ou.user.email}</p>
                    <p className="text-sm text-muted-foreground">{ou.user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <EditUserRoleForm
                    userOrgId={ou.id}
                    currentRoleId={ou.role.id}
                    roles={roles}
                    disabled={ou.isSuperAdmin}
                  />
                </TableCell>
                <TableCell>
                  {ou.isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Shield className="h-3 w-3" />
                      Super admin
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                  {currentUserIsSuperAdmin && ou.role.name === "ADMIN" && (
                    <SetSuperAdminButton
                      userOrgId={ou.id}
                      userName={ou.user.name || ou.user.email}
                      currentlySuperAdmin={ou.isSuperAdmin}
                    />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {currentUserIsSuperAdmin && (
                      <ResetPasswordButton
                        userId={ou.user.id}
                        userName={ou.user.name || ou.user.email}
                      />
                    )}
                    <RemoveUserButton
                      userOrgId={ou.id}
                      userName={ou.user.name || ou.user.email}
                      disabled={ou.isSuperAdmin || ou.user.id === currentUserId}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
