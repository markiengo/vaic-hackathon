import Link from "next/link";
import { ArrowRight, Building2, Check, ShieldCheck, Store } from "lucide-react";
import { TaxLensLogo } from "@/components/brand/TaxLensLogo";

const roles = [
  {
    href: "/login?email=huong.salonhoa%40gmail.com&role=merchant",
    icon: Store,
    accent: "bg-primary/10 text-primary",
    label: "CHỦ DOANH NGHIỆP SME",
    name: "Salon Hương",
    bullets: [
      "Xem giao dịch khớp lệnh tự động",
      "Xử lý ngoại lệ nhanh với Trợ lý TaxLens",
      "Biết khi nào sẵn sàng thuế",
    ],
  },
  {
    href: "/login?email=long.ops%40shb.com.vn&role=ops",
    icon: Building2,
    accent: "bg-secondary/10 text-secondary",
    label: "SHB OPERATIONS",
    name: "Linh — Vận hành",
    bullets: [
      "Giám sát sức khỏe danh mục merchant",
      "Xử lý cases được escalate",
      "Kiểm toán agent runs và tuân thủ",
    ],
  },
] as const;

export default function WelcomePage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
      <section className="relative hidden overflow-hidden border-r bg-brand-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 top-24 size-80 rounded-full border border-white/15" />
        <div className="absolute -right-10 top-44 size-48 rounded-full border border-white/10" />
        <div className="animate-welcome-enter-left" style={{ animationDelay: "0ms" }}>
          <TaxLensLogo inverse />
        </div>
        <div className="relative max-w-2xl">
          <p className="animate-welcome-enter-left text-sm uppercase tracking-[0.22em] text-white/65" style={{ animationDelay: "150ms" }}>
            TaxOps được SHB đồng hành
          </p>
          <h1 className="font-display animate-welcome-enter-left mt-6 text-[64px] leading-[0.94] tracking-[-0.04em]" style={{ animationDelay: "300ms" }}>
            Dòng tiền khớp.<br />
            Sổ sách sạch.<br />
            <span className="text-mango">Vận hành nhẹ.</span>
          </h1>
          <p className="animate-welcome-enter-left mt-8 max-w-xl text-lg leading-8 text-white/75" style={{ animationDelay: "450ms" }}>
            TaxLens kết nối đơn hàng, thanh toán, hóa đơn và bằng chứng để chị chỉ xử lý những việc thực sự cần phán đoán.
          </p>
        </div>
        <div className="animate-welcome-enter-left flex gap-8 text-sm text-white/65" style={{ animationDelay: "600ms" }}>
          <span className="flex items-center gap-2"><ShieldCheck size={18} /> Kiểm soát bởi con người</span>
          <span className="flex items-center gap-2"><Building2 size={18} /> Bảo chứng vận hành SHB</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[460px]">
          <div className="animate-welcome-enter mb-9 lg:hidden" style={{ animationDelay: "0ms" }}>
            <TaxLensLogo />
          </div>
          <p className="animate-welcome-enter text-xs font-semibold uppercase tracking-[0.18em] text-secondary" style={{ animationDelay: "200ms" }}>
            Chọn trải nghiệm demo
          </p>
          <h2 className="font-display animate-welcome-enter mt-3 text-4xl leading-tight tracking-[-0.03em]" style={{ animationDelay: "300ms" }}>
            Bạn là ai?
          </h2>
          <p className="animate-welcome-enter mt-3 text-sm leading-6 text-text-secondary" style={{ animationDelay: "400ms" }}>
            Chọn vai trò để xem TaxLens phù hợp với bạn ra sao.
          </p>

          <div className="mt-8 grid gap-4">
            {roles.map((role, index) => {
              const Icon = role.icon;
              return (
                <Link
                  key={role.href}
                  href={role.href}
                  className="group animate-welcome-enter flex flex-col gap-4 rounded-xl border bg-surface p-5 transition-all hover:border-secondary hover:shadow-md hover:-translate-y-0.5"
                  style={{ animationDelay: `${500 + index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${role.accent}`}>
                      <Icon aria-hidden size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{role.label}</p>
                      <strong className="block text-base font-semibold text-text">{role.name}</strong>
                    </div>
                    <ArrowRight aria-hidden size={20} className="shrink-0 text-text-tertiary transition-colors group-hover:text-secondary" />
                  </div>
                  <ul className="grid gap-2">
                    {role.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2.5 text-sm text-text-secondary">
                        <Check aria-hidden size={15} className="shrink-0 text-success" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </Link>
              );
            })}
          </div>

          <p className="animate-welcome-enter mt-7 text-center text-sm text-text-tertiary" style={{ animationDelay: "700ms" }}>
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-secondary transition-colors hover:text-secondary-hover">
              Đăng nhập
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
