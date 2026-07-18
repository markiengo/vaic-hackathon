import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";

const display = Newsreader({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

const ui = localFont({
  src: "./fonts/momo-trust-display.ttf",
  weight: "400",
  variable: "--font-ui",
  display: "swap",
  adjustFontFallback: false,
});

const body = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVariables = `${display.variable} ${ui.variable} ${body.variable} ${mono.variable}`;
