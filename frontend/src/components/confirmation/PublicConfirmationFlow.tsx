"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { TaxLensLogo } from "@/components/brand/TaxLensLogo";
import { Money } from "@/components/domain/Money";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import {
  inspectConfirmation,
  submitConfirmation,
  type ConfirmationClassification,
  type ConfirmationResult,
  type PublicConfirmation,
} from "@/lib/api/public-confirmation";
import { cn } from "@/lib/utils";

const classificationOptions: Array<{
  value: ConfirmationClassification;
  label: string;
  description: string;
}> = [
  { value: "revenue", label: "Doanh thu", description: "Tiền từ bán hàng hoặc cung cấp dịch vụ." },
  { value: "internal_transfer", label: "Chuyển nội bộ", description: "Tiền chuyển giữa các tài khoản của bạn." },
  { value: "loan", label: "Khoản vay", description: "Tiền vay nhận về, không phải doanh thu." },
  { value: "other", label: "Giao dịch khác", description: "Không thuộc ba nhóm trên." },
];

type ViewState =
  | { kind: "loading" }
  | { kind: "valid"; data: PublicConfirmation }
  | { kind: "already"; data: PublicConfirmation }
  | { kind: "confirmed"; result: ConfirmationResult }
  | { kind: "expired" }
  | { kind: "invalid" }
  | { kind: "unavailable"; message: string };

function classificationLabel(value: string | null | undefined) {
  return classificationOptions.find((option) => option.value === value)?.label ?? "Chưa xác định";
}

function formatDate(value: string | null) {
  if (!value) return "Chưa có ngày giao dịch";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div aria-hidden className="absolute -left-24 top-20 -z-10 size-72 rounded-full bg-accent/70 blur-3xl" />
      <div aria-hidden className="absolute -right-28 bottom-0 -z-10 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <TaxLensLogo />
          <span className="inline-flex items-center gap-2 rounded-full border bg-surface/90 px-3 py-2 text-xs font-semibold text-ink">
            <ShieldCheck aria-hidden className="text-success" size={16} /> Liên kết bảo mật
          </span>
        </header>
        {children}
        <p className="mx-auto mt-6 flex max-w-lg items-start justify-center gap-2 text-center text-xs leading-5 text-text-secondary">
          <LockKeyhole aria-hidden className="mt-0.5 shrink-0" size={14} /> TaxLens không yêu cầu đăng nhập, mật khẩu hoặc mã OTP trên trang này.
        </p>
      </div>
    </main>
  );
}

function LoadingConfirmation() {
  return (
    <section role="status" className="surface-shadow mx-auto grid min-h-96 max-w-2xl place-items-center rounded-xl border bg-surface p-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-primary"><RefreshCw aria-hidden className="animate-spin motion-reduce:animate-none" size={23} /></span>
        <h1 className="font-display mt-6 text-3xl text-ink">Đang kiểm tra liên kết</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">TaxLens đang tải đúng giao dịch và thời hạn xác nhận.</p>
      </div>
    </section>
  );
}

function TerminalState({
  icon,
  eyebrow,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="surface-shadow mx-auto max-w-2xl rounded-xl border bg-surface p-7 text-center sm:p-11">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary">{icon}</span>
      <p className="mt-7 text-[13px] font-medium text-text-tertiary">{eyebrow}</p>
      <h1 className="font-display mt-3 text-4xl leading-tight tracking-[-0.03em] text-ink">{title}</h1>
      <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-text-secondary">{description}</p>
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </section>
  );
}

