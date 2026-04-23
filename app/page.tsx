"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchConfig, Player } from "@/types";

const PRESETS = {
  tennis3: { label: "Tennis Bo3", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
  tennis5: { label: "Tennis Bo5", totalSets: 5, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
  padel: { label: "Padel", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: true, goldenPoint: true },
  custom: { label: "Custom", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
} as const;

type PresetKey = keyof typeof PRESETS;

export default function SetupPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<PresetKey>("tennis3");
  const [config, setConfig] = useState<Omit<MatchConfig, "player1Name" | "player2Name" | "firstServer">>({
    totalSets: 3,
    gamesPerSet: 6,
    hasTiebreak: true,
    finalSetSuperTiebreak: false,
    goldenPoint: false,
  });
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [firstServer, setFirstServer] = useState<Player>(0);

  function applyPreset(key: PresetKey) {
    setPreset(key);
    if (key !== "custom") {
      const p = PRESETS[key];
      setConfig({
        totalSets: p.totalSets as 1 | 3 | 5,
        gamesPerSet: p.gamesPerSet,
        hasTiebreak: p.hasTiebreak,
        finalSetSuperTiebreak: p.finalSetSuperTiebreak,
        goldenPoint: p.goldenPoint,
      });
    }
  }

  function handleStart() {
    const fullConfig: MatchConfig = {
      ...config,
      player1Name: player1Name || "Player 1",
      player2Name: player2Name || "Player 2",
      firstServer,
    };
    const encoded = encodeURIComponent(JSON.stringify(fullConfig));
    router.push(`/match?config=${encoded}`);
  }

  const p1Display = player1Name || "Player 1";
  const p2Display = player2Name || "Player 2";

  const inputClass =
    "bg-transparent border-b border-neutral-800 text-white text-2xl font-bold w-full pb-2 focus:outline-none focus:border-white transition-colors placeholder-neutral-700";
  const labelClass = "block text-neutral-600 text-xs tracking-widest uppercase mb-2";

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-black text-white tracking-tight mb-1">Scorer</h1>
        <p className="text-neutral-600 text-xs tracking-widest uppercase mb-10">Tennis &amp; Padel</p>

        {/* Players */}
        <div className="mb-8 space-y-6">
          <div>
            <label className={labelClass}>Player 1</label>
            <input
              className={inputClass}
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              placeholder="Player 1"
            />
          </div>
          <div>
            <label className={labelClass}>Player 2</label>
            <input
              className={inputClass}
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              placeholder="Player 2"
            />
          </div>
        </div>

        {/* First server */}
        <div className="mb-8">
          <label className={labelClass}>First Server</label>
          <div className="grid grid-cols-2 gap-2">
            {([0, 1] as Player[]).map((p) => (
              <button
                key={p}
                onClick={() => setFirstServer(p)}
                className={`py-3 text-sm font-bold tracking-wide transition-colors ${
                  firstServer === p
                    ? "bg-white text-black"
                    : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
                }`}
              >
                {p === 0 ? p1Display : p2Display}
              </button>
            ))}
          </div>
        </div>

        {/* Match type */}
        <div className="mb-8">
          <label className={labelClass}>Match Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`py-3 text-sm font-bold tracking-wide transition-colors ${
                  preset === key
                    ? "bg-white text-black"
                    : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
                }`}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom settings */}
        {preset === "custom" && (
          <div className="border border-neutral-800 p-5 mb-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sets</label>
                <select
                  className="bg-black border-b border-neutral-700 text-white text-base w-full pb-2 focus:outline-none"
                  value={config.totalSets}
                  onChange={(e) => setConfig((c) => ({ ...c, totalSets: Number(e.target.value) as 1 | 3 | 5 }))}
                >
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Games / Set</label>
                <select
                  className="bg-black border-b border-neutral-700 text-white text-base w-full pb-2 focus:outline-none"
                  value={config.gamesPerSet}
                  onChange={(e) => setConfig((c) => ({ ...c, gamesPerSet: Number(e.target.value) }))}
                >
                  {[4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4 pt-1">
              <Toggle
                label="Tiebreak at equal games"
                checked={config.hasTiebreak}
                onChange={(v) => setConfig((c) => ({ ...c, hasTiebreak: v }))}
              />
              <Toggle
                label="Super Tiebreak (final set)"
                checked={config.finalSetSuperTiebreak}
                onChange={(v) => setConfig((c) => ({ ...c, finalSetSuperTiebreak: v }))}
              />
              <Toggle
                label="Golden Point"
                checked={config.goldenPoint}
                onChange={(v) => setConfig((c) => ({ ...c, goldenPoint: v }))}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full py-5 bg-white text-black font-black text-xl tracking-wide active:scale-95 transition-transform"
        >
          Start Match
        </button>
      </div>
    </main>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-400 text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 transition-colors ${checked ? "bg-white" : "bg-neutral-800"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 transition-transform ${
            checked ? "translate-x-5 bg-black" : "translate-x-0.5 bg-neutral-600"
          }`}
        />
      </button>
    </div>
  );
}
