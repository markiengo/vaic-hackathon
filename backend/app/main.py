from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import (
    auth,
    merchants,
    transactions,
    sales,
    reconciliation,
    tax,
    cases,
    agents,
    audit,
    pos,
    confirm,
    ws,
)
from app.adapters.sepay import router as sepay_webhook_router

app = FastAPI(
    title="TaxLens API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
            }
        },
    )


PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX)
app.include_router(merchants.router, prefix=PREFIX)
app.include_router(transactions.router, prefix=PREFIX)
app.include_router(sales.router, prefix=PREFIX)
app.include_router(reconciliation.router, prefix=PREFIX)
app.include_router(tax.router, prefix=PREFIX)
app.include_router(cases.router, prefix=PREFIX)
app.include_router(agents.router, prefix=PREFIX)
app.include_router(audit.router, prefix=PREFIX)
app.include_router(pos.router, prefix=PREFIX)
app.include_router(confirm.router, prefix=PREFIX)
app.include_router(sepay_webhook_router, prefix=PREFIX)
app.include_router(ws.router, prefix=PREFIX)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "taxlens-api"}
