/**
 * Centralized Vietnamese mapping for English backend messages, enum values,
 * and technical error strings that must never leak into the merchant UI.
 *
 * Use `vi()` for any user-facing text that originates from the backend.
 * If a key is not found, returns the original string so development errors
 * are visible — but production should have all keys mapped.
 */

const MESSAGES: Record<string, string> = {
  // Match / candidate errors
  NO_MATCH_CANDIDATES: "Không tìm thấy đơn hàng hoặc bản ghi phù hợp.",
  NO_MATCH_CANDIDATES_FOUND: "Không tìm thấy đơn hàng hoặc bản ghi phù hợp.",
  "No match candidates found for transaction": "Không tìm thấy đơn hàng hoặc bản ghi phù hợp.",
  "No match candidates found": "Không tìm thấy đơn hàng hoặc bản ghi phù hợp.",

  // Sender
  UNKNOWN_SENDER: "Chưa xác định được người gửi.",
  "Unknown sender": "Chưa xác định được người gửi.",

  // Transfer note
  MISSING_TRANSFER_NOTE: "Ngân hàng không cung cấp nội dung chuyển khoản.",
  "No content": "Ngân hàng không cung cấp nội dung chuyển khoản.",
  "No transfer note": "Ngân hàng không cung cấp nội dung chuyển khoản.",

  // Classification
  UNCLASSIFIED: "Chưa phân loại.",
  "Unclassified": "Chưa phân loại.",
  PENDING_REVIEW: "Chưa phân loại.",
  NO_MATCH: "Chưa phân loại.",
  AMBIGUOUS: "Cần xác nhận.",

  // Confidence
  "Confidence unavailable": "Độ tin cậy chưa xác định.",
  CONFIDENCE_UNAVAILABLE: "Độ tin cậy chưa xác định.",

  // Exception types
  CASH_DISCREPANCY: "Chênh lệch tiền mặt.",
  MISSING_INVOICE: "Thiếu hóa đơn.",
  DUPLICATE_CANDIDATE: "Nghi ngờ trùng lặp.",
  OVERPAYMENT: "Thanh toán thừa.",
  UNDERPAYMENT: "Thanh toán thiếu.",
  SPLIT_PAYMENT: "Thanh toán chia nhiều lần.",
  TWO_PAYER: "Hai người thanh toán.",
  MULTI_ORDER: "Một giao dịch cho nhiều đơn.",
  REFUND: "Hoàn tiền.",

  // Generic backend errors
  "Internal server error": "Lỗi hệ thống. Vui lòng thử lại sau.",
  "Unauthorized": "Phiên đăng nhập đã hết hạn.",
  "Forbidden": "Bạn không có quyền thực hiện thao tác này.",
  "Not found": "Không tìm thấy dữ liệu.",

  // Match status enums
  matched: "Đã khớp",
  unmatched: "Chưa phân loại",
  partial: "Sai số tiền",
  ambiguous: "Cần xác nhận",

  // Resolution status
  PENDING: "Cần xác nhận",
  RESOLVED: "Đã xác nhận",
  DISMISSED: "Đã bỏ qua",
};

/**
 * Map a backend/technical string to Vietnamese user-facing text.
 * Returns the original string if no mapping is found (so dev errors are visible).
 */
export function vi(key: string | null | undefined): string {
  if (!key) return "";
  return MESSAGES[key] ?? MESSAGES[key.toUpperCase()] ?? key;
}

/**
 * Map a backend string, returning a fallback if no mapping exists.
 */
export function viOr(key: string | null | undefined, fallback: string): string {
  if (!key) return fallback;
  const mapped = MESSAGES[key] ?? MESSAGES[key.toUpperCase()];
  return mapped ?? fallback;
}

/**
 * Check if a string is likely an English/backend message that needs mapping.
 * Used to detect leaked technical text.
 */
export function looksLikeBackendMessage(text: string): boolean {
  if (!text) return false;
  // Contains English words and no Vietnamese diacritics
  const hasEnglish = /[a-zA-Z]{3,}/.test(text);
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
  return hasEnglish && !hasVietnamese;
}
