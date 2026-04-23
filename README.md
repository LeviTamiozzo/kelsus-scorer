# kelsus-scorer

A client-side score tracker for tennis and padel matches. Pick your players, choose a format, and tap to score — no accounts, no backend, no bullshit.

Made by the best team of developers in Kelsus:
- Ariel Pertile
- Emmanuel García
- Levi Tamiozzo

## How it works

1. **Setup:** Enter player names, pick a preset (Tennis Bo3, Tennis Bo5, Padel) or go custom.
2. **Match:** Tap a player's side to award a point. The entire match config travels in the URL query param, so refreshing keeps your settings (not the score).

## Presets

| Preset | Sets | Games/Set | Tiebreak | Final Set Super TB | Golden Point |
|--------|------|-----------|----------|--------------------|--------------|
| Tennis Bo3 | 3 | 6 | yes | no | no |
| Tennis Bo5 | 5 | 6 | yes | no | no |
| Padel | 3 | 6 | yes | yes | yes |
| Custom | 1/3/5 | 4–8 | toggle | toggle | toggle |

## Voice Commands

All commands are in Spanish. Tap the **Mic** button before speaking.

### Game score — prefix `game`

| Command | Effect |
|---------|--------|
| `game cero quince` | Set score to 0 – 15 |
| `game quince treinta` | Set score to 15 – 30 |
| `game treinta cuarenta` | Set score to 30 – 40 |
| `game cuarenta cero` | Set score to 40 – 0 |
| `game deuce` / `game iguales` | Set score to deuce |
| `game ventaja [nombre]` | Set advantage for a player |
| `game [nombre]` / `game jugador 1` | Player wins the current game |

Scores are **server-relative**: the first number is the server's score, the second is the receiver's. If player 2 is serving and you say `game cuarenta cero`, player 2 gets 40 and player 1 gets 0.

Accepted point words: `cero`, `amor`, `quince`, `treinta`, `cuarenta` (also the numeric equivalents `0`, `15`, `30`, `40`).

### Current set score — prefix `set`

| Command | Effect |
|---------|--------|
| `set seis uno` | Set current set to 6 – 1 |
| `set tres cuatro` | Set current set to 3 – 4 |
| `set 6 1` | Same, using digits |

### Tiebreak score — no prefix needed

During a tiebreak or super tiebreak, just say the two numbers. Scores are server-relative (first = server, second = receiver).

| Command | Effect |
|---------|--------|
| `1 0` | Set tiebreak to 1 – 0 |
| `6 7` | Set tiebreak to 6 – 7 |
| `seis siete` | Same, using words |

### Undo

| Command | Effect |
|---------|--------|
| `deshacer` / `undo` | Undo the last point |

## Running locally

```bash
npm install
npm run dev
```

Opens on `localhost:3000`.
