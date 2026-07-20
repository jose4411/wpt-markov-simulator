import React, { useState } from "react";
import api from "../api/client.js";

function Slider({ label, unit, value, min, max, step, onChange, accent = "signal" }) {
  const accentColor = accent === "agent" ? "#9B7DFF" : accent === "warn" ? "#FF9B45" : "#22D3EE";
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">{label}</span>
        <span className="text-xs font-mono tabular text-slate-200">
          {value}
          <span className="text-slate-500">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-lab-700 accent-signal-500"
        style={{ accentColor }}
      />
    </div>
  );
}

export default function Controls({ onReset }) {
  const [distance, setDistance] = useState(5);
  const [misalignment, setMisalignment] = useState(5);
  const [frequency, setFrequency] = useState(200);
  const [ambientHeat, setAmbientHeat] = useState(28);
  const [autoMode, setAutoMode] = useState(true);
  const [manualPower, setManualPower] = useState(20);
  const [batteryReset, setBatteryReset] = useState(20);

  const push = (payload) => api.updateControls(payload).catch(() => {});

  return (
    <div className="bg-lab-900/80 border border-lab-700 rounded-xl p-4 backdrop-blur-sm shadow-lg">
      <h3 className="text-xs font-mono uppercase tracking-widest text-signal-500 mb-3">
        Parametros de campo
      </h3>

      <Slider
        label="Distancia entre bobinas"
        unit=" cm"
        value={distance}
        min={2}
        max={20}
        step={0.5}
        onChange={(v) => {
          setDistance(v);
          push({ distance_cm: v });
        }}
      />
      <Slider
        label="Desalineacion"
        unit="%"
        value={misalignment}
        min={0}
        max={100}
        step={1}
        onChange={(v) => {
          setMisalignment(v);
          push({ misalignment: v / 100 });
        }}
      />
      <Slider
        label="Perturbacion termica"
        unit=" C"
        value={ambientHeat}
        min={20}
        max={95}
        step={1}
        accent="warn"
        onChange={(v) => {
          setAmbientHeat(v);
          push({ ambient_heat_c: v });
        }}
      />

      <div className="h-px bg-lab-700 my-4" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
          Modo de control
        </span>
        <button
          onClick={() => {
            const next = !autoMode;
            setAutoMode(next);
            push({ auto_mode: next });
          }}
          className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
            autoMode
              ? "bg-agent-600/20 border-agent-500 text-agent-400"
              : "bg-lab-800 border-lab-600 text-slate-400"
          }`}
        >
          {autoMode ? "AGENTE AUTOMATICO" : "MANUAL"}
        </button>
      </div>

      <Slider
        label="Frecuencia de operacion"
        unit=" kHz"
        value={frequency}
        min={100}
        max={500}
        step={5}
        accent="agent"
        onChange={(v) => {
          setFrequency(v);
          if (!autoMode) push({ frequency_khz: v });
        }}
      />
      <Slider
        label="Potencia transmitida (manual)"
        unit=" W"
        value={manualPower}
        min={0}
        max={100}
        step={1}
        accent="agent"
        onChange={(v) => {
          setManualPower(v);
          if (!autoMode) push({ manual_power_w: v });
        }}
      />

      {!autoMode && (
        <p className="text-[10px] text-slate-500 font-mono leading-relaxed mb-2">
          El agente sigue observando el estado pero no actua: tu controlas potencia y frecuencia.
        </p>
      )}

      <div className="h-px bg-lab-700 my-4" />

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={batteryReset}
          onChange={(e) => setBatteryReset(parseFloat(e.target.value))}
          className="w-16 bg-lab-800 border border-lab-600 rounded px-2 py-1 text-xs font-mono text-slate-200"
        />
        <button
          onClick={() => onReset(batteryReset)}
          className="flex-1 text-[11px] font-mono uppercase tracking-wider py-2 rounded-lg bg-signal-600/15 border border-signal-500/50 text-signal-400 hover:bg-signal-600/25 transition-colors"
        >
          Reiniciar simulacion
        </button>
      </div>
    </div>
  );
}
