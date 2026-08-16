// Purpose: SCR-10 Route & Travel Cost Screen — computes route distance, travel duration, mileage-based fuel consumption, and highway toll estimates using Google Routes API proxy, syncing metrics to the Firestore trip document.

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToTrip, updateTripRouteEstimates, removeStopFromTrip } from "@/lib/firebase/trips";
import type { TripDocument } from "@/types/trip";
import type { RouteCalculationResult } from "@/types/place";
import { formatPaise } from "@/lib/utils";
import {
  Route,
  ArrowLeft,
  Car,
  Bike,
  Zap,
  Fuel,
  Coins,
  Clock,
  Navigation,
  MapPin,
  Trash2,
  Plus,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const VEHICLES = [
  { id: "sedan", labelEn: "Sedan / Hatchback", labelTa: "செடான் / கார்", mileage: 15, unit: "km/L", icon: Car },
  { id: "suv", labelEn: "SUV / MUV", labelTa: "எஸ்.யு.வி (SUV)", mileage: 12, unit: "km/L", icon: Car },
  { id: "bike", labelEn: "Bike / Two Wheeler", labelTa: "இருசக்கர வாகனம்", mileage: 40, unit: "km/L", icon: Bike },
  { id: "ev", labelEn: "Electric Vehicle (EV)", labelTa: "மின்சார வாகனம் (EV)", mileage: 7, unit: "km/kWh", icon: Zap },
];

export default function RoutePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { lang, t } = useLanguage();
  const { user } = useAuthStore();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [vehicleType, setVehicleType] = useState<string>("sedan");
  const [fuelPrice, setFuelPrice] = useState<number>(102); // ₹102 per liter
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [originCity, setOriginCity] = useState("Chennai, Tamil Nadu");

  useEffect(() => {
    if (!tripId) return;
    const unsub = subscribeToTrip(tripId, (data) => {
      if (data) {
        setTrip(data);
        if (data.vehicleType) setVehicleType(data.vehicleType);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [tripId]);

  // Compute route through Google Routes API proxy
  const computeRoute = async () => {
    if (!trip) return;
    setCalculating(true);
    try {
      const res = await fetch("/api/routes/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: originCity,
          destination: trip.destination,
          vehicleType,
          fuelPricePerLiter: fuelPrice,
          stops: trip.stops || [],
        }),
      });

      if (res.ok) {
        const data: RouteCalculationResult = await res.json();
        setRouteResult(data);

        // Automatically sync computed route metrics to Firestore trip document
        await updateTripRouteEstimates(tripId, {
          distanceMeters: data.distanceMeters,
          durationSeconds: data.durationSeconds,
          fuelCostPaise: data.estimatedFuelCostPaise,
          tollCostPaise: data.estimatedTollCostPaise,
          vehicleType,
        });

        toast.success(
          lang === "ta"
            ? "பாதை & செலவு மதிப்பீடு பயணத்தில் சேமிக்கப்பட்டது!"
            : "Route & cost estimates synced to trip!"
        );
      }
    } catch (err) {
      console.error("Route calculation error:", err);
      toast.error(lang === "ta" ? "கணக்கிட முடியவில்லை" : "Failed to compute route");
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (trip && !routeResult) {
      computeRoute();
    }
  }, [trip]);

  const handleRemoveStop = async (stopId: string) => {
    try {
      await removeStopFromTrip(tripId, stopId);
      toast.success(lang === "ta" ? "நிறுத்தம் நீக்கப்பட்டது" : "Stop removed");
    } catch (e) {
      toast.error("Failed to remove stop");
    }
  };

  if (loading || !trip) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const distanceKm = routeResult ? Math.round(routeResult.distanceMeters / 1000) : Math.round((trip.estimatedDistanceMeters || 540000) / 1000);
  const durationHours = routeResult
    ? Math.round(routeResult.durationSeconds / 3600)
    : Math.round((trip.estimatedDurationSeconds || 32400) / 3600);

  const fuelCostPaise = routeResult?.estimatedFuelCostPaise || trip.estimatedFuelCostPaise || 380000;
  const tollCostPaise = routeResult?.estimatedTollCostPaise || trip.estimatedTollCostPaise || 55000;
  const totalCostPaise = fuelCostPaise + tollCostPaise;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/dashboard`)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{t("tourist.routeAndCost")}</span>
                <Route className="h-4 w-4 text-teal-400" />
              </h1>
              <p className="text-[11px] text-teal-400 font-medium truncate max-w-[180px]">
                {trip.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={computeRoute}
            disabled={calculating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={cn("h-3.5 w-3.5", calculating && "animate-spin")} />
            <span>{lang === "ta" ? "மறு கணக்கீடு" : "Recalculate"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        {/* ─── Grand Total Cost Banner ─── */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-teal-900/50 via-[#0d2235] to-[#08131d] border border-teal-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-teal-400" />
              <span>{t("tourist.totalTravelCost")}</span>
            </span>
            <span className="text-xs font-semibold text-gray-300 bg-white/10 px-2.5 py-1 rounded-full">
              {distanceKm} km · {durationHours} hrs
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              {formatPaise(totalCostPaise)}
            </h2>
            <span className="text-xs text-gray-400">
              {lang === "ta" ? "(எரிபொருள் + டோல்கேட்)" : "(Fuel + Toll Booths)"}
            </span>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-semibold flex items-center gap-1">
                <Fuel className="h-3 w-3 text-amber-400" />
                {t("tourist.estimatedFuelCost")}
              </span>
              <p className="text-base font-bold text-amber-300 font-mono">
                {formatPaise(fuelCostPaise)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-semibold flex items-center gap-1">
                <Coins className="h-3 w-3 text-emerald-400" />
                {t("tourist.estimatedTollCost")}
              </span>
              <p className="text-base font-bold text-emerald-300 font-mono">
                {formatPaise(tollCostPaise)}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Vehicle & Fuel Customizer ─── */}
        <section className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Car className="h-4 w-4 text-teal-400" />
            <span>{t("tourist.vehicleType")}</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VEHICLES.map((v) => {
              const Icon = v.icon;
              const isSelected = vehicleType === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleType(v.id)}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all",
                    isSelected
                      ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-950/40"
                      : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-bold">{lang === "ta" ? v.labelTa : v.labelEn}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{v.mileage} {v.unit}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <label className="text-xs text-gray-300 font-semibold">
              {t("tourist.fuelPrice")}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">₹</span>
              <input
                type="number"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 102)}
                className="w-20 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white font-mono text-xs text-center focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
        </section>

        {/* ─── Itinerary Stops Sequence ─── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-400" />
              <span>{lang === "ta" ? "பயண நிறுத்தங்கள் (இடைவழிகள்)" : "Trip Stops & Itinerary"}</span>
              <span className="text-[10px] text-gray-400 font-normal bg-white/5 px-2 py-0.5 rounded-full">
                {(trip.stops || []).length} {lang === "ta" ? "இடங்கள்" : "stops"}
              </span>
            </h3>

            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{lang === "ta" ? "இடங்களை சேர்" : "Add Stops"}</span>
            </Link>
          </div>

          {/* Origin Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase font-semibold">
                {lang === "ta" ? "தொடக்க புள்ளி" : "Origin (Starting Point)"}
              </p>
              <input
                type="text"
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="text-sm font-bold text-white bg-transparent border-b border-white/15 focus:outline-none focus:border-teal-400 w-full py-0.5"
              />
            </div>
          </div>

          {/* Added Stops */}
          {(trip.stops || []).map((stop, index) => (
            <div
              key={stop.stopId}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {stop.name}
                  </p>
                  {stop.tamilName && (
                    <p className="text-xs text-teal-400 truncate">
                      {stop.tamilName}
                    </p>
                  )}
                  {stop.formattedAddress && (
                    <p className="text-[11px] text-gray-400 truncate">
                      {stop.formattedAddress}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveStop(stop.stopId)}
                className="p-2 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                title="Remove Stop"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Destination Card */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
              B
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-400 uppercase font-semibold">
                {lang === "ta" ? "இறுதி சேருமிடம்" : "Final Destination"}
              </p>
              <p className="text-sm font-bold text-white truncate">
                {trip.destination}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
