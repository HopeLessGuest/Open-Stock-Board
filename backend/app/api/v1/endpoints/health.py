from datetime import datetime, timezone

from fastapi import APIRouter

from app.services import check_data_source_health

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health_check():
    source_health = check_data_source_health()
    ready = (
        source_health["akshareAvailable"]
        and source_health["upstreamReachable"]
        and source_health.get("allProbesPassed", False)
    )

    return {
        "status": "ok" if ready else "degraded",
        "ready": ready,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "dataSource": source_health,
        },
    }
