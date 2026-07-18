import { JetBrains_Mono, Momo_Trust_Display, Newsreader } from "next/font/google";

const display = Newsreader({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

const ui = Momo_Trust_Display({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-ui",
  display: "swap",
  adjustFontFallback: false,
});

const mono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVariables = `${display.variable} ${ui.variable} ${mono.variable}`;
