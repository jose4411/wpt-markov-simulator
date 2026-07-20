import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api/client.js";

/**
 * Orquesta el bucle de simulacion: cada `intervalMs` le pide al backend
 * que ejecute un paso (observar estado -> el agente decide -> fisica avanza
 * -> recompensa -> aprendizaje). Mantiene tambien un historial local corto
 * para los graficos del dashboard.
 */
export function useSimulationLoop({ intervalMs = 700, running = true } = {}) {
  const [simState, setSimState] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reward, setReward] = useState(0);
  const [historyLog, setHistoryLog] = useState([]);
  const [connected, setConnected] = useState(true);
  const timerRef = useRef(null);

  const tick = useCallback(async () => {
    try {
      const res = await api.step();
      setSimState(res.state);
      setDecision(res.decision);
      setReward(res.reward);
      setConnected(true);
      setHistoryLog((prev) => {
        const next = [
          ...prev,
          {
            tick: res.state.tick,
            efficiency: +(res.state.efficiency * 100).toFixed(1),
            temperature: res.state.temperature_c,
            power_tx: res.state.power_tx_w,
            power_rx: res.state.power_rx_w,
            battery: res.state.battery_pct,
            reward: res.reward,
            action: res.decision?.action,
          },
        ];
        return next.slice(-60);
      });
    } catch (err) {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    tick();
    timerRef.current = setInterval(tick, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [running, intervalMs, tick]);

  const reset = useCallback(async (batteryPct = 20) => {
    await api.reset(batteryPct);
    setHistoryLog([]);
    setDecision(null);
    setReward(0);
    await tick();
  }, [tick]);

  return { simState, decision, reward, historyLog, connected, reset };
}
