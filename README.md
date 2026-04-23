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

## Running locally

```bash
npm install
npm run dev
```

Opens on `localhost:3000`.
