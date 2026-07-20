import React, { Suspense } from "react";
import Scene from "./components/Scene.jsx";
import Controls from "./components/Controls.jsx";
import Indicators from "./components/Indicators.jsx";
import AgentPanel from "./components/AgentPanel.jsx";
import Dashboard from "./components/Dashboard.jsx";
import { useSimulationLoop } from "./hooks/useSimulationLoop.js";

export default function App() {
  const { simState, decision, reward, historyLog, connected, reset } = useSimulationLoop({
    intervalMs: 700,
  });

  // 🛡️ GUARDIÁN: Evita que Three.js y React colapsen si simState es undefined/null
  if (!simState) {
    return (
      <div className="min-h-screen w-full bg-lab-950 text-slate-100 flex flex-col items-center justify-center font-mono">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <p className="text-sm text-slate-300">Conectando con el servidor de Markov...</p>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          {connected ? "Cargando estado inicial..." : "Esperando conexión al backend..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-lab-950 text-slate-100 overflow-hidden">
      {/* --- Encabezado --- */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-lab-700 bg-lab-950/90 backdrop-blur-sm relative z-10">
        <div>
          <h1 className="font-display text-lg tracking-tight text-slate-100">
            Simulador Inteligente de Transferencia Inalámbrica de Energía
          </h1>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            Agente de Markov · Acoplamiento resonante · Visualización educativa (no EM real)
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-danger-500"} pulse-glow`} />
          {connected ? "backend conectado" : "sin conexión al backend"}
        </div>
      </header>

      {/* --- Layout principal: escena 3D + paneles laterales --- */}
      <main className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 p-4 h-[calc(100vh-73px)]">
        {/* Panel izquierdo: controles */}
        <aside className="overflow-y-auto pr-1 space-y-4">
          <Controls onReset={reset} />
        </aside>

        {/* Centro: escena 3D + indicadores superpuestos */}
        <section className="relative rounded-2xl overflow-hidden border border-lab-700 bg-gradient-to-b from-lab-900 to-lab-950">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">
                Cargando laboratorio 3D...
              </div>
            }
          >
            <Scene simState={simState} />
          </Suspense>

          <div className="absolute top-4 left-4 w-72 pointer-events-none opacity-95">
            <div className="pointer-events-auto">
              <Indicators simState={simState} reward={reward} />
            </div>
          </div>
        </section>

        {/* Panel derecho: agente + dashboard */}
        <aside className="overflow-y-auto pl-1 space-y-4">
          <AgentPanel decision={decision} reward={reward} />
          <Dashboard historyLog={historyLog} />
        </aside>
      </main>

      <div className="crt-vignette" />
    </div>
  );
}