"""
markov_agent.py
----------------
Agente de Markov (Proceso de Decision de Markov, MDP) resuelto mediante
Q-Learning tabular.

El agente SOLO observa el estado actual (propiedad de Markov: la mejor
accion depende unicamente del estado presente, no del historial), elige
una accion, y aprende en linea a partir de la recompensa obtenida.

Estado discretizado (bins) -> tupla hashable -> fila en la tabla Q.
"""

import random
from dataclasses import dataclass
from typing import Dict, List, Tuple

from simulation.physics import SystemState, Action

ACTIONS: List[Action] = [
    "increase_power",
    "decrease_power",
    "maintain_power",
    "wait",
    "change_frequency",
]

# --- Discretizacion del espacio de estados ---
DISTANCE_BINS = [4, 8, 12, 16, 20]        # cm
TEMP_BINS = [35, 50, 65, 80, 100]         # C
POWER_BINS = [20, 40, 60, 80, 101]        # W
BATTERY_BINS = [20, 40, 60, 80, 101]      # %
ALIGN_BINS = [0.1, 0.25, 0.5, 1.01]       # desalineacion


def _bin_index(value: float, bins: List[float]) -> int:
    for i, edge in enumerate(bins):
        if value <= edge:
            return i
    return len(bins) - 1


def discretize(state: SystemState) -> Tuple[int, int, int, int, int]:
    return (
        _bin_index(state.distance_cm, DISTANCE_BINS),
        _bin_index(state.temperature_c, TEMP_BINS),
        _bin_index(state.power_tx_w, POWER_BINS),
        _bin_index(state.battery_pct, BATTERY_BINS),
        _bin_index(state.misalignment, ALIGN_BINS),
    )


@dataclass
class Decision:
    state_key: Tuple[int, int, int, int, int]
    action: Action
    q_values: Dict[str, float]
    reward: float = 0.0
    explanation: str = ""


class MarkovAgent:
    """
    Agente MDP con Q-Learning tabular y politica epsilon-greedy.

    - alpha: tasa de aprendizaje
    - gamma: factor de descuento (importancia del futuro)
    - epsilon: probabilidad de exploracion aleatoria
    """

    def __init__(self, alpha: float = 0.25, gamma: float = 0.9, epsilon: float = 0.15):
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q_table: Dict[Tuple, Dict[str, float]] = {}
        self.last_decision: Decision | None = None
        self.decisions_history: List[Decision] = []
        self.visited_states: Dict[str, int] = {}

    def _get_q_row(self, state_key: Tuple) -> Dict[str, float]:
        if state_key not in self.q_table:
            self.q_table[state_key] = {a: 0.0 for a in ACTIONS}
        return self.q_table[state_key]

    def choose_action(self, state: SystemState) -> Decision:
        state_key = discretize(state)
        q_row = self._get_q_row(state_key)

        self.visited_states[str(state_key)] = self.visited_states.get(str(state_key), 0) + 1

        if random.random() < self.epsilon:
            action = random.choice(ACTIONS)
        else:
            action = max(q_row, key=q_row.get)

        explanation = self._explain(state, action, q_row)

        decision = Decision(
            state_key=state_key,
            action=action,
            q_values=dict(q_row),
            explanation=explanation,
        )
        self.last_decision = decision
        return decision

    def learn(self, prev_state_key: Tuple, action: Action, reward: float, new_state: SystemState):
        """Actualizacion de Q-Learning: Q(s,a) += alpha * (r + gamma*max(Q(s')) - Q(s,a))"""
        new_state_key = discretize(new_state)
        old_q_row = self._get_q_row(prev_state_key)
        new_q_row = self._get_q_row(new_state_key)

        old_value = old_q_row[action]
        future_estimate = max(new_q_row.values())

        old_q_row[action] = old_value + self.alpha * (
            reward + self.gamma * future_estimate - old_value
        )

        if self.last_decision is not None:
            self.last_decision.reward = reward
            self.decisions_history.append(self.last_decision)
            if len(self.decisions_history) > 200:
                self.decisions_history.pop(0)

    def learned_policy_sample(self, limit: int = 12) -> List[dict]:
        """Devuelve una muestra de la politica aprendida (mejor accion por estado)."""
        items = []
        for state_key, q_row in list(self.q_table.items())[-limit:]:
            best_action = max(q_row, key=q_row.get)
            items.append({
                "estado": {
                    "distancia_bin": state_key[0],
                    "temperatura_bin": state_key[1],
                    "potencia_bin": state_key[2],
                    "bateria_bin": state_key[3],
                    "alineacion_bin": state_key[4],
                },
                "mejor_accion": best_action,
                "q_valor": round(q_row[best_action], 2),
            })
        return items

    @staticmethod
    def _explain(state: SystemState, action: Action, q_row: Dict[str, float]) -> str:
        """
        Genera una explicacion en lenguaje natural de por que se eligio
        la accion, basada en reglas sobre el estado actual (temperatura,
        bateria, eficiencia, distancia, alineacion).
        """
        reasons = []

        if action == "decrease_power":
            if state.temperature_c > 65:
                reasons.append(f"la temperatura era alta ({state.temperature_c:.0f}\u00b0C)")
            if state.battery_pct > 90:
                reasons.append(f"la bateria ya estaba casi llena ({state.battery_pct:.0f}%)")
            if not reasons:
                reasons.append("la eficiencia actual no justificaba mas potencia")
            return (
                f"El agente decidio DISMINUIR la potencia porque {', y '.join(reasons)}, "
                f"evitando perdidas energeticas y sobrecalentamiento."
            )

        if action == "increase_power":
            if state.efficiency > 0.5:
                reasons.append(f"el acoplamiento actual es bueno (eficiencia {state.efficiency*100:.0f}%)")
            if state.battery_pct < 80:
                reasons.append(f"la bateria aun necesita carga ({state.battery_pct:.0f}%)")
            if not reasons:
                reasons.append("hay margen termico y de eficiencia disponible")
            return (
                f"El agente decidio AUMENTAR la potencia porque {', y '.join(reasons)}, "
                f"acelerando la carga de forma segura."
            )

        if action == "change_frequency":
            return (
                f"El agente decidio CAMBIAR LA FRECUENCIA ({state.frequency_khz:.0f} kHz) "
                f"para buscar el punto de resonancia y mejorar el acoplamiento, ya que la "
                f"eficiencia actual ({state.efficiency*100:.0f}%) es menor a la esperada para "
                f"esta distancia."
            )

        if action == "wait":
            return (
                f"El agente decidio ESPERAR porque el sistema esta inestable "
                f"(desalineacion {state.misalignment*100:.0f}%) y conviene no inyectar mas "
                f"potencia hasta estabilizar el acoplamiento."
            )

        # maintain_power
        return (
            f"El agente decidio MANTENER la potencia ({state.power_tx_w:.0f} W) porque el "
            f"sistema esta en un punto estable: eficiencia {state.efficiency*100:.0f}%, "
            f"temperatura {state.temperature_c:.0f}\u00b0C y bateria {state.battery_pct:.0f}%."
        )

    def reset(self):
        self.q_table.clear()
        self.decisions_history.clear()
        self.visited_states.clear()
        self.last_decision = None
