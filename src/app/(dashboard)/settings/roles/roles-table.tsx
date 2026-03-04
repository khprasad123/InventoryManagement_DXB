"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditRolePermissionsDialog } from "./edit-role-permissions-dialog";

type RoleWithPerms = {
  id: string;
  name: string;
  permissions: { permission: { id: string; code: string; name: string } }[];
};

type Permission = { id: string; code: string; name: string };

interface RolesTableProps {
  roles: RoleWithPerms[];
  allPermissions: Permission[];
}

export function RolesTable({ roles, allPermissions }: RolesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.length === 0 ? (
                    <span className="text-muted-foreground text-sm">None</span>
                  ) : (
                    role.permissions.map((rp) => (
                      <Badge key={rp.permission.id} variant="secondary" className="text-xs">
                        {rp.permission.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <EditRolePermissionsDialog
                  role={role}
                  allPermissions={allPermissions}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
