"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import type { MatchConfig, Player } from "@/types";
import { useMatchState } from "@/hooks/useMatchState";
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

  const { state, addPoint, undoPoint } = useMatchState(config);
  const { sets, currentSet, currentGame, isTiebreak, isSuperTiebreak, winner, server } = state;

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

  const completedSets = sets.filter((s) => s.winner !== null);
  const p1Sets = completedSets.filter((s) => s.winner === 0).length;
  const p2Sets = completedSets.filter((s) => s.winner === 1).length;
  const isInTiebreak = isTiebreak || isSuperTiebreak;

  // During a tiebreak: 1 serve, then alternate every 2 (1, 2, 2, 2, ...)
  function getCurrentServer(): Player {
    if (!isInTiebreak) return server;
    const pts = sets[currentSet]?.tiebreakPoints ?? [0, 0];
    const total = pts[0] + pts[1];
    return Math.floor((total + 1) / 2) % 2 === 0 ? server : (server === 0 ? 1 : 0);
  }

  const currentServer = getCurrentServer();

  return (
    <main className="min-h-screen bg-white flex flex-col select-none overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-zinc-100">
        <button
          onClick={() => router.push("/")}
          className="text-zinc-400 text-xs tracking-widest uppercase hover:text-zinc-900 transition-colors"
        >
          ← Back
        </button>
        <span className="text-zinc-300 text-xs tracking-widest uppercase">
          {isInTiebreak ? (isSuperTiebreak ? "Super TB" : "Tiebreak") : ""}
        </span>
        <button
          onClick={undoPoint}
          className="text-zinc-400 text-xs tracking-widest uppercase hover:text-zinc-900 transition-colors disabled:opacity-25"
          disabled={state.history.length === 0}
        >
          Undo
        </button>
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
          />
          <div className="h-px landscape:w-px bg-zinc-100 shrink-0" />
          <PlayerPanel
            name={config.player2Name}
            setsWon={p2Sets}
            currentSetGames={getSetGames(currentSet, 1)}
            pointLabel={getPointLabel(1)}
            allSets={sets}
            playerSide={1}
            onScore={() => addPoint(1)}
            isServing={currentServer === 1}
          />
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
}: PlayerPanelProps) {
  const completedSets = allSets.filter((s) => s.winner !== null);

  return (
    <button
      onClick={onScore}
      className="flex-1 flex flex-col justify-center px-8 landscape:px-14 py-6 bg-white cursor-pointer active:bg-zinc-50 transition-colors"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Name row */}
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-xl leading-none ${isServing ? "visible" : "invisible"}`}>🎾</span>
        <span className="text-2xl font-bold text-zinc-900 tracking-tight truncate max-w-[200px] landscape:max-w-xs">
          {name}
        </span>
        <span className="text-xl font-bold text-zinc-300 ml-auto">{setsWon}</span>
      </div>

      {/* Past set scores */}
      {completedSets.length > 0 && (
        <div className="flex gap-5 mb-3 pl-9">
          {completedSets.map((set, i) => (
            <span
              key={i}
              className={`text-base font-bold ${set.winner === playerSide ? "text-zinc-900" : "text-zinc-300"}`}
            >
              {set.games[playerSide]}
              {set.tiebreakPoints !== undefined && (
                <sup className="text-xs text-zinc-400 ml-0.5">
                  {set.tiebreakPoints[playerSide]}
                </sup>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Current games */}
      <div className="text-[5.5rem] landscape:text-[6rem] font-bold text-zinc-900 leading-none mb-1 pl-9">
        {currentSetGames}
      </div>

      {/* Current points */}
      <div className="text-[8rem] landscape:text-[9rem] font-bold text-zinc-900 leading-none pl-9">
        {pointLabel}
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
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-white">
      <h2 className="text-5xl font-bold text-zinc-900 text-center tracking-tight">{winnerName}</h2>
      <p className="text-zinc-400 text-sm tracking-widest uppercase">wins the match</p>
      <div className="text-4xl font-bold text-zinc-900 tracking-tight">
        {winner === 0 ? p1Sets : p2Sets} – {winner === 0 ? p2Sets : p1Sets}
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onRematch}
          className="px-8 py-4 bg-zinc-900 text-white font-bold tracking-wide active:scale-95 transition-transform"
        >
          Rematch
        </button>
        <button
          onClick={onNewMatch}
          className="px-8 py-4 border border-zinc-200 text-zinc-700 font-bold tracking-wide active:scale-95 transition-transform"
        >
          New Match
        </button>
      </div>
    </div>
  );
}
