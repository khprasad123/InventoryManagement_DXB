"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateRolePermissions } from "./actions";
import { Pencil } from "lucide-react";

type RoleWithPerms = {
  id: string;
  name: string;
  permissions: { permission: { id: string; code: string; name: string } }[];
};

type Permission = { id: string; code: string; name: string };

/** Group permissions by menu for display (Inventory, Suppliers, Clients, etc.) */
function getMenuForPermission(code: string): string {
  if (code.startsWith("inventory_") || code === "manage_inventory" || code === "adjust_stock")
    return "Inventory";
  if (code.startsWith("suppliers_") || code === "manage_suppliers") return "Suppliers";
  if (code.startsWith("clients_") || code === "manage_clients") return "Clients";
  if (code.startsWith("purchases_") || code === "manage_purchases" || code === "approve_purchase_request")
    return "Purchases";
  if (code.startsWith("sales_") || code === "manage_sales" || code === "approve_quotation")
    return "Sales";
  if (code.startsWith("expenses_") || code === "manage_expenses") return "Expenses";
  if (code.startsWith("manage_users") || code.startsWith("manage_roles")) return "Settings";
  if (code.startsWith("record_payments")) return "Payments";
  if (code.startsWith("view_reports")) return "Reports";
  if (code.startsWith("view_audit")) return "Audit";
  return "Other";
}

interface EditRolePermissionsDialogProps {
  role: RoleWithPerms;
  allPermissions: Permission[];
}

export function EditRolePermissionsDialog({
  role,
  allPermissions,
}: EditRolePermissionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(role.permissions.map((rp) => rp.permission.id))
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePermission(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateRolePermissions(role.id, Array.from(selectedIds));
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  const byMenu = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const menu = getMenuForPermission(p.code);
    if (!acc[menu]) acc[menu] = [];
    acc[menu].push(p);
    return acc;
  }, {});
  const menuOrder = ["Inventory", "Suppliers", "Clients", "Purchases", "Sales", "Expenses", "Payments", "Settings", "Reports", "Audit", "Other"];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSelectedIds(new Set(role.permissions.map((rp) => rp.permission.id)));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit permissions: {role.name}</DialogTitle>
          <DialogDescription>
            Assign menu permissions (Create, Read, Edit, Delete per module). Users with this role get these access rights.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {menuOrder.map((menu) => {
            const perms = byMenu[menu];
            if (!perms?.length) return null;
            return (
              <div key={menu}>
                <p className="font-semibold text-sm text-muted-foreground mb-2">{menu}</p>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
