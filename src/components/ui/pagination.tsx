import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({
  className,
  page,
  totalPages,
  onPageChange,
  ...props
}: PaginationProps) => (
  <div
    className={cn("flex items-center justify-between px-2", className)}
    {...props}
  >
    <p className="text-sm text-muted-foreground">
      Page {page} of {totalPages}
    </p>
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export { Pagination };
