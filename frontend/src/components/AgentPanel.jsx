import React, { useState } from "react";
import api from "../api/client.js";

const ACTION_LABELS = {
  increase_power: "Aumentar potencia",
  decrease_power: "Reducir potencia",
  maintain_power: "Mantener potencia",
  wait: "Esperar",
  change_frequency: "Cambiar frecuencia",
};

/**
 * Elemento distintivo del proyecto: el diagrama de flujo del Agente de
 * Markov (Estado -> Decision -> Nuevo estado -> Recompensa -> Siguiente
 * estado), animado como un circuito que "respira" con cada paso.
 */
function MarkovFlow({ decision, reward }) {
  const nodes = [
    { key: "estado", label: "Estado actual" },
    { key: "decision", label: "Decision" },
    { key: "nuevo", label: "Nuevo estado" },
    { key: "recompensa", label: "Recompensa" },
    { key: "siguiente", label: "Siguiente estado" },
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 640 90" className="w-full min-w-[560px] h-[90px]">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#7C5CF0" />
          </marker>
        </defs>
        {nodes.map((n, i) => {
          const x = 40 + i * 140;
          return (
            <g key={n.key}>
              <circle cx={x} cy={40} r={26} fill="#0F1620" stroke="#7C5CF0" strokeWidth="1.5" />
              <text x={x} y={44} textAnchor="middle" fontSize="9" fill="#B69CFF" fontFamily="JetBrains Mono, monospace">
                {n.label.split(" ")[0]}
              </text>
              <text x={x} y={78} textAnchor="middle" fontSize="8.5" fill="#64748B" fontFamily="JetBrains Mono, monospace">
                {n.label.split(" ").slice(1).join(" ")}
              </text>
              {i < nodes.length - 1 && (
                <line
                  x1={x + 26}
                  y1={40}
                  x2={x + 114}
                  y2={40}
                  stroke="#7C5CF0"
                  strokeWidth="1.5"
                  className="flow-line"
                  markerEnd="url(#arrow)"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] font-mono text-slate-500 px-2 -mt-1">
        <span>observado</span>
        <span className="text-agent-400">{decision ? ACTION_LABELS[decision.action] : "—"}</span>
        <span>fisica(s,a)</span>
        <span className={reward >= 0 ? "text-emerald-400" : "text-danger-500"}>
          {reward !== undefined ? reward.toFixed(2) : "—"}
        </span>
        <span>s'</span>
      </div>
    </div>
  );
}

function QValueBars({ qValues }) {
  if (!qValues) return null;
  const entries = Object.entries(qValues);
  const max = Math.max(0.001, ...entries.map(([, v]) => Math.abs(v)));

  return (
    <div className="space-y-1.5 mt-3">
      {entries.map(([action, value]) => (
        <div key={action} className="flex items-center gap-2">
          <span className="w-32 text-[10px] font-mono text-slate-400 truncate">
            {ACTION_LABELS[action]}
          </span>
          <div className="flex-1 h-2 bg-lab-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${value >= 0 ? "bg-agent-500" : "bg-danger-500"}`}
              style={{ width: `${(Math.abs(value) / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-[10px] font-mono text-slate-500 text-right">{value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AgentPanel({ decision, reward }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const res = await api.explain();
      setExplanation(res.explanation);
    } catch {
      setExplanation("No se pudo obtener la explicacion del backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-lab-900/80 border border-lab-700 rounded-xl p-4 backdrop-blur-sm shadow-lg shadow-glow-agent">
      <h3 className="text-xs font-mono uppercase tracking-widest text-agent-400 mb-3">
        Agente de Markov
      </h3>

      <MarkovFlow decision={decision} reward={reward} />

      <div className="h-px bg-lab-700 my-3" />

      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
        Valores Q por accion
      </span>
      <QValueBars qValues={decision?.q_values} />

      <button
        onClick={handleExplain}
        disabled={loading}
        className="w-full mt-4 text-[11px] font-mono uppercase tracking-wider py-2 rounded-lg bg-agent-600/15 border border-agent-500/50 text-agent-400 hover:bg-agent-600/25 transition-colors disabled:opacity-50"
      >
        {loading ? "Analizando..." : "Explicar decision"}
      </button>

      {explanation && (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-300 font-mono bg-lab-800/60 border border-lab-700 rounded-lg p-3">
          {explanation}
        </p>
      )}
    </div>
  );
}
