"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Target, Newspaper, Settings, Search, LogIn, LogOut } from "lucide-react";
import { useFocus } from "@/context/focus-app";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState, useRef } from "react";

export function SideNav() {
  const pathname = usePathname();
  const { isRunning } = useFocus();
  const { isGuest, profile, signOut, isLoading } = useAuth();
  
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isRunning) return null;

  const links = [
    { href: "/", label: "Focus", icon: Target },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/search", label: "Search", icon: Search },
    { href: "/feed", label: "Feed", icon: Newspaper },
    { href: "/settings", label: "Settings", icon: Settings },
  ] as const;

  const initial = profile
    ? (profile.display_name || profile.username)[0]?.toUpperCase()
    : null;

  return (
    <nav
      className={`fixed z-40 flex bg-surface/90 backdrop-blur-md bottom-2 left-2 right-2 h-[60px] md:h-full md:bottom-auto md:left-0 md:top-0 md:w-44 flex-row items-center justify-around rounded-2xl border border-border/50 px-2 py-0 shadow-sm md:flex-col md:justify-start md:rounded-none md:border-r md:border-t-0 md:px-3 md:py-8 transition-transform duration-300 ease-in-out ${isVisible ? "translate-y-0" : "translate-y-[150%] md:translate-y-0"}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="flex w-full md:w-auto flex-row md:flex-col items-center justify-around md:justify-start md:items-stretch gap-1 md:gap-2 md:flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 rounded-xl p-2 md:px-3 md:py-2.5 text-sm font-medium transition-all duration-cozy ${
                isActive
                  ? "bg-cream/80 md:bg-cream/80 text-brown shadow-sm md:shadow-sm border border-transparent md:border-border/50"
                  : "text-brown-muted hover:bg-cream/40 hover:text-brown"
              } ${href === "/profile" && !isGuest ? "md:hidden" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" aria-hidden="true" />
              <span className="text-xs md:text-sm font-medium md:font-medium">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Auth section at bottom (hidden on mobile) */}
      <div className="hidden md:block mt-auto border-t border-border/40 pt-4 w-full">
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
                  {profile?.display_name || (profile?.username?.startsWith("user_") ? "Focus User" : profile?.username)}
                </p>
                {!profile?.username?.startsWith("user_") && (
                  <p className="truncate text-xs text-brown-muted">
                    @{profile?.username}
                  </p>
                )}
              </div>
            </Link>

            {/* Sign out */}
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  signOut();
                }
              }}
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
