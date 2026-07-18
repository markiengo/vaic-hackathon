import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TaxLens",
    template: "%s | TaxLens",
  },
  description: "Dòng tiền khớp. Sổ sách sạch. Vận hành nhẹ.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${fontVariables} light`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
