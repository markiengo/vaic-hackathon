"use client";

import { useState } from "react";
import { ArrowRight, Bell, Filter, Plus } from "lucide-react";
import {
  Badge, Button, Card, DataTable, Dialog, EmptyState, ErrorState, Field, FilterBar, KpiCard,
  LoadingState, PageHeader, Select, Sheet, Skeleton, Tabs, ToastProvider, useToast,
  type DataTableColumn,
} from "@/components/ui";

type LedgerRow = { id: string; reference: string; source: string; amount: string; status: "Khớp" | "Cần xem" };
const rows: LedgerRow[] = [
  { id: "1", reference: "TL-0726-0148", source: "SHB QR", amount: "480.000 ₫", status: "Khớp" },
  { id: "2", reference: "TL-0726-0149", source: "Tiền mặt", amount: "1.250.000 ₫", status: "Cần xem" },
  { id: "3", reference: "TL-0726-0150", source: "Chuyển khoản", amount: "320.000 ₫", status: "Khớp" },
];
const columns: DataTableColumn<LedgerRow>[] = [
  { key: "reference", header: "Mã giao dịch", primary: true, cell: (row) => row.reference },
  { key: "source", header: "Nguồn", cell: (row) => row.source },
  { key: "status", header: "Trạng thái", cell: (row) => <Badge tone={row.status === "Khớp" ? "success" : "warning"}>{row.status}</Badge> },
  { key: "amount", header: "Số tiền", align: "right", cell: (row) => <span className="font-mono text-xs text-text">{row.amount}</span> },
];

function InteractiveShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="TaxLens internal" title="UI foundation" description="Bộ thành phần dùng chung cho Merchant Workspace và SHB Operations Console, được kiểm tra với bàn phím, màn hình nhỏ và chế độ giảm chuyển động." actions={<><Button variant="outline" onClick={() => setSheetOpen(true)}><Filter aria-hidden size={17} />Mở sheet</Button><Button onClick={() => setDialogOpen(true)}><Plus aria-hidden size={17} />Tạo tác vụ</Button></>} />

      <section aria-labelledby="buttons-heading">
        <h2 id="buttons-heading" className="font-display text-3xl">Actions & status</h2>
        <div className="mt-4 flex flex-wrap gap-3"><Button>Primary<ArrowRight aria-hidden size={16} /></Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button disabled>Disabled</Button><Button size="icon" variant="outline" aria-label="Thông báo"><Bell aria-hidden size={18} /></Button></div>
        <div className="mt-4 flex flex-wrap gap-2"><Badge>Đang chờ</Badge><Badge tone="info">AI gợi ý</Badge><Badge tone="success">Đã khớp</Badge><Badge tone="warning">Cần xem</Badge><Badge tone="danger">Lỗi</Badge></div>
      </section>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="font-display text-3xl">Operational summary</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Dòng tiền đã khớp" value="96,2%" detail="1–31 tháng 7" trend={{ direction: "up", label: "+2,4%" }} /><KpiCard label="Cần xác nhận" value="07" detail="3 việc ưu tiên" accent="mango" /><KpiCard label="Hóa đơn thiếu" value="02" detail="Trước ngày 05/08" /><KpiCard label="Sẵn sàng thuế" value="92%" detail="Còn 2 kiểm tra" accent="mist" /></div>
      </section>

      <section aria-labelledby="filters-heading" className="space-y-4">
        <h2 id="filters-heading" className="font-display text-3xl">Filters & ledger</h2>
        <FilterBar summary={<Badge tone="info">2 bộ lọc</Badge>}><Select label="Kỳ dữ liệu" defaultValue="jul"><option value="jul">Tháng 07/2026</option><option value="jun">Tháng 06/2026</option></Select><Select label="Trạng thái" defaultValue="all"><option value="all">Tất cả</option><option value="review">Cần xem</option></Select><Field label="Tìm giao dịch" placeholder="Mã, ghi chú, người gửi…" /><Button variant="outline">Áp dụng</Button></FilterBar>
        <DataTable caption="Giao dịch gần đây" columns={columns} rows={rows} getRowKey={(row) => row.id} />
      </section>

      <section aria-labelledby="forms-heading" className="grid gap-5 lg:grid-cols-2">
        <Card><h2 id="forms-heading" className="font-display text-3xl">Fields</h2><div className="mt-5 grid gap-5"><Field label="Tên người gửi" placeholder="Nguyễn Văn An" hint="Dùng tên hiển thị trên giao dịch ngân hàng." /><Field label="Mã tham chiếu" defaultValue="TL-0726-0149" error="Mã này đã được dùng cho một giao dịch khác." /><Select label="Loại giao dịch" required defaultValue=""><option value="" disabled>Chọn một loại</option><option value="sale">Bán hàng</option><option value="refund">Hoàn tiền</option></Select></div></Card>
        <Card><h2 className="font-display text-3xl">Tabs</h2><Tabs ariaLabel="Chi tiết giao dịch" items={[{ value: "summary", label: "Tóm tắt", content: <p className="text-sm leading-6 text-text-secondary">Thông tin rõ ràng cho merchant được ưu tiên trước.</p> }, { value: "evidence", label: "Bằng chứng", content: <p className="text-sm leading-6 text-text-secondary">Các record liên quan và confidence được trình bày theo progressive disclosure.</p> }, { value: "audit", label: "Audit", content: <p className="font-mono text-xs leading-6 text-text-secondary">actor=merchant · action=confirm · source=web</p> }]} /></Card>
      </section>

      <section aria-labelledby="states-heading">
        <h2 id="states-heading" className="font-display text-3xl">System states</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3"><EmptyState compact title="Không có ngoại lệ" description="Tất cả giao dịch trong kỳ đã được xử lý." /><ErrorState compact title="Chưa tải được dữ liệu" description="Kết nối tạm thời gián đoạn. Dữ liệu của bạn vẫn an toàn." retry={() => toast({ title: "Đang thử kết nối lại", tone: "info" })} /><LoadingState label="Đang đối soát giao dịch" /></div>
        <Card className="mt-4" aria-label="Skeleton loading preview"><Skeleton className="h-4 w-28" /><Skeleton className="mt-4 h-10 w-2/3" /><div className="mt-5 grid gap-3 sm:grid-cols-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div></Card>
      </section>

      <section aria-label="Toast demonstration" className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => toast({ title: "Đã lưu thay đổi", description: "Audit log đã ghi lại thao tác này.", tone: "success" })}>Toast thành công</Button><Button variant="outline" onClick={() => toast({ title: "Không thể hoàn tất", description: "Kiểm tra lại quyền truy cập merchant.", tone: "danger" })}>Toast lỗi</Button></section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Tạo tác vụ đối soát" description="TaxLens sẽ lập kế hoạch trước khi thực hiện bất kỳ thay đổi nào." footer={<><Button variant="ghost" onClick={() => setDialogOpen(false)}>Hủy</Button><Button onClick={() => { setDialogOpen(false); toast({ title: "Đã tạo tác vụ", tone: "success" }); }}>Tạo tác vụ</Button></>}><div className="grid gap-5"><Select label="Kỳ dữ liệu"><option>Tháng 07/2026</option></Select><Field label="Ghi chú" placeholder="Phạm vi cần kiểm tra…" /></div></Dialog>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Bộ lọc nâng cao" description="Thu hẹp dữ liệu mà không rời khỏi ngữ cảnh hiện tại." footer={<Button onClick={() => setSheetOpen(false)}>Áp dụng bộ lọc</Button>}><div className="grid gap-5"><Select label="Nguồn dữ liệu"><option>Tất cả nguồn</option><option>SHB QR</option><option>Tiền mặt</option></Select><Select label="Mức tin cậy"><option>Tất cả</option><option>Dưới 75%</option></Select></div></Sheet>
    </div>
  );
}

export function UiShowcase() { return <ToastProvider><InteractiveShowcase /></ToastProvider>; }
