import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.security import TaxLensError
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
    invoices,
    ws,
    demo,
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


_log = logging.getLogger(__name__)


@app.exception_handler(TaxLensError)
async def taxlens_error_handler(request: Request, exc: TaxLensError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Pydantic validation → 400 ERR-GEN-001 (not 422) per plan v6 Bước 3
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "ERR-GEN-001",
                "message": "Dữ liệu đầu vào không hợp lệ",
                "details": {"errors": exc.errors()},
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP-{exc.status_code}",
                "message": exc.detail,
                "details": {},
            }
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    _log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "ERR-GEN-002", "message": "Lỗi hệ thống nội bộ", "details": {}}},
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
app.include_router(invoices.router, prefix=PREFIX)
app.include_router(sepay_webhook_router, prefix=PREFIX)
app.include_router(ws.router, prefix=PREFIX)
app.include_router(demo.router, prefix=PREFIX)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "taxlens-api"}
