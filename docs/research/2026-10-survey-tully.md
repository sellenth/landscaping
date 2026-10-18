# Survey results: Tully Henderson (October 2026)

Collected with the survey in [`designer-survey.html`](designer-survey.html).
Raw answers first, then what they mean for the product.

## Raw answers

**Work**
- Projects: Residential
- Typical site size: Multi-acre
- Role: Design-build (prices and installs)

**Deliverables**
- To the client: printed color plan, PDF, 3D images, plant photo sheet, walkthrough video, hand sketch
- To the crew/nursery: plant list, dimensioned plan, bid/estimate, material quantities

**Current software**
- Uses: PRO Landscape, SketchUp, AutoCAD + Land F/X
- Experience: 5 years
- Top frustrations:
  1. Constant glitches
  2. Expensive price
  3. Vendors removing or changing features, processes and procedures for doing things in the program
- Would hate to lose: the 2D schematic view

**Drawing**
- Draws with: paper first, then computer, using a mouse
- Starts base plans from: property survey, aerial/satellite photo, own tape measurements, architect's drawings, client's sketch (all of them)
- Client plan look: 3 of 5 (halfway between crisp CAD and hand-rendered)
- Units: feet and inches
- DWG/DXF exchange: sometimes

**Plants**
- Region: high desert, central Oregon
- Palette size: under 50
- Looks at: mature size, sun/shade, water, hardiness zone, bloom color and season, fall color, evergreen vs deciduous, native, deer resistance, cost, nursery availability (every option)
- Own symbols to bring in: a few

**3D and site**
- How often clients need 3D: 3 of 5
- 3D quality: decent, with real-looking plants
- Grading/slopes/drainage: **a big part of his work**
- Who touches files: team and clients

**Wishlist (top 5)**
1. Live quantities
2. Plant library with real data
3. Real-scale paver patterns
4. Smooth curve tool
5. Print to scale

**Practical**
- Would pay if it solved his top frustrations: Probably
- Current cost: $1,200/year for two seats
- Would share a project or screen recording: Maybe, ask

**Magic wand**
> Be able to show in 3D a 2D plan and walk around as a person, similar to Minecraft first person.

---

## What this tells us

### 1. He's juggling three tools to do one job
He uses PRO Landscape, SketchUp *and* AutoCAD + Land F/X, so roughly: 2D plans and imaging,
3D, and CAD/DWG work. That's three programs, three file formats, and re-drawing the same yard
more than once. **One drawing that is the plan, the bid and the 3D walk-through** is the pitch.

### 2. Reliability is a feature
His #1 and #3 complaints aren't about missing features. They're about the software being
**glitchy** and **changing under him**. So:
- Autosave, crash recovery, and "you never lose work" are core features, not polish.
- A versioned file format with migrations, so old projects always open.
- A strong automated test suite from day one.
- A stable, predictable UI. Don't move things around between versions.

### 3. Design-build means the estimate matters as much as the drawing
He prices and installs, hands the crew quantities and a bid, and ranked **live quantities** #1.
The takeoff panel (area, volume, length, count, cost) belongs in the first version, not later.

### 4. The 2D plan is home base
The one thing he'd hate to lose is the 2D schematic view, and he works with a mouse. The first
version should be an excellent mouse-and-keyboard 2D planner. iPad/stylus support can wait.

### 5. Grading is bigger than we assumed
Multi-acre residential in the central Oregon high desert, with grading as a big part of the
work. For a design-build firm, grading also means **cut/fill volumes in the bid**. Terrain also
underpins the 3D walk-through: you can't walk a hillside site on a flat plane. Grading moves
up from "later" to its own phase right after 3D.

### 6. His magic wand is a first-person walk-through
"Walk around as a person, like Minecraft." That's very achievable: WASD to move, mouse to look,
eye height around 5'6", walking on the terrain. 3D wasn't in his top 5 for daily work, but it's
how he wants to *sell*. It's the "wow" feature after the 2D core works.

### 7. Plants: a small, rich, regional palette
Under 50 plants, but he checks *every* attribute. He doesn't need 10,000 species. He needs
**his own palette** with complete data (including cost and nursery availability, which change
per supplier). Ship a high-desert starter set, make it easy to edit, and let him import a few
of his own symbols (SVG).

### 8. Everything comes in as an underlay
He starts from surveys, aerials, tape measurements, architect's drawings *and* client sketches.
Image/PDF import with two-click scale calibration is required even though he didn't pick it in
his top 5. **DXF import** matters too, since surveys and architect's drawings often arrive as DWG.

### 9. The look sits in the middle
A 3 of 5 means clean, readable plans with some warmth (soft color fills, plant shadows), not
pure CAD and not watercolor. One good default style is enough to start.

### 10. Pricing benchmark
$600 per seat per year today, and he'd "probably" pay. Team and client access will matter
later (sharing, multiple seats).

### Notable non-picks
- **Reusable components** weren't in his top 5, though "save a canvas as a reusable object" came
  up in the original conversation. Keep it, but it isn't a first-version feature.
- **iPad, sun/shade studies and the growth slider** weren't picked. They're later ideas.

---

## Follow-ups to ask him
He said "Maybe, ask me" to sharing a project. Specific, small asks are more likely to get a yes:

1. **His plant list** (the under-50 palette) as a spreadsheet or photo. We'll seed the library with it.
2. **One recent bid or estimate** (numbers blacked out is fine), so the quantities export matches what he uses.
3. **One survey or base plan** he started from (PDF or DWG), to test import and calibration.
4. **How he shows grading today**: spot elevations, contour lines, or both? Does he calculate cut/fill?
5. **His 5–10 most-used hardscape materials** (e.g. flagstone, pavers, gravel types, boulders).
