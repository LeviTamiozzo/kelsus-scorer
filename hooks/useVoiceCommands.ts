"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { MatchConfig, Player } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

type VoiceCommand =
  | { type: "winGame"; player: Player }
  | { type: "undo" }
  | { type: "setGameScore"; p1: number; p2: number; deuce?: boolean; advantage?: Player | null }
  | { type: "setCurrentSet"; p1Games: number; p2Games: number }
  | { type: "insult" };

// Tennis point words in Spanish
const GAME_POINTS: Record<string, number> = {
  cero: 0, amor: 0, "0": 0,
  quince: 1, "15": 1,
  treinta: 2, "30": 2,
  cuarenta: 3, "40": 3,
};

// Regular numbers in Spanish (for set scores)
const NUMBERS: Record<string, number> = {
  cero: 0, "0": 0,
  uno: 1, "1": 1,
  dos: 2, "2": 2,
  tres: 3, "3": 3,
  cuatro: 4, "4": 4,
  cinco: 5, "5": 5,
  seis: 6, "6": 6,
  siete: 7, "7": 7,
  ocho: 8, "8": 8,
  nueve: 9, "9": 9,
};

function resolvePlayer(text: string, config: MatchConfig): Player | null {
  const t = text.toLowerCase().trim();
  const p1 = config.player1Name.toLowerCase();
  const p2 = config.player2Name.toLowerCase();

  if (t.includes(p1)) return 0;
  if (t.includes(p2)) return 1;
  if (/\b(jugador uno|jugador 1|player one|player 1)\b/.test(t)) return 0;
  if (/\b(jugador dos|jugador 2|player two|player 2)\b/.test(t)) return 1;
  return null;
}

function parse(raw: string, config: MatchConfig): VoiceCommand | null {
  const t = raw.toLowerCase().trim().replace(/[.,!?¿¡]/g, "").replace(/\s+/g, " ");

  console.log("t", t);
  // Undo — "deshacer" or "undo"
  if (/^(deshacer|undo|deshaz)$/.test(t)) return { type: "undo" };

  // --- game prefix commands ---
  if (t.startsWith("game ")) {
    console.log(`[Voice] Parsing game command: "${t}"`);
    const rest = t.slice(5).trim();

    // "game deuce" | "game iguales"
    if (/^(deuce|iguales)$/.test(rest)) {
      return { type: "setGameScore", p1: 3, p2: 3, deuce: true };
    }

    // "game ventaja [player]"
    if (rest.startsWith("ventaja ")) {
      const player = resolvePlayer(rest.slice(8), config);
      if (player !== null) {
        return { type: "setGameScore", p1: 3, p2: 3, deuce: true, advantage: player };
      }
    }

    // "game [player]" — that player wins the game
    const gameWinner = resolvePlayer(rest, config);
    if (gameWinner !== null) return { type: "winGame", player: gameWinner };

    // "game cero quince" | "game cuarenta treinta" etc.
    const words = rest.split(" ");
    if (words.length === 2) {
      const s1 = GAME_POINTS[words[0]];
      const s2 = GAME_POINTS[words[1]];
      if (s1 !== undefined && s2 !== undefined) {
        return { type: "setGameScore", p1: s1, p2: s2 };
      }
    }
    // Recognizer sometimes concatenates digits: "1540" instead of "15 40"
    if (words.length === 1) {
      const SCORE_TOKENS = ["40", "30", "15", "0"];
      for (const v1 of SCORE_TOKENS) {
        if (words[0].startsWith(v1)) {
          const v2 = words[0].slice(v1.length);
          if (SCORE_TOKENS.includes(v2)) {
            return { type: "setGameScore", p1: GAME_POINTS[v1], p2: GAME_POINTS[v2] };
          }
        }
      }
    }
  }

  // --- set prefix commands ---
  // "set 6 1" | "set seis uno" | "set 61" (concatenated)
  if (t.startsWith("set ")) {
    const words = t.slice(4).trim().split(" ");
    if (words.length === 2) {
      const g1 = NUMBERS[words[0]];
      const g2 = NUMBERS[words[1]];
      if (g1 !== undefined && g2 !== undefined) {
        return { type: "setCurrentSet", p1Games: g1, p2Games: g2 };
      }
    }
    // Recognizer concatenates single digits: "61" instead of "6 1"
    if (words.length === 1 && /^\d\d$/.test(words[0])) {
      const g1 = NUMBERS[words[0][0]];
      const g2 = NUMBERS[words[0][1]];
      if (g1 !== undefined && g2 !== undefined) {
        return { type: "setCurrentSet", p1Games: g1, p2Games: g2 };
      }
    }
  }

  if (/concha.{0,5}(tu|su).{0,5}madre/.test(t)) return { type: "insult" };
  if (/puta.{0,5}que.{0,5}(te|le).{0,5}pari[oó]/.test(t)) return { type: "insult" };
  if (/hijo.{0,5}de.{0,5}puta/.test(t)) return { type: "insult" };

  return null;
}

