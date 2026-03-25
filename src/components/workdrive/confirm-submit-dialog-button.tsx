"use client";

import * as React from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitDialogButton({
  formId,
  triggerLabel,
  confirmTitle = "Confirm delete",
  confirmDescription = "This action cannot be undone.",
  triggerVariant = "destructive",
  triggerSize = "default",
  triggerClassName,
}: {
  formId: string;
  triggerLabel: string;
  confirmTitle?: string;
  confirmDescription?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);

  function handleConfirm() {
    const el = document.getElementById(formId) as HTMLFormElement | null;
    el?.requestSubmit();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
          <DialogDescription>{confirmDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

