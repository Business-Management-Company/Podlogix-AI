import type { Metadata } from "next";
import { Anton } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/Satoshi-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/Satoshi-BoldItalic.otf", weight: "700", style: "italic" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Podlogix | One place to create, stream, and grow",
  description:
    "Record or livestream podcasts, broadcast events, conferences, and shows, then turn every moment into content that grows your audience and your business.",
  metadataBase: new URL("https://podlogix.io"),
  openGraph: {
    title: "Podlogix | Your show is a business. Run it like one.",
    description:
      "Your entire streaming business, in one workspace. Free during the beta.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${satoshi.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
