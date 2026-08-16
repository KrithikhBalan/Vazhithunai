// Purpose: SCR-06 Explore Places Screen — nationwide tourist destination discovery with category filter pills, city search, dynamic nearby attractions, and direct itinerary addition.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToUserTrips, addStopToTrip } from "@/lib/firebase/trips";
import type { PlaceSummary, PlaceCategory } from "@/types/place";
import type { TripDocument } from "@/types/trip";
import {
  Compass,
  Search,
  MapPin,
  Star,
  Plus,
  Navigation,
  Hotel,
  LifeBuoy,
  Route,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Check,
  Building2,
  TreePine,
  Waves,
  Mountain,
  Footprints,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES: { id: PlaceCategory; labelEn: string; labelTa: string; icon: any }[] = [
  { id: "all", labelEn: "All", labelTa: "அனைத்தும்", icon: Compass },
  { id: "hills", labelEn: "Hills & Mist", labelTa: "மலைகள்", icon: Mountain },
  { id: "nature", labelEn: "Nature", labelTa: "இயற்கை", icon: TreePine },
  { id: "beaches", labelEn: "Beaches", labelTa: "கடற்கரை", icon: Waves },
  { id: "temples", labelEn: "Temples", labelTa: "கோயில்கள்", icon: Building2 },
  { id: "heritage", labelEn: "Heritage", labelTa: "பாரம்பரியம்", icon: Footprints },
  { id: "waterfalls", labelEn: "Waterfalls", labelTa: "அருவிகள்", icon: Waves },
];

const POPULAR_CITIES = [
  "All India",
  "Ooty",
  "Kodaikanal",
  "Rameshwaram",
  "Madurai",
  "Mahabalipuram",
  "Kanyakumari",
  "Munnar",
  "Goa",
  "Jaipur",
];

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, t } = useLanguage();
  const { user } = useAuthStore();

  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>("all");
  const [selectedCity, setSelectedCity] = useState<string>("All India");
  const [userTrips, setUserTrips] = useState<TripDocument[]>([]);
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);

  // Load user trips so they can quick-add stops
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserTrips(user.uid, setUserTrips);
    return () => unsub();
  }, [user]);

  // Fetch places via server-side Google Places API proxy
  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedCity && selectedCity !== "All India") params.set("city", selectedCity);

      const res = await fetch(`/api/places/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPlaces(data.places || []);
      }
    } catch (e) {
      console.error("Fetch places error:", e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlaces();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPlaces]);

  // Quick Add Stop to the latest active trip
  const handleQuickAddToTrip = async (place: PlaceSummary) => {
    if (userTrips.length === 0) {
      toast(lang === "ta" ? "முதலில் முகப்பு பக்கத்தில் ஒரு பயணத்தை உருவாக்கவும்" : "Please create a trip on Dashboard first", { icon: "ℹ️" });
      router.push("/dashboard");
      return;
    }

    const targetTrip = userTrips[0];
    setAddingPlaceId(place.id);
    try {
      await addStopToTrip(targetTrip.tripId, {
        placeId: place.id,
        name: place.displayName,
        tamilName: place.tamilName,
        category: place.category,
        location: place.location,
        formattedAddress: place.formattedAddress,
        photoUrl: place.photoUrl,
        order: (targetTrip.stops || []).length + 1,
      });

      toast.success(
        lang === "ta"
          ? `${place.displayName} '${targetTrip.name}' பயணத்தில் சேர்க்கப்பட்டது!`
          : `Added to ${targetTrip.name} itinerary!`
      );
    } catch (e) {
      console.error("Add stop error:", e);
      toast.error(lang === "ta" ? "சேர்க்க முடியவில்லை" : "Failed to add stop");
    } finally {
      setAddingPlaceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center hover:bg-teal-600/30 transition-colors"
            >
              <Compass className="h-5 w-5 text-teal-400" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{t("tourist.explore")}</span>
                <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              </h1>
              <p className="text-[11px] text-gray-400">
                {lang === "ta" ? "சுற்றுலா தலங்கள் & வழிகாட்டி" : "Discover attractions across Tamil Nadu & India"}
              </p>
            </div>
          </div>

          {/* Quick Hub Navigation Pills */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/explore/hotels"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-teal-500/20 hover:border-teal-500/30 text-teal-300 transition-colors"
            >
              <Hotel className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tourist.hotels")}</span>
            </Link>

            <Link
              href="/explore/help"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 transition-colors"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tourist.emergencyHelp")}</span>
            </Link>

            {userTrips[0] && (
              <Link
                href={`/trips/${userTrips[0].tripId}/route`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors shadow-sm"
              >
                <Route className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("tourist.routeAndCost")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ─── Search Bar ─── */}
        <section className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("tourist.searchPlaces")}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/15 text-white placeholder:text-gray-400 focus:outline-none focus:border-teal-400 text-sm transition-colors shadow-inner"
          />
          <Search className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
        </section>

        {/* ─── Popular City Pills ─── */}
        <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                selectedCity === city
                  ? "bg-teal-500 text-black shadow-md shadow-teal-950/40"
                  : "bg-white/[0.03] border border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
              )}
            >
              {city}
            </button>
          ))}
        </section>

        {/* ─── Category Filter Pills ─── */}
        <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap border transition-all",
                  isSelected
                    ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-950/40"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{lang === "ta" ? cat.labelTa : cat.labelEn}</span>
              </button>
            );
          })}
        </section>

        {/* ─── Places Grid ─── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-400" />
              <span>{t("tourist.popularPlaces")}</span>
              <span className="text-[10px] text-gray-400 font-normal bg-white/5 px-2 py-0.5 rounded-full">
                {places.length} {lang === "ta" ? "இடங்கள்" : "destinations"}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
              <Compass className="h-8 w-8 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-400">
                {lang === "ta" ? "இடங்கள் எதுவும் கிடைக்கவில்லை" : "No attractions found matching your search"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {places.map((place) => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  place.displayName + " " + place.formattedAddress
                )}`;

                return (
                  <div
                    key={place.id}
                    className="group rounded-3xl bg-white/[0.03] border border-white/10 hover:border-teal-500/40 transition-all overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-teal-950/30"
                  >
                    {/* Image Banner */}
                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                      {place.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={place.photoUrl}
                          alt={place.displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-teal-950/40 text-teal-300">
                          <Compass className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08131d] via-transparent to-black/30" />

                      {/* Rating Chip */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{place.rating || 4.6}</span>
                      </div>

                      {/* Category Tag */}
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-teal-950/80 backdrop-blur-md border border-teal-500/30 text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                        {place.category}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <Link href={`/explore/${place.id}`} className="block group-hover:text-teal-300 transition-colors">
                          <h3 className="font-bold text-base text-white line-clamp-1">
                            {place.displayName}
                          </h3>
                          {place.tamilName && (
                            <p className="text-xs text-teal-400 font-medium line-clamp-1">
                              {place.tamilName}
                            </p>
                          )}
                        </Link>
                        <p className="text-xs text-gray-400 flex items-start gap-1 line-clamp-2">
                          <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" />
                          <span>{place.formattedAddress}</span>
                        </p>
                      </div>

                      {place.description && (
                        <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                          {place.description}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        {/* Open in Maps */}
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <Navigation className="h-3.5 w-3.5 text-teal-400" />
                          <span>{lang === "ta" ? "மேப்ஸ்" : "Directions"}</span>
                        </a>

                        {/* Add to Trip */}
                        <button
                          type="button"
                          onClick={() => handleQuickAddToTrip(place)}
                          disabled={addingPlaceId === place.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all active:scale-95 shadow-md shadow-teal-950/40 disabled:opacity-50"
                        >
                          {addingPlaceId === place.id ? (
                            <Check className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          <span>{t("tourist.addToTrip")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
