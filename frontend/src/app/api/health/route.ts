// Render health check target — returns 200 once Next.js server is up.
export function GET() {
  return Response.json({ ok: true });
}
