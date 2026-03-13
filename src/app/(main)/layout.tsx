"use client";

import Sidebar from "@/components/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
