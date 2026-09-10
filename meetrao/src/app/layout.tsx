import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

/* Two families, strictly divided by role.
   Instrument Sans — all product UI, including the machine strings and
     micro-labels. There is no monospace family: see globals.css § --font-mono.
   Instrument Serif — display moments only (never a section heading, never body). */
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Meetrao",
    template: "%s · Meetrao",
  },
  description:
    "Share one link. Guests pick a time you are genuinely free, and every booking gets a Google Meet link on both calendars.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
