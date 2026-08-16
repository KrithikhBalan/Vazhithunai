// Purpose: Mobile-first persistent bottom navigation bar for the Vazhithunai PWA. Provides quick 1-tap switching between Dashboard, Tourist Discovery, AI Assistant, and User Profile with active route glowing indicators and bilingual labels.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Compass,
  LayoutDashboard,
  Sparkles,
  User,
  MapPin,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavBar() {
  const pathname = usePathname();
  const { lang, t } = useLanguage();

  // Hide bottom nav on splash and login pages
  if (pathname === "/splash" || pathname === "/login" || pathname === "/") {
    return null;
  }

  const navItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      labelEn: "Home",
      labelTa: "முகப்பு",
      isActive: pathname === "/dashboard" || pathname.startsWith("/trips") && !pathname.includes("/ai"),
    },
    {
      href: "/explore",
      icon: Compass,
      labelEn: "Explore",
      labelTa: "சுற்றுலா",
      isActive: pathname.startsWith("/explore"),
    },
    {
      href: pathname.includes("/trips/")
        ? `${pathname.split("/").slice(0, 3).join("/")}/ai`
        : "/dashboard",
      icon: Sparkles,
      labelEn: "AI Chat",
      labelTa: "AI அரட்டை",
      isActive: pathname.includes("/ai"),
    },
    {
      href: "/profile",
      icon: User,
      labelEn: "Profile",
      labelTa: "சுயவிவரம்",
      isActive: pathname === "/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#08131d]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 safe-area-bottom shadow-2xl shadow-black">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = lang === "ta" ? item.labelTa : item.labelEn;

          return (
            <Link
              key={item.href + item.labelEn}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 min-w-[64px] min-h-[48px] justify-center relative active:scale-95",
                item.isActive
                  ? "text-teal-300 font-bold"
                  : "text-gray-400 hover:text-gray-200 font-medium"
              )}
            >
              {item.isActive && (
                <span className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-teal-400 to-teal-300 rounded-full shadow-[0_0_12px_rgba(45,212,191,0.8)]" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  item.isActive && "scale-110 text-teal-300"
                )}
              />
              <span className="text-[10px] tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
