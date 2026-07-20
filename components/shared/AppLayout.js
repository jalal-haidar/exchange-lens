"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Navbar = dynamic(() => import("./Navbar"), { ssr: false });
const MobileBottomNav = dynamic(() => import("./MobileBottomNav"), { ssr: false });

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login" || pathname === "/auth/callback";

  return (
    <div className="min-h-screen bg-surface-alt">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      {!hideNav && <Navbar />}
      <main
        id="main-content"
        className={!hideNav ? "pb-20 sm:pb-0" : ""}
      >
        {children}
      </main>
      {!hideNav && <MobileBottomNav />}
    </div>
  );
}
