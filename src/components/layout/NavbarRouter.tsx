"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export function NavbarWrapper() {
  const pathname = usePathname();
  // Admin has its own sidebar layout; design-preview routes are full-bleed
  // mockups; the homepage (Linear design) renders its own self-contained nav.
  const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
  if (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/design-preview") ||
    AUTH_ROUTES.includes(pathname)
  ) return null;
  return <Navbar />;
}

export function FooterWrapper() {
  const pathname = usePathname();
  // Hide footer where the page provides its own (homepage, portals, admin,
  // design-preview mockups).
  const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
  if (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/contractor") ||
    pathname.startsWith("/design-preview") ||
    AUTH_ROUTES.includes(pathname)
  ) {
    return null;
  }
  return <Footer />;
}
