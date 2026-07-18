"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_PERIOD } from "@/features/ledger/format";

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function reportingPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  return `Tháng ${month}/${year}`;
}

export function useReportingPeriod() {
  const pathname = usePathname();
  const router = useRouter();
  const [period, setPeriodState] = useState(DEMO_PERIOD);

  useEffect(() => {
    function syncFromUrl() {
      const requested = new URLSearchParams(window.location.search).get("period") ?? "";
      setPeriodState(PERIOD_PATTERN.test(requested) ? requested : DEMO_PERIOD);
    }
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function setPeriod(nextPeriod: string) {
    if (!PERIOD_PATTERN.test(nextPeriod)) return;
    setPeriodState(nextPeriod);
    const next = new URLSearchParams(window.location.search);
    next.set("period", nextPeriod);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return { period, periodLabel: reportingPeriodLabel(period), setPeriod };
}
