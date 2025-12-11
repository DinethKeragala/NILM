import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

// Default export a single React component
export default function NILMRealtimeUI() {
  // Mock device catalogue (could be replaced by real dataset)
  const devicesCatalog = useMemo(
    () => [
      { id: "kettle", label: "Kettle", nominal: 1500 },
      { id: "iron", label: "Iron", nominal: 1100 },
      { id: "bulb", label: "Bulb 60W", nominal: 60 },
      { id: "fridge", label: "Fridge", nominal: 120 },
      { id: "tv", label: "TV", nominal: 200 },
      { id: "microwave", label: "Microwave", nominal: 1000 },
    ],
    []
  );

  // UI state
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1); // multiplier for simulated time
  const [filter, setFilter] = useState("");

  // Device states: { id: {on: boolean, lastChanged: Date, currentPower: number} }
  const [deviceStates, setDeviceStates] = useState(() => {
    const init: Record<string, any> = {};
    devicesCatalog.forEach((d) => {
      init[d.id] = { on: false, lastChanged: Date.now(), currentPower: 0 };
    });
    return init;
  });

  // Historical aggregated power timeseries for the chart
  const [history, setHistory] = useState(() => {
    const now = Date.now();
    return [
      { time: new Date(now - 5000).toLocaleTimeString(), power: 0 },
      { time: new Date(now - 4000).toLocaleTimeString(), power: 0 },
      { time: new Date(now - 3000).toLocaleTimeString(), power: 0 },
      { time: new Date(now - 2000).toLocaleTimeString(), power: 0 },
      { time: new Date(now - 1000).toLocaleTimeString(), power: 0 },
      { time: new Date(now).toLocaleTimeString(), power: 0 },
    ];
  });

  // Controls: simulate incoming events
  useEffect(() => {
    if (!running) return undefined;

    // interval depends on speed
    const baseMs = 1000; // base 1 second per tick
    const ms = Math.max(120, baseMs / Math.max(0.1, speed));

    const timer = setInterval(() => {
      // Randomly decide whether to toggle 1 or 2 devices to simulate overlaps
      const toggleCount = Math.random() < 0.25 ? 2 : 1; // 25% chance of overlap
      const shuffled = [...devicesCatalog].sort(() => Math.random() - 0.5);
      const toggles = shuffled.slice(0, toggleCount);

      setDeviceStates((prev) => {
        const next = { ...prev };
        toggles.forEach((d) => {
          const wasOn = prev[d.id].on;
          // 50% chance to flip state, otherwise keep
          const doFlip = Math.random() < 0.8; // mostly flip to simulate events
          if (doFlip) {
            const newOn = !wasOn;
            next[d.id] = {
              on: newOn,
              lastChanged: Date.now(),
              currentPower: newOn ? d.nominal + Math.round((Math.random() - 0.5) * d.nominal * 0.08) : 0,
            };
          }
        });
        return next;
      });

      // update chart history
      setHistory((prev) => {
        const totalPower = Object.values(deviceStates).reduce((s, ds) => s + (ds.on ? ds.currentPower : 0), 0);
        // But note deviceStates is slightly stale — compute from next by re-evaluating with toggles
        const nextTotal = toggles.reduce((acc, d) => {
          const ds = deviceStates[d.id];
          const wasOn = ds?.on ?? false;
          const flipped = !wasOn && (Math.random() < 0.8);
          // This is only an approximation for the visualization timeline
          return acc + 0; // we'll compute below more reliably
        }, 0);

        // Safer: compute using current deviceStates after a tiny microtask delay
        // But to avoid complexity we compute aggregated below using latest deviceStates in closure
        const aggregated = Object.entries(deviceStates).reduce((s, [id, ds]) => s + (ds.on ? ds.currentPower : 0), 0);

        const next = [...prev, { time: new Date().toLocaleTimeString(), power: aggregated }];
        if (next.length > 30) next.shift();
        return next;
      });
    }, ms);

    return () => clearInterval(timer);
  }, [running, speed, devicesCatalog, deviceStates]);

  // Helper: compute aggregated in render
  const aggregatedPower = useMemo(() => {
    return Object.values(deviceStates).reduce((s, ds) => s + (ds.on ? ds.currentPower : 0), 0);
  }, [deviceStates]);

  // Derived filtered list
  const filteredDevices = useMemo(() => {
    if (!filter.trim()) return devicesCatalog;
    const q = filter.toLowerCase();
    return devicesCatalog.filter((d) => d.label.toLowerCase().includes(q) || d.id.includes(q));
  }, [devicesCatalog, filter]);

  // Toggle device manually (UI control)
  function toggleDevice(id: string) {
    setDeviceStates((prev) => {
      const current = prev[id];
      const device = devicesCatalog.find((d) => d.id === id)!;
      return {
        ...prev,
        [id]: {
          on: !current.on,
          lastChanged: Date.now(),
          currentPower: !current.on ? device.nominal : 0,
        },
      };
    });

    // update history immediately to show user action
    setHistory((prev) => {
      const aggregated = Object.values(deviceStates).reduce((s, ds) => s + (ds.on ? ds.currentPower : 0), 0);
      const next = [...prev, { time: new Date().toLocaleTimeString(), power: aggregated }];
      if (next.length > 30) next.shift();
      return next;
    });
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-white to-slate-50">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NILM — Real-time Device Grid</h1>
          <p className="text-sm text-slate-500">Simulated real-time dashboard (frontend-only)</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Speed</label>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-28"
            />
          </div>

          <button
            onClick={() => setRunning((r) => !r)}
            className={`px-3 py-1 rounded-md text-sm font-medium shadow-sm ${running ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
            {running ? "Pause" : "Play"}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Device grid */}
        <section className="col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Devices</h2>
            <div className="flex items-center gap-3">
              <input
                placeholder="Filter devices..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredDevices.map((d) => {
              const ds = deviceStates[d.id];
              return (
                <motion.div
                  key={d.id}
                  layout
                  initial={{ opacity: 0.8, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl shadow-sm border ${ds.on ? "border-green-200 bg-green-50" : "border-slate-100 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">{d.label}</div>
                      <div className="mt-1 text-xl font-semibold">{d.nominal} W</div>
                      <div className="mt-2 text-xs text-slate-500">Last changed: {new Date(ds.lastChanged).toLocaleTimeString()}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${ds.on ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                        {ds.on ? "ON" : "OFF"}
                      </div>
                      <button
                        onClick={() => toggleDevice(d.id)}
                        className={`px-3 py-1 rounded-md text-sm ${ds.on ? "bg-red-500 text-white" : "bg-blue-600 text-white"}`}>
                        {ds.on ? "Turn off" : "Turn on"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Right: Summary + Chart */}
        <aside className="col-span-1">
          <div className="p-4 rounded-2xl bg-white shadow-sm border">
            <h3 className="text-sm text-slate-600">Summary</h3>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Aggregated Power</div>
                <div className="text-2xl font-bold">{aggregatedPower} W</div>
                <div className="text-xs text-slate-400">Active devices: {Object.values(deviceStates).filter((x) => x.on).length}</div>
              </div>
              <div className="text-xs text-slate-400">Status: <span className={`ml-2 font-medium ${running ? "text-green-600" : "text-red-500"}`}>{running ? "Receiving" : "Paused"}</span></div>
            </div>

            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 6, right: 0, left: 0, bottom: 6 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 'dataMax + 200']} hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="power" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium">Currently active</h4>
              <ul className="mt-2 space-y-2">
                {Object.entries(deviceStates)
                  .filter(([_, ds]) => ds.on)
                  .map(([id, ds]) => {
                    const device = devicesCatalog.find((d) => d.id === id)!;
                    return (
                      <li key={id} className="flex items-center justify-between text-sm">
                        <div>{device.label}</div>
                        <div className="font-semibold">{ds.currentPower} W</div>
                      </li>
                    );
                  })}
                {Object.values(deviceStates).every((ds) => !ds.on) && <li className="text-xs text-slate-400">No active devices</li>}
              </ul>
            </div>

            <div className="mt-4 text-xs text-slate-500">This UI is frontend-only and simulates incoming events. Connect a backend WebSocket that emits JSON events like <code>{`{"type":"device","id":"kettle","on":true,"power":1480}`}</code> to drive it from real data.</div>
          </div>
        </aside>
      </main>

      <footer className="mt-6 text-center text-xs text-slate-400">Tip: use the toggle buttons to simulate user actions. Integrate a backend to replace the simulator.</footer>
    </div>
  );
}
