"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("peers_auth") === "1") {
      setAuthed(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authed) return null;

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 md:hidden bg-sidebar px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-bold text-sm">Peers Recruit</span>
        </div>
        {children}
      </div>
    </div>
  );
}
