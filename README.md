# Landscaping

A modern landscape design tool for design-build landscapers: one drawing that is
the plan, the bid and (later) the 3D walk-through. See the [roadmap](docs/ROADMAP.md).

## Run it

```sh
npm install
npm run dev        # open the printed localhost URL
```

Your plan autosaves in the browser as you work. **Save file** downloads a
`.landscape.json` plan file you can open later or on another computer.

## What works today (Milestone 1, first slice)

- Pan and zoom (mouse wheel zooms, space-drag or middle-drag pans), with an adaptive grid, scale bar and north arrow
- Drawing tools: **smooth curve** (sketch a bed line, get clean curves), line/polygon, rectangle, circle/ellipse
- Typed dimensions while drawing: `20'` Tab `15'` Enter, `12'-6"`, `4m`, etc.
- Point editing: drag points and curve handles, click an edge to add a point, Alt-click to toggle smooth/corner
- Snapping to other shapes' points (and to the grid with `G`)
- 12 starter materials drawn at real scale: herringbone and running-bond pavers, flagstone, concrete, decking, lawn, mulch, gravel, DG, river rock, water
- Live **quantities & bid**: sq ft, cu yd at depth, cost per item and total; editable prices; CSV export
- Underlay images (surveys, aerials, sketches) with two-click **Set scale**
- Layers (show/hide, lock, rename), unlimited undo/redo, autosave and crash recovery

## Keyboard

| Key | Action | Key | Action |
|---|---|---|---|
| `V` | Select | `⌘Z` / `⇧⌘Z` | Undo / redo |
| `A` | Edit points | `⌘D` | Duplicate |
| `C` | Smooth curve | `Del` | Delete |
| `L` | Line / polygon | Arrows | Nudge 1" (Shift: 1') |
| `R` | Rectangle | `[` / `]` | Send to back / bring to front |
| `O` | Circle / ellipse | `⇧1` | Zoom to fit |
| `M` | Measure | `G` | Snap to grid |
| `H` | Pan | `I` | Import image |

## Development

```sh
npm test            # unit tests (units, geometry, curve fitting, quantities, file format, undo)
npm run test:e2e    # browser tests with Playwright
npm run typecheck
```

Code layout: `src/model` (document, units, materials, quantities, file
migrations), `src/geometry` (paths, curve fitting), `src/render` (canvas plan
renderer and patterns), `src/tools` (drawing tools), `src/store` (undo
history, autosave), `src/ui` (React panels).

## Docs

- [Roadmap](docs/ROADMAP.md)
- [Designer survey results](docs/research/2026-10-survey-tully.md)
- [Brainstorm](docs/BRAINSTORM.md)
