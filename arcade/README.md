# NEON BREAKOUT

A breakout game in one canvas. Real physics, combos, three lives, levels that speed up, and a high score that survives a reload.

## Play

Any static server works:

```bash
python3 -m http.server 12000
```

Then open http://127.0.0.1:12000/

## Controls

| Action | Input |
| --- | --- |
| Move paddle | Mouse, finger drag, `←` `→` (or `A` `D`) |
| Launch ball | Click / tap, or `Space` |
| Pause | `P` or the Pause button |
| Restart | `R` or the Restart button |
| Sound | The ♪ button (remembered between visits) |

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup and HUD |
| `style.css` | Neon theme, layout, responsive rules |
| `game.js` | Game loop, sub-stepped collision, particles, WebAudio blips |
| `favicon.svg` | Icon |

No dependencies and no build step. Fonts are the only external request. High score and sound preference live in `localStorage`.

## Live

https://zyraxon-ai.github.io/lumen-landing/arcade/
