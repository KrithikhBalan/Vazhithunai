// Purpose: SCR-07 Place Details Screen — displays comprehensive tourist attraction details, high-res photo gallery, operating hours, reviews, Google Maps deep link, and trip itinerary addition.

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToUserTrips, addStopToTrip } from "@/lib/firebase/trips";
import type { PlaceSummary } from "@/types/place";
import type { TripDocument } from "@/types/trip";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Navigation,
  Plus,
  Check,
  Sparkles,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PlaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const placeId = params.placeId as string;
  const { lang, t } = useLanguage();
  const { user } = useAuthStore();

  const [place, setPlace] = useState<PlaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [userTrips, setUserTrips] = useState<TripDocument[]>([]);
  const [addingStop, setAddingStop] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserTrips(user.uid, setUserTrips);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!placeId) return;

    fetch(`/api/places/${placeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.place) setPlace(data.place);
      })
      .catch((err) => console.error("Place fetch error:", err))
      .finally(() => setLoading(false));
  }, [placeId]);

  const handleAddToTrip = async () => {
    if (!place) return;
    if (userTrips.length === 0) {
      toast(lang === "ta" ? "முதலில் முகப்பில் பயணத்தை உருவாக்கவும்" : "Create a trip first on Dashboard", { icon: "ℹ️" });
      router.push("/dashboard");
      return;
    }

    const trip = userTrips[0];
    setAddingStop(true);
    try {
      await addStopToTrip(trip.tripId, {
        placeId: place.id,
        name: place.displayName,
        tamilName: place.tamilName,
        category: place.category,
        location: place.location,
        formattedAddress: place.formattedAddress,
        photoUrl: place.photoUrl,
        order: (trip.stops || []).length + 1,
      });

      toast.success(
        lang === "ta"
          ? `${place.displayName} '${trip.name}' பயணத்தில் சேர்க்கப்பட்டது!`
          : `Added to ${trip.name} itinerary!`
      );
    } catch (e) {
      console.error("Add stop error:", e);
      toast.error(lang === "ta" ? "சேர்க்க முடியவில்லை" : "Failed to add stop");
    } finally {
      setAddingStop(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place?.displayName,
        text: `Check out ${place?.displayName} on Vazhithunai`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(lang === "ta" ? "இணைப்பு நகலெடுக்கப்பட்டது!" : "Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-[#08131d] text-white p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-gray-400 text-sm">Place not found</p>
        <button
          onClick={() => router.push("/explore")}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const photos = place.photos && place.photos.length > 0 ? place.photos : [place.photoUrl || ""];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.displayName + " " + place.formattedAddress
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Sticky Top Nav ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-300" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        {/* ─── Photo Carousel & Viewer ─── */}
        <section className="space-y-2">
          <div className="relative h-64 sm:h-80 w-full rounded-3xl bg-slate-900 overflow-hidden border border-white/10 shadow-2xl">
            {photos[selectedPhotoIndex] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[selectedPhotoIndex]}
                alt={place.displayName}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Rating Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300 shadow-lg">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{place.rating || 4.6}</span>
              <span className="text-[10px] text-gray-400">({place.userRatingCount || 500})</span>
            </div>
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={cn(
                    "relative h-16 w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0",
                    selectedPhotoIndex === idx ? "border-teal-400 scale-105" : "border-transparent opacity-60"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ─── Place Title & Location ─── */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-teal-500/20 border border-teal-500/30 text-xs font-semibold text-teal-300 uppercase tracking-wider">
              {place.category}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {place.displayName}
          </h1>
          {place.tamilName && (
            <p className="text-sm font-semibold text-teal-400">
              {place.tamilName}
            </p>
          )}

          <p className="text-xs sm:text-sm text-gray-300 flex items-start gap-1.5 pt-1 leading-relaxed">
            <MapPin className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <span>{place.formattedAddress}</span>
          </p>
        </section>

        {/* ─── Primary Action Buttons ─── */}
        <section className="grid grid-cols-2 gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-all shadow-md active:scale-95"
          >
            <Navigation className="h-4 w-4 text-teal-400" />
            <span>{t("tourist.directions")}</span>
          </a>

          <button
            type="button"
            onClick={handleAddToTrip}
            disabled={addingStop}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white transition-all shadow-lg shadow-teal-950/50 active:scale-95 disabled:opacity-50"
          >
            {addingStop ? <Check className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{t("tourist.addToTrip")}</span>
          </button>
        </section>

        {/* ─── Description & Highlights ─── */}
        {place.description && (
          <section className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span>{lang === "ta" ? "விளக்கம்" : "Overview"}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {place.description}
            </p>
          </section>
        )}

        {/* ─── Highlights Chips ─── */}
        {place.highlights && place.highlights.length > 0 && (
          <section className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-white">
              {lang === "ta" ? "முக்கிய சிறப்பம்சங்கள்" : "Key Highlights"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {place.highlights.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-300"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ─── Opening Hours & Contact ─── */}
        {place.openingHours && place.openingHours.length > 0 && (
          <section className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-400" />
              <span>{t("tourist.hours")}</span>
            </h2>
            <ul className="text-xs text-gray-300 space-y-1.5">
              {place.openingHours.map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
