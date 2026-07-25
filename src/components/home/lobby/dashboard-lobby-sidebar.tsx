"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";



import { LobbySidebar, type LobbyMenuId } from "@/components/home/lobby/lobby-sidebar";



interface DashboardLobbySidebarProps {

  walletSlot?: React.ReactNode;

}



export function DashboardLobbySidebar({ walletSlot }: DashboardLobbySidebarProps) {

  const router = useRouter();

  const [lobbyMenu, setLobbyMenu] = useState<LobbyMenuId>("lobby");



  function handleLobbyMenu(menu: LobbyMenuId) {

    setLobbyMenu(menu);

    if (menu === "lobby") {

      router.push("/");

      return;

    }

    if (menu === "missions") {

      router.push("/#missions");

      return;

    }

    if (menu === "promotions") {

      router.push("/promotions");

      return;

    }

    if (menu === "vip") {

      router.push("/dashboard/vip");

      return;

    }

    if (menu === "leaderboard") {

      router.push("/leaderboard");

      return;

    }

    if (menu === "support") {

      router.push("/dashboard/messages");

      return;

    }

    router.push("/#games");

  }



  return (

    <LobbySidebar

      activeMenu={lobbyMenu}

      onMenuChange={handleLobbyMenu}

      walletSlot={walletSlot}

      showAccountLinks

    />

  );

}

