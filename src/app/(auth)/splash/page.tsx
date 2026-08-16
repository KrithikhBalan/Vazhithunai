"use client";


import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { MapPin, Users, IndianRupee } from "lucide-react";

/** Kolam-inspired SVG brand mark */
function KolamMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("animate-spin-slow", className)}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.4" />
      {/* 8-point kolam star */}
      <g transform="translate(100,100)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <g key={i} transform={`rotate(${deg})`}>
            <polygon points="0,-72 8,-40 0,-28 -8,-40" fill="#f59e0b" opacity="0.85" />
            <circle cx="0" cy="-80" r="3" fill="#f59e0b" opacity="0.6" />
          </g>
        ))}
        {/* Inner lotus petals */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-22"
            rx="5"
            ry="14"
            fill="#0d9488"
            opacity="0.7"
            transform={`rotate(${deg})`}
          />
        ))}
        {/* Center */}
        <circle cx="0" cy="0" r="8" fill="#f59e0b" />
        <circle cx="0" cy="0" r="4" fill="#0a1628" />
      </g>
    </svg>
  );
}

/** Feature pill */
function FeaturePill({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-gray-300",
        className
      )}
    >
      {icon}
      {label}
    </div>
  );
}

export default function SplashPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const { lang, setLang, t } = useLanguage();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const isTamil = lang === "ta";

  const features = [
    {
      icon: <MapPin className="h-3.5 w-3.5 text-teal-400" />,
      en: "Smart Trip Planning",
      ta: "புத்திசாலி பயண திட்டமிடல்",
    },
    {
      icon: <IndianRupee className="h-3.5 w-3.5 text-saffron-400" style={{ color: "#f59e0b" }} />,
      en: "Expense Splitting",
      ta: "செலவு பகிர்வு",
    },
    {
      icon: <Users className="h-3.5 w-3.5 text-teal-400" />,
      en: "Group Travel",
      ta: "குழு பயணம்",
    },
  ];

  return (
    <main className="min-h-dvh bg-vt-gradient relative flex flex-col items-center justify-between px-6 py-safe overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-[-10%] left-[10%] w-96 h-96 rounded-full bg-teal-900/20 blur-3xl" />
        <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 rounded-full bg-amber-900/10 blur-3xl" />
      </div>

      {/* Top bar — language toggle */}
      <header className="w-full max-w-sm flex justify-end pt-4 relative z-10">
        <div
          role="group"
          aria-label="Language selector"
          className="flex items-center glass rounded-full p-1 gap-1"
        >
          <button
            id="lang-en-btn"
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
              lang === "en"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            )}
          >
            English
          </button>
          <button
            id="lang-ta-btn"
            onClick={() => setLang("ta")}
            aria-pressed={lang === "ta"}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
              lang === "ta"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            )}
          >
            தமிழ்
          </button>
        </div>
      </header>

      {/* Center — brand mark + wordmark */}
      <section className="flex-1 flex flex-col items-center justify-center gap-8 relative z-10 w-full max-w-sm">
        {/* Kolam icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-2xl scale-150 animate-pulse-glow" />
          <div className="relative w-32 h-32">
            <Image
              src="/icon-512.jpg"
              alt="Vazhithunai brand mark"
              fill
              className="object-cover rounded-3xl shadow-2xl"
              priority
            />
          </div>
        </div>

        {/* Wordmark */}
        <div
          className="text-center opacity-0-init animate-fade-in-up delay-200"
        >
          <h1 className="text-4xl font-bold tracking-tight mb-1">
            <span
              className={cn(
                "bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-transparent",
                isTamil ? "block text-3xl" : "block"
              )}
            >
              {isTamil ? "வழித்துணை" : "Vazhithunai"}
            </span>
            {isTamil && (
              <span className="block text-xl font-normal text-gray-400 mt-0.5">
                Vazhithunai
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-base mt-2">
            {isTamil ? "உங்கள் AI பயண துணை" : "Your AI travel companion"}
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 opacity-0-init animate-fade-in delay-400">
          {features.map((f, i) => (
            <FeaturePill
              key={i}
              icon={f.icon}
              label={isTamil ? f.ta : f.en}
            />
          ))}
        </div>

        {/* Decorative kolam */}
        <div className="w-24 h-24 opacity-20 opacity-0-init animate-fade-in delay-500">
          <KolamMark className="w-full h-full" />
        </div>
      </section>

      {/* Bottom — CTA */}
      <footer className="w-full max-w-sm pb-10 relative z-10 space-y-3 opacity-0-init animate-fade-in-up delay-700">
        <Link
          id="get-started-btn"
          href="/login"
          className={cn(
            "flex items-center justify-center w-full py-4 px-6 rounded-2xl",
            "font-semibold text-lg text-white",
            "bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600",
            "hover:brightness-110 active:scale-95",
            "transition-all duration-200",
            "shadow-xl shadow-teal-900/50",
            "animate-pulse-glow"
          )}
        >
          {isTamil ? "தொடங்குவோம்" : "Get Started"}
        </Link>

        <p className="text-center text-xs text-gray-600">
          {isTamil
            ? "உள்நுழைவதன் மூலம் நீங்கள் எங்கள் பயன்பாட்டு விதிமுறைகளை ஒப்புக்கொள்கிறீர்கள்"
            : "By continuing, you agree to our Terms of Service"}
        </p>
      </footer>
    </main>
  );
}
