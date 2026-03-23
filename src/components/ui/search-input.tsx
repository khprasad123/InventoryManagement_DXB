"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "./input";

export function SearchInput({
  value,
  placeholder,
  queryParam = "search",
  resetPageParam = "page",
  debounceMs = 300,
}: {
  value: string;
  placeholder: string;
  queryParam?: string;
  resetPageParam?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(value ?? "");
  const didMountRef = useRef(false);

  useEffect(() => {
    setQ(value ?? "");
  }, [value]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const t = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
      const trimmed = q.trim();

      if (trimmed) nextParams.set(queryParam, trimmed);
      else nextParams.delete(queryParam);

      // Whenever search changes, go back to page 1.
      nextParams.set(resetPageParam, "1");

      const queryString = nextParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    }, debounceMs);

    return () => clearTimeout(t);
  }, [q, debounceMs, pathname, queryParam, resetPageParam, router, searchParams]);

  return (
    <Input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}

