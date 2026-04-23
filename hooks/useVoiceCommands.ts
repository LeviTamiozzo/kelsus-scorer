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

const GAME_POINTS: Record<string, number> = {
  cero: 0, amor: 0, nada: 0, "0": 0,
  quince: 1, "15": 1,
  treinta: 2, "30": 2,
  cuarenta: 3, "40": 3,
};

const NUMBERS: Record<string, number> = {
  cero: 0, "0": 0,
  uno: 1, un: 1, "1": 1,
  dos: 2, "2": 2,
  tres: 3, "3": 3,
  cuatro: 4, "4": 4,
  cinco: 5, "5": 5,
  seis: 6, "6": 6,
  siete: 7, "7": 7,
  ocho: 8, "8": 8,
  nueve: 9, "9": 9,
};

// Fix common speech-to-text mishearings for Spanish tennis/padel
function normalizeTranscript(t: string): string {
  const fixes: [RegExp, string][] = [
    [/\bjuego\b/g, "game"],          // "juego" is Spanish for "game"
    [/\bjuega\b/g, "game"],
    [/\bgane\b/g, "game"],           // conjugated verb, phonetically similar
    [/\bgeim\b/g, "game"],           // phonetic spelling of "game"
    [/\bguem\b/g, "game"],
    [/\bsem\b/g, "set"],             // common mishearing
    [/\bsen\b/g, "set"],
    [/\bseth\b/g, "set"],
    [/\bdeshaz\b/g, "deshacer"],
    [/\bvuelv[ae]\b/g, "deshacer"],
    [/\banul[ae]r?\b/g, "deshacer"],
    [/\bborrar\b/g, "deshacer"],
    [/\bdius\b/g, "deuce"],          // phonetic
    [/\bvent[ae]ja\b/g, "ventaja"],  // accent variants
    [/\biguala[s]?\b/g, "iguales"],
  ];
  for (const [pattern, replacement] of fixes) {
    t = t.replace(pattern, replacement);
  }
  return t;
}

function resolvePlayer(text: string, config: MatchConfig): Player | null {
  const t = text.toLowerCase().trim();
  const p1 = config.player1Name.toLowerCase();
  const p2 = config.player2Name.toLowerCase();

  if (t.includes(p1)) return 0;
  if (t.includes(p2)) return 1;

  // Try first word of each player name (handles "Juan" matching "Juan Pérez")
  const p1First = p1.split(" ")[0];
  const p2First = p2.split(" ")[0];
  if (p1First.length >= 3 && t.includes(p1First)) return 0;
  if (p2First.length >= 3 && t.includes(p2First)) return 1;

  if (/\b(jugador uno|jugador 1|player one|player 1|el uno|primero?)\b/.test(t)) return 0;
  if (/\b(jugador dos|jugador 2|player two|player 2|el dos|segundo)\b/.test(t)) return 1;
  return null;
}

function parse(raw: string, config: MatchConfig): VoiceCommand | null {
  let t = raw.toLowerCase().trim().replace(/[.,!?¿¡]/g, "").replace(/\s+/g, " ");
  t = normalizeTranscript(t);

  // Undo
  if (/\b(deshacer|undo|volver|anular|borrar)\b/.test(t)) return { type: "undo" };

  // "game ..." — allow any leading words (recognizer often prepends filler)
  const gameMatch = t.match(/\b(game)\s+(.+)/);
  if (gameMatch) {
    const rest = gameMatch[2].trim();

    // deuce / iguales / cuarenta cuarenta
    if (/^(deuce|dius|iguales?|empate|cuarenta cuarenta|40 40|cuarenta iguales?)$/.test(rest)) {
      return { type: "setGameScore", p1: 3, p2: 3, deuce: true };
    }

    // "game ventaja [player]" / "game advantage [player]" / "game ad [player]"
    const advantageMatch = rest.match(/^(ventaja|advantage|ad|adv)\s+(.+)/);
    if (advantageMatch) {
      const player = resolvePlayer(advantageMatch[2], config);
      if (player !== null) {
        return { type: "setGameScore", p1: 3, p2: 3, deuce: true, advantage: player };
      }
    }

    // "game [player]" — player wins the game
    const gameWinner = resolvePlayer(rest, config);
    if (gameWinner !== null) return { type: "winGame", player: gameWinner };

    // "game cero quince" / "game cuarenta treinta" / "game 15 40" etc.
    const words = rest.split(" ");
    if (words.length === 2) {
      const s1 = GAME_POINTS[words[0]];
      const s2 = GAME_POINTS[words[1]];
      if (s1 !== undefined && s2 !== undefined) {
        if (s1 === 3 && s2 === 3) return { type: "setGameScore", p1: 3, p2: 3, deuce: true };
        return { type: "setGameScore", p1: s1, p2: s2 };
      }
    }
    // Recognizer sometimes concatenates digits: "1540" → "15" + "40"
    if (words.length === 1) {
      const SCORE_TOKENS = ["40", "30", "15", "0"];
      for (const v1 of SCORE_TOKENS) {
        if (words[0].startsWith(v1)) {
          const v2 = words[0].slice(v1.length);
          if (SCORE_TOKENS.includes(v2)) {
            const s1 = GAME_POINTS[v1], s2 = GAME_POINTS[v2];
            if (s1 === 3 && s2 === 3) return { type: "setGameScore", p1: 3, p2: 3, deuce: true };
            return { type: "setGameScore", p1: s1, p2: s2 };
          }
        }
      }
    }
  }

  // "set ..." / "parcial ..." — also allow leading words
  const setMatch = t.match(/\b(set|parcial)\s+(.+)/);
  if (setMatch) {
    const words = setMatch[2].trim().split(" ");
    if (words.length === 2) {
      const g1 = NUMBERS[words[0]];
      const g2 = NUMBERS[words[1]];
      if (g1 !== undefined && g2 !== undefined) {
        return { type: "setCurrentSet", p1Games: g1, p2Games: g2 };
      }
    }
    // Concatenated single digits: "61" → 6, 1
    if (words.length === 1 && /^\d\d$/.test(words[0])) {
      const g1 = NUMBERS[words[0][0]];
      const g2 = NUMBERS[words[0][1]];
      if (g1 !== undefined && g2 !== undefined) {
        return { type: "setCurrentSet", p1Games: g1, p2Games: g2 };
      }
    }
  }

  const insultPatterns = [
    /la\s+(re\s+)?concha/,
    /concha.{0,5}(tu|su).{0,5}(madre|hermana)/,
    /puta\s+madre/,
    /que\s+(te|le)\s+(re\s+)?pari[oó]/,
    /hijo.{0,5}(de\s+)?(tu\s+)?puta/,
    /mierda/,
  ];
  if (insultPatterns.some((p) => p.test(t))) return { type: "insult" };

  return null;
}

