import type { Metadata } from "next";
import { PublicConfirmationFlow } from "@/components/confirmation/PublicConfirmationFlow";

export const metadata: Metadata = {
  title: "Xác nhận giao dịch",
  description: "Xác nhận phân loại giao dịch an toàn qua TaxLens.",
  referrer: "no-referrer",
  robots: { index: false, follow: false, nocache: true },
};

export default function ConfirmationPage() {
  return <PublicConfirmationFlow />;
}
