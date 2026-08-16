"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/providers/AuthProvider";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Toaster } from "react-hot-toast";

/**
 * Client-side providers wrapper.
 * Must be a Client Component because AuthProvider and LanguageProvider
 * use Firebase and browser APIs that cannot run during SSR pre-rendering.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(17,24,39,0.95)",
              color: "#f9fafb",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
              borderRadius: "12px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#0d9488", secondary: "#f9fafb" },
            },
            error: {
              iconTheme: { primary: "#f87171", secondary: "#f9fafb" },
            },
          }}
        />
      </LanguageProvider>
    </AuthProvider>
  );
}
