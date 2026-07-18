import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiShowcase } from "@/components/ui/UiShowcase";

export const metadata: Metadata = { title: "UI Foundation" };

export default function UiPage() {
  if (process.env.NODE_ENV !== "development" && process.env.PLAYWRIGHT_TEST !== "1") notFound();
  return <UiShowcase />;
}
