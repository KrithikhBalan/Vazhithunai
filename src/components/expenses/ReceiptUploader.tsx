// Purpose: UI Component for capturing or uploading receipt images with thumbnail preview, zoom modal, and AI OCR scan trigger.

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useLanguage } from "@/i18n/LanguageContext";
import { Camera, Upload, Trash2, Sparkles, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ReceiptUploaderProps {
  receiptFile: File | null;
  receiptUrl: string | null;
  onSelectFile: (file: File | null) => void;
  onOcrExtracted?: (details: { amountPaise?: number; category?: string; description?: string }) => void;
}

export function ReceiptUploader({
  receiptFile,
  receiptUrl,
  onSelectFile,
  onOcrExtracted,
}: ReceiptUploaderProps) {
  const { t, lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(receiptUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(lang === "ta" ? "கோப்பு 10MB க்கும் குறைவாக இருக்க வேண்டும்" : "File must be under 10MB");
        return;
      }
      onSelectFile(file);
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
    }
  };

  // Remove current receipt
  const handleRemove = () => {
    onSelectFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Trigger AI OCR extraction (Extensible hook ready for Module 8)
  const handleScanReceipt = async () => {
    if (!previewUrl && !receiptFile) return;
    setIsScanning(true);
    toast.loading(t("expenses.ocrScanning"), { id: "ocr-toast" });

    try {
      // Simulate OCR scan payload
      await new Promise((res) => setTimeout(res, 1200));
      toast.success(t("expenses.ocrSuccess"), { id: "ocr-toast" });

      if (onOcrExtracted) {
        onOcrExtracted({
          description: "Highway Toll & Food Bill",
        });
      }
    } catch {
      toast.error(lang === "ta" ? "ரசீது ஸ்கேன் செய்ய முடியவில்லை" : "Could not scan receipt", { id: "ocr-toast" });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
        {t("expenses.receipt")}
      </label>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        /* Preview Card */
        <div className="relative flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
          <div
            onClick={() => setShowModal(true)}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 shrink-0 cursor-pointer group"
          >
            <Image
              src={previewUrl}
              alt="Receipt Preview"
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {receiptFile?.name || "Receipt photo attached"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {receiptFile ? `${(receiptFile.size / 1024).toFixed(0)} KB` : "Uploaded to cloud"}
            </p>

            {/* AI OCR Trigger Button */}
            <button
              type="button"
              onClick={handleScanReceipt}
              disabled={isScanning}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>{isScanning ? t("expenses.ocrScanning") : t("expenses.scanReceiptOCR")}</span>
            </button>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Remove receipt"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Upload Buttons */
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            id="take-photo-btn"
            onClick={() => cameraInputRef.current?.click()}
            className={cn(
              "flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-xs font-semibold",
              "bg-white/[0.02] border-white/15 text-gray-300 hover:bg-white/[0.06] hover:border-white/30",
              "transition-all active:scale-95"
            )}
          >
            <Camera className="h-4 w-4 text-teal-400" />
            <span>{t("expenses.takePhoto")}</span>
          </button>

          <button
            type="button"
            id="upload-photo-btn"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-xs font-semibold",
              "bg-white/[0.02] border-white/15 text-gray-300 hover:bg-white/[0.06] hover:border-white/30",
              "transition-all active:scale-95"
            )}
          >
            <Upload className="h-4 w-4 text-teal-400" />
            <span>{t("expenses.uploadPhoto")}</span>
          </button>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {showModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-w-lg w-full bg-gray-900 border border-white/15 rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative w-full h-[70vh]">
              <Image
                src={previewUrl}
                alt="Receipt Full View"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
