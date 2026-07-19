import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, Card, DataTable, Dialog, Field, StatusPill, Tabs, ToastProvider, useToast, type DataTableColumn, type TaxLensStatus } from "@/components/ui";

describe("TaxLens UI primitives", () => {
  it("keeps native button behavior and variants", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button variant="outline" onClick={onClick}>Duyệt giao dịch</Button>);

    const button = screen.getByRole("button", { name: "Duyệt giao dịch" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("type", "button");
  });

  it("renders locked card variants and all semantic status labels", () => {
    const labels: TaxLensStatus[] = [
      "Đã khớp", "Cần xác nhận", "Chưa xác định", "Thiếu hóa đơn", "Sai số tiền",
      "Chờ đồng bộ", "Đã hoàn tiền", "Đã thanh toán", "Chưa thanh toán", "Đạt",
      "Cần xử lý", "Chưa sẵn sàng", "Sẵn sàng",
    ];
    render(
      <>
        <Card variant="standard">Chuẩn</Card>
        <Card variant="information">Thông tin</Card>
        <Card variant="workspace">Workspace</Card>
        {labels.map((label) => <StatusPill key={label} status={label} />)}
      </>,
    );
    expect(screen.getByText("Workspace")).toHaveClass("surface-shadow");
    for (const label of labels) expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders one data contract as a semantic table and mobile list", () => {
    type Row = { id: string; reference: string; amount: string };
    const columns: DataTableColumn<Row>[] = [
      { key: "reference", header: "Mã", primary: true, cell: (row) => row.reference },
      { key: "amount", header: "Số tiền", cell: (row) => row.amount },
    ];
    render(<DataTable caption="Sổ giao dịch" columns={columns} rows={[{ id: "1", reference: "TL-01", amount: "480.000 ₫" }]} getRowKey={(row) => row.id} />);

    expect(screen.getByRole("table", { name: "Sổ giao dịch" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Sổ giao dịch" })).toBeInTheDocument();
    expect(screen.getAllByText("TL-01")).toHaveLength(2);
  });

  it("associates errors and required state with fields", () => {
    render(<Field label="Mã tham chiếu" error="Mã đã được sử dụng" required />);
    const input = screen.getByRole("textbox", { name: /Mã tham chiếu/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Mã đã được sử dụng");
  });

  it("moves tabs with keyboard arrow keys", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    render(<Tabs ariaLabel="Chi tiết" items={[{ value: "one", label: "Tóm tắt", content: "Một" }, { value: "two", label: "Bằng chứng", content: "Hai" }]} />);

    const first = screen.getByRole("tab", { name: "Tóm tắt" });
    fireEvent.keyDown(first.parentElement!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Bằng chứng" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Hai");
    vi.unstubAllGlobals();
  });

  it("opens and closes a native dialog through controlled state", () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) { this.removeAttribute("open"); });
    const onOpenChange = vi.fn();
    const { rerender } = render(<Dialog open onOpenChange={onOpenChange} title="Xác nhận">Nội dung</Dialog>);
    expect(screen.getByRole("dialog", { name: "Xác nhận" })).toHaveAttribute("open");
    rerender(<Dialog open={false} onOpenChange={onOpenChange} title="Xác nhận">Nội dung</Dialog>);
    expect(screen.queryByRole("dialog", { name: "Xác nhận" })).not.toBeInTheDocument();
  });

  it("announces toast status and allows dismissal", async () => {
    function Trigger() {
      const { toast } = useToast();
      return <button onClick={() => toast({ title: "Đã lưu", tone: "success" })}>Lưu</button>;
    }
    const user = userEvent.setup();
    render(<ToastProvider><Trigger /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(screen.getByRole("status")).toHaveTextContent("Đã lưu");
    await user.click(screen.getByRole("button", { name: "Đóng thông báo" }));
    expect(screen.queryByText("Đã lưu")).not.toBeInTheDocument();
  });
});
