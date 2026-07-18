import { Suspense } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { TaxLensLogo } from "@/components/brand/TaxLensLogo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
      <section className="relative hidden overflow-hidden border-r bg-brand-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 top-24 size-80 rounded-full border border-white/15" />
        <div className="absolute -right-10 top-42 size-48 rounded-full border border-white/10" />
        <TaxLensLogo inverse />
        <div className="relative max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-white/65">TaxOps được SHB đồng hành</p>
          <h1 className="font-display mt-5 text-6xl leading-[0.96] tracking-[-0.04em]">Dòng tiền khớp.<br />Sổ sách sạch.<br /><span className="text-mango">Vận hành nhẹ.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">TaxLens kết nối đơn hàng, thanh toán, hóa đơn và bằng chứng để chị chỉ xử lý những việc thực sự cần phán đoán.</p>
        </div>
        <div className="flex gap-8 text-sm text-white/65">
          <span className="flex items-center gap-2"><ShieldCheck size={18} /> Kiểm soát bởi con người</span>
          <span className="flex items-center gap-2"><Building2 size={18} /> Bảo chứng vận hành SHB</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="surface-shadow-lg w-full max-w-[460px] rounded-xl border bg-surface p-6 sm:p-9">
          <TaxLensLogo className="mb-9 lg:hidden" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Chào mừng trở lại</p>
          <h2 className="font-display mt-3 text-4xl leading-tight tracking-[-0.03em]">Đăng nhập TaxLens</h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">Dùng tài khoản thật hoặc vào nhanh bằng dữ liệu demo đã được chuẩn bị.</p>

          <Suspense fallback={<p className="mt-8 text-sm text-text-secondary">Đang tải phiên đăng nhập...</p>}>
            <LoginForm />
          </Suspense>
          <p className="mt-7 text-center text-xs leading-5 text-text-tertiary">Phiên đăng nhập được bảo vệ bằng cookie HttpOnly và phân quyền theo dữ liệu seed.</p>
        </div>
      </section>
    </main>
  );
}
