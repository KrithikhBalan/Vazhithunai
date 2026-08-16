// Purpose: SCR-09 Hotel Discovery Screen — lists verified hotels and hill resorts near travel destinations with direct 'tel:' call-to-book links, pricing, amenities, and trip stay addition.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToUserTrips, addStopToTrip } from "@/lib/firebase/trips";
import type { HotelItem } from "@/types/place";
import type { TripDocument } from "@/types/trip";
import { formatPaise } from "@/lib/utils";
import {
  Hotel,
  ArrowLeft,
  Search,
  Phone,
  Navigation,
  Star,
  Plus,
  Check,
  Sparkles,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function HotelsPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { user } = useAuthStore();

  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("Ooty");
  const [userTrips, setUserTrips] = useState<TripDocument[]>([]);
  const [addingHotelId, setAddingHotelId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserTrips(user.uid, (trips) => {
      setUserTrips(trips);
      if (trips.length > 0 && trips[0].destination) {
        setSearchCity(trips[0].destination.split(",")[0].trim());
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/places/hotels?city=${encodeURIComponent(searchCity)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hotels) setHotels(data.hotels);
      })
      .catch((err) => console.error("Hotels fetch error:", err))
      .finally(() => setLoading(false));
  }, [searchCity]);

  const handleAddHotelToTrip = async (hotel: HotelItem) => {
    if (userTrips.length === 0) {
      toast(lang === "ta" ? "முதலில் முகப்பில் பயணத்தை உருவாக்கவும்" : "Create a trip first", { icon: "ℹ️" });
      router.push("/dashboard");
      return;
    }

    const trip = userTrips[0];
    setAddingHotelId(hotel.id);
    try {
      await addStopToTrip(trip.tripId, {
        placeId: hotel.id,
        name: hotel.name,
        tamilName: hotel.tamilName,
        category: "hotel",
        location: hotel.location,
        formattedAddress: hotel.formattedAddress,
        photoUrl: hotel.photoUrl,
        order: (trip.stops || []).length + 1,
      });

      toast.success(
        lang === "ta"
          ? `${hotel.name} '${trip.name}' தங்குமிடமாக சேர்க்கப்பட்டது!`
          : `Added to ${trip.name} as a stay!`
      );
    } catch (e) {
      console.error("Add hotel stop error:", e);
      toast.error(lang === "ta" ? "சேர்க்க முடியவில்லை" : "Failed to add stay");
    } finally {
      setAddingHotelId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                <span>{t("tourist.hotels")}</span>
                <Hotel className="h-4 w-4 text-teal-400" />
              </h1>
              <p className="text-[11px] text-gray-400">
                {lang === "ta" ? "நேரடி முன்பதிவுக்கான ஹோட்டல்கள் & தங்குமிடங்கள்" : "Direct contact hotel & resort discovery"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ─── Non-Custodial Direct Booking Banner ─── */}
        <section className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-200 leading-relaxed">
            {lang === "ta"
              ? "🔒 நேரடி தொலைபேசி இணைப்பு: வழித்துணை இடைத்தரகர் கட்டணமின்றி நேரடியாக ஹோட்டல் வரவேற்பறையை அழைக்கும் நேரடி வசதியை வழங்குகிறது."
              : "🔒 Direct Contact: Connect directly with hotel front desks with zero middleman commissions or booking fees."}
          </p>
        </section>

        {/* ─── City Filter Bar ─── */}
        <section className="relative">
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder={lang === "ta" ? "நகரத்தை உள்ளிடவும் (எ.கா: Ooty, Kodaikanal, Madurai)…" : "Search destination city…"}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/15 text-white placeholder:text-gray-400 focus:outline-none focus:border-teal-400 text-sm font-medium"
          />
          <Search className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
        </section>

        {/* ─── Hotels List ─── */}
        <section className="space-y-4">
          {loading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : hotels.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10 space-y-2">
              <Hotel className="h-8 w-8 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-400">
                {lang === "ta" ? "ஹோட்டல்கள் எதுவும் கிடைக்கவில்லை" : "No hotels found in this area"}
              </p>
            </div>
          ) : (
            hotels.map((hotel) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                hotel.name + " " + hotel.formattedAddress
              )}`;

              return (
                <div
                  key={hotel.id}
                  className="rounded-3xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 transition-all overflow-hidden flex flex-col sm:flex-row gap-4 p-4 shadow-lg"
                >
                  {/* Photo Thumbnail */}
                  <div className="relative h-44 sm:h-auto sm:w-56 rounded-2xl overflow-hidden shrink-0 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hotel.photoUrl}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{hotel.rating}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white">
                        {hotel.name}
                      </h3>
                      {hotel.tamilName && (
                        <p className="text-xs text-teal-400 font-medium">
                          {hotel.tamilName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" />
                        <span>{hotel.formattedAddress}</span>
                      </p>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.amenities.map((am, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-300"
                        >
                          {am}
                        </span>
                      ))}
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <div>
                        <span className="text-base font-extrabold text-white font-mono">
                          {formatPaise(hotel.approxNightPaise)}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          {t("tourist.approxNight")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Open in Maps */}
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-colors"
                          title="Open in Maps"
                        >
                          <Navigation className="h-4 w-4 text-teal-400" />
                        </a>

                        {/* Add to Trip */}
                        <button
                          type="button"
                          onClick={() => handleAddHotelToTrip(hotel)}
                          disabled={addingHotelId === hotel.id}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-teal-300 transition-colors"
                          title="Add Stay to Itinerary"
                        >
                          {addingHotelId === hotel.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>

                        {/* Direct Call to Book */}
                        <a
                          href={`tel:${hotel.phoneNumber}`}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white transition-all shadow-md active:scale-95"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{t("tourist.callToBook")}</span>
                        </a>
                      </div>
                    </div>
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
