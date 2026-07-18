"use client";

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Money } from "@/components/domain/Money";
import { RecordRelationshipChain } from "@/components/domain/RecordRelationshipChain";
import { useMerchantRealtime } from "@/components/realtime/MerchantRealtimeProvider";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  Tabs,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api/client";
import {
  closeCashSession,
  createPaymentIntent,
  createSale,
  getPosContext,
  getProducts,
  getSales,
  recordCashPayment,
  salesQueryKeys,
  type PaymentIntentResult,
  type PosContext,
  type PosProduct,
  type SaleDraftItem,
  type SaleHistoryItem,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

type CartItem = SaleDraftItem & { key: string };
type Receipt = { orderId: string; paymentId: string; amount: number };
type CheckoutKeys = { sale: string; cash: string; intent: string };

const currentPeriod = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
}).format(new Date());

function newKey(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`;
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

function paymentLabel(value: SaleHistoryItem["payment_method"]) {
  if (value === "cash") return "Tiền mặt";
  if (value === "bank_transfer") return "Chuyển khoản";
  if (value === "other") return "Kết hợp";
  return "Chưa thanh toán";
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "PAID" || status === "RECONCILED") return "success";
  if (status === "PARTIAL" || status === "PENDING") return "warning";
  return "neutral";
}

function CatalogProduct({ product, disabled, onAdd }: { product: PosProduct; disabled: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="surface-lift group flex min-h-32 flex-col justify-between rounded-xl border bg-surface p-4 text-left transition-[border-color,transform,box-shadow] enabled:hover:-translate-y-0.5 enabled:hover:border-secondary disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
          {product.category ?? "Khác"}
        </span>
        <strong className="mt-2 block font-normal leading-6 text-text">{product.name}</strong>
      </span>
      <span className="mt-4 flex items-center justify-between gap-3">
        <Money value={product.price} className="text-sm" />
        <span className="grid size-8 place-items-center rounded-full bg-accent text-secondary transition-transform group-hover:rotate-90">
          <Plus aria-hidden size={16} />
        </span>
      </span>
    </button>
  );
}

function CartPanel({
  cart,
  discount,
  busy,
  locked,
  onDiscount,
  onQuantity,
  onRemove,
  onCustom,
  onCheckout,
}: {
  cart: CartItem[];
  discount: string;
  busy: boolean;
  locked: boolean;
  onDiscount: (value: string) => void;
  onQuantity: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onCustom: () => void;
  onCheckout: (method: "cash" | "qr") => void;
}) {
  const gross = cart.reduce((total, item) => total + item.unit_price * item.quantity, 0);
  const discountValue = Math.min(Number(discount) || 0, gross);
  const net = gross - discountValue;

  return (
    <Card variant="workspace" className="lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Đơn hiện tại</p>
          <h2 className="font-display mt-1 text-2xl">{cart.length} mặt hàng</h2>
        </div>
        <span className="grid size-11 place-items-center rounded-full bg-accent text-secondary">
          <ShoppingBag aria-hidden size={20} />
        </span>
      </div>

      {cart.length ? (
        <ul className="max-h-[22rem] divide-y overflow-y-auto" aria-label="Mặt hàng trong đơn">
          {cart.map((item) => (
            <li key={item.key} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-normal text-text">{item.product_name}</strong>
                  <Money value={item.unit_price} className="mt-1 text-xs" />
                </div>
                <button
                  type="button"
                  aria-label={`Xóa ${item.product_name}`}
                  onClick={() => onRemove(item.key)}
                  disabled={locked}
                  className="rounded-md p-2 text-text-tertiary hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 aria-hidden size={16} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border bg-background">
                  <button
                    type="button"
                    aria-label={`Giảm số lượng ${item.product_name}`}
                    onClick={() => onQuantity(item.key, -1)}
                    disabled={locked}
                    className="grid size-9 place-items-center text-text-secondary hover:text-secondary"
                  >
                    <Minus aria-hidden size={14} />
                  </button>
                  <span className="min-w-8 text-center font-mono text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Tăng số lượng ${item.product_name}`}
                    onClick={() => onQuantity(item.key, 1)}
                    disabled={locked}
                    className="grid size-9 place-items-center text-text-secondary hover:text-secondary"
                  >
                    <Plus aria-hidden size={14} />
                  </button>
                </div>
                <Money value={item.unit_price * item.quantity} className="text-sm" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <ShoppingBag aria-hidden className="mx-auto text-text-tertiary" size={28} />
          <p className="mt-3 text-sm text-text-secondary">Chọn dịch vụ để bắt đầu đơn.</p>
        </div>
      )}

      {locked ? (
        <p className="mb-4 rounded-xl border border-secondary/25 bg-accent px-4 py-3 text-sm leading-6 text-text">
          Đơn đã được lưu và đang chờ chuyển khoản. Mở lại mã QR để tiếp tục hoặc tạo mã mới khi hết hạn.
        </p>
      ) : null}
      <Button variant="tertiary" className="w-full" onClick={onCustom} disabled={locked}>
        <Sparkles aria-hidden size={16} /> Thêm mặt hàng tùy chỉnh
      </Button>
      <div className="mt-4 border-t pt-4">
        <Field
          label="Giảm giá"
          type="number"
          min="0"
          max={gross}
          value={discount}
          onChange={(event) => onDiscount(event.target.value)}
          disabled={!cart.length || locked}
          inputMode="numeric"
        />
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4 text-text-secondary"><dt>Tạm tính</dt><dd><Money value={gross} /></dd></div>
          <div className="flex justify-between gap-4 text-text-secondary"><dt>Giảm giá</dt><dd><Money value={-discountValue} /></dd></div>
          <div className="mt-1 flex items-end justify-between gap-4 border-t pt-4"><dt className="font-semibold">Tổng thanh toán</dt><dd><Money value={net} className="font-display text-3xl" /></dd></div>
        </dl>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Button variant="outline" disabled={!cart.length || net <= 0 || busy || locked} onClick={() => onCheckout("cash")}>
          <Banknote aria-hidden size={17} /> Tiền mặt
        </Button>
        <Button disabled={!cart.length || net <= 0 || busy} onClick={() => onCheckout("qr")}>
          <Smartphone aria-hidden size={17} /> {locked ? "Mở lại QR" : "Tạo QR"}
        </Button>
      </div>
    </Card>
  );
}

