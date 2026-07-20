import React from "react";

function Stat({ label, value, unit, accent = "text-signal-400", danger = false }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">{label}</span>
      <span className={`text-xl font-mono tabular font-medium ${danger ? "text-danger-500" : accent}`}>
        {value}
        <span className="text-sm text-slate-500 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

const STATUS_STYLES = {
  TRANSFIRIENDO: { color: "text-signal-400", dot: "bg-signal-500" },
  "CARGA COMPLETA": { color: "text-emerald-400", dot: "bg-emerald-400" },
  "BAJA EFICIENCIA": { color: "text-warn-500", dot: "bg-warn-500" },
  SOBRECALENTAMIENTO: { color: "text-danger-500", dot: "bg-danger-500" },
  OK: { color: "text-slate-400", dot: "bg-slate-400" },
};

export default function Indicators({ simState, reward }) {
  if (!simState) {
    return (
      <div className="bg-lab-900/80 border border-lab-700 rounded-xl p-4 text-slate-500 font-mono text-xs">
        Conectando con el backend...
      </div>
    );
  }

  const {
    efficiency,
    power_rx_w,
    losses_w,
    temperature_c,
    battery_pct,
    status,
    coupling_k,
  } = simState;

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.OK;
  const overheating = temperature_c > 75;

  return (
    <div className="bg-lab-900/80 border border-lab-700 rounded-xl p-4 backdrop-blur-sm shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-signal-500">
          Telemetria en vivo
        </h3>
        <span className={`flex items-center gap-1.5 text-[11px] font-mono ${statusStyle.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} pulse-glow`} />
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-3 mb-4">
        <Stat label="Eficiencia" value={(efficiency * 100).toFixed(1)} unit="%" />
        <Stat label="Potencia recibida" value={power_rx_w.toFixed(1)} unit="W" />
        <Stat label="Perdidas" value={losses_w.toFixed(1)} unit="W" accent="text-warn-500" />
        <Stat
          label="Temperatura"
          value={temperature_c.toFixed(1)}
          unit="C"
          danger={overheating}
          accent={overheating ? "" : "text-slate-200"}
        />
        <Stat label="Bateria" value={battery_pct.toFixed(1)} unit="%" accent="text-emerald-400" />
        <Stat label="Acoplamiento k" value={coupling_k.toFixed(3)} unit="" accent="text-agent-400" />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
          <span>NIVEL DE BATERIA</span>
          <span>{battery_pct.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-lab-800 overflow-hidden border border-lab-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-600 to-emerald-400 transition-all duration-500"
            style={{ width: `${battery_pct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-lab-700 mt-3">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
          Recompensa (t)
        </span>
        <span className={`font-mono text-sm ${reward >= 0 ? "text-emerald-400" : "text-danger-500"}`}>
          {reward >= 0 ? "+" : ""}
          {reward.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
