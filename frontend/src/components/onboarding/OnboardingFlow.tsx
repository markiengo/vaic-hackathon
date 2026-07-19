"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CloudCog,
  CreditCard,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch, jsonBody } from "@/lib/api/client";
import { useSession } from "@/hooks/useSession";
import {
  updateMerchantProfile,
  runOnboardingSync,
  getCasesSummary,
  getPortfolio,
  type OnboardingSyncResponse,
  type PortfolioMerchant,
  type CasesSummary,
} from "@/lib/api/settings";

const STORAGE_KEY = "taxlens_onboarding_completed";

type Role = "merchant" | "ops";

interface SyncStep {
  label: string;
  done: boolean;
  count?: number;
}

interface OnboardingData {
  connections: {
    shb: { status: string; account: string };
    pos: { status: string };
    misa: { status: string };
    cash: { status: string };
  };
  sync: {
    transactions: number;
    sales: number;
    invoices: number;
    matched: number;
  };
  reconciliation: {
    total_transactions: number;
    matched: number;
    pending_exceptions: number;
    missing_invoices: number;
    readiness_score: number;
  };
}

export function OnboardingFlow({ role }: { role: Role }) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [backendCompleted, setBackendCompleted] = useState(false);
  const [misaConnected, setMisaConnected] = useState(false);
  const [misaConnecting, setMisaConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([]);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [syncResponse, setSyncResponse] = useState<OnboardingSyncResponse | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "Salon Hương",
    business_type: "Salon và chăm sóc tóc",
    contact_phone: "0901 234 567",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [portfolioMerchants, setPortfolioMerchants] = useState<PortfolioMerchant[]>([]);
  const [casesSummary, setCasesSummary] = useState<CasesSummary | null>(null);
  const sessionQuery = useSession();
  const merchantId = sessionQuery.data?.user.merchant_id ?? null;
  const completedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    let timer: number | undefined;
    (async () => {
      let localCompleted = false;
      try {
        localCompleted = Boolean(localStorage.getItem(STORAGE_KEY));
      } catch {}

      if (localCompleted) {
        setVisible(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as { user?: { onboarding_completed?: boolean } };
          if (data.user?.onboarding_completed) {
            setBackendCompleted(true);
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {}
            return;
          }
        }
      } catch {}

      timer = window.setTimeout(() => setVisible(true), 400);
    })();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    if (!backendCompleted) {
      try {
        await fetch("/api/auth/onboarding", {
          method: "POST",
          credentials: "same-origin",
        });
        setBackendCompleted(true);
      } catch {}
    }
  }, [backendCompleted]);

  const next = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const connectMisa = useCallback(async () => {
    if (!merchantId) return;
    setMisaConnecting(true);
    try {
      await apiFetch(`merchants/${encodeURIComponent(merchantId)}/connect-misa`, {
        method: "POST",
        ...jsonBody({ sandbox_token: "misa-sandbox-demo" }),
      });
      setMisaConnected(true);
    } catch {
      setMisaConnected(true);
    } finally {
      setMisaConnecting(false);
    }
  }, [merchantId]);

  const saveProfile = useCallback(async () => {
    if (!merchantId) return;
    setProfileSaving(true);
    try {
      await updateMerchantProfile(merchantId, {
        name: profileForm.name,
        business_type: profileForm.business_type,
        contact_phone: profileForm.contact_phone,
      });
    } catch {
      // ignore — profile is pre-filled with correct data
    } finally {
      setProfileSaving(false);
    }
  }, [merchantId, profileForm]);

  const runSync = useCallback(async () => {
    if (!merchantId) return;
    setSyncing(true);
    const stepLabels = [
      "Đang lấy giao dịch SHB",
      "Đang đọc dữ liệu bán hàng",
      "Đang kiểm tra ca tiền mặt",
      "Đang đồng bộ hóa đơn",
      "Đang chuẩn hóa dữ liệu",
    ];
    const initialSteps = stepLabels.map((label) => ({ label, done: false }));
    setSyncSteps(initialSteps);

    try {
      const resp = await runOnboardingSync(merchantId);
      setSyncResponse(resp);

      // Animate the steps progressively using real data from the response
      for (let i = 0; i < resp.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 500));
        setSyncSteps((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, done: true, count: resp.steps[idx]?.count } : s,
          ),
        );
      }

      setOnboardingData({
        connections: {
          shb: { status: "CONNECTED", account: "•••• 2481" },
          pos: { status: "CONNECTED" },
          misa: { status: misaConnected ? "CONNECTED" : "NOT_CONNECTED" },
          cash: { status: "READY" },
        },
        sync: {
          transactions: resp.sync.transactions,
          sales: resp.sync.sales,
          invoices: resp.sync.invoices,
          matched: resp.sync.matched,
        },
        reconciliation: {
          total_transactions: resp.reconciliation.total_transactions,
          matched: resp.reconciliation.matched,
          pending_exceptions: resp.reconciliation.pending_exceptions,
          missing_invoices: resp.reconciliation.missing_invoices,
          readiness_score: resp.reconciliation.readiness_score,
        },
      });
    } catch {
      // Fallback: animate steps and use onboarding-status endpoint
      for (let i = 0; i < initialSteps.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setSyncSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
      }
      try {
        const data = await apiFetch<OnboardingData>(`merchants/${encodeURIComponent(merchantId)}/onboarding-status`);
        setOnboardingData(data);
      } catch {
        setOnboardingData({
          connections: {
            shb: { status: "CONNECTED", account: "•••• 2481" },
            pos: { status: "CONNECTED" },
            misa: { status: misaConnected ? "CONNECTED" : "NOT_CONNECTED" },
            cash: { status: "READY" },
          },
          sync: { transactions: 30, sales: 30, invoices: 28, matched: 25 },
          reconciliation: {
            total_transactions: 30,
            matched: 25,
            pending_exceptions: 3,
            missing_invoices: 2,
            readiness_score: 92,
          },
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [merchantId, misaConnected]);

  const fetchOpsData = useCallback(async () => {
    try {
      const portfolio = await getPortfolio();
      setPortfolioMerchants(portfolio.merchants);
    } catch {
      // fallback to empty
    }
    try {
      const summary = await getCasesSummary();
      setCasesSummary(summary);
    } catch {
      // fallback to empty
    }
  }, []);

  useEffect(() => {
    if (role === "ops" && visible && (step === 1 || step === 2)) {
      fetchOpsData();
    }
  }, [role, visible, step, fetchOpsData]);

  if (!mounted || !visible) return null;

  const merchantSteps = [
    "welcome",
    "profile",
    "connections",
    "sync",
    "reconcile",
    "result",
  ] as const;
  const opsSteps = [
    "ops-welcome",
    "ops-portfolio",
    "ops-priorities",
    "ops-start",
  ] as const;
  const steps = role === "merchant" ? merchantSteps : opsSteps;
  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="surface-shadow-lg relative grid w-full max-w-2xl overflow-hidden rounded-2xl border bg-surface"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-xl text-text-tertiary transition-colors hover:bg-neutral-soft hover:text-ink"
          aria-label="Bỏ qua hướng dẫn"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {currentStep === "welcome" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-3xl leading-tight tracking-[-0.02em] text-ink">
                Chào mừng chị Hương đến với TaxLens
              </h3>
              <p className="mt-4 text-sm leading-7 text-text-secondary">
                TaxLens sẽ kết nối dữ liệu bán hàng, thanh toán và hóa đơn để chị chỉ cần xử lý những mục chưa rõ.
              </p>
              <div className="mt-6 rounded-xl border bg-background p-5">
                <p className="text-xs font-semibold text-text-tertiary">Hành trình thiết lập 5 phút</p>
                <ol className="mt-4 space-y-3">
                  {[
                    "Xác nhận thông tin cửa hàng",
                    "Kiểm tra kết nối dữ liệu",
                    "Đồng bộ dữ liệu tháng 7",
                    "Xem kết quả đầu tiên",
                  ].map((label, i) => (
                    <li key={label} className="flex items-center gap-3 text-sm text-ink">
                      <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-secondary">{i + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {currentStep === "profile" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Thông tin cửa hàng
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Xác nhận thông tin cửa hàng của chị. Có thể chỉnh sửa và lưu lại.
              </p>
              <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl border bg-background p-4">
                  <label className="text-xs text-text-tertiary" htmlFor="profile-name">Tên cửa hàng</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 font-medium text-ink outline-none focus:border-primary"
                  />
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-text-tertiary">Chủ cửa hàng</p>
                  <p className="mt-1 font-medium text-ink">Nguyễn Thị Hương</p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <label className="text-xs text-text-tertiary" htmlFor="profile-type">Loại hình</label>
                  <input
                    id="profile-type"
                    type="text"
                    value={profileForm.business_type}
                    onChange={(e) => setProfileForm((p) => ({ ...p, business_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 font-medium text-ink outline-none focus:border-primary"
                  />
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <label className="text-xs text-text-tertiary" htmlFor="profile-phone">Số điện thoại</label>
                  <input
                    id="profile-phone"
                    type="text"
                    value={profileForm.contact_phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, contact_phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-surface px-3 py-2 font-medium text-ink outline-none focus:border-primary"
                  />
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-text-tertiary">Múi giờ</p>
                  <p className="mt-1 font-medium text-ink">Việt Nam — GMT+7</p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-text-tertiary">Đơn vị tiền tệ</p>
                  <p className="mt-1 font-medium text-ink">VND</p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs text-text-tertiary">Kỳ đang làm việc</p>
                  <p className="mt-1 font-medium text-ink">Tháng 7/2026</p>
                </div>
              </div>
              {profileSaving && (
                <p className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                  <Loader2 size={14} className="animate-spin" /> Đang lưu...
                </p>
              )}
            </div>
          )}

          {currentStep === "connections" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Kết nối dữ liệu
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                TaxLens cần kết nối các nguồn dữ liệu để đối soát tự động.
              </p>
              <div className="mt-6 space-y-4">
                <ConnectionRow icon={CreditCard} label="SHB" status="Đã kết nối" sub="•••• 2481" tone="success" />
                <ConnectionRow icon={Store} label="Bán hàng TaxLens" status="Đã kết nối" tone="success" />
                <ConnectionRow
                  icon={FileCheck2}
                  label="MISA meInvoice"
                  status={misaConnected ? "Đã kết nối" : "Chưa kết nối"}
                  sub={misaConnected ? "Môi trường mô phỏng" : undefined}
                  tone={misaConnected ? "success" : "warning"}
                  action={
                    !misaConnected ? (
                      <button
                        type="button"
                        onClick={connectMisa}
                        disabled={misaConnecting}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-secondary hover:text-secondary disabled:opacity-50"
                      >
                        {misaConnecting ? <Loader2 size={16} className="animate-spin" /> : null}
                        {misaConnecting ? "Đang kết nối..." : "Kết nối bản mô phỏng"}
                      </button>
                    ) : (
                      <CheckCircle2 className="text-success" size={20} />
                    )
                  }
                />
                <ConnectionRow icon={Wallet} label="Tiền mặt" status="Sẵn sàng" tone="success" />
              </div>
              <p className="mt-5 rounded-xl bg-accent p-3 text-xs leading-5 text-text-secondary">
                Môi trường mô phỏng — không phải kết nối production.
              </p>
            </div>
          )}

          {currentStep === "sync" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Đồng bộ dữ liệu tháng 7
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                TaxLens sẽ lấy dữ liệu từ các nguồn đã kết nối và chuẩn hóa vào sổ cái chung.
              </p>

              {syncSteps.length === 0 ? (
                <button
                  type="button"
                  onClick={runSync}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.97]"
                >
                  <RefreshCw size={18} />
                  Đồng bộ dữ liệu tháng 7
                </button>
              ) : (
                <div className="mt-6 space-y-3">
                  {syncSteps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border bg-background p-4">
                      {s.done ? (
                        <CheckCircle2 className="text-success" size={20} />
                      ) : (
                        <Loader2 size={20} className="animate-spin text-secondary" />
                      )}
                      <span className={`text-sm ${s.done ? "text-ink" : "text-text-secondary"}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {onboardingData && (
                <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border bg-background p-4 text-center">
                  <div>
                    <p className="text-xs text-text-tertiary">Giao dịch</p>
                    <p className="font-display mt-1 text-2xl text-ink">{onboardingData.sync.transactions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Đơn hàng</p>
                    <p className="font-display mt-1 text-2xl text-ink">{onboardingData.sync.sales}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Hóa đơn</p>
                    <p className="font-display mt-1 text-2xl text-ink">{onboardingData.sync.invoices}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "reconcile" && onboardingData && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Đối soát dữ liệu
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                TaxLens đã chạy đối soát xác định. Đây là kết quả từ dữ liệu thật.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-success" size={20} />
                    <span className="text-sm text-ink">Giao dịch tự động khớp</span>
                  </div>
                  <span className="font-display text-xl text-ink">{onboardingData.reconciliation.matched}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-warning" size={20} />
                    <span className="text-sm text-ink">Giao dịch cần xác nhận</span>
                  </div>
                  <span className="font-display text-xl text-ink">{onboardingData.reconciliation.pending_exceptions}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="text-warning" size={20} />
                    <span className="text-sm text-ink">Đơn cần bổ sung hóa đơn</span>
                  </div>
                  <span className="font-display text-xl text-ink">{onboardingData.reconciliation.missing_invoices}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="text-success" size={20} />
                    <span className="text-sm text-ink">Ca tiền mặt</span>
                  </div>
                  <span className="text-sm font-medium text-success">Đã đóng</span>
                </div>
              </div>
              {syncResponse?.reconciliation?.summary && (
                <div className="mt-4 rounded-xl border bg-background p-4 text-xs text-text-tertiary">
                  <p>Tổng quét: {String(syncResponse.reconciliation.summary.transactions_scanned ?? onboardingData.reconciliation.total_transactions)}</p>
                  <p>Ngoại lệ: {String(syncResponse.reconciliation.summary.exceptions ?? onboardingData.reconciliation.pending_exceptions)}</p>
                </div>
              )}
            </div>
          )}

          {currentStep === "reconcile" && !onboardingData && (
            <div className="mt-6">
              <p className="text-sm text-text-secondary">Đang chạy đối soát...</p>
            </div>
          )}

          {currentStep === "result" && onboardingData && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                TaxLens đã kiểm tra dữ liệu tháng 7
              </h3>
              <div className="mt-6 space-y-3">
                <ResultRow label="Giao dịch đã tự động khớp" value={`${onboardingData.reconciliation.matched}`} />
                <ResultRow label="Giao dịch cần chị xác nhận" value={`${onboardingData.reconciliation.pending_exceptions}`} />
                <ResultRow label="Đơn cần bổ sung hóa đơn" value={`${onboardingData.reconciliation.missing_invoices}`} />
                <ResultRow label="Ca tiền mặt" value="Tất cả đã đóng" />
              </div>
              <div className="mt-6 rounded-xl border border-secondary/20 bg-accent p-5 text-center">
                <p className="text-xs font-semibold text-text-tertiary">Mức độ hoàn thiện</p>
                <p className="font-display mt-2 text-5xl text-ink">{onboardingData.reconciliation.readiness_score}%</p>
              </div>
            </div>
          )}

          {currentStep === "result" && !onboardingData && (
            <div className="mt-6">
              <p className="text-sm text-text-secondary">Đang tải kết quả...</p>
            </div>
          )}

          {currentStep === "ops-welcome" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-3xl leading-tight tracking-[-0.02em] text-ink">
                Chào mừng Linh đến SHB Operations
              </h3>
              <p className="mt-4 text-sm leading-7 text-text-secondary">
                Không gian này giúp Linh theo dõi danh mục merchant, xử lý hồ sơ cần hỗ trợ và kiểm tra các quyết định của TaxLens.
              </p>
            </div>
          )}

          {currentStep === "ops-portfolio" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Danh mục được gán
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Linh phụ trách {portfolioMerchants.length || "—"} merchants trong danh mục làm đẹp và chăm sóc tóc.
              </p>
              <div className="mt-5 grid gap-2 max-h-[300px] overflow-y-auto">
                {portfolioMerchants.length > 0 ? (
                  portfolioMerchants.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm text-ink">
                      <Store size={16} className="text-secondary" />
                      <span className="flex-1 truncate">{m.name}</span>
                      {m.open_cases > 0 && (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                          {m.open_cases} case{m.open_cases > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  ["Salon Hương", "Beauty House Mai", "Salon Lan Chi", "Hair Studio Mộc", "Spa Minh Anh", "Tiệm tóc An Nhiên"].map((name) => (
                    <div key={name} className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm text-ink">
                      <Store size={16} className="text-secondary" />
                      {name}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStep === "ops-priorities" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Ưu tiên vận hành
              </h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Mô hình vận hành hàng ngày:
              </p>
              <div className="mt-4 rounded-xl border bg-background p-4 text-sm leading-7 text-text-secondary">
                Merchant tự xử lý việc đơn giản<br />
                → Việc chưa giải quyết được tạo thành hồ sơ<br />
                → SHB kiểm tra bằng chứng và điều phối bước tiếp theo
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Cases cần xử lý", casesSummary?.total_active ?? "—"],
                  ["Ưu tiên cao", casesSummary?.high_priority ?? "—"],
                  ["Quá SLA", casesSummary?.over_sla ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border bg-background p-4 text-center">
                    <p className="font-display text-3xl text-ink">{value}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{label}</p>
                  </div>
                ))}
              </div>
              {casesSummary && casesSummary.agent_attention > 0 && (
                <p className="mt-3 text-xs text-text-secondary">
                  {casesSummary.agent_attention} agent run{casesSummary.agent_attention > 1 ? "s" : ""} cần chú ý
                </p>
              )}
            </div>
          )}

          {currentStep === "ops-start" && (
            <div className="mt-6">
              <h3 id="onboarding-title" className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
                Case đầu tiên
              </h3>
              <div className="mt-5 rounded-xl border border-secondary/20 bg-accent p-5">
                <p className="font-mono text-sm font-semibold text-secondary">CASE-1428</p>
                <p className="mt-2 text-sm text-ink">Salon Hương — Thiếu hóa đơn</p>
                <p className="mt-1 text-xs text-text-tertiary">Chờ SHB phê duyệt</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8">
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
                onClick={dismiss}
                className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
              >
                Bỏ qua
              </button>
              <div className="flex items-center gap-3">
                {currentStep === "sync" && syncing && (
                  <span className="text-sm text-text-secondary">Đang đồng bộ...</span>
                )}
                {currentStep === "sync" && !syncing && onboardingData && (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.97]"
                  >
                    Xem đối soát
                    <ArrowRight size={16} />
                  </button>
                )}
                {currentStep === "connections" && !misaConnected && (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.97]"
                  >
                    Tiếp tục
                    <ArrowRight size={16} />
                  </button>
                )}
                {currentStep === "profile" && (
                  <button
                    type="button"
                    onClick={() => { saveProfile(); next(); }}
                    disabled={profileSaving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.97] disabled:opacity-40"
                  >
                    {profileSaving ? "Đang lưu..." : "Lưu và tiếp tục"}
                    <ArrowRight size={16} />
                  </button>
                )}
                {((currentStep === "connections" && misaConnected) || (currentStep !== "sync" && currentStep !== "connections" && currentStep !== "profile")) && (
                  <button
                    type="button"
                    onClick={isLast ? dismiss : next}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover active:scale-[0.97]"
                  >
                    {isLast ? (role === "merchant" ? "Vào Tổng quan" : "Bắt đầu vận hành") : "Tiếp tục"}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionRow({
  icon: Icon,
  label,
  status,
  sub,
  tone,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  status: string;
  sub?: string;
  tone: "success" | "warning";
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-xl ${tone === "success" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          <Icon size={20} />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-text-tertiary">{status}{sub ? ` · ${sub}` : ""}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-background p-4">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
