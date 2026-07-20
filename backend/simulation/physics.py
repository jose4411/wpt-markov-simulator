"""
physics.py
-----------
Modelo FISICO SIMPLIFICADO (no electromagnetismo real) de Transferencia
Inalambrica de Energia (WPT) por acoplamiento inductivo resonante.

El objetivo NO es precision de ingenieria (para eso existe Ansys HFSS),
sino un modelo plausible, estable y controlable que reaccione de forma
intuitiva a: distancia, desalineacion, frecuencia, potencia y temperatura,
para poder ser visualizado en 3D y controlado por un Agente de Markov.

Todas las unidades son "de juego" (game-like), elegidas para que la
simulacion se sienta viva en tiempo real dentro de un navegador.
"""

from dataclasses import dataclass, field
from typing import Literal
import math
import time

Action = Literal[
    "increase_power",
    "decrease_power",
    "maintain_power",
    "wait",
    "change_frequency",
]


@dataclass
class SystemState:
    # --- Parametros controlados por el usuario (sliders) ---
    distance_cm: float = 5.0          # separacion entre bobinas (2 - 20 cm)
    misalignment: float = 0.05        # desalineacion normalizada (0 - 1)
    frequency_khz: float = 200.0      # frecuencia de operacion (100 - 500 kHz)

    # --- Variables de estado que evolucionan con la simulacion ---
    power_tx_w: float = 20.0          # potencia transmitida (0 - 100 W)
    temperature_c: float = 28.0       # temperatura del sistema (20 - 95 C)
    battery_pct: float = 20.0         # nivel de bateria del receptor (0 - 100 %)

    # --- Salidas calculadas cada tick ---
    coupling_k: float = 0.0
    efficiency: float = 0.0
    power_rx_w: float = 0.0
    losses_w: float = 0.0
    status: str = "OK"

    tick: int = 0
    last_update: float = field(default_factory=time.time)


RESONANT_FREQ_KHZ = 200.0     # frecuencia "ideal" de resonancia del par de bobinas
MAX_DISTANCE_CM = 20.0
MAX_POWER_W = 100.0


def _coupling_coefficient(distance_cm: float, misalignment: float, frequency_khz: float) -> float:
    """
    Coeficiente de acoplamiento k in [0,1].
    - Decae con la distancia (aprox. ley inversa cubica suavizada).
    - Decae con la desalineacion.
    - Tiene una curva de resonancia gaussiana alrededor de RESONANT_FREQ_KHZ:
      alejarse de la frecuencia ideal penaliza el acoplamiento (igual que en
      un sistema real, donde el matching de frecuencia importa).
    """
    d = max(0.5, distance_cm)
    distance_factor = 1.0 / (1.0 + (d / 6.0) ** 2.2)
    distance_factor = max(0.0, min(1.0, distance_factor))

    alignment_factor = max(0.0, 1.0 - misalignment) ** 1.5

    freq_delta = (frequency_khz - RESONANT_FREQ_KHZ) / 120.0
    resonance_factor = math.exp(-(freq_delta ** 2))

    k = distance_factor * alignment_factor * resonance_factor
    return max(0.0, min(1.0, k))


def _efficiency_from_coupling(k: float) -> float:
    """
    Curva tipica de sistemas resonantes acoplados: la eficiencia crece
    con k^2 y satura cerca de 1 para acoplamientos altos.
    """
    eff = (k ** 2) * 1.15
    return max(0.0, min(0.97, eff))


def step(state: SystemState, action: Action, dt: float = 1.0) -> SystemState:
    """
    Avanza la simulacion un paso de tiempo `dt` (segundos simulados),
    aplicando la accion elegida por el agente sobre power_tx y frequency.
    """

    # 1. Aplicar la accion del agente sobre la potencia / frecuencia
    if action == "increase_power":
        state.power_tx_w = min(MAX_POWER_W, state.power_tx_w + 6.0)
    elif action == "decrease_power":
        state.power_tx_w = max(0.0, state.power_tx_w - 6.0)
    elif action == "maintain_power":
        pass
    elif action == "wait":
        state.power_tx_w = max(0.0, state.power_tx_w - 1.0)
    elif action == "change_frequency":
        # el agente "barre" la frecuencia buscando la resonancia
        direction = 1 if state.frequency_khz < RESONANT_FREQ_KHZ else -1
        state.frequency_khz = max(100.0, min(500.0, state.frequency_khz + direction * 15.0))

    # 2. Calcular acoplamiento y eficiencia con el estado fisico actual
    k = _coupling_coefficient(state.distance_cm, state.misalignment, state.frequency_khz)
    efficiency = _efficiency_from_coupling(k)

    power_rx = state.power_tx_w * efficiency
    losses = max(0.0, state.power_tx_w - power_rx)

    # 3. Termica: el sistema se calienta con las perdidas y con potencia alta,
    #    y se enfria pasivamente hacia la temperatura ambiente (25 C).
    heating = (losses * 0.18) + (state.power_tx_w * 0.03)
    cooling = (state.temperature_c - 25.0) * 0.06
    state.temperature_c += (heating - cooling) * dt
    state.temperature_c = max(20.0, min(98.0, state.temperature_c))

    # proteccion termica pasiva: si se sobrecalienta, el hardware limita potencia
    if state.temperature_c > 80.0:
        state.power_tx_w *= 0.9

    # 4. Bateria: se carga proporcional a la potencia recibida, con perdida
    #    de eficiencia de carga a medida que se acerca al 100%.
    charge_rate = power_rx * 0.15 * (1.0 - (state.battery_pct / 100.0) ** 2)
    state.battery_pct = min(100.0, state.battery_pct + charge_rate * dt * 0.1)

    # 5. Estado general del sistema (para mostrar en el dashboard)
    if state.temperature_c > 80:
        status = "SOBRECALENTAMIENTO"
    elif state.battery_pct >= 100:
        status = "CARGA COMPLETA"
    elif efficiency < 0.15 and state.power_tx_w > 5:
        status = "BAJA EFICIENCIA"
    else:
        status = "TRANSFIRIENDO"

    state.coupling_k = k
    state.efficiency = efficiency
    state.power_rx_w = power_rx
    state.losses_w = losses
    state.status = status
    state.tick += 1
    state.last_update = time.time()

    return state


def compute_reward(state: SystemState, prev_battery: float) -> float:
    """
    Funcion de recompensa del Agente de Markov.
    Combina 4 objetivos, tal como pide el proyecto:
      - Mayor eficiencia
      - Mayor velocidad de carga
      - Menor calentamiento
      - Menores perdidas
    """
    efficiency_term = state.efficiency * 10.0
    charge_speed_term = (state.battery_pct - prev_battery) * 8.0

    temp_penalty = 0.0
    if state.temperature_c > 60:
        temp_penalty = ((state.temperature_c - 60) / 40.0) * 6.0

    losses_penalty = (state.losses_w / MAX_POWER_W) * 5.0

    # penalizar desperdiciar potencia si la bateria ya esta casi llena
    overcharge_penalty = 3.0 if (state.battery_pct > 95 and state.power_tx_w > 10) else 0.0

    reward = (
        efficiency_term
        + charge_speed_term
        - temp_penalty
        - losses_penalty
        - overcharge_penalty
    )
    return round(reward, 3)
