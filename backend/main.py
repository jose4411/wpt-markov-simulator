"""
main.py
-------
API FastAPI para el "Simulador Inteligente de Transferencia Inalambrica
de Energia utilizando un Agente de Markov".

Ejecutar con:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from simulation.physics import SystemState, step as physics_step
from simulation.physics import compute_reward
from agent.markov_agent import MarkovAgent, discretize
from models.schemas import ControlsUpdate, ResetRequest, StepResponse, HistoryPoint

app = FastAPI(title="WPT Markov Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo academico: abierto. Restringir en produccion.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Estado global de la simulacion (demo de un solo usuario / una sesion) ---
state = SystemState()
agent = MarkovAgent()
auto_mode = True
manual_power_target: float | None = None
history: List[HistoryPoint] = []


def _state_to_dict(s: SystemState) -> dict:
    return {
        "tick": s.tick,
        "distance_cm": round(s.distance_cm, 2),
        "misalignment": round(s.misalignment, 3),
        "frequency_khz": round(s.frequency_khz, 1),
        "power_tx_w": round(s.power_tx_w, 2),
        "power_rx_w": round(s.power_rx_w, 2),
        "losses_w": round(s.losses_w, 2),
        "efficiency": round(s.efficiency, 4),
        "temperature_c": round(s.temperature_c, 2),
        "battery_pct": round(s.battery_pct, 2),
        "coupling_k": round(s.coupling_k, 4),
        "status": s.status,
    }


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/state")
def get_state():
    return {
        "state": _state_to_dict(state),
        "auto_mode": auto_mode,
        "last_decision": _decision_to_dict(agent.last_decision) if agent.last_decision else None,
    }


def _decision_to_dict(decision) -> dict:
    if decision is None:
        return {}
    return {
        "action": decision.action,
        "q_values": decision.q_values,
        "reward": decision.reward,
        "explanation": decision.explanation,
    }


@app.post("/api/controls")
def update_controls(controls: ControlsUpdate):
    global auto_mode, manual_power_target

    if controls.distance_cm is not None:
        state.distance_cm = controls.distance_cm
    if controls.misalignment is not None:
        state.misalignment = controls.misalignment
    if controls.frequency_khz is not None and not auto_mode:
        state.frequency_khz = controls.frequency_khz
    if controls.auto_mode is not None:
        auto_mode = controls.auto_mode
    if controls.manual_power_w is not None:
        manual_power_target = controls.manual_power_w
        if not auto_mode:
            state.power_tx_w = controls.manual_power_w
    if controls.ambient_heat_c is not None:
        # perturbacion termica externa simulada por el usuario (ej. ambiente caluroso)
        state.temperature_c = controls.ambient_heat_c

    return {"ok": True, "auto_mode": auto_mode}


@app.post("/api/reset")
def reset(req: ResetRequest):
    global state, history
    state = SystemState(battery_pct=req.battery_pct or 20.0)
    agent.reset()
    history = []
    return {"ok": True, "state": _state_to_dict(state)}


@app.post("/api/step", response_model=StepResponse)
def do_step():
    """
    Avanza un paso de la simulacion:
      1. El agente observa el estado actual (propiedad de Markov).
      2. Elige una accion (o se usa modo manual si auto_mode=False).
      3. La fisica del sistema evoluciona con esa accion.
      4. Se calcula la recompensa y se actualiza la tabla Q.
    """
    prev_state_key = discretize(state)
    prev_battery = state.battery_pct

    if auto_mode:
        decision = agent.choose_action(state)
        action = decision.action
    else:
        # En modo manual, el usuario controla la potencia directamente;
        # el agente sigue "observando" pero no actua (accion = mantener).
        action = "maintain_power"
        decision = agent.choose_action(state)
        decision.action = action

    physics_step(state, action)
    reward = compute_reward(state, prev_battery)
    agent.learn(prev_state_key, action, reward, state)

    history.append(HistoryPoint(
        tick=state.tick,
        efficiency=state.efficiency,
        temperature_c=state.temperature_c,
        power_tx_w=state.power_tx_w,
        power_rx_w=state.power_rx_w,
        battery_pct=state.battery_pct,
        reward=reward,
        action=action,
    ))
    if len(history) > 300:
        history.pop(0)

    return StepResponse(
        state=_state_to_dict(state),
        decision=_decision_to_dict(agent.last_decision),
        reward=reward,
    )


@app.get("/api/history")
def get_history():
    return {"history": [h.dict() for h in history]}


@app.get("/api/explain")
def explain():
    if agent.last_decision is None:
        return {"explanation": "Aun no se ha tomado ninguna decision."}
    return {"explanation": agent.last_decision.explanation, "action": agent.last_decision.action}


@app.get("/api/policy")
def policy():
    return {"policy_sample": agent.learned_policy_sample(), "states_visited": len(agent.visited_states)}
