"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchConfig } from "@/types";

const PRESETS = {
  tennis3: { label: "Tennis (Best of 3)", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
  tennis5: { label: "Tennis (Best of 5)", totalSets: 5, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
  padel: { label: "Padel (Best of 3)", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: true, goldenPoint: true },
  custom: { label: "Custom", totalSets: 3, gamesPerSet: 6, hasTiebreak: true, finalSetSuperTiebreak: false, goldenPoint: false },
} as const;

type PresetKey = keyof typeof PRESETS;

export default function SetupPage() {
  const router = useRouter();
  const [preset, setPreset] = useState<PresetKey>("tennis3");
  const [config, setConfig] = useState<Omit<MatchConfig, "player1Name" | "player2Name">>({
    totalSets: 3,
    gamesPerSet: 6,
    hasTiebreak: true,
    finalSetSuperTiebreak: false,
    goldenPoint: false,
  });
  const [player1Name, setPlayer1Name] = useState("Player 1");
  const [player2Name, setPlayer2Name] = useState("Player 2");

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
    const fullConfig: MatchConfig = { ...config, player1Name, player2Name };
    const encoded = encodeURIComponent(JSON.stringify(fullConfig));
    router.push(`/match?config=${encoded}`);
  }

  const inputClass =
    "bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg w-full focus:outline-none focus:border-yellow-400 transition-colors";
  const labelClass = "block text-gray-400 text-sm font-medium mb-1";

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center text-yellow-400 mb-2">🎾 Scorer</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">Tennis &amp; Padel</p>

        {/* Players */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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

        {/* Presets */}
        <div className="mb-6">
          <label className={labelClass}>Match Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  preset === key
                    ? "bg-yellow-400 text-gray-900"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom settings */}
        {preset === "custom" && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Sets</label>
                <select
                  className={inputClass}
                  value={config.totalSets}
                  onChange={(e) => setConfig((c) => ({ ...c, totalSets: Number(e.target.value) as 1 | 3 | 5 }))}
                >
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Games/Set</label>
                <select
                  className={inputClass}
                  value={config.gamesPerSet}
                  onChange={(e) => setConfig((c) => ({ ...c, gamesPerSet: Number(e.target.value) }))}
                >
                  {[4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
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
                label="Golden Point (no advantage)"
                checked={config.goldenPoint}
                onChange={(v) => setConfig((c) => ({ ...c, goldenPoint: v }))}
              />
            </div>
          </div>
        )}

        {/* Summary for non-custom */}
        {preset !== "custom" && (
          <div className="bg-gray-800 rounded-xl p-3 mb-6 flex flex-wrap gap-2">
            <Chip label={`${config.totalSets} sets`} />
            <Chip label={`${config.gamesPerSet} games/set`} />
            {config.hasTiebreak && <Chip label="Tiebreak" />}
            {config.finalSetSuperTiebreak && <Chip label="Super TB" />}
            {config.goldenPoint && <Chip label="Golden Point" />}
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full py-4 bg-yellow-400 text-gray-900 font-bold text-xl rounded-xl hover:bg-yellow-300 active:scale-95 transition-all"
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
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? "bg-yellow-400" : "bg-gray-600"}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-md">{label}</span>
  );
}
