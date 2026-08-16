// Purpose: Firebase Storage helpers for uploading travel receipts, bill photos, and providing extensible OCR hooks.

import { storage } from "./config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Uploads a receipt image/photo to Firebase Storage.
 * Path: `trips/{tripId}/receipts/{expenseId}_{timestamp}.{ext}`
 * @returns Public download URL for the receipt image.
 */
export async function uploadReceiptPhoto(
  tripId: string,
  expenseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${expenseId}_${Date.now()}.${ext}`;
  const storagePath = `trips/${tripId}/receipts/${filename}`;
  const storageRef = ref(storage, storagePath);

  // Set metadata with content type
  const metadata = {
    contentType: file.type || "image/jpeg",
    customMetadata: {
      tripId,
      expenseId,
      uploadedAt: new Date().toISOString(),
    },
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Deletes a receipt photo from Firebase Storage if it was removed.
 */
export async function deleteReceiptPhoto(receiptUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, receiptUrl);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn("Could not delete receipt photo from storage:", err);
  }
}

/**
 * Extensible OCR hook for Module 8:
 * Scans a receipt photo to extract the amount and predicted category using AI Gateway.
 * Returns parsed amount in paise and predicted travel category.
 */
export async function extractReceiptDetails(
  _file: File | string
): Promise<{ amountPaise?: number; category?: string; description?: string } | null> {
  // Placeholder ready for Module 8 LLM API Gateway OCR pipeline
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, 500);
  });
}
