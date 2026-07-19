"use client";

import { useRef, useState, type DragEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  Building2,
  CheckCircle2,
  CloudCog,
  FileCheck2,
  FileSpreadsheet,
  Laptop,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UploadCloud,
} from "lucide-react";
import { Money } from "@/components/domain/Money";
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api/client";
import {
  getIntegrationStatus,
  getMerchantProfile,
  importLedger,
  settingsQueryKeys,
  syncSepay,
  type ImportPreviewRow,
  type IntegrationSyncStatus,
  type LedgerImportResult,
} from "@/lib/api/settings";
import { cn } from "@/lib/utils";

const currentPeriod = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
}).format(new Date());

const themes = [
  { value: "light", label: "Sáng", description: "Nền giấy sáng, độ tương phản rõ.", icon: Sun },
  { value: "dark", label: "Tối", description: "Dịu mắt khi làm việc buổi tối.", icon: Moon },
  { value: "system", label: "Theo thiết bị", description: "Tự đổi theo hệ điều hành.", icon: Laptop },
] as const;

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

function syncTone(status: IntegrationSyncStatus | undefined): "success" | "warning" | "danger" | "neutral" {
  if (status === "COMPLETED") return "success";
  if (status === "PARTIAL" || status === "RUNNING" || status === "PENDING") return "warning";
  if (status === "FAILED" || status === "CANCELLED") return "danger";
  return "neutral";
}

