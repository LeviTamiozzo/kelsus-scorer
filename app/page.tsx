"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchConfig, Player } from "@/types";

const PRESETS = {
  tennis3: { label: "Best of 3", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
  tennis5: { label: "Best of 5", totalSets: 5, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
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

  const labelClass = "block text-zinc-400 text-xs tracking-widest uppercase mb-2";

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-1">Scorer</h1>
        <p className="text-zinc-400 text-xs tracking-widest uppercase mb-10">Tennis &amp; Padel</p>

        {/* Players */}
        <div className="mb-8 space-y-6">
          <div>
            <label className={labelClass}>Player 1</label>
            <input
              className="bg-transparent border-b border-zinc-200 text-zinc-900 text-2xl font-bold w-full pb-2 focus:outline-none focus:border-zinc-900 transition-colors placeholder-zinc-300"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              placeholder="Player 1"
            />
          </div>
          <div>
            <label className={labelClass}>Player 2</label>
            <input
              className="bg-transparent border-b border-zinc-200 text-zinc-900 text-2xl font-bold w-full pb-2 focus:outline-none focus:border-zinc-900 transition-colors placeholder-zinc-300"
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
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 text-zinc-400 hover:border-zinc-400"
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
                  key === "custom" ? "col-span-2" : ""
                } ${
                  preset === key
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 text-zinc-400 hover:border-zinc-400"
                }`}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom settings */}
        {preset === "custom" && (
          <div className="border border-zinc-200 p-5 mb-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Sets</label>
                <select
                  className="bg-white border-b border-zinc-200 text-zinc-900 text-base w-full pb-2 focus:outline-none"
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
                  className="bg-white border-b border-zinc-200 text-zinc-900 text-base w-full pb-2 focus:outline-none"
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
          className="w-full py-5 bg-zinc-900 text-white font-bold text-xl tracking-wide active:scale-95 transition-transform"
        >
          Start Match
        </button>
      </div>
    </main>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left w-full"
    >
      <span
        className={`w-5 h-5 border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          checked ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white"
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 3.5L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-zinc-600 text-sm">{label}</span>
    </button>
  );
}
