from fastapi import APIRouter
from app.api.v1.endpoints import auth, appointments, clinical, portal

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["clinical"])
api_router.include_router(portal.router, prefix="/portal", tags=["portal"])