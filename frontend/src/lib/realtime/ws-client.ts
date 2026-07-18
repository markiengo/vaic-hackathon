export function transactionWebSocketUrl(merchantId: string): string {
  const configured = process.env.NEXT_PUBLIC_TAXLENS_WS_URL;
  if (configured) {
    const target = new URL(configured);
    target.searchParams.set("merchant_id", merchantId);
    return target.toString();
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const port = process.env.NEXT_PUBLIC_TAXLENS_WS_PORT ?? "8000";
  const target = new URL(`${protocol}//${window.location.hostname}:${port}/api/v1/ws/transactions`);
  target.searchParams.set("merchant_id", merchantId);
  return target.toString();
}
