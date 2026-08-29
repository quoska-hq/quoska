"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackMarketingSignupStart } from "@/lib/marketing-analytics";
import type { MarketingPlacement } from "@/types/site-analytics";

export function MarketingSignupLink({
  placement,
  className,
  children,
}: {
  placement: MarketingPlacement;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link
      href="/register"
      className={className}
      onClick={() => trackMarketingSignupStart(pathname, placement)}
    >
      {children}
    </Link>
  );
}
