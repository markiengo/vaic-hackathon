export function AuthVisualPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-[24px] bg-[#0D0D0D] p-10 lg:flex lg:flex-col lg:justify-between">
      {/* Abstract orange light effect near bottom */}
      <div className="pointer-events-none absolute -bottom-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#F36B2E] opacity-25 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-[#F59A1E] opacity-20 blur-[60px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-56 w-32 rounded-full bg-[#F36B2E] opacity-15 blur-[50px]" />

      {/* Subtle noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Short statement near top-left */}
      <div className="relative z-10 max-w-[360px]">
        <p className="text-[44px] font-medium leading-[1.12] text-white">
          Biến dữ liệu vận hành
          <br />
          thành hồ sơ
          <br />
          có thể kiểm tra.
        </p>
      </div>

      {/* Small wordmark at lower-left */}
      <div className="relative z-10">
        <span className="text-[20px] font-bold tracking-[-0.02em] text-white/90">
          TaxLens
        </span>
      </div>
    </div>
  );
}
