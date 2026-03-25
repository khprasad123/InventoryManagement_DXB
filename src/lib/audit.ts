"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_Supplier"
  | "UPDATE_Supplier"
  | "DELETE_Supplier"
  | "CREATE_Client"
  | "UPDATE_Client"
  | "DELETE_Client"
  | "CREATE_Item"
  | "UPDATE_Item"
  | "DELETE_Item"
  | "CREATE_PurchaseInvoice"
  | "UPDATE_PurchaseInvoice"
  | "DELETE_PurchaseInvoice"
  | "CREATE_SalesInvoice"
  | "UPDATE_SalesInvoice"
  | "DELETE_SalesInvoice"
  | "CREATE_Quotation"
  | "UPDATE_Quotation"
  | "DELETE_Quotation"
  | "CREATE_Expense"
  | "UPDATE_Expense"
  | "DELETE_Expense"
  | "CREATE_Document"
  | "DELETE_Document"
  | "CREATE_Grn"
  | "UPDATE_Grn"
  | "DELETE_Grn"
  | "CREATE_StockMovement"
  | "CREATE_SupplierPayment"
  | "CREATE_ClientPayment"
  // WorkDrive
  | "WORKDRIVE_CREATE_FOLDER"
  | "WORKDRIVE_UPLOAD_FILE"
  | "WORKDRIVE_UPDATE_FOLDER_PERMISSIONS"
  | "WORKDRIVE_UPDATE_FILE_PERMISSIONS"
  | "WORKDRIVE_DELETE_FOLDER"
  | "WORKDRIVE_DELETE_FILE";

/**
 * Record an audit log entry. Safe to call from server actions; no-op if not authenticated.
 */
export async function createAuditLog(params: {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  /** If provided, use this org/user instead of session (e.g. for login before session is set) */
  organizationId?: string;
  userId?: string;
}): Promise<void> {
  try {
    const orgId = params.organizationId ?? (await getOrganizationId());
    const user = params.userId ? { id: params.userId } : await getCurrentUser();
    const userId = params.userId ?? (user as { id?: string } | null)?.id ?? null;
    if (!orgId) return;

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: userId ?? undefined,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Don't fail the main action if audit write fails
  }
}
