"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={
        isActive
          ? "px-3 py-2 rounded bg-slate-700 text-white text-sm"
          : "px-3 py-2 rounded text-slate-400 hover:bg-slate-700 hover:text-white text-sm"
      }
    >
      {children}
    </Link>
  );
}