function ImportResult({ result }: { result: LedgerImportResult }) {
  const columns: DataTableColumn<ImportPreviewRow>[] = [
    { key: "row", header: "Dòng", primary: true, cell: (row) => `#${row.row_number}` },
    { key: "date", header: "Ngày", cell: (row) => row.date },
    { key: "sender", header: "Người gửi", cell: (row) => row.sender || "—" },
    { key: "note", header: "Nội dung", cell: (row) => row.note || "—", hideOnMobile: true },
    { key: "amount", header: "Số tiền", align: "right", cell: (row) => <Money value={Number(row.amount)} /> },
  ];

  return (
    <div className="grid gap-5" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Tổng dòng", result.total_rows],
          ["Hợp lệ", result.valid_rows],
          ["Lỗi", result.rejected_rows],
          ["Đã nhập", result.imported_rows],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-background p-4">
            <p className="text-[13px] font-medium text-text-tertiary">{label}</p>
            <p className="font-display mt-2 text-3xl text-ink">{value}</p>
          </div>
        ))}
      </div>

      {result.preview.length ? (
        <DataTable caption="Xem trước dữ liệu sao kê" columns={columns} rows={result.preview} getRowKey={(row) => row.row_number} />
      ) : null}

      {result.errors.length ? (
        <div className="rounded-xl border border-danger/25 bg-danger/5 p-4">
          <h3 className="font-semibold text-ink">Dòng cần sửa trước khi nhập</h3>
          <ul className="mt-3 grid gap-2 text-sm text-text-secondary">
            {result.errors.slice(0, 8).map((error) => (
              <li key={`${error.row_number}:${error.reason}`} className="flex gap-3">
                <span className="font-mono text-danger">#{error.row_number}</span>
                <span>{error.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsWorkspace() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const sessionQuery = useSession();
  const merchantId = sessionQuery.data?.user.merchant_id ?? null;
  const [syncPeriod, setSyncPeriod] = useState(currentPeriod);
  const [accountNumber, setAccountNumber] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const syncKey = useRef<string | null>(null);
  const [reportingPeriod, setReportingPeriod] = useState(currentPeriod);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<LedgerImportResult | null>(null);

  const merchantQuery = useQuery({
    queryKey: settingsQueryKeys.merchant(merchantId ?? "none"),
    queryFn: () => getMerchantProfile(merchantId!),
    enabled: Boolean(merchantId),
  });
  const integrationQuery = useQuery({
    queryKey: settingsQueryKeys.integration(merchantId ?? "none"),
    queryFn: () => getIntegrationStatus(merchantId!),
    enabled: Boolean(merchantId),
  });

  function chooseFile(next: File | null) {
    setImportResult(null);
    setFileError("");
    if (!next) {
      setFile(null);
      return;
    }
    const extension = next.name.split(".").at(-1)?.toLowerCase();
    if (!extension || !["csv", "xlsx"].includes(extension)) {
      setFile(null);
      setFileError("Chỉ nhận file CSV hoặc XLSX.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setFile(null);
      setFileError("File vượt quá giới hạn 5 MB.");
      return;
    }
    setFile(next);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files.item(0));
  }

  async function runSync() {
    if (!merchantId) return;
    syncKey.current ??= `sepay:${crypto.randomUUID()}`;
    setSyncBusy(true);
    try {
      const run = await syncSepay(merchantId, syncPeriod, accountNumber, syncKey.current);
      queryClient.setQueryData(settingsQueryKeys.integration(merchantId), {
        merchant_id: merchantId,
        provider: "SEPAY",
        configured: true,
        latest_run: run,
      });
      syncKey.current = null;
      toast({
        title: run.status === "COMPLETED" ? "Đồng bộ SePay hoàn tất" : "Đồng bộ hoàn tất một phần",
        description: `${run.records_inserted} giao dịch mới, ${run.records_skipped} dòng đã có.`,
        tone: run.status === "COMPLETED" ? "success" : "info",
      });
    } catch (error) {
      toast({ title: "Chưa thể đồng bộ SePay", description: errorMessage(error), tone: "danger" });
    } finally {
      setSyncBusy(false);
    }
  }

  async function submitImport(commit: boolean) {
    if (!merchantId || !file) return;
    setImportBusy(true);
    try {
      const result = await importLedger(merchantId, reportingPeriod, file, commit);
      setImportResult(result);
      if (commit) {
        toast({
          title: result.status === "COMPLETED" ? "Đã nhập sao kê" : "Sao kê được nhập một phần",
          description: `${result.imported_rows} giao dịch mới đã vào sổ.`,
          tone: result.status === "COMPLETED" ? "success" : "info",
        });
      }
    } catch (error) {
      toast({ title: commit ? "Chưa thể nhập sao kê" : "Không đọc được sao kê", description: errorMessage(error), tone: "danger" });
    } finally {
      setImportBusy(false);
    }
  }

  if (sessionQuery.isLoading) return <LoadingState label="Đang mở cài đặt" />;
  if (!merchantId) return <ErrorState title="Không có merchant workspace" description="Tài khoản này chưa được gắn với cửa hàng để quản lý cài đặt." />;

  const profile = merchantQuery.data;
  const integration = integrationQuery.data;
  const latestRun = integration?.latest_run;
  const importFinished = importResult?.status === "COMPLETED" || importResult?.status === "PARTIAL";

  return (
    <div className="grid gap-7 animate-[route-in_220ms_ease-out]">
      <PageHeader
        eyebrow="Tài khoản & kết nối"
        merchant={profile?.name}
        title="Cài đặt"
        subtitle="Một nơi để kiểm tra hồ sơ cửa hàng, chọn giao diện và kiểm soát dữ liệu đi vào TaxLens."
      />

      <section aria-labelledby="appearance-title">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-accent text-secondary"><Sun aria-hidden size={18} /></span>
          <div><h2 id="appearance-title" className="font-display text-2xl text-ink">Giao diện</h2><p className="text-sm text-text-secondary">Chọn cách TaxLens hiển thị trên thiết bị này.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(option.value)}
                className={cn("surface-lift rounded-xl border bg-surface p-5 text-left transition-[border-color,transform,box-shadow] hover:-translate-y-0.5", selected && "border-secondary ring-2 ring-secondary/15")}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-background text-secondary"><Icon aria-hidden size={18} /></span>
                  {selected ? <CheckCircle2 aria-hidden className="text-success" size={20} /> : null}
                </span>
                <strong className="mt-5 block font-normal text-ink">{option.label}</strong>
                <span className="mt-1 block text-sm leading-6 text-text-secondary">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-secondary/20">
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-11 place-items-center rounded-full bg-surface text-secondary"><Building2 aria-hidden size={21} /></span>
            {profile ? <Badge tone={profile.status === "ACTIVE" ? "success" : "warning"}>{profile.status}</Badge> : null}
          </div>
          <p className="mt-6 text-[13px] font-medium text-text-tertiary">Hồ sơ cửa hàng</p>
          {merchantQuery.isLoading ? <div className="mt-4"><LoadingState label="Đang tải hồ sơ" /></div> : null}
          {merchantQuery.isError ? <div className="mt-4"><ErrorState compact title="Không tải được hồ sơ" description="Thông tin pháp lý đang tạm gián đoạn." retry={() => merchantQuery.refetch()} /></div> : null}
          {profile ? (
            <>
              <h2 className="font-display mt-2 text-3xl text-ink">{profile.name}</h2>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-text-secondary">Mã số thuế</dt><dd className="font-mono mt-1 text-ink">{profile.tax_id || "Chưa cập nhật"}</dd></div>
                <div><dt className="text-text-secondary">Loại hình</dt><dd className="mt-1 text-ink">{profile.business_category || profile.business_type}</dd></div>
                <div><dt className="text-text-secondary">Điện thoại</dt><dd className="mt-1 text-ink">{profile.contact_phone || "Chưa cập nhật"}</dd></div>
                <div><dt className="text-text-secondary">Email</dt><dd className="mt-1 break-all text-ink">{profile.contact_email || "Chưa cập nhật"}</dd></div>
              </dl>
              <p className="mt-6 flex items-start gap-2 border-t pt-4 text-xs leading-5 text-text-secondary"><ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-success" size={16} />Thông tin pháp lý được quản trị viên TaxLens kiểm soát để tránh sửa nhầm dữ liệu kê khai.</p>
            </>
          ) : null}
        </Card>

        <Card variant="workspace">
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-11 place-items-center rounded-full bg-accent text-secondary"><CloudCog aria-hidden size={21} /></span>
            {integration ? <Badge tone={integration.configured ? syncTone(latestRun?.status) : "warning"}>{integration.configured ? (latestRun?.status ?? "ĐÃ KẾT NỐI") : "CHƯA CẤU HÌNH"}</Badge> : null}
          </div>
          <p className="mt-6 text-[13px] font-medium text-text-tertiary">Kết nối ngân hàng</p>
          <h2 className="font-display mt-2 text-3xl text-ink">SePay</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Token SePay được giữ ở backend. Trình duyệt chỉ có thể kiểm tra trạng thái và yêu cầu đồng bộ.</p>
          {integrationQuery.isLoading ? <div className="mt-5"><LoadingState label="Đang kiểm tra SePay" /></div> : null}
          {integrationQuery.isError ? <div className="mt-5"><ErrorState compact title="Không kiểm tra được kết nối" description="Trạng thái SePay đang tạm gián đoạn." retry={() => integrationQuery.refetch()} /></div> : null}
          {integration ? (
            <>
              {latestRun ? (
                <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl border bg-background p-4 text-center">
                  <div><dt className="text-xs text-text-secondary">Nhận</dt><dd className="font-display mt-1 text-2xl">{latestRun.records_received}</dd></div>
                  <div><dt className="text-xs text-text-secondary">Mới</dt><dd className="font-display mt-1 text-2xl">{latestRun.records_inserted}</dd></div>
                  <div><dt className="text-xs text-text-secondary">Bỏ qua</dt><dd className="font-display mt-1 text-2xl">{latestRun.records_skipped}</dd></div>
                </dl>
              ) : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Kỳ đồng bộ" type="month" value={syncPeriod} onChange={(event) => setSyncPeriod(event.target.value)} />
                <Field label="Số tài khoản" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Không bắt buộc" inputMode="numeric" maxLength={20} />
              </div>
              <Button className="mt-5 w-full" disabled={!integration.configured || syncBusy || !syncPeriod} onClick={runSync}>
                <RefreshCw aria-hidden className={cn(syncBusy && "animate-spin motion-reduce:animate-none")} size={17} />
                {syncBusy ? "Đang đồng bộ" : "Đồng bộ SePay ngay"}
              </Button>
              {!integration.configured ? <p className="mt-3 text-xs leading-5 text-warning">Cần cấu hình `SEPAY_API_TOKEN` trên backend trước khi đồng bộ thật.</p> : null}
            </>
          ) : null}
        </Card>
      </div>

      <Card variant="workspace" aria-labelledby="import-title">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-secondary"><FileSpreadsheet aria-hidden size={21} /></span>
            <div><p className="text-[13px] font-medium text-text-tertiary">Nguồn dữ liệu</p><h2 id="import-title" className="font-display mt-1 text-3xl text-ink">Nhập sao kê</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Kiểm tra CSV/XLSX trước, xem từng dòng lỗi, rồi mới xác nhận ghi vào sổ giao dịch.</p></div>
          </div>
          {importResult ? <Badge tone={importResult.rejected_rows ? "warning" : "success"}>{importResult.status}</Badge> : null}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
          <div
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn("grid min-h-48 place-items-center rounded-xl border border-dashed bg-background p-6 text-center transition-colors", dragging && "border-secondary bg-accent")}
          >
            <div>
              <UploadCloud aria-hidden className="mx-auto text-secondary" size={32} />
              <p className="mt-4 font-semibold text-ink">Kéo file sao kê vào đây</p>
              <p className="mt-1 text-sm text-text-secondary">CSV hoặc XLSX, tối đa 5 MB</p>
              <label htmlFor="ledger-file" className="mt-5 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-secondary hover:text-secondary">
                Chọn file sao kê
              </label>
              <input id="ledger-file" aria-label="Chọn file sao kê" type="file" accept=".csv,.xlsx" className="sr-only" onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)} />
            </div>
          </div>
          <div className="grid content-start gap-4">
            <Field label="Kỳ dữ liệu" type="month" value={reportingPeriod} onChange={(event) => setReportingPeriod(event.target.value)} />
            <div className={cn("rounded-xl border p-4", file ? "border-success/25 bg-success/5" : "bg-background") }>
              <p className="text-[13px] font-medium text-text-tertiary">File đã chọn</p>
              <p className="mt-2 break-all text-sm text-ink">{file?.name ?? "Chưa có file"}</p>
              {file ? <p className="mt-1 text-xs text-text-secondary">{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(file.size / 1024)} KB</p> : null}
            </div>
            {fileError ? <p role="alert" className="text-sm text-danger">{fileError}</p> : null}
            <Button variant="outline" disabled={!file || importBusy || !reportingPeriod} onClick={() => submitImport(false)}>
              <FileCheck2 aria-hidden size={17} /> {importBusy && !importResult ? "Đang kiểm tra" : "Kiểm tra dữ liệu"}
            </Button>
            <Button disabled={!file || importBusy || !importResult?.valid_rows || importFinished} onClick={() => submitImport(true)}>
              <UploadCloud aria-hidden size={17} /> {importFinished ? "Đã ghi vào sổ" : "Xác nhận nhập vào sổ"}
            </Button>
          </div>
        </div>

        {importResult ? <div className="mt-7 border-t pt-7"><ImportResult result={importResult} /></div> : null}
      </Card>
    </div>
  );
}