function ConfirmationForm({
  data,
  choice,
  busy,
  error,
  onChoice,
  onSubmit,
}: {
  data: PublicConfirmation;
  choice: ConfirmationClassification | null;
  busy: boolean;
  error: string;
  onChoice: (value: ConfirmationClassification | null) => void;
  onSubmit: () => void;
}) {
  const confidence = data.confidence == null
    ? null
    : Math.round(Math.min(100, Math.max(0, data.confidence <= 1 ? data.confidence * 100 : data.confidence)));
  const allowedOptions = classificationOptions.filter((option) => data.options.includes(option.value));

  return (
    <section className="surface-shadow overflow-hidden rounded-xl border bg-surface">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden bg-brand-navy p-6 text-white sm:p-9">
          <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full border-[32px] border-white/5" />
          <p className="relative text-[13px] font-medium text-white/70">Giao dịch cần xác nhận</p>
          <div className="relative mt-8">
            <p className="text-sm text-white/70">Số tiền nhận</p>
            {data.amount ? <Money value={Number(data.amount)} className="font-display mt-2 text-4xl text-white sm:text-5xl" /> : <p className="font-display mt-2 text-3xl">Chưa có số tiền</p>}
          </div>
          <ul aria-label="Chi tiết giao dịch" className="relative mt-9 grid gap-5 border-t border-white/15 pt-6 text-sm">
            <li className="flex items-start gap-3"><UserRound aria-hidden className="mt-0.5 shrink-0 text-white/65" size={18} /><div><span className="text-xs text-white/65">Người gửi</span><p className="mt-1 text-white">{data.sender_name || "Không có tên người gửi"}</p></div></li>
            <li className="flex items-start gap-3"><CalendarDays aria-hidden className="mt-0.5 shrink-0 text-white/65" size={18} /><div><span className="text-xs text-white/65">Ngày giao dịch</span><p className="mt-1 text-white">{formatDate(data.date)}</p></div></li>
            <li className="flex items-start gap-3"><MessageSquareText aria-hidden className="mt-0.5 shrink-0 text-white/65" size={18} /><div><span className="text-xs text-white/65">Nội dung chuyển khoản</span><p className="mt-1 break-words text-white">{data.raw_note || "Không có nội dung"}</p></div></li>
          </ul>
        </div>

        <div className="p-6 sm:p-9">
          <p className="text-[13px] font-medium text-text-tertiary">Một quyết định ngắn</p>
          <h1 className="font-display mt-3 text-4xl leading-tight tracking-[-0.035em] text-ink">Khoản tiền này là gì?</h1>
          <p className="mt-3 text-[15px] leading-7 text-text-secondary">Chọn đúng bản chất giao dịch. TaxLens sẽ dùng câu trả lời này để làm sạch sổ, không tự thay đổi quyết định của bạn.</p>

          {data.ai_suggestion ? (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary-soft p-4 text-ink">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-primary"><Sparkles aria-hidden size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">TaxLens đề xuất: {classificationLabel(data.ai_suggestion)}</p>
                    {confidence != null ? <span className="rounded-full border bg-surface px-2.5 py-1 font-mono text-xs text-ink">{confidence}% tin cậy</span> : null}
                  </div>
                  {data.suggestion_summary ? <p className="mt-2 text-sm leading-6 text-ink">{data.suggestion_summary}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          <fieldset className="mt-7">
            <legend className="text-sm font-semibold text-ink">Chọn một phân loại</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {allowedOptions.map((option) => {
                const selected = choice === option.value;
                return (
                  <label key={option.value} className={cn("relative cursor-pointer rounded-xl border bg-background p-4 transition-colors hover:border-primary", selected && "border-primary bg-primary-soft ring-2 ring-primary/10") }>
                    <input type="radio" name="classification" value={option.value} checked={selected} onChange={() => onChoice(option.value)} className="sr-only" />
                    <span className="flex items-start justify-between gap-3">
                      <span><strong className="block font-normal text-ink">{option.label}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{option.description}</span></span>
                      <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full border bg-surface text-transparent", selected && "border-primary bg-primary text-white")}><Check size={14} /></span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? <p role="alert" className="mt-4 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p> : null}
            <Button size="lg" className="mt-6 w-full" disabled={!choice || busy} onClick={onSubmit}>
              <CheckCircle2 aria-hidden size={18} /> {busy ? "Đang ghi nhận" : "Xác nhận đề xuất"}
            </Button>
            <button type="button" className="mt-3 w-full text-center text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => onChoice(null)} disabled={busy}>
              Chọn phân loại khác
            </button>
          <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-text-secondary"><Clock3 aria-hidden className="mt-0.5 shrink-0" size={14} /> Liên kết dùng một lần và hết hạn lúc {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(data.expires_at))}.</p>
        </div>
      </div>
    </section>
  );
}

export function PublicConfirmationFlow() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [choice, setChoice] = useState<ConfirmationClassification | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void inspectConfirmation(token).then(
      (data) => {
        if (cancelled) return;
        const suggestion = classificationOptions.find((option) => option.value === data.ai_suggestion && data.options.includes(option.value));
        setChoice(suggestion?.value ?? null);
        setView(data.consumed_at ? { kind: "already", data } : { kind: "valid", data });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 410) setView({ kind: "expired" });
        else if (error instanceof ApiError && [400, 404].includes(error.status)) setView({ kind: "invalid" });
        else setView({ kind: "unavailable", message: error instanceof Error ? error.message : "Không thể kiểm tra liên kết." });
      },
    );
    return () => { cancelled = true; };
  }, [reload, token]);

  function retry() {
    setView({ kind: "loading" });
    setReload((value) => value + 1);
  }

  async function confirm() {
    if (!choice) return;
    setBusy(true);
    setSubmitError("");
    try {
      const result = await submitConfirmation(token, choice);
      setView({ kind: "confirmed", result });
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) setView({ kind: "expired" });
      else if (error instanceof ApiError && [400, 404].includes(error.status)) setView({ kind: "invalid" });
      else setSubmitError(error instanceof Error ? error.message : "Chưa thể ghi nhận lựa chọn. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicFrame>
      {view.kind === "loading" ? <LoadingConfirmation /> : null}
      {view.kind === "valid" ? <ConfirmationForm data={view.data} choice={choice} busy={busy} error={submitError} onChoice={setChoice} onSubmit={confirm} /> : null}
      {view.kind === "already" ? (
        <TerminalState icon={<CheckCircle2 aria-hidden size={28} />} eyebrow="Đã xử lý an toàn" title="Giao dịch này đã được xác nhận" description="Liên kết đã được dùng trước đó. TaxLens giữ nguyên quyết định đầu tiên và không ghi đè khi mở lại." />
      ) : null}
      {view.kind === "confirmed" ? (
        <TerminalState
          icon={<CheckCircle2 aria-hidden className="text-success" size={30} />}
          eyebrow={view.result.status === "ALREADY_CONFIRMED" ? "Quyết định đã tồn tại" : "Đã ghi nhận"}
          title={view.result.status === "ALREADY_CONFIRMED" ? "Giao dịch đã được xác nhận trước đó" : "Cảm ơn bạn đã xác nhận"}
          description={`TaxLens giữ phân loại “${classificationLabel(view.result.classification)}” làm quyết định chính thức cho giao dịch này.`}
        />
      ) : null}
      {view.kind === "expired" ? <TerminalState icon={<Clock3 aria-hidden size={28} />} eyebrow="Liên kết hết hạn" title="Cần một liên kết mới" description="Để bảo vệ dữ liệu giao dịch, liên kết này không còn hiệu lực. Hãy yêu cầu người gửi tạo lại yêu cầu xác nhận." /> : null}
      {view.kind === "invalid" ? <TerminalState icon={<CircleAlert aria-hidden size={28} />} eyebrow="Không thể xác minh" title="Liên kết không hợp lệ" description="Liên kết có thể đã bị thay đổi hoặc không còn tồn tại. TaxLens chưa cập nhật bất kỳ dữ liệu nào." /> : null}
      {view.kind === "unavailable" ? <TerminalState icon={<Banknote aria-hidden size={28} />} eyebrow="Kết nối tạm gián đoạn" title="Chưa tải được giao dịch" description={view.message} action={<Button variant="outline" onClick={retry}><RefreshCw aria-hidden size={16} /> Thử lại</Button>} /> : null}
    </PublicFrame>
  );
}
