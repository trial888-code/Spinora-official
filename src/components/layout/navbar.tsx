"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Search, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { BrandLogo } from "@/components/ui/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { logoutUser } from "@/lib/auth/logout";

const NotificationDropdown = dynamic(
  () =>
    import("@/components/notifications/notification-dropdown").then(
      (m) => m.NotificationDropdown
    ),
  { ssr: false, loading: () => null }
);

const UserAccountMenu = dynamic(
  () => import("@/components/layout/user-account-menu").then((m) => m.UserAccountMenu),
  {
    ssr: false,
    loading: () => <div className="hidden sm:block h-9 w-9 rounded-full bg-white/5" aria-hidden />,
  }
);

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#games", label: "Games" },
  { href: "/promotions", label: "Promotions" },
  { href: "/blog", label: "Blog" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/support", label: "Support" },
];

type NavbarProps = {
  /** Homepage: open sidebar drawer on mobile */
  onMenuClick?: () => void;
  /** Homepage: focus game search */
  onSearchClick?: () => void;
  /** Cosmic Arcade Glow public landing */
  variant?: "default" | "cosmic";
};

export function Navbar({ onMenuClick, onSearchClick, variant = "default" }: NavbarProps = {}) {
  const cosmic = variant === "cosmic";
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setIsLoggedIn(true);
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function closeMobile() {
    setOpen(false);
  }

  async function handleLogout() {
    await logoutUser("/");
    window.location.href = "/";
  }

  const authActions = isLoggedIn ? (
    <>
      <NotificationDropdown buttonClassName="w-9 h-9" />
      <Button size="sm" asChild className="hidden sm:inline-flex bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs">
        <Link href="/dashboard/deposit">Deposit</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void handleLogout()}
        className="hidden lg:inline-flex text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold text-xs gap-1"
      >
        <LogOut className="size-3.5" /> Logout
      </Button>
      <UserAccountMenu compact />
    </>
  ) : cosmic ? (
    <>
      <Link
        href="/login"
        className="hidden sm:inline-flex items-center rounded-2xl border border-cyan-400/50 bg-cyan-500/5 px-5 py-2 text-xs font-black uppercase tracking-wider text-cyan-100 hover:bg-cyan-500/15 transition-all"
      >
        Log In
      </Link>
      <Link
        href="/register"
        className="cosmic-gold-btn inline-flex items-center px-5 py-2 text-xs uppercase tracking-wider font-extrabold"
      >
        Sign Up
      </Link>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" asChild className="font-extrabold text-xs">
        <Link href="/login">Log In</Link>
      </Button>
      <Button size="sm" asChild className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs px-4">
        <Link href="/register">Sign Up</Link>
      </Button>
    </>
  );

  const mobileAuthActions = isLoggedIn ? (
    <>
      <Button asChild className="bg-emerald-500 text-black font-bold">
        <Link href="/dashboard/deposit" onClick={closeMobile}>
          Deposit
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/dashboard" onClick={closeMobile}>
          Dashboard
        </Link>
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          closeMobile();
          void handleLogout();
        }}
        className="text-rose-400 hover:bg-rose-500/10 font-bold text-xs"
      >
        <LogOut className="h-4 w-4 mr-1" /> Logout
      </Button>
    </>
  ) : (
    <>
      <Button variant="outline" asChild>
        <Link href="/login" onClick={closeMobile}>
          <User className="h-4 w-4 mr-1" /> Log In
        </Link>
      </Button>
      <Button asChild className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold">
        <Link href="/register" onClick={closeMobile}>
          Sign Up
        </Link>
      </Button>
    </>
  );

  return (
    <header
      className={
        cosmic
          ? "fixed top-0 left-0 right-0 z-50 border-b border-purple-500/25 bg-[#0a0418]/85 backdrop-blur-xl shadow-[0_4px_30px_rgba(88,28,135,0.15)]"
          : "fixed top-0 left-0 right-0 z-50 glass"
      }
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {cosmic ? (
            <Link href="/">
              <BrandLogo className="h-9" showText />
            </Link>
          ) : (
            <AnimatedLogo textClassName="text-lg" />
          )}
        </div>

        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                cosmic
                  ? "text-xs font-bold uppercase tracking-[0.14em] text-purple-200/70 hover:text-amber-300 transition-colors"
                  : "text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 font-medium"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-gray-900 hover:opacity-90 transition-opacity"
              aria-label="Search games"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          {authActions}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-gray-900 hover:opacity-90 transition-opacity shrink-0"
              aria-label="Search games"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          {!onMenuClick && (
            <button
              className="p-2 text-foreground"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
          {isLoggedIn && <UserAccountMenu compact />}
        </div>
      </nav>

      <AnimatePresence>
        {open && !onMenuClick && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border"
          >
            <div className="flex flex-col gap-2 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">{mobileAuthActions}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