// Build a JSGF grammar string to bias the recognizer toward known commands
function buildGrammar(config: MatchConfig): string {
  const p1 = config.player1Name.toLowerCase();
  const p2 = config.player2Name.toLowerCase();
  const playerAlts = [p1, p2, "jugador uno", "jugador dos", "jugador 1", "jugador 2"].join(" | ");
  return `#JSGF V1.0 UTF-8;
grammar tennis;
public <command> = <undo> | <game_cmd> | <set_cmd>;
<undo> = deshacer | undo | volver | anular;
<game_cmd> = game <game_arg>;
<game_arg> = <score> | <player> | <deuce> | <advantage>;
<deuce> = deuce | iguales | cuarenta cuarenta;
<advantage> = ventaja <player> | advantage <player> | ad <player>;
<score> = cero quince | cero treinta | cero cuarenta | quince cero | quince quince | quince treinta | quince cuarenta | treinta cero | treinta quince | treinta treinta | treinta cuarenta | cuarenta cero | cuarenta quince | cuarenta treinta;
<set_cmd> = set <number> <number> | parcial <number> <number>;
<player> = ${playerAlts};
<number> = cero | uno | dos | tres | cuatro | cinco | seis | siete | ocho | nueve | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;`;
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
  currentServer: Player;
}

export function useVoiceCommands({
  config,
  onWinGame,
  onUndo,
  onSetGameScore,
  onSetCurrentSet,
  onInsult,
  active,
  currentServer,
}: Options): UseVoiceCommandsResult {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const configRef = useRef(config);
  const onWinGameRef = useRef(onWinGame);
  const onUndoRef = useRef(onUndo);
  const onSetGameScoreRef = useRef(onSetGameScore);
  const onSetCurrentSetRef = useRef(onSetCurrentSet);
  const currentServerRef = useRef(currentServer);
  const onInsultRef = useRef(onInsult);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { onWinGameRef.current = onWinGame; }, [onWinGame]);
  useEffect(() => { onUndoRef.current = onUndo; }, [onUndo]);
  useEffect(() => { onSetGameScoreRef.current = onSetGameScore; }, [onSetGameScore]);
  useEffect(() => { onSetCurrentSetRef.current = onSetCurrentSet; }, [onSetCurrentSet]);
  useEffect(() => { currentServerRef.current = currentServer; }, [currentServer]);
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
      case "setGameScore": {
        let { p1, p2 } = cmd;
        // Voice scores are server-relative: first = server, second = receiver
        if (!cmd.deuce && currentServerRef.current === 1) {
          [p1, p2] = [p2, p1];
        }
        onSetGameScoreRef.current(p1, p2, { deuce: cmd.deuce, advantage: cmd.advantage });
        showFeedback(
          cmd.deuce
            ? cmd.advantage != null
              ? `Ventaja — ${cmd.advantage === 0 ? cfg.player1Name : cfg.player2Name}`
              : "Deuce"
            : `${LABELS[p1]} – ${LABELS[p2]}`
        );
        break;
      }
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
    rec.lang = "es-AR";       // Argentine Spanish — better for Latin American padel/tennis
    rec.maxAlternatives = 5;  // Try up to 5 hypotheses before giving up

    // Hint the model with expected vocabulary (Chrome supports webkitSpeechGrammarList)
    const GrammarList = (window as SR).SpeechGrammarList || (window as SR).webkitSpeechGrammarList;
    if (GrammarList) {
      try {
        const gl = new GrammarList();
        gl.addFromString(buildGrammar(configRef.current), 1);
        rec.grammars = gl;
      } catch (_) { /* grammar hints are optional */ }
    }

    rec.onresult = (event: SR) => {
      const results = event.results[event.results.length - 1];
      // Walk alternatives from most to least confident; use the first one that parses
      for (let i = 0; i < results.length; i++) {
        const transcript: string = results[i].transcript;
        const confidence: number = results[i].confidence;
        console.log(`[Voice] Alt ${i}: "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
        const cmd = parse(transcript.trim().toLocaleLowerCase(), configRef.current);
        if (cmd) {
          console.log(`[Voice] Command recognized (alt ${i}):`, cmd);
          executeRef.current(cmd);
          return;
        }
      }
      console.log(`[Voice] No command matched for any alternative`);
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
      console.log("[Voice] Listening started (es-AR)");
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