function HistoryPanel({
  rows,
  loading,
  error,
  period,
  selected,
  onPeriod,
  onSelect,
  retry,
}: {
  rows: SaleHistoryItem[];
  loading: boolean;
  error: boolean;
  period: string;
  selected: SaleHistoryItem | null;
  onPeriod: (period: string) => void;
  onSelect: (sale: SaleHistoryItem) => void;
  retry: () => void;
}) {
  const columns: DataTableColumn<SaleHistoryItem>[] = [
    {
      key: "order",
      header: "Đơn hàng",
      primary: true,
      cell: (sale) => (
        <button type="button" onClick={() => onSelect(sale)} className="font-mono text-secondary hover:underline">
          {sale.id}
        </button>
      ),
    },
    {
      key: "time",
      header: "Thời gian",
      cell: (sale) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(sale.created_at)),
    },
    { key: "method", header: "Phương thức", cell: (sale) => paymentLabel(sale.payment_method) },
    { key: "status", header: "Trạng thái", cell: (sale) => <Badge tone={statusTone(sale.payment_status)}>{sale.payment_status}</Badge> },
    { key: "amount", header: "Giá trị", align: "right", cell: (sale) => <Money value={sale.net_amount} /> },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field label="Kỳ bán hàng" type="month" value={period} onChange={(event) => onPeriod(event.target.value)} className="min-w-48" />
        <p className="text-sm text-text-secondary">{rows.length} đơn trong kỳ</p>
      </div>
      {loading ? <LoadingState label="Đang tải lịch sử bán hàng" /> : null}
      {error ? <ErrorState title="Không tải được lịch sử" description="Kết nối dữ liệu bán hàng đang gián đoạn." retry={retry} /> : null}
      {!loading && !error ? (
        <DataTable
          caption="Lịch sử bán hàng"
          columns={columns}
          rows={rows}
          getRowKey={(sale) => sale.id}
          empty={<EmptyState compact title="Chưa có đơn trong kỳ" description="Đơn mới sẽ xuất hiện ở đây sau khi được tạo." />}
        />
      ) : null}
      {selected ? (
        <Card variant="information">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">Dòng chứng từ</p>
              <h3 className="font-display mt-1 text-2xl">{selected.lines.map((line) => line.product_name).join(", ")}</h3>
            </div>
            <Money value={selected.net_amount} className="text-lg" />
          </div>
          <RecordRelationshipChain
            order={{ id: selected.relationship.order_id, amount: selected.net_amount }}
            payment={selected.relationship.payment_id ? { id: selected.relationship.payment_id, amount: selected.net_amount } : null}
            invoice={selected.relationship.invoice_id ? { id: selected.relationship.invoice_id, amount: selected.net_amount } : null}
          />
        </Card>
      ) : null}
    </div>
  );
}

