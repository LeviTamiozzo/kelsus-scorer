export type Player = 0 | 1;

export interface MatchConfig {
  player1Name: string;
  player2Name: string;
  firstServer: Player;
  totalSets: 1 | 3 | 5;
  gamesPerSet: number;
  hasTiebreak: boolean;
  finalSetSuperTiebreak: boolean;
  goldenPoint: boolean;
}

export type PointScore = 0 | 15 | 30 | 40;

export interface GameState {
  points: [number, number];
  deuce: boolean;
  advantage: Player | null;
}

export interface SetScore {
  games: [number, number];
  tiebreakPoints?: [number, number];
  winner: Player | null;
}

export interface MatchState {
  config: MatchConfig;
  sets: SetScore[];
  currentSet: number;
  currentGame: GameState;
  isTiebreak: boolean;
  isSuperTiebreak: boolean;
  winner: Player | null;
  server: Player;
  history: MatchSnapshot[];
}

export interface MatchSnapshot {
  sets: SetScore[];
  currentSet: number;
  currentGame: GameState;
  isTiebreak: boolean;
  isSuperTiebreak: boolean;
  winner: Player | null;
  server: Player;
}

export const POINT_LABELS: Record<number, string> = {
  0: "0",
  1: "15",
  2: "30",
  3: "40",
};
