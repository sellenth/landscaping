# Landscape Design Tool — Brainstorm

> Status: pre-build brainstorm, kept for reference. Decisions now live in [ROADMAP.md](ROADMAP.md),
> based on the [first designer survey](research/2026-10-survey-tully.md).
>
> Original note: nothing here is decided yet. The goal is to understand
> what a landscape designer actually does all day, find where current tools hurt,
> and only then pick an MVP.

---

## 1. Who is the user?

The starting assumption is a **residential landscape designer** or a **design-build contractor**:
someone who designs a yard, presents it to a homeowner, and then the yard gets built
(by them or a crew). This might turn out to be wrong (commercial, municipal, or golf
work looks quite different), so it's the first thing to confirm with the friend.

What that person cares about, roughly in order:

1. **Winning the job.** The plan has to look good and be easy for a homeowner to read.
2. **Being accurate.** Real dimensions, plants spaced right, nothing that breaks code or the budget.
3. **Pricing the job.** Square footage of patio, cubic yards of mulch, linear feet of edging, plant counts.
4. **Iterating fast.** "What if the patio was bigger?" "Can we see option B?"
5. **Handing it off.** A crew, a nursery order, maybe a permit office.

A tool that only does #1 is a drawing app. A tool that does #1 through #3 from **one
drawing** is something designers would pay for.

---

## 2. The real workflow (how a project actually goes)

| Phase | What happens | What the tool needs |
|---|---|---|
| **Site intake** | Visit the site. Tape-measure house corners, trees, and existing hardscape. Note sun/shade, drainage, slopes, utilities, views. Get the survey/plat if there is one. | Import a survey PDF or photo, **calibrate scale** ("this line is 85 ft"), trace over it. Mark existing trees with canopy size. Field notes and photos pinned to locations. |
| **Base plan** | Draw property lines, house footprint, driveway, existing features. | Precise drafting: typed dimensions, angles, snapping. Lock the layer when it's done. |
| **Concept** | Loose bubble diagrams for zones (patio, play, veggies, screening) and circulation arrows. | Quick, sketchy shapes. Doesn't need to be precise. Easy to throw away. |
| **Master plan** | Hardscape (patios, walls, paths, steps), beds, lawn, water, structures. | Smooth curves, offsets, boolean shape ops, **material fills** (pavers, flagstone, gravel, mulch, lawn). |
| **Planting plan** | Pick plants, place symbols at mature size, mass shrubs, fill groundcover areas. | **Plant library with real data**, symbols sized by mature spread, array-along-path, fill-area-at-spacing, **auto plant schedule**. |
| **Presentation** | A colored rendered plan, maybe elevations or a 3D view, on a titled sheet. | Good-looking styles (the "hand-rendered" look), title block, north arrow, scale bar, legend, **print to scale**, PDF export. |
| **Estimate / build** | Quantities become a bid; the plan goes to the crew. | **Live quantity takeoff**, CSV/PDF export, construction-style view with dimensions and no color. |
| **Revisions** | The client wants changes. | Options/versions, cheap duplication, history. |

**Takeaway:** the core loop is *draw a shape → it's a real thing with a material → it
knows its own area, cost, and height.* Every feature should hang off that.

---

## 3. Why the current tools feel dated (hypotheses to check)

The usual tools are PRO Landscape, DynaSCAPE, Vectorworks Landmark, AutoCAD + Land F/X,
SketchUp, Realtime Landscaping, and iScape. Common complaints:

- **The CAD mental model is imposed on designers.** Command lines, modal dialogs, "pick first point, pick second point."
- **Curves are painful.** Landscapes are mostly flowing bed lines, and CAD tools are built for straight lines.
- **Plant libraries are bad.** Ugly symbols, missing regional plants, and data that can't be edited.
- **Quantities live outside the drawing.** People re-measure the plan to build a spreadsheet.
- **Rendering is either ugly or slow.** Flat CAD hatching, or a full trip into a separate 3D app.
- **Windows-only, expensive, and installed per machine.** No iPad, no working on site.
- **Undo, layers, and selection feel clunky** next to Figma, Procreate, or Illustrator.

> **Ask the friend:** which tool are you using, and what are the three moments in a
> typical week when you want to throw it out the window? That answer will shape the MVP
> more than anything in this document.

---

## 4. Feature brainstorm (grouped, not prioritized yet)

### 4.1 Canvas & navigation
- Infinite canvas with smooth pan/zoom (trackpad pinch, space-drag, scroll).
- **Real-world units are first-class**: ft-in (`12'6"`) or metric. Units are set per document and you can type either.
- A drawing scale that only matters for printing (1/8" = 1'-0", 1:100, …). The model is always real size.
- Rulers, a grid that adapts to zoom (1 ft → 5 ft → 10 ft → 50 ft), and a minimap.
- **Underlay images and PDFs**: drop in a survey or aerial, use two-point scale calibration and rotation, adjust opacity, lock.

