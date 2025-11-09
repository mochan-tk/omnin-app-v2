from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_env_variable
from src.routes.agents.generated_agent_route import generated_agent_router
from src.routes.health.health_route import health_router
from src.routes.realtime.realtime_route import realtime_router

OPENAI_API_KEY = get_env_variable("OPENAI_API_KEY", "")


def get_application() -> FastAPI:
    app = FastAPI(
        prefix="/api/",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(generated_agent_router)
    app.include_router(health_router)
    app.include_router(realtime_router)
    return app


app = get_application()


if __name__ == "__main__":
    import uvicorn

    # Run with: python api/main.py (useful for local development)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
