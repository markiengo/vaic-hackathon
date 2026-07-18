import type { BankTransaction } from "@/lib/domain/types";

export const transactionFixtures: BankTransaction[] = [
  {
    id: "SHB-20260803-001",
    merchant_id: "M001",
    amount: 480_000,
    sender_name: "Nguyễn Minh Anh",
    raw_note: "PAY-A8F21X",
    normalized_note: "PAY-A8F21X",
    ai_interpretation: null,
    transaction_date: "2026-08-03T09:12:00+07:00",
    match_status: "matched",
    matched_sale_id: "SALE-M001-0501",
  },
  {
    id: "SHB-20260803-002",
    merchant_id: "M001",
    amount: 1_250_000,
    sender_name: "Trần Hoàng Nam",
    raw_note: "chuyen tien dich vu",
    normalized_note: "CHUYEN TIEN DICH VU",
    ai_interpretation: "Thanh toán dịch vụ, chưa xác định đơn hàng.",
    transaction_date: "2026-08-03T09:28:00+07:00",
    match_status: "unmatched",
    matched_sale_id: null,
  },
];
