"use client";

import { useState, useCallback } from "react";
import type { MatchConfig, MatchState, MatchSnapshot, Player, SetScore, GameState } from "@/types";

function initialGame(): GameState {
  return { points: [0, 0], deuce: false, advantage: null };
}

function initialSet(): SetScore {
  return { games: [0, 0], winner: null };
}

function snapshotState(state: MatchState): MatchSnapshot {
  return {
    sets: JSON.parse(JSON.stringify(state.sets)),
    currentSet: state.currentSet,
    currentGame: JSON.parse(JSON.stringify(state.currentGame)),
    isTiebreak: state.isTiebreak,
    isSuperTiebreak: state.isSuperTiebreak,
    winner: state.winner,
    server: state.server,
  };
}

export function createInitialMatchState(config: MatchConfig): MatchState {
  return {
    config,
    sets: [initialSet()],
    currentSet: 0,
    currentGame: initialGame(),
    isTiebreak: false,
    isSuperTiebreak: false,
    winner: null,
    server: config.firstServer ?? 0,
    history: [],
  };
}

function isFinalSet(state: MatchState): boolean {
  const setsToWin = Math.ceil(state.config.totalSets / 2);
  const p1Sets = state.sets.filter((s) => s.winner === 0).length;
  const p2Sets = state.sets.filter((s) => s.winner === 1).length;
  return p1Sets === setsToWin - 1 && p2Sets === setsToWin - 1;
}

function checkTiebreakNeeded(state: MatchState, newGames: [number, number]): boolean {
  const { gamesPerSet, hasTiebreak, finalSetSuperTiebreak } = state.config;
  const tied = newGames[0] === gamesPerSet && newGames[1] === gamesPerSet;
  if (!tied) return false;
  if (isFinalSet(state) && finalSetSuperTiebreak) return true;
  return hasTiebreak;
}

function applyGameWin(state: MatchState, winner: Player): MatchState {
  const sets = JSON.parse(JSON.stringify(state.sets)) as SetScore[];
  const currentSetData = sets[state.currentSet];
  const newGames: [number, number] = [...currentSetData.games] as [number, number];
  newGames[winner]++;

  const { gamesPerSet } = state.config;
  const other: Player = winner === 0 ? 1 : 0;

  const newServer: Player = state.server === 0 ? 1 : 0;
  let newState = { ...state, sets, currentGame: initialGame(), isTiebreak: false, isSuperTiebreak: false, server: newServer };

  if (checkTiebreakNeeded(newState, newGames)) {
    currentSetData.games = newGames;
    const isFinal = isFinalSet(newState);
    const superTB = isFinal && state.config.finalSetSuperTiebreak;
    currentSetData.tiebreakPoints = [0, 0];
    return { ...newState, isTiebreak: !superTB, isSuperTiebreak: superTB };
  }

  const winMargin = newGames[winner] - newGames[other];
  const setWon =
    newGames[winner] >= gamesPerSet && winMargin >= 2;

  currentSetData.games = newGames;

  if (setWon) {
    currentSetData.winner = winner;
    return advanceSet(newState, winner, sets);
  }

  return newState;
}

function advanceSet(state: MatchState, setWinner: Player, sets: SetScore[]): MatchState {
  const setsToWin = Math.ceil(state.config.totalSets / 2);
  const p1Sets = sets.filter((s) => s.winner === 0).length;
  const p2Sets = sets.filter((s) => s.winner === 1).length;

  if (p1Sets >= setsToWin || p2Sets >= setsToWin) {
    return { ...state, sets, winner: setWinner };
  }

  const newSets = [...sets, initialSet()];
  return { ...state, sets: newSets, currentSet: state.currentSet + 1, currentGame: initialGame() };
}

function applyTiebreakPoint(state: MatchState, scorer: Player): MatchState {
  const sets = JSON.parse(JSON.stringify(state.sets)) as SetScore[];
  const currentSetData = sets[state.currentSet];
  const pts = [...(currentSetData.tiebreakPoints ?? [0, 0])] as [number, number];
  pts[scorer]++;

  const other: Player = scorer === 0 ? 1 : 0;
  const target = state.isSuperTiebreak ? 10 : 7;
  const won = pts[scorer] >= target && pts[scorer] - pts[other] >= 2;

  currentSetData.tiebreakPoints = pts;

  if (won) {
    currentSetData.winner = scorer;
    const newServer: Player = state.server === 0 ? 1 : 0;
    return advanceSet({ ...state, sets, isTiebreak: false, isSuperTiebreak: false, currentGame: initialGame(), server: newServer }, scorer, sets);
  }

  return { ...state, sets };
}

function applyRegularPoint(state: MatchState, scorer: Player): MatchState {
  const game = JSON.parse(JSON.stringify(state.currentGame)) as GameState;
  const other: Player = scorer === 0 ? 1 : 0;

  if (game.deuce) {
    if (state.config.goldenPoint) {
      return applyGameWin(state, scorer);
    }
    if (game.advantage === scorer) {
      return applyGameWin(state, scorer);
    } else if (game.advantage === other) {
      game.advantage = null;
      return { ...state, currentGame: game };
    } else {
      game.advantage = scorer;
      return { ...state, currentGame: game };
    }
  }

  game.points[scorer]++;

  if (game.points[scorer] >= 3 && game.points[other] >= 3) {
    if (state.config.goldenPoint) {
      return applyGameWin(state, scorer);
    }
    game.deuce = true;
    game.points = [3, 3];
    return { ...state, currentGame: game };
  }

  if (game.points[scorer] >= 4) {
    return applyGameWin(state, scorer);
  }

  return { ...state, currentGame: game };
}

export function useMatchState(config: MatchConfig) {
  const [state, setState] = useState<MatchState>(() => createInitialMatchState(config));

  const addPoint = useCallback((scorer: Player) => {
    setState((prev) => {
      if (prev.winner !== null) return prev;
      const snapshot = snapshotState(prev);
      const next =
        prev.isTiebreak || prev.isSuperTiebreak
          ? applyTiebreakPoint(prev, scorer)
          : applyRegularPoint(prev, scorer);
      return { ...next, history: [...prev.history, snapshot] };
    });
  }, []);

  const undoPoint = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      return {
        ...prev,
        sets: last.sets,
        currentSet: last.currentSet,
        currentGame: last.currentGame,
        isTiebreak: last.isTiebreak,
        isSuperTiebreak: last.isSuperTiebreak,
        winner: last.winner,
        server: last.server,
        history: prev.history.slice(0, -1),
      };
    });
  }, []);

  return { state, addPoint, undoPoint };
}
