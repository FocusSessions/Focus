import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { FocusProvider } from "@/context/focus-app";
import { SideNav } from "@/components/profile/side-nav";
import { LayoutShell } from "@/components/layout-shell";
import { Toaster } from "sonner";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focus — A Quiet Place to Work",
  description:
    "Track your deep work sessions, build streaks, and stay focused. A minimal productivity timer with achievements, analytics, and a community of focused minds.",
  openGraph: {
    title: "Focus — A Quiet Place to Work",
    description:
      "Track your deep work sessions, build streaks, and stay focused.",
    type: "website",
    siteName: "Focus",
  },
  twitter: {
    card: "summary_large_image",
    title: "Focus — A Quiet Place to Work",
    description:
      "Track your deep work sessions, build streaks, and stay focused.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) || (localStorage.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${lora.variable} ${inter.variable}`}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <AuthProvider>
          <FocusProvider>
            <SideNav />
            <LayoutShell>{children}</LayoutShell>
            <Toaster 
              theme="system" 
              toastOptions={{
                className: "font-sans border border-border bg-surface text-brown shadow-lg",
              }} 
            />
          </FocusProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
