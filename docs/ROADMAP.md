# Roadmap

Based on the [brainstorm](BRAINSTORM.md) and the [first designer survey](research/2026-10-survey-tully.md).
Each milestone ends in a demo that a design-build landscaper would recognize as real work.

## Principles (from the survey)

1. **Never lose work, never glitch.** Autosave, crash recovery, versioned files with migrations, and tests on every change.
2. **Don't churn the UI.** Once a workflow ships, keep it where it was.
3. **The 2D plan is home base.** Mouse and keyboard first, and fast.
4. **One drawing is the plan, the bid and the 3D model.** Quantities, schedules and 3D views are all computed from the same objects. Nothing gets re-drawn.
5. **Store real data from day one.** Every object stores real units, material, elevation and height, even before 3D exists.

---

## Progress

**Milestone 1, first slice (done):** canvas, ft-in units and typed dimensions, undo/redo,
autosave and versioned files, layers, image underlays with Set scale, smooth curve /
polygon / rectangle / ellipse tools, point editing, snapping, 12 real-scale materials,
live quantities with editable prices, and CSV bid export.

**Milestone 1, still to do:** plant palette and symbols, offset and union/subtract,
PDF underlays, labels and dimensions, sheets with title block and PDF export to scale.

## Milestone 1: Plan & Price
*Replaces the daily PRO Landscape work and the separate estimate spreadsheet.*

**Canvas & files**
- Pan and zoom, ft-in units with typed input (`12'6"`), an adaptive grid, and rulers.
- Undo/redo, autosave, crash recovery, and a versioned project file.
- Layers (show, lock, print on/off).

**Base plan**
- Import images and PDFs as underlays (surveys, aerials, architect's drawings, scanned sketches).
- Set scale with two clicks ("this line is 120'"), rotate, set opacity, lock.

**Drawing**
- Rectangle, circle/ellipse, polygon, polyline.
- **Smooth curve tool**: sketch a rough line and it becomes a clean, editable curve.
- Pen tool and node editing (move, add, delete points, corner ↔ smooth).
- Offset and union/subtract.
- Snapping (grid, endpoints, midpoints, edges) and smart guides.
- Typed length and angle while drawing.

**Materials**
- **Real-scale patterns**: pavers (running bond, herringbone, basketweave), flagstone, gravel, decomposed granite, river rock, mulch, lawn, decking. Each pattern's origin and rotation can be adjusted per shape.
- Each material has a unit cost, a unit (sq ft, cu yd, ln ft, each) and a depth.

**Plants**
- An editable plant palette with full data: mature size, sun, water, zone, bloom, fall color, evergreen/deciduous, native, deer resistance, cost and nursery.
- Ship a high-desert starter set, ideally seeded from Tully's own list.
- Symbols drawn at mature spread, with SVG import for custom symbols.
- Row placement (hedges) and area fill (groundcover) at a set spacing.

**Quantities & output**
- **Live quantities panel**: area, volume, length and count per material and plant, with cost and a running total.
- Automatic plant schedule.
- CSV export of the bid.
- Labels, dimensions and area tags.
- **Print to scale**: sheets with a title block, north arrow, scale bar and legend, exported to PDF at 1/8" = 1'-0" and other common scales.

> **Demo:** import a survey PDF and calibrate it, trace the house and drive, draw a curvy bed and a
> herringbone patio, place plants, then export a to-scale PDF and a bid CSV with the right square
> footage, cubic yards and plant counts.

## Milestone 2: Walk It
*Replaces most of the SketchUp work. This is Tully's "magic wand."*

- Height and elevation controls on every object (walls, raised beds, steps, structures).
- A 3D view built from the plan: extruded hardscape, a house massing block, and decent-looking plants (low-poly or textured cards sized by species).
- **First-person walk mode**: WASD to move, mouse to look, eye height around 5'6", Minecraft-style.
- Quad view (plan, front, side, 3D) with a hotkey to toggle it and to maximize any pane.
- Export 3D still images for clients.

> **Demo:** open the Milestone 1 project and walk from the driveway to the patio in first person.

## Milestone 3: Ground Truth
*Grading, which Tully said is a big part of his work.*

- Spot elevations and contour lines (existing and proposed).
- A terrain surface built from them, so the 3D walk follows the ground.
- **Cut/fill volumes**, fed into the quantities and bid.
- Section-cut tool: draw a line across the plan and get an elevation along it.
- DXF import (surveys, architect's drawings) and DXF export.

## Milestone 4: Share & Reuse
- Reusable components (save any selection or canvas and drop it into other projects).
- A view-only client link with the 3D walk-through and comments.
- Team accounts and multiple seats.

## Later
Growth slider, sun/shade studies, iPad and stylus, irrigation and lighting layers, design options A/B.

---

## Tech stack (proposed)

| Concern | Choice | Why |
|---|---|---|
| App | TypeScript + Vite, web first | Runs on any Windows or Mac machine with no install. It can be wrapped as a desktop app later. |
| UI chrome | React | Panels, inspectors and dialogs. |
| 2D plan rendering | Custom Canvas 2D renderer | Full control over real-scale patterns and performance on multi-acre plans. |
| Geometry | Bézier math + Clipper2 | Robust offsets and booleans. |
| 3D | Three.js | Extrusions, terrain, and pointer-lock first-person controls. |
| PDF in/out | pdf.js (import), pdf-lib (export) | Survey underlays and vector to-scale output. |
| Storage | Local-first (IndexedDB), JSON project files | Works offline; cloud sync comes later. |
| Tests | Vitest (geometry, quantities, file migrations) + Playwright (end-to-end) | Answers the "constant glitches" complaint directly. |
