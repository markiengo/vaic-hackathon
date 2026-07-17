import { create } from 'zustand';

interface UIState {
  merchantId: string;
  merchantName: string;
  period: string;
  setMerchant: (id: string, name: string) => void;
  setPeriod: (period: string) => void;
}

export const useStore = create<UIState>((set) => ({
  merchantId: 'M001',
  merchantName: 'Salon Hoa',
  period: '2026-07',
  setMerchant: (id, name) => set({ merchantId: id, merchantName: name }),
  setPeriod: (period) => set({ period }),
}));
