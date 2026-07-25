"use client";



import { useEffect, type ReactNode } from "react";

import { useSearchParams } from "next/navigation";

import { toast } from "sonner";

import { AppLayout } from "@/components/layout/app-layout";



interface DashboardShellProps {

  children: React.ReactNode;

  sidebarWalletSlot?: ReactNode;

}



/** Dashboard uses the Cosmic Arcade Glow AppLayout (mockup shell). */

export function DashboardShell({ children, sidebarWalletSlot }: DashboardShellProps) {

  const searchParams = useSearchParams();



  useEffect(() => {

    if (searchParams.get("verified") === "1") {

      toast.success("Welcome to Spinora! Your email is verified.");

    }

  }, [searchParams]);



  return (

    <AppLayout sidebarWalletSlot={sidebarWalletSlot}>

      <div className="vip-page-content">{children}</div>

    </AppLayout>

  );

}

