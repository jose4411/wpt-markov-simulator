import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../api/client.js";

const ACTION_LABELS = {
  increase_power: "Aumentar potencia",
  decrease_power: "Reducir potencia",
  maintain_power: "Mantener potencia",
  wait: "Esperar",
  change_frequency: "Cambiar frecuencia",
};

function MiniChart({ data, dataKey, color, unit, label, domain }) {
  return (
    <div className="mb-4">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">{label}</span>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={data}>
          <CartesianGrid stroke="#1B2635" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tick" hide />
          <YAxis hide domain={domain || ["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#0F1620",
              border: "1px solid #28394D",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
            labelFormatter={(t) => `tick ${t}`}
            formatter={(v) => [`${v}${unit}`, label]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard({ historyLog }) {
  const [policy, setPolicy] = useState({ policy_sample: [], states_visited: 0 });

  useEffect(() => {
    const fetchPolicy = () => api.getPolicy().then(setPolicy).catch(() => {});
    fetchPolicy();
    const id = setInterval(fetchPolicy, 2500);
    return () => clearInterval(id);
  }, []);

  const recentDecisions = [...historyLog].slice(-8).reverse();

  return (
    <div className="bg-lab-900/80 border border-lab-700 rounded-xl p-4 backdrop-blur-sm shadow-lg">
      <h3 className="text-xs font-mono uppercase tracking-widest text-signal-500 mb-3">
        Panel de analisis
      </h3>

      <MiniChart data={historyLog} dataKey="efficiency" color="#22D3EE" unit="%" label="Eficiencia" domain={[0, 100]} />
      <MiniChart data={historyLog} dataKey="temperature" color="#FF9B45" unit="C" label="Temperatura" />
      <MiniChart data={historyLog} dataKey="power_tx" color="#9B7DFF" unit="W" label="Potencia transmitida" domain={[0, 100]} />
      <MiniChart data={historyLog} dataKey="reward" color="#34D399" unit="" label="Recompensa" />

      <div className="h-px bg-lab-700 my-3" />

      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
        Historial de decisiones
      </span>
      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
        {recentDecisions.length === 0 && (
          <p className="text-[11px] text-slate-600 font-mono">Sin decisiones aun.</p>
        )}
        {recentDecisions.map((h, i) => (
          <div key={i} className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">#{h.tick}</span>
            <span className="text-agent-400 truncate">{ACTION_LABELS[h.action] || h.action}</span>
            <span className={h.reward >= 0 ? "text-emerald-400" : "text-danger-500"}>
              {h.reward >= 0 ? "+" : ""}
              {h.reward.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-lab-700 my-3" />

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
          Politica aprendida
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {policy.states_visited} estados visitados
        </span>
      </div>
      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
        {policy.policy_sample.length === 0 && (
          <p className="text-[11px] text-slate-600 font-mono">El agente aun no ha aprendido una politica.</p>
        )}
        {policy.policy_sample.map((p, i) => (
          <div key={i} className="text-[10px] font-mono text-slate-400 flex justify-between border-b border-lab-800 py-1">
            <span>
              d{p.estado.distancia_bin} t{p.estado.temperatura_bin} p{p.estado.potencia_bin} b
              {p.estado.bateria_bin} a{p.estado.alineacion_bin}
            </span>
            <span className="text-agent-400">{ACTION_LABELS[p.mejor_accion]}</span>
            <span className="text-slate-500">{p.q_valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
