"use client";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(37, 99, 235, 0.05) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
