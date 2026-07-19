import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicConfirmationFlow } from "@/components/confirmation/PublicConfirmationFlow";
import { ApiError } from "@/lib/api/client";
import * as confirmationApi from "@/lib/api/public-confirmation";

const secretToken = "signed.public.capability.token.that-must-not-render";

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: secretToken }),
}));

vi.mock("@/lib/api/public-confirmation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/public-confirmation")>();
  return {
    ...actual,
    inspectConfirmation: vi.fn(),
    submitConfirmation: vi.fn(),
  };
});

const validConfirmation: confirmationApi.PublicConfirmation = {
  exception_id: 42,
  status: "OPEN",
  amount: "5000000",
  sender_name: "Nguyễn Văn A",
  date: "2026-07-17",
  raw_note: "chuyen tien cho em",
  ai_suggestion: "revenue",
  confidence: 0.82,
  suggestion_summary: "TaxLens đề xuất doanh thu từ các chi tiết giao dịch đang hiển thị.",
  expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
  options: ["revenue", "internal_transfer", "loan", "other"],
  consumed_at: null,
};

describe("public confirmation flow", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("loads visible evidence and confirms the selected classification without rendering the token", async () => {
    const user = userEvent.setup();
    vi.mocked(confirmationApi.inspectConfirmation).mockResolvedValue(validConfirmation);
    vi.mocked(confirmationApi.submitConfirmation).mockResolvedValue({
      status: "CONFIRMED",
      exception_id: 42,
      classification: "internal_transfer",
    });
    render(<PublicConfirmationFlow />);

    expect(screen.getByRole("status")).toHaveTextContent("Đang kiểm tra liên kết");
    expect(await screen.findByRole("heading", { name: "Khoản tiền này là gì?" })).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("82% tin cậy")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(secretToken);

    await user.click(screen.getByRole("radio", { name: /^Chuyển nội bộ/ }));
    await user.click(screen.getByRole("button", { name: "Xác nhận đề xuất" }));
    await waitFor(() => expect(confirmationApi.submitConfirmation).toHaveBeenCalledWith(secretToken, "internal_transfer"));
    expect(await screen.findByRole("heading", { name: "Cảm ơn bạn đã xác nhận" })).toBeInTheDocument();
    expect(screen.getByText(/Chuyển nội bộ/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(secretToken);
  });

  it("shows the replay-safe already confirmed state", async () => {
    vi.mocked(confirmationApi.inspectConfirmation).mockResolvedValue({ ...validConfirmation, status: "RESOLVED", consumed_at: "2026-07-18T02:00:00Z" });
    render(<PublicConfirmationFlow />);
    expect(await screen.findByRole("heading", { name: "Giao dịch này đã được xác nhận" })).toBeInTheDocument();
    expect(screen.getByText(/không ghi đè/)).toBeInTheDocument();
  });

  it("distinguishes an expired token from an invalid token", async () => {
    vi.mocked(confirmationApi.inspectConfirmation).mockRejectedValueOnce(new ApiError("expired", 410, "ERR-TOKEN-002"));
    const first = render(<PublicConfirmationFlow />);
    expect(await screen.findByRole("heading", { name: "Cần một liên kết mới" })).toBeInTheDocument();
    first.unmount();

    vi.mocked(confirmationApi.inspectConfirmation).mockRejectedValueOnce(new ApiError("invalid", 404, "ERR-TOKEN-001"));
    render(<PublicConfirmationFlow />);
    expect(await screen.findByRole("heading", { name: "Liên kết không hợp lệ" })).toBeInTheDocument();
  });
});
