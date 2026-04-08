"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export function NavbarWrapper() {
  const pathname = usePathname();
  // Admin has its own sidebar layout — suppress global navbar there only
  if (pathname.startsWith("/admin")) return null;
  return <Navbar />;
}

export function FooterWrapper() {
  const pathname = usePathname();
  // Hide footer inside portals and admin (they have their own layouts)
  if (pathname.startsWith("/admin") || pathname.startsWith("/client") || pathname.startsWith("/contractor")) {
    return null;
  }
  return <Footer />;
}
