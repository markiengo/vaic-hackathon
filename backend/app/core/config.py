from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database — postgresql+asyncpg:// scheme for async engine
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # SePay (SHB transaction API)
    SEPAY_API_URL: str
    SEPAY_API_TOKEN: str
    SEPAY_WEBHOOK_API_KEY: str

    # External mock services
    INVOICE_API_URL: str
    CASE_API_URL: str

    # LLM Provider
    LLM_PROVIDER: str
    LLM_API_KEY: str
    LLM_MODEL_PLANNER: str
    LLM_MODEL_SPECIALIST: str

    # App
    CORS_ORIGINS: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def alembic_database_url(self) -> str:
        # Alembic env.py uses async_engine_from_config which accepts postgresql+asyncpg://
        # No conversion needed — we use run_sync() pattern (option b in plan)
        return self.DATABASE_URL


settings = Settings()
