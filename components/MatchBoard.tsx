"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import type { MatchConfig, Player } from "@/types";
import { useMatchState } from "@/hooks/useMatchState";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { POINT_LABELS } from "@/types";

export default function MatchBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const config = useMemo<MatchConfig>(() => {
    try {
      return JSON.parse(decodeURIComponent(searchParams.get("config") ?? "{}"));
    } catch {
      return {
        player1Name: "Player 1",
        player2Name: "Player 2",
        firstServer: 0,
        totalSets: 3,
        gamesPerSet: 6,
        hasTiebreak: true,
        finalSetSuperTiebreak: false,
        goldenPoint: false,
      };
    }
  }, [searchParams]);

  const { state, addPoint, undoPoint, setGameScore, winGame, setCurrentSetGames } = useMatchState(config);
  const { sets, currentSet, currentGame, isTiebreak, isSuperTiebreak, winner, server } = state;

  const completedSets = sets.filter((s) => s.winner !== null);
  const p1Sets = completedSets.filter((s) => s.winner === 0).length;
  const p2Sets = completedSets.filter((s) => s.winner === 1).length;
  const isInTiebreak = isTiebreak || isSuperTiebreak;

  const currentServer: Player = (() => {
    if (!isInTiebreak) return server;
    const pts = sets[currentSet]?.tiebreakPoints ?? [0, 0];
    const total = pts[0] + pts[1];
    return Math.floor((total + 1) / 2) % 2 === 0 ? server : (server === 0 ? 1 : 0);
  })();

  const { isListening, isSupported, feedback, toggleListening } = useVoiceCommands({
    config,
    onWinGame: winGame,
    onUndo: undoPoint,
    onSetGameScore: setGameScore,
    onSetCurrentSet: setCurrentSetGames,
    active: winner === null,
    currentServer,
  });

  function getPointLabel(playerIdx: Player): string {
    if (isTiebreak || isSuperTiebreak) {
      return String(sets[currentSet]?.tiebreakPoints?.[playerIdx] ?? 0);
    }
    const { points, deuce, advantage } = currentGame;
    if (deuce) {
      if (advantage === null) return "40";
      return advantage === playerIdx ? "AD" : "40";
    }
    return POINT_LABELS[points[playerIdx]] ?? "0";
  }

  function getSetGames(setIdx: number, playerIdx: Player): number {
    return sets[setIdx]?.games[playerIdx] ?? 0;
  }

  return (
    <main className="min-h-screen bg-[#0a1628] flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="text-slate-500 text-xs font-semibold tracking-widest uppercase active:text-white transition-colors"
        >
          ← Back
        </button>
        <span className="text-emerald-400/60 text-xs font-semibold tracking-widest uppercase">
          {isInTiebreak ? (isSuperTiebreak ? "Super TB" : "Tiebreak") : ""}
        </span>

        <div className="flex items-center gap-4">
          {isSupported && (
            <button
              onClick={toggleListening}
              className={`text-xs font-semibold tracking-widest uppercase transition-colors ${
                isListening
                  ? "text-[#4ade80] animate-pulse"
                  : "text-slate-500 active:text-white"
              }`}
            >
              {isListening ? "● Mic" : "Mic"}
            </button>
          )}
          <button
            onClick={undoPoint}
            className="text-slate-500 text-xs font-semibold tracking-widest uppercase active:text-white transition-colors disabled:opacity-20"
            disabled={state.history.length === 0}
          >
            Undo
          </button>
        </div>
      </div>

      {winner !== null ? (
        <WinnerScreen
          winner={winner}
          config={config}
          p1Sets={p1Sets}
          p2Sets={p2Sets}
          onNewMatch={() => router.push("/")}
          onRematch={() => router.push(`/match?config=${encodeURIComponent(JSON.stringify(config))}&t=${Date.now()}`)}
        />
      ) : (
        <div className="flex-1 flex flex-col landscape:flex-row">
          <PlayerPanel
            name={config.player1Name}
            setsWon={p1Sets}
            currentSetGames={getSetGames(currentSet, 0)}
            pointLabel={getPointLabel(0)}
            allSets={sets}
            playerSide={0}
            onScore={() => addPoint(0)}
            isServing={currentServer === 0}
            position="top"
          />
          <div className="h-px landscape:h-auto landscape:w-px bg-white/[0.06] shrink-0" />
          <PlayerPanel
            name={config.player2Name}
            setsWon={p2Sets}
            currentSetGames={getSetGames(currentSet, 1)}
            pointLabel={getPointLabel(1)}
            allSets={sets}
            playerSide={1}
            onScore={() => addPoint(1)}
            isServing={currentServer === 1}
            position="bottom"
          />
        </div>
      )}

      {/* Voice feedback toast */}
      {feedback && (
        <div className="fixed bottom-8 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-[#4ade80] text-[#0a1628] text-xs font-bold px-5 py-2.5 rounded-full shadow-lg tracking-widest uppercase">
            {feedback}
          </div>
        </div>
      )}
    </main>
  );
}