export interface UseVoiceCommandsResult {
  isListening: boolean;
  isSupported: boolean;
  feedback: string | null;
  toggleListening: () => void;
}

interface Options {
  config: MatchConfig;
  onWinGame: (player: Player) => void;
  onUndo: () => void;
  onSetGameScore: (p1: number, p2: number, opts?: { deuce?: boolean; advantage?: Player | null }) => void;
  onSetCurrentSet: (p1Games: number, p2Games: number) => void;
  onInsult?: () => void;
  active: boolean;
}

export function useVoiceCommands({
  config,
  onWinGame,
  onUndo,
  onSetGameScore,
  onSetCurrentSet,
  onInsult,
  active,
}: Options): UseVoiceCommandsResult {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const configRef = useRef(config);
  const onWinGameRef = useRef(onWinGame);
  const onUndoRef = useRef(onUndo);
  const onSetGameScoreRef = useRef(onSetGameScore);
  const onSetCurrentSetRef = useRef(onSetCurrentSet);
  const onInsultRef = useRef(onInsult);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { onWinGameRef.current = onWinGame; }, [onWinGame]);
  useEffect(() => { onUndoRef.current = onUndo; }, [onUndo]);
  useEffect(() => { onSetGameScoreRef.current = onSetGameScore; }, [onSetGameScore]);
  useEffect(() => { onSetCurrentSetRef.current = onSetCurrentSet; }, [onSetCurrentSet]);
  useEffect(() => { onInsultRef.current = onInsult; }, [onInsult]);

  const recognitionRef = useRef<SR>(null);
  const activeRef = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSupported(!!((window as SR).SpeechRecognition || (window as SR).webkitSpeechRecognition));
    }
  }, []);

  const showFeedback = useCallback((text: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(text);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  const execute = useCallback((cmd: VoiceCommand) => {
    const cfg = configRef.current;
    const LABELS = ["0", "15", "30", "40"];
    switch (cmd.type) {
      case "winGame":
        onWinGameRef.current(cmd.player);
        showFeedback(`Juego — ${cmd.player === 0 ? cfg.player1Name : cfg.player2Name}`);
        break;
      case "undo":
        onUndoRef.current();
        showFeedback("Deshecho");
        break;
      case "setGameScore":
        onSetGameScoreRef.current(cmd.p1, cmd.p2, { deuce: cmd.deuce, advantage: cmd.advantage });
        showFeedback(
          cmd.deuce
            ? cmd.advantage != null
              ? `Ventaja — ${cmd.advantage === 0 ? cfg.player1Name : cfg.player2Name}`
              : "Deuce"
            : `${LABELS[cmd.p1]} – ${LABELS[cmd.p2]}`
        );
        break;
      case "setCurrentSet":
        onSetCurrentSetRef.current(cmd.p1Games, cmd.p2Games);
        showFeedback(`Set  ${cmd.p1Games} – ${cmd.p2Games}`);
        break;
      case "insult":
        onInsultRef.current?.();
        break;
    }
  }, [showFeedback]);

  const executeRef = useRef(execute);
  useEffect(() => { executeRef.current = execute; }, [execute]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    console.log("[Voice] Listening stopped");
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    const Api = (window as SR).SpeechRecognition || (window as SR).webkitSpeechRecognition;
    const rec = new Api();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "es-ES";

    rec.onresult = (event: SR) => {
      const transcript: string = event.results[event.results.length - 1][0].transcript;
      const confidence: number = event.results[event.results.length - 1][0].confidence;
      console.log(`[Voice] Heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);
      const cmd = parse(transcript.trim().toLocaleLowerCase(), configRef.current);
      console.log({ cmd });
      if (cmd) {
        console.log(`[Voice] Command recognized:`, cmd);
        executeRef.current(cmd);
      } else {
        console.log(`[Voice] No command matched for: "${transcript}"`);
      }
    };

    rec.onerror = (event: SR) => {
      console.log(`[Voice] Error: ${event.error}`);
      if (event.error !== "no-speech") stopListening();
    };

    rec.onend = () => {
      if (activeRef.current) {
        try { rec.start(); } catch (_) {}
      }
    };

    recognitionRef.current = rec;
    activeRef.current = true;
    try {
      rec.start();
      setIsListening(true);
      console.log("[Voice] Listening started (es-ES)");
    } catch (_) {
      activeRef.current = false;
      console.log("[Voice] Failed to start");
    }
  }, [isSupported, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    if (!active) stopListening();
  }, [active, stopListening]);

  useEffect(() => () => {
    stopListening();
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, [stopListening]);

  return { isListening, isSupported, feedback, toggleListening };
}
