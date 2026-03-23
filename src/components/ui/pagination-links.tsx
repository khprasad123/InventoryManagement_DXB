import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function PaginationLinks({
  page,
  totalPages,
  total,
  showingFrom,
  showingTo,
  prevHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  total?: number;
  showingFrom?: number;
  showingTo?: number;
  prevHref?: string;
  nextHref?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {typeof total === "number" && typeof showingFrom === "number" && typeof showingTo === "number"
          ? `Showing ${showingFrom} to ${showingTo} of ${total} items`
          : `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={page <= 1 ? "#" : prevHref ?? "#"}>
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-2">Previous</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
          <Link href={page >= totalPages ? "#" : nextHref ?? "#"}>
            <span className="mr-2">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