### 4.2 Drawing tools
- **Basic geometry:** rectangle, rounded rectangle, circle/ellipse, regular polygon, line/polyline, arc.
- **Pen tool** (Bézier, Illustrator/Figma style) for precise curves.
- **Smooth freehand / spline tool**: draw a rough bed line and it gets fitted to a clean curve. This is probably *the* landscape tool.
- **Node editing:** move, add, and delete points, convert corner ↔ smooth, and fillet a corner by radius.
- **Shape operations:** union, subtract, intersect (e.g. "bed minus patio"), plus **offset** ("3 ft bed around the patio", "6 in. edging strip").
- **Typed input while drawing:** start a line, type `14'` and press Tab, type `30°`, press Enter. This is a huge speed win over the mouse.
- **Snapping:** grid, endpoints, midpoints, centers, intersections, perpendicular, tangent, plus Figma-style smart guides showing spacing/alignment. Hold a modifier to disable.
- Transform: move, rotate, scale, and mirror with handles, plus align/distribute.
- **Arrays:** along a path at spacing (hedge rows, path lights, fence posts), grid arrays, and radial arrays.

### 4.3 Fills, hatches, and materials
The idea: **a "material" is more than a hatch.** A material bundles:
- how it looks in plan (hatch/pattern + color + optional texture)
- how it looks in 3D (color/texture, thickness)
- data: unit cost, unit (sq ft / cu yd / ln ft), depth (mulch at 3"), supplier notes

Pattern library ideas:
- **Hardscape:** running bond, herringbone, basketweave, ashlar, random flagstone, brick, concrete (stipple), decking boards (directional).
- **Aggregates:** gravel stipple, river rock, decomposed granite.
- **Soft:** lawn (dot stipple or short strokes), mulch, groundcover, meadow.
- **Water:** wave lines.
- **Line styles:** dashed and dotted lines, property lines (dash-dot), hedge "cloud" edges, fence lines with posts, retaining wall double lines, contour lines.

Key details that make patterns feel right:
- Patterns are **scaled to real size**: a 12×24 paver hatch is actually 12×24 at any zoom.
- **Pattern origin and rotation are adjustable** per shape (align pavers to the house wall).
- A choice between crisp CAD-style output and a "hand-drawn/rendered" style (soft colors, watercolor-ish edges, drop shadows). Designers sell with the second one.

### 4.4 Reusable objects ("save canvas as object")
This is the friend's idea, and it maps well onto **components/symbols** (Figma, Illustrator symbols, CAD blocks):
- Any selection or whole canvas → **"Make component"**. It goes into a library.
- Drop instances into any document. **Edit the master and all instances update**, with per-instance overrides (color, rotation, scale, flip).
- Components can carry data (name, category, cost, height), so they show up in schedules.
- Examples: a standard patio set with table and chairs, a fire pit design, a raised veggie bed module, a typical foundation planting, a signature planting combo the designer reuses.
- Libraries can be **personal** (my stuff), **built-in** (ships with the app), and later **shared** (team, marketplace).
- Decide later whether to "link" (stay in sync with the source file) or "embed" (copy it in). Probably both, like Figma vs. paste-as-copy.

### 4.5 Plants (the built-in library)
A plant isn't just a symbol. It's a **record**:
- Botanical name, common name, cultivar
- Type: tree (deciduous/evergreen), shrub, perennial, grass, groundcover, annual, vine
- **Mature height and spread**, growth rate, form (round, columnar, vase, weeping, spreading, pyramidal)
- Sun, water, hardiness zones, native region, bloom color/season, fall color, deer resistance
- Default install size (#1, #3, #5 gal, 2" cal B&B) and price

Placement behavior:
- The plan symbol is **drawn at mature spread** by default, with an optional "at install" view.
- Symbol style comes from the plant type (deciduous trees get the classic branching circle, conifers the star, shrubs a cloud), and it's tinted by foliage/bloom color.
- **Massing:** click-drag places a row at proper spacing, and an area fill places groundcover in a triangular grid at spacing with an exact count.
- Overlap warnings when plants are crammed closer than their spread.
- **Auto plant schedule/legend:** key, botanical/common name, size, quantity, spacing. Always in sync.
- Callout labels with leaders ("5 – ILE GLA"), with auto-grouping of identical adjacent plants.
- Filters and search: "show me shade-tolerant evergreen shrubs under 4 ft for zone 6."
- *Later:* a **growth slider** showing the design at year 0 / 3 / 10 / 20, in plan and 3D. Clients love this, and it's something nobody does well.

### 4.6 Annotation & documentation
- Dimension tools: linear, aligned, angular, radius, and auto-dimension a shape.
- Live area/perimeter labels on shapes.
- Text, leaders, callouts, revision clouds.
- North arrow, scale bar, legend, plant schedule, material schedule.
- **Sheets/layouts:** place one or more views of the model on a titled sheet (24×36, 11×17, A1…), with a title block template and multiple sheets per project (master plan, planting plan, lighting plan).
- Export: PDF (vector, to scale), PNG/JPG presentation images, SVG, and maybe DXF/DWG later for interoperability.

### 4.7 Quantities & estimating
- A live **takeoff panel** that groups everything by material and plant: area, volume (area × depth), length, count.
- Unit costs → a running project total.
- Export a CSV/PDF bid sheet.
- This is a strong differentiator: the drawing *is* the estimate.

### 4.8 Organization
- **Layers** (visibility, lock, opacity, print on/off) and **tags/categories** (hardscape, softscape, irrigation, lighting).
- **Existing / proposed / demolish** status on any object, with automatic styling (existing = gray, demo = dashed red X).
- **Design options:** duplicate a design into Option A / B / C and compare side-by-side.
- Version history with named snapshots ("sent to client 10/12").

### 4.9 Views: 2D, elevations, and 3D
Requested: a **4-up view** (top, front, side, perspective 3D), with quick toggle/fullscreen per pane.

Thoughts:
- This is the classic 3ds Max / Blender quad view, and it's a good, familiar pattern. **Default to a big single plan view** (where ~90% of the work happens) with a hotkey to switch to quad, and a hotkey to maximize any pane (Blender uses `Ctrl+Space`).
- For the "front"/"side" views to mean anything, **every object needs height data from day one**, even before 3D is built:
  - shapes: `baseElevation`, `height` / thickness (patio 4", wall 24", raised bed 18")
  - plants: height, spread, form (drives a simple 3D proxy: sphere, cone, column, lollipop tree)
- Landscape designers think in **sections and elevations**, more than in pure front/side axes. A **section-cut tool** (draw a line across the plan and get a live elevation along that line) might be more useful than fixed front/side views. It could replace or supplement them.
- The 3D view starts simple: flat ground, extruded hardscape, primitive plant proxies, a house massing box. Orbit/walk camera. Fine for client conversations.
- *Later:* terrain/grading (contours and spot elevations to a surface), sun/shadow studies by location and date (the north arrow and lat/long are already in the doc), and nicer plant models.

### 4.10 UX affordances & niceties
- **Command palette** (`Ctrl/Cmd+K`) to search for any tool, plant, material, or action.
- Single-key tool shortcuts (V select, P pen, R rect, O ellipse, L line, T text, M measure), all rebindable.
- Contextual properties panel: select a thing and see its meaningful properties (a bed shows area, material, and depth; a plant shows species, size, and quantity).
- Unlimited undo/redo, an undo history panel, and **autosave** (never lose work).
- Non-destructive everything: shape ops keep their sources editable where possible.
- Multi-select editing (change 30 plants to a different species at once).
- "Select similar" (all plants of this species, all shapes with this material).
- Find & replace a species across the plan (nursery is out of stock → swap).
- Quick measure tool (drag to read the distance, nothing gets added).
- Hover tooltips with names and dimensions, plus good empty states and onboarding.
- Dark/light theme, high-DPI crisp rendering, and fast with thousands of objects.
- **Touch and stylus** support (iPad + Pencil on site would be huge), with palm rejection.
- Copy/paste between documents (and to/from other apps as SVG/PNG).
- Templates: start a new project from a template with a title block, layers, and favorite plants.

### 4.11 Later / maybe
- Client share link (view-only, comments, approve option A/B).
- Real-time collaboration.
- Irrigation layout (heads, zones, coverage arcs) and lighting layout (fixtures, beam spreads, wiring runs).
- Photo-overlay "imaging": place plant photos on a photo of the client's house (iScape-style).
- Regional nursery inventory/pricing integration.
- AI helpers: "suggest a deer-resistant planting for this shady bed," "auto-arrange plants by height."

---

## 5. Data model sketch (3D-aware from day one)

Even if 3D ships months later, designing the document like this now avoids a rewrite:

```
Project
 ├─ settings: units, north angle, location (lat/long), default print scale
 ├─ libraries: materials[], components[], plants[] (refs to built-in + custom)
 ├─ layers[]
 ├─ objects[]                      ← the single source of truth, in real units
 │    ├─ id, type, layerId, tags[], status (existing|proposed|demo)
 │    ├─ geometry: path (Béziers, holes) in plan XY
 │    ├─ z: baseElevation, height
 │    ├─ style: materialId | fill/stroke overrides, pattern origin/rotation
 │    └─ type-specific: plant {speciesId, installSize}, instance {componentId, overrides}, dimension {...}, label {...}
 ├─ views[]: plan, elevation/section (cut line), 3D camera presets
 ├─ sheets[]: paper size, title block, viewports → views at scale
 └─ options[] / history snapshots
```

Every view (plan, elevations, 3D, sheets, takeoff) is a **projection of the same objects**.
The drawing stores no area/quantity totals; they're always computed from the objects.

---

## 6. Tech direction (tentative)

- **Web app first** (TypeScript). Runs anywhere, including iPad, and needs no install. It can be wrapped as a desktop app later (Tauri/Electron) if offline or file access matters.
- **UI:** React (or Svelte/Solid) for panels and chrome. The canvas is its own rendering engine, not DOM.
- **2D plan rendering:** Canvas 2D or WebGL (e.g. PixiJS) with custom pattern fills. SVG is simpler but struggles with thousands of hatched shapes.
- **Geometry:** a Bézier/path library for curves, plus Clipper2 (or similar) for robust offset and boolean ops.
- **3D:** Three.js. Orthographic cameras give the front/side/section views and a perspective camera gives the 3D pane, all fed from the same document.
- **Storage:** local-first (IndexedDB) with a JSON-based project file (zipped, with images). Cloud sync later.
- **State:** an immutable document store plus a command pattern, which gives undo/redo, autosave, and later collaboration (CRDT, e.g. Yjs) a clean path.

---

## 7. Proposed phasing (strawman, to be reshaped after talking to the friend)

**Phase 0: Foundations**
Document model, units, pan/zoom canvas, selection, undo/redo, autosave, save/load file.

**Phase 1: Drawing that feels great**
Rect/ellipse/polygon/line, pen tool, smooth freehand curve, node editing, snapping and smart guides, typed dimensions, layers, materials with real-scale hatch patterns.

**Phase 2: Plants & components**
Built-in starter plant library (~100–200 common species), plant symbols at mature spread, massing/fill tools, auto plant schedule, "make component" plus a library and instances.

**Phase 3: Real projects**
Underlay import with scale calibration, dimensions and labels, live quantity takeoff, sheets with title block, PDF export to scale.

**Phase 4: Into 3D**
Height data UI, quad view with maximize/toggle, extruded hardscape and plant proxies, section-cut tool.

**Phase 5+:** growth slider, sun/shadow, grading, client sharing, collaboration, irrigation/lighting.

A good **first demo** to aim for: *import an aerial photo, calibrate the scale, trace the house,
draw a curvy bed and a herringbone paver patio, drop in a few plants, and see the plant list and
patio square footage update live.* If that feels great, the foundation is right.

---

## 8. Questions for the friend (please answer before we build)

**About the work**
1. What kind of projects: residential, commercial, both? Typical size (a front yard vs. a 5-acre estate)?
2. Designer only, or design-build (do you also price and install)?
3. What do you hand the client: a printed colored plan, PDF, 3D images, a walkthrough?
4. What do you hand the crew or nursery: a plant list, dimensions, a bid?

**About the current tool**
5. Which software do you use now, and how long have you used it?
6. What are the three most frustrating things about it? What's the one thing it does that you'd *hate* to lose?
7. Can you share a recent real project (exported plan + any spreadsheets)? Even better, a 10-minute screen recording of you working in it.

**About drawing**
8. Mouse, trackpad, or stylus/iPad? Do you sketch by hand first?
9. Do you start from a survey, an aerial photo, or your own tape measurements?
10. Crisp CAD look or hand-rendered/watercolor look for client presentations? Both?
11. Imperial or metric? Do you ever need to exchange DWG/DXF files with architects or engineers?

**About plants**
12. What region/hardiness zone? Roughly how many plants are in your regular palette?
13. What plant info do you actually look at when choosing (sun, size, bloom, deer, native…)?
14. Do you have your own plant symbols you'd want to bring over?

**About 3D & the rest**
15. How often do clients need 3D, and how good does it need to look? Is it a closer or a nice-to-have?
16. Do you deal with grading/slopes and drainage on plans, or is it mostly flat?
17. Solo, or would a team or clients need to access the files?
18. Would you pay for this, and what's the current tool costing you?

---

## 9. Next steps

1. Get answers to §8, ideally with a real sample project and a screen recording.
2. Rewrite §7 into a concrete MVP scope with a short list of "must feel amazing" interactions.
3. Pick the stack (§6), scaffold the repo, and build Phase 0 + the first slice of Phase 1.
