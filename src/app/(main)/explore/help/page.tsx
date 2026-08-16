// Purpose: SCR-08 Emergency & Help Services Screen — rapid locator for 24x7 fuel stations, hospitals, ATMs, pharmacies, highway food, and EV chargers near traveler's current location.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import type { EmergencyServiceItem, HelpCategory } from "@/types/place";
import {
  LifeBuoy,
  Fuel,
  Hospital,
  Pill,
  CreditCard,
  UtensilsCrossed,
  Zap,
  ArrowLeft,
  Phone,
  Navigation,
  MapPin,
  Clock,
  LocateFixed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const HELP_CATEGORIES: { id: HelpCategory; labelEn: string; labelTa: string; icon: any }[] = [
  { id: "fuel", labelEn: "Fuel & Petrol", labelTa: "பெட்ரோல் பங்க்", icon: Fuel },
  { id: "hospital", labelEn: "24x7 Hospitals", labelTa: "மருத்துவமனை", icon: Hospital },
  { id: "pharmacy", labelEn: "Pharmacies", labelTa: "மருந்தகம்", icon: Pill },
  { id: "atm", labelEn: "Cash ATMs", labelTa: "ஏடிஎம்", icon: CreditCard },
  { id: "restaurant", labelEn: "Highway Dhabas", labelTa: "உணவகம்", icon: UtensilsCrossed },
  { id: "ev_charging", labelEn: "EV Chargers", labelTa: "EV சார்ஜிங்", icon: Zap },
];

export default function HelpServicesPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>("fuel");
  const [services, setServices] = useState<EmergencyServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Request browser geolocation for rapid emergency distance calculations
  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast.success(lang === "ta" ? "இருப்பிடம் கண்டறியப்பட்டது" : "Current location detected");
        },
        (err) => {
          console.warn("Geolocation denied:", err);
        }
      );
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ category: selectedCategory });
    if (userLocation) {
      params.set("lat", userLocation.lat.toString());
      params.set("lng", userLocation.lng.toString());
    }

    fetch(`/api/places/emergency?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.services) setServices(data.services);
      })
      .catch((err) => console.error("Emergency fetch error:", err))
      .finally(() => setLoading(false));
  }, [selectedCategory, userLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/explore")}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{t("tourist.emergencyHelp")}</span>
                <LifeBuoy className="h-4 w-4 text-rose-400" />
              </h1>
              <p className="text-[11px] text-gray-400">
                {lang === "ta" ? "அருகிலுள்ள அவசர உதவி & நெடுஞ்சாலை சேவைகள்" : "Rapid roadside assistance and medical locator"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:bg-teal-500/30 transition-colors"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{lang === "ta" ? "இருப்பிடம்" : "GPS"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* ─── Category Filter Grid ─── */}
        <section className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {HELP_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all",
                  isSelected
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/40 scale-105"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="h-5 w-5 mb-1 text-teal-400" />
                <span className="text-[11px] font-semibold">
                  {lang === "ta" ? cat.labelTa : cat.labelEn}
                </span>
              </button>
            );
          })}
        </section>

        {/* ─── Emergency List ─── */}
        <section className="space-y-3">
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 text-xs">
              No services found in this category
            </div>
          ) : (
            services.map((srv) => {
              const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                srv.name + " " + srv.address
              )}`;

              return (
                <div
                  key={srv.id}
                  className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">
                        {srv.name}
                      </h3>
                      {srv.isOpenNow && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          24/7 OPEN
                        </span>
                      )}
                    </div>

                    {srv.tamilName && (
                      <p className="text-xs text-teal-400 font-medium">
                        {srv.tamilName}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span>{srv.address}</span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {srv.phoneNumber && (
                      <a
                        href={`tel:${srv.phoneNumber}`}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{lang === "ta" ? "அழைக்க" : "Call"}</span>
                      </a>
                    )}

                    <a
                      href={navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md active:scale-95"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>{lang === "ta" ? "வழிகாட்டு" : "Directions"}</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
