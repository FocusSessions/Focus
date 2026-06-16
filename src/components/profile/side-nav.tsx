"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Clock, Home, Settings, Search, LogIn, LogOut } from "lucide-react";
import { useFocus } from "@/context/focus-app";
import { useAuth } from "@/context/auth-context";

export function SideNav() {
  const pathname = usePathname();
  const { isRunning } = useFocus();
  const { isGuest, profile, signOut, isLoading } = useAuth();

  if (isRunning) return null;

  const links = [
    { href: "/", label: "Focus", icon: Clock },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/search", label: "Search", icon: Search },
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/settings", label: "Settings", icon: Settings },
  ] as const;

  const initial = profile
    ? (profile.display_name || profile.username)[0]?.toUpperCase()
    : null;

  return (
    <nav
      className="fixed left-0 top-0 z-40 flex h-full w-44 flex-col border-r border-border bg-surface/90 px-3 py-8 backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <div className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-cozy px-3 py-2.5 text-sm font-medium transition-all duration-cozy ${
                isActive
                  ? "bg-cream text-brown shadow-cozy"
                  : "text-brown-muted hover:bg-cream/60 hover:text-brown"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Auth section at bottom */}
      <div className="mt-auto border-t border-border/40 pt-4">
        {isLoading ? (
          <div className="px-3 py-2">
            <div className="h-4 w-24 animate-pulse rounded bg-border/30" />
          </div>
        ) : isGuest ? (
          <Link
            href="/auth"
            className="flex items-center gap-3 rounded-cozy px-3 py-2.5 text-sm font-medium text-brown-muted transition-all duration-cozy hover:bg-cream/60 hover:text-brown"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            Sign In
          </Link>
        ) : (
          <div className="space-y-1">
            {/* User info */}
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-cozy px-3 py-2 transition-all duration-cozy hover:bg-cream/60"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-xs font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-brown">
                  {profile?.display_name || profile?.username}
                </p>
                <p className="truncate text-[10px] text-brown-muted">
                  @{profile?.username}
                </p>
              </div>
            </Link>

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-cozy px-3 py-2 text-sm font-medium text-brown-muted transition-all duration-cozy hover:bg-cream/60 hover:text-brown"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
