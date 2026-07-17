'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import type { Product } from '@/types';

const mockProducts: Product[] = [
  { id: 'P001', name: 'Cắt tóc', category: 'Dịch vụ', price: 80000, is_service: true },
  { id: 'P002', name: 'Gội đầu', category: 'Dịch vụ', price: 200000, is_service: true },
  { id: 'P003', name: 'Uốn tóc', category: 'Dịch vụ', price: 500000, is_service: true },
  { id: 'P004', name: 'Nhuộm tóc', category: 'Dịch vụ', price: 600000, is_service: true },
  { id: 'P005', name: 'Sơn móng', category: 'Dịch vụ', price: 150000, is_service: true },
  { id: 'P006', name: 'Dưỡng tóc', category: 'Sản phẩm', price: 350000, is_service: false },
  { id: 'P007', name: 'Tẩy trang', category: 'Sản phẩm', price: 120000, is_service: false },
  { id: 'P008', name: 'Gel vuốt', category: 'Sản phẩm', price: 90000, is_service: false },
];

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showCashClose, setShowCashClose] = useState(false);
  const [countedCash, setCountedCash] = useState('');

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const checkout = (method: string) => {
    if (method === 'qr') setShowQR(true);
    if (method === 'cash') {
      alert('Thanh toán tiền mặt thành công! Sale ID: ORDER-' + Date.now().toString().slice(-5));
      setCart([]);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between border-b border-border-default pb-6">
        <div>
          <h2 className="font-page-title text-page-title text-text-primary mb-2">Mini POS</h2>
          <p className="font-default text-default text-text-secondary">Tạo đơn hàng và thanh toán</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-section-header text-section-header text-text-primary mb-4">Sản phẩm & Dịch vụ</h3>
          <div className="grid grid-cols-2 gap-4">
            {mockProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-white rounded-xl shadow-sm border border-border-default p-4 text-left hover:shadow-card-hover hover:border-primary/30 transition-all active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-caps text-label-caps text-xs ${p.is_service ? 'bg-primary-light text-primary' : 'bg-secondary-light text-secondary'}`}>
                    {p.category}
                  </span>
                  <span className="material-symbols-outlined text-text-tertiary text-sm">add_circle</span>
                </div>
                <h4 className="font-body text-body font-semibold text-text-primary">{p.name}</h4>
                <p className="font-data-mono text-data-mono text-primary mt-1">{fmt(p.price)}₫</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-section-header text-section-header text-text-primary mb-4">Giỏ hàng</h3>
          <div className="bg-white rounded-xl shadow-sm border border-border-default p-5">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-text-tertiary text-5xl">shopping_cart</span>
                <p className="text-text-secondary mt-2">Chưa có sản phẩm nào</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-body text-body font-semibold text-text-primary">{item.product.name}</p>
                        <p className="font-data-mono text-data-mono text-text-secondary">{fmt(item.product.price)}₫</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="font-data-mono text-data-mono w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <p className="font-data-mono text-data-mono text-text-primary w-24 text-right">{fmt(item.product.price * item.quantity)}₫</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border-default pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-section-header text-section-header text-text-secondary">Tổng cộng</span>
                    <span className="font-hero-numbers text-hero-numbers text-primary">{fmt(total)}₫</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => checkout('cash')} className="flex-1 bg-white border border-secondary text-secondary py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-secondary-light transition-colors">
                      <span className="material-symbols-outlined">banknote</span>
                      Tiền mặt
                    </button>
                    <button onClick={() => checkout('qr')} className="flex-1 primary-gradient text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined">qr_code</span>
                      Tạo QR
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 bg-white rounded-xl shadow-sm border border-border-default p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-label-caps text-label-caps text-text-secondary uppercase">Phiên quỹ tiền mặt</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-success-light text-success font-label-caps text-label-caps text-xs">Đang mở</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Tiền đầu ca</p>
                <p className="font-data-mono text-data-mono text-text-primary">{fmt(2000000)}₫</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-text-tertiary uppercase">Dự kiến</p>
                <p className="font-data-mono text-data-mono text-text-primary">{fmt(5200000)}₫</p>
              </div>
            </div>
            <button onClick={() => setShowCashClose(true)} className="mt-3 w-full bg-white border border-danger text-danger py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-danger-light transition-colors">
              <span className="material-symbols-outlined">lock</span>
              Đóng ca
            </button>
          </div>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-section-header text-section-header text-text-primary text-center mb-4">QR Thanh toán</h3>
            <div className="w-48 h-48 bg-surface-container-low rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-border-default">
              <span className="material-symbols-outlined text-primary text-8xl">qr_code_2</span>
            </div>
            <p className="font-data-mono text-data-mono text-text-primary text-center mb-2">Ref: TL{Date.now().toString().slice(-8)}</p>
            <p className="font-hero-numbers text-hero-numbers text-primary text-center">{fmt(total)}₫</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-warning">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span className="font-label-caps text-label-caps">Hết hạn sau 15:00</span>
            </div>
            <button onClick={() => setShowQR(false)} className="mt-4 w-full bg-white border border-border-default text-text-primary py-2 rounded-lg font-medium hover:bg-surface-container-low transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}

      {showCashClose && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCashClose(false)}>
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-section-header text-section-header text-text-primary text-center mb-4">Đóng ca tiền mặt</h3>
            <div className="mb-4">
              <label className="block font-label-caps text-label-caps text-text-secondary mb-2 uppercase">Tiền đếm thực tế</label>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="5,080,000"
                className="w-full bg-white border border-border-default rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary text-body"
              />
            </div>
            {countedCash && (
              <div className={`rounded-lg p-3 mb-4 ${Number(countedCash) === 5200000 ? 'bg-success-light' : 'bg-warning-light'}`}>
                <p className="font-body text-body">
                  Chênh lệch: <span className={`font-data-mono font-bold ${Number(countedCash) === 5200000 ? 'text-success' : 'text-warning'}`}>
                    {(Number(countedCash) - 5200000).toLocaleString('vi-VN')}₫
                  </span>
                </p>
              </div>
            )}
            <button
              onClick={() => { setShowCashClose(false); setCountedCash(''); alert('Đã đóng ca!'); }}
              className="w-full primary-gradient text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Xác nhận đóng ca
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