function CashClosePanel({ context, onClosed }: { context: PosContext | undefined; onClosed: () => void }) {
  const { toast } = useToast();
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const session = context?.active_cash_session;
  const expected = session?.expected_cash ?? 0;
  const discrepancy = (Number(counted) || 0) - expected;

  if (!context) return <LoadingState label="Đang tải ca tiền mặt" />;
  if (!session) {
    return <EmptyState title="Chưa có ca tiền mặt" description="Ca sẽ tự mở khi đơn tiền mặt đầu tiên được ghi nhận." />;
  }
  const sessionId = session.id;

  async function submit() {
    if (!counted || (discrepancy !== 0 && !reason.trim())) return;
    setBusy(true);
    try {
      const result = await closeCashSession(sessionId, Number(counted), reason.trim());
      toast({
        title: result.status === "RECONCILED" ? "Ca đã khớp" : "Ca đã đóng với chênh lệch",
        description: `Chênh lệch: ${new Intl.NumberFormat("vi-VN").format(result.discrepancy)}₫`,
        tone: result.discrepancy === 0 ? "success" : "info",
      });
      onClosed();
    } catch (error) {
      toast({ title: "Không thể đóng ca", description: errorMessage(error), tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Card variant="information">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Ca #{session.id}</p>
        <h2 className="font-display mt-2 text-3xl">Đối chiếu tiền trong quầy</h2>
        <dl className="mt-7 grid gap-4">
          <div className="flex items-center justify-between border-b pb-4"><dt className="text-text-secondary">Tiền đầu ca</dt><dd><Money value={session.opening_cash} /></dd></div>
          <div className="flex items-center justify-between border-b pb-4"><dt className="text-text-secondary">Thu tiền mặt dự kiến</dt><dd><Money value={expected - session.opening_cash + session.cash_expenses} /></dd></div>
          <div className="flex items-center justify-between"><dt className="font-semibold">Tiền cuối ca dự kiến</dt><dd><Money value={expected} className="font-display text-3xl" /></dd></div>
        </dl>
      </Card>
      <Card variant="workspace">
        <Field label="Tiền đếm thực tế" type="number" min="0" value={counted} onChange={(event) => setCounted(event.target.value)} required inputMode="numeric" />
        <div className={cn("my-5 flex items-center justify-between rounded-xl border p-4", discrepancy === 0 ? "bg-success/10" : "bg-warning/10")}>
          <span className="text-sm font-semibold">Chênh lệch</span>
          <Money value={discrepancy} className="text-lg" showPositiveSign />
        </div>
        {discrepancy !== 0 ? (
          <Field label="Lý do chênh lệch" value={reason} onChange={(event) => setReason(event.target.value)} required error={!reason.trim() && counted ? "Cần ghi lý do trước khi đóng ca." : undefined} />
        ) : null}
        <Button className="mt-5 w-full" size="lg" disabled={busy || !counted || (discrepancy !== 0 && !reason.trim())} onClick={submit}>
          <ReceiptText aria-hidden size={18} /> Xác nhận đóng ca
        </Button>
      </Card>
    </div>
  );
}

export function SalesWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sessionQuery = useSession();
  const merchantId = sessionQuery.data?.user.merchant_id ?? null;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState("Tất cả");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [busy, setBusy] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [qr, setQr] = useState<PaymentIntentResult | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [checkoutLocked, setCheckoutLocked] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [period, setPeriod] = useState(currentPeriod);
  const [selectedSale, setSelectedSale] = useState<SaleHistoryItem | null>(null);
  const checkoutKeys = useRef<CheckoutKeys | null>(null);
  const activeSale = useRef<{ id: string; amount: number } | null>(null);

  const contextQuery = useQuery({
    queryKey: salesQueryKeys.context(merchantId ?? "none"),
    queryFn: () => getPosContext(merchantId!),
    enabled: Boolean(merchantId),
  });
  const productsQuery = useQuery({
    queryKey: salesQueryKeys.products(merchantId ?? "none"),
    queryFn: () => getProducts(merchantId!),
    enabled: Boolean(merchantId),
  });
  const historyQuery = useQuery({
    queryKey: salesQueryKeys.history(merchantId ?? "none", period),
    queryFn: () => getSales(merchantId!, period),
    enabled: Boolean(merchantId),
  });

  const { connection, latestEvent } = useMerchantRealtime();
  const handleRealtimeMatch = useEffectEvent((event: Extract<NonNullable<typeof latestEvent>, { type: "transaction.matched" }>) => {
    if (activeSale.current?.id !== event.sale_id) return;
    setReceipt({ orderId: event.sale_id, paymentId: event.transaction_id, amount: event.amount });
    setQrOpen(false);
    setCart([]);
    setDiscount("0");
    setCheckoutLocked(false);
    checkoutKeys.current = null;
    activeSale.current = null;
    toast({
      title: "Đã nhận chuyển khoản",
      description: `Đơn ${event.sale_id} đã được thanh toán.`,
      tone: "success",
    });
  });

  useEffect(() => {
    if (latestEvent?.type !== "transaction.matched") return;
    handleRealtimeMatch(latestEvent);
  }, [latestEvent]);

  useEffect(() => {
    if (!qrOpen || !qr) return;
    function update() {
      setRemaining(Math.max(0, Math.ceil((new Date(qr!.expires_at).getTime() - Date.now()) / 1000)));
    }
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [qr, qrOpen]);

  const products = productsQuery.data ?? [];
  const categories = ["Tất cả", ...Array.from(new Set(products.map((product) => product.category ?? "Khác")))];
  const visibleProducts = products.filter((product) => {
    const matchesCategory = category === "Tất cả" || (product.category ?? "Khác") === category;
    const matchesSearch = product.name.toLocaleLowerCase("vi").includes(deferredSearch.toLocaleLowerCase("vi"));
    return matchesCategory && matchesSearch;
  });
  const gross = cart.reduce((total, item) => total + item.unit_price * item.quantity, 0);
  const discountValue = Math.min(Number(discount) || 0, gross);
  const net = gross - discountValue;
  function resetAttempt() {
    checkoutKeys.current = null;
    activeSale.current = null;
    setCheckoutLocked(false);
    setReceipt(null);
  }

  function addProduct(product: PosProduct) {
    resetAttempt();
    setCart((items) => {
      const existing = items.find((item) => item.product_id === product.id);
      if (existing) return items.map((item) => item.key === existing.key ? { ...item, quantity: item.quantity + 1 } : item);
      return [...items, { key: product.id, product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price }];
    });
  }

  function changeQuantity(key: string, delta: number) {
    resetAttempt();
    setCart((items) => items.flatMap((item) => item.key === key ? (item.quantity + delta > 0 ? [{ ...item, quantity: item.quantity + delta }] : []) : [item]));
  }

  function addCustom() {
    const price = Number(customPrice);
    if (!customName.trim() || price <= 0) return;
    resetAttempt();
    setCart((items) => [...items, { key: newKey("custom"), product_id: null, product_name: customName.trim(), quantity: 1, unit_price: price }]);
    setCustomName("");
    setCustomPrice("");
    setCustomOpen(false);
  }

  async function checkout(method: "cash" | "qr", refreshIntent = false) {
    const context = contextQuery.data;
    if (!context || !cart.length || net <= 0) return;
    if (checkoutLocked && !refreshIntent) {
      if (method === "qr") setQrOpen(true);
      return;
    }
    checkoutKeys.current ??= { sale: newKey("sale"), cash: newKey("cash"), intent: newKey("intent") };
    if (refreshIntent) checkoutKeys.current.intent = newKey("intent");
    setBusy(true);
    try {
      const sale = await createSale(context, cart, discountValue, checkoutKeys.current.sale);
      activeSale.current = { id: sale.sale_id, amount: sale.net_amount };
      if (method === "cash") {
        const payment = await recordCashPayment(sale.sale_id, sale.net_amount, context, checkoutKeys.current.cash);
        const paymentId = payment.allocation_id == null
          ? `CASH-SESSION-${payment.cash_session_id}`
          : `CASH-${payment.allocation_id}`;
        setReceipt({ orderId: sale.sale_id, paymentId, amount: sale.net_amount });
        setCart([]);
        setDiscount("0");
        setCheckoutLocked(false);
        checkoutKeys.current = null;
        activeSale.current = null;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["sales", merchantId] }),
          queryClient.invalidateQueries({ queryKey: salesQueryKeys.context(merchantId!) }),
        ]);
        toast({ title: "Đã ghi nhận tiền mặt", description: `Đơn ${sale.sale_id} đã thanh toán.`, tone: "success" });
      } else {
        const intent = await createPaymentIntent(sale.sale_id, sale.net_amount, checkoutKeys.current.intent);
        setQr(intent);
        setCheckoutLocked(true);
        setQrOpen(true);
      }
    } catch (error) {
      toast({ title: "Chưa thể thanh toán", description: errorMessage(error), tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  if (sessionQuery.isLoading) return <LoadingState label="Đang mở quầy bán hàng" />;
  if (!merchantId) return <ErrorState title="Không có merchant workspace" description="Tài khoản này chưa được gắn với cửa hàng để tạo đơn." />;
  if (contextQuery.isError) return <ErrorState title="Chưa thể mở quầy bán hàng" description="Backend chưa cung cấp ngữ cảnh cửa hàng, nhân viên và ca tiền mặt cho merchant này." retry={() => contextQuery.refetch()} />;

  const createPanel = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)]">
      <section aria-label="Danh mục bán hàng" className="min-w-0">
        <div className="flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block flex-1">
            <span className="sr-only">Tìm dịch vụ</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm dịch vụ, sản phẩm..." className="min-h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm" />
          </label>
          <div className="flex gap-2 overflow-x-auto" aria-label="Danh mục">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={cn("min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold text-text-secondary", category === item && "border-secondary bg-secondary text-white")}>{item}</button>
            ))}
          </div>
        </div>
        {productsQuery.isLoading ? <div className="mt-4"><LoadingState label="Đang tải danh mục" /></div> : null}
        {productsQuery.isError ? <div className="mt-4"><ErrorState title="Không tải được danh mục" description="Vui lòng kiểm tra kết nối backend." retry={() => productsQuery.refetch()} /></div> : null}
        {!productsQuery.isLoading && !productsQuery.isError ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => <CatalogProduct key={product.id} product={product} disabled={checkoutLocked} onAdd={() => addProduct(product)} />)}
          </div>
        ) : null}
        {!productsQuery.isLoading && visibleProducts.length === 0 ? <div className="mt-4"><EmptyState compact title="Không tìm thấy mặt hàng" description="Đổi từ khóa hoặc thêm mặt hàng tùy chỉnh." /></div> : null}
      </section>
      <CartPanel
        cart={cart}
        discount={discount}
        busy={busy || contextQuery.isLoading}
        locked={checkoutLocked}
        onDiscount={(value) => { resetAttempt(); setDiscount(value); }}
        onQuantity={changeQuantity}
        onRemove={(key) => { resetAttempt(); setCart((items) => items.filter((item) => item.key !== key)); }}
        onCustom={() => setCustomOpen(true)}
        onCheckout={checkout}
      />
    </div>
  );

  return (
    <div className="grid gap-7 animate-[route-in_220ms_ease-out]">
      <PageHeader
        eyebrow="Bán hàng nhẹ"
        merchant={contextQuery.data?.store_name}
        period={period}
        title="Quầy bán hàng"
        subtitle="Tạo đơn, nhận tiền và giữ dòng chứng từ luôn nhìn thấy trong một workspace."
        actions={
          <Badge tone={connection === "live" ? "success" : "warning"}>
            {connection === "live" ? <Wifi aria-hidden size={14} /> : <WifiOff aria-hidden size={14} />}
            {connection === "live" ? "Thanh toán trực tiếp" : "Đang nối realtime"}
          </Badge>
        }
      />

      {receipt ? (
        <Card variant="information" className="border-success/30">
          <div className="mb-4 flex items-start gap-3">
            <CheckCircle2 aria-hidden className="mt-0.5 text-success" size={22} />
            <div><h2 className="font-display text-2xl">Đã nhận thanh toán · Đã tự động khớp</h2><p className="mt-1 text-sm text-text">Dòng quan hệ này là bằng chứng cho đơn vừa hoàn tất.</p></div>
          </div>
          <RecordRelationshipChain order={{ id: receipt.orderId, amount: receipt.amount }} payment={{ id: receipt.paymentId, amount: receipt.amount }} invoice={null} />
        </Card>
      ) : null}

      <Tabs
        ariaLabel="Khu vực bán hàng"
        items={[
          { value: "create", label: "Tạo đơn", content: createPanel },
          {
            value: "history",
            label: "Lịch sử đơn",
            content: (
              <HistoryPanel
                rows={historyQuery.data?.items ?? []}
                loading={historyQuery.isLoading}
                error={historyQuery.isError}
                period={period}
                selected={selectedSale}
                onPeriod={setPeriod}
                onSelect={setSelectedSale}
                retry={() => historyQuery.refetch()}
              />
            ),
          },
          {
            value: "cash-close",
            label: "Ca tiền mặt",
            content: <CashClosePanel context={contextQuery.data} onClosed={() => { void contextQuery.refetch(); void historyQuery.refetch(); void queryClient.invalidateQueries({ queryKey: ["tax-readiness", merchantId] }); }} />,
          },
        ]}
      />

      <Dialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        title="Mặt hàng tùy chỉnh"
        description="Dùng cho dịch vụ phát sinh chưa có trong danh mục."
        footer={<><Button variant="ghost" onClick={() => setCustomOpen(false)}>Hủy</Button><Button disabled={!customName.trim() || Number(customPrice) <= 0} onClick={addCustom}>Thêm vào đơn</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên mặt hàng" value={customName} onChange={(event) => setCustomName(event.target.value)} required autoFocus />
          <Field label="Đơn giá" type="number" min="1" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} required inputMode="numeric" />
        </div>
      </Dialog>

      <Dialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        title="Chờ chuyển khoản"
        description="TaxLens tự xác nhận khi SePay nhận đúng mã và số tiền. Không có nút đánh dấu đã trả."
        footer={
          <>
            {remaining === 0 ? <Button onClick={() => checkout("qr", true)}>Tạo lại mã</Button> : <Button variant="ghost" onClick={() => setQrOpen(false)}>Hủy mã QR</Button>}
            {remaining ? <Button variant="ghost" onClick={() => { setQrOpen(false); toast({ title: "Đã đóng mã QR", description: "Bạn có thể chọn phương thức thanh toán khác tại quầy.", tone: "info" }); }}>Đánh dấu thanh toán cách khác</Button> : null}
          </>
        }
      >
        {qr ? (
          <div className="grid place-items-center text-center">
            <div className="surface-shadow-md rounded-xl border bg-white p-4"><QRCodeSVG value={qr.qr_data} size={220} level="M" /></div>
            <Money value={qr.amount} className="font-display mt-5 text-4xl" />
            <p className="font-mono mt-2 text-sm text-secondary">{qr.payment_intent_id}</p>
            <p className={cn("mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", remaining ? "bg-accent" : "bg-danger/10 text-danger")}>
              <Clock3 aria-hidden size={16} />
              {remaining ? `Còn ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}` : "Mã đã hết hạn"}
            </p>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-text">Đang chờ thanh toán</p><p className="max-w-sm text-sm leading-6 text-text-secondary">Giữ cửa sổ này mở. Khi tiền về, trạng thái sẽ đổi tự động qua kết nối realtime.</p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