interface PlayerPanelProps {
  name: string;
  setsWon: number;
  currentSetGames: number;
  pointLabel: string;
  allSets: ReturnType<typeof useMatchState>["state"]["sets"];
  playerSide: Player;
  onScore: () => void;
  isServing: boolean;
  position: "top" | "bottom";
}

function PlayerPanel({
  name,
  setsWon,
  currentSetGames,
  pointLabel,
  allSets,
  playerSide,
  onScore,
  isServing,
  position,
}: PlayerPanelProps) {
  const completedSets = allSets.filter((s) => s.winner !== null);

  return (
    <button
      onClick={onScore}
      className={`flex-1 flex flex-col justify-center px-6 landscape:px-10 cursor-pointer transition-colors outline-none ${
        position === "top"
          ? "bg-[#0e1c34] active:bg-[#132446]"
          : "bg-[#0b1729] active:bg-[#0f1f3d]"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Name + serve indicator */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className={`w-3 h-3 rounded-full shrink-0 transition-all ${
            isServing
              ? "bg-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.5)]"
              : "bg-white/10"
          }`}
        />
        <span className="text-white/90 font-bold text-xl tracking-wide truncate uppercase max-w-[200px] landscape:max-w-xs">
          {name}
        </span>
        <span className="text-white/20 text-base font-bold ml-auto tabular-nums">
          {setsWon}
        </span>
      </div>

      {/* Completed sets row */}
      {completedSets.length > 0 && (
        <div className="flex items-center gap-2 pl-5 mb-3">
          {completedSets.map((set, i) => (
            <div
              key={i}
              className="w-12 h-12 flex items-center justify-center rounded-md bg-white/[0.04]"
            >
              <span
                className={`text-2xl font-bold tabular-nums ${
                  set.winner === playerSide ? "text-white/80" : "text-white/25"
                }`}
              >
                {set.games[playerSide]}
                {set.tiebreakPoints !== undefined && (
                  <sup className="text-xs text-white/30 ml-0.5">
                    {set.tiebreakPoints[playerSide]}
                  </sup>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Current game + point score */}
      <div className="flex items-center gap-2 pl-5">
        <div className="w-[5.5rem] h-[5.5rem] flex items-center justify-center rounded-lg bg-white/[0.07]">
          <span className="text-[3.5rem] font-extrabold text-white tabular-nums leading-none">
            {currentSetGames}
          </span>
        </div>

        <div className="min-w-[5.5rem] h-[5.5rem] px-2 flex items-center justify-center rounded-lg bg-[#4ade80]/[0.1]">
          <span className="text-[3.5rem] font-extrabold text-[#4ade80] tabular-nums leading-none">
            {pointLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

function WinnerScreen({
  winner,
  config,
  p1Sets,
  p2Sets,
  onNewMatch,
  onRematch,
}: {
  winner: Player;
  config: MatchConfig;
  p1Sets: number;
  p2Sets: number;
  onNewMatch: () => void;
  onRematch: () => void;
}) {
  const winnerName = winner === 0 ? config.player1Name : config.player2Name;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-[#4ade80]/70 text-xs font-bold tracking-[0.3em] uppercase">
        Match Complete
      </div>
      <h2 className="text-4xl font-extrabold text-white text-center tracking-tight uppercase">
        {winnerName}
      </h2>
      <p className="text-white/40 text-sm tracking-widest uppercase">wins the match</p>
      <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
        {winner === 0 ? p1Sets : p2Sets} – {winner === 0 ? p2Sets : p1Sets}
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={onRematch}
          className="px-7 py-3.5 bg-[#4ade80] text-[#0a1628] font-bold tracking-wide rounded-lg active:scale-95 transition-transform uppercase text-sm"
        >
          Rematch
        </button>
        <button
          onClick={onNewMatch}
          className="px-7 py-3.5 border border-white/20 text-white/70 font-bold tracking-wide rounded-lg active:scale-95 transition-transform uppercase text-sm"
        >
          New Match
        </button>
      </div>
    </div>
  );
}
