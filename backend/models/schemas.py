"""Esquemas Pydantic para las peticiones y respuestas de la API."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ControlsUpdate(BaseModel):
    distance_cm: Optional[float] = Field(None, ge=2, le=20)
    misalignment: Optional[float] = Field(None, ge=0, le=1)
    frequency_khz: Optional[float] = Field(None, ge=100, le=500)
    auto_mode: Optional[bool] = None
    manual_power_w: Optional[float] = Field(None, ge=0, le=100)
    ambient_heat_c: Optional[float] = Field(None, ge=20, le=95)


class ResetRequest(BaseModel):
    battery_pct: Optional[float] = Field(20.0, ge=0, le=100)


class StepResponse(BaseModel):
    state: Dict[str, Any]
    decision: Dict[str, Any]
    reward: float


class HistoryPoint(BaseModel):
    tick: int
    efficiency: float
    temperature_c: float
    power_tx_w: float
    power_rx_w: float
    battery_pct: float
    reward: float
    action: str
