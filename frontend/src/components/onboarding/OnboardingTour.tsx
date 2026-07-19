"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowRight, X } from "lucide-react";
import {
  MerchantAssistantIllustration,
  MerchantDashboardIllustration,
  MerchantTaxReadinessIllustration,
  OpsCasesIllustration,
  OpsComplianceIllustration,
  OpsOverviewIllustration,
} from "./OnboardingIllustrations";

const STORAGE_KEY = "taxlens_onboarding_completed";

type Role = "merchant" | "ops";

interface TourStep {
  title: string;
  description: string;
  Illustration: () => React.ReactNode;
}

const merchantSteps: TourStep[] = [
  {
    title: "Tổng quan",
    description: "Xem tình trạng khớp lệnh, ngoại lệ cần xử lý, và mức sẵn sàng thuế — tất cả trong một màn hình.",
    Illustration: MerchantDashboardIllustration,
  },
  {
    title: "Trợ lý TaxLens",
    description: "Yêu cầu AI xử lý công việc, nhận artifacts có cấu trúc, và phê duyệt những thay đổi quan trọng.",
    Illustration: MerchantAssistantIllustration,
  },
  {
    title: "Sẵn sàng thuế",
    description: "Kiểm tra checklist cuối kỳ, xem gì còn thiếu, và xuất báo cáo khi mọi thứ đã sẵn sàng.",
    Illustration: MerchantTaxReadinessIllustration,
  },
];

const opsSteps: TourStep[] = [
  {
    title: "Tổng quan vận hành",
    description: "Giám sát sức khỏe danh mục merchant, xem cases cần chú ý, và agent runs đang chạy.",
    Illustration: OpsOverviewIllustration,
  },
  {
    title: "Cases",
    description: "Xử lý cases được escalate từ merchant, xem evidence, và ghi nhận quyết định có audit.",
    Illustration: OpsCasesIllustration,
  },
  {
    title: "Tuân thủ",
    description: "Quản lý rule versions, xem nguồn tham chiếu, và đảm bảo báo cáo luôn có thể tái lập.",
    Illustration: OpsComplianceIllustration,
  },
];

export function OnboardingTour({ role }: { role: Role }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        const timer = window.setTimeout(() => setVisible(true), 400);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
  }, []);

  const next = useCallback(() => {
    setStep((prev) => {
      if (prev >= steps.length - 1) {
        dismiss();
        return prev;
      }
      return prev + 1;
    });
  }, [dismiss]);

  const skip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skip();
      } else if (e.key === "ArrowRight") {
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, skip, next]);

  const steps = role === "merchant" ? merchantSteps : opsSteps;

  if (!mounted || !visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Illustration = current.Illustration;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="animate-tour-backdrop-in absolute inset-0 bg-black/60" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="animate-tour-card-in surface-shadow-lg relative grid w-full max-w-2xl overflow-hidden rounded-2xl border bg-surface md:grid-cols-2"
      >
        <button
          type="button"
          onClick={skip}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-xl text-text-tertiary transition-colors hover:bg-neutral-soft hover:text-ink"
          aria-label="Bỏ qua hướng dẫn"
        >
          <X size={18} />
        </button>

        {/* Illustration panel */}
        <div className="relative hidden min-h-[280px] border-b border-border bg-neutral-soft md:border-b-0 md:border-r">
          <div key={step} className="animate-tour-slide-in h-full">
            <Illustration />
          </div>
        </div>

        {/* Mobile illustration */}
        <div className="border-b border-border bg-neutral-soft md:hidden">
          <div key={step} className="animate-tour-slide-in min-h-[180px]">
            <Illustration />
          </div>
        </div>

        {/* Content panel */}
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <h3 id="onboarding-title" className="font-display mt-4 text-2xl leading-tight tracking-[-0.02em] text-ink">
            {current.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{current.description}</p>

          <div className="mt-auto pt-6">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-border-strong"}`}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={skip}
                className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={next}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.97]"
              >
                {isLast ? "Bắt đầu" : "Tiếp tục"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
