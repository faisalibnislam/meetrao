import type { Metadata, Viewport } from "next";
import { Instrument_Sans, DM_Mono, Instrument_Serif } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Instrument Sans carries `wdth` and `wght` axes and no optical-size axis, so
// no `opsz` is requested here. Explicit weights rather than the variable face:
// the same four the design uses.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Meetrao — Simple scheduling. Less back-and-forth.",
    template: "%s · Meetrao",
  },
  description:
    "Share one link. Guests pick a time you are genuinely free, and every booking gets a Google Meet link automatically.",
  icons: { icon: "/assets/favicon.png", apple: "/assets/favicon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E7E4DC",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${dmMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
