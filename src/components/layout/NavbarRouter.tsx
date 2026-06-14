"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export function NavbarWrapper() {
  const pathname = usePathname();
  // Admin has its own sidebar layout; design-preview routes are full-bleed
  // standalone mockups — suppress the global navbar on both.
  if (pathname.startsWith("/admin") || pathname.startsWith("/design-preview")) return null;
  return <Navbar />;
}

export function FooterWrapper() {
  const pathname = usePathname();
  // Hide footer inside portals, admin, and design-preview mockups.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/contractor") ||
    pathname.startsWith("/design-preview")
  ) {
    return null;
  }
  return <Footer />;
}
