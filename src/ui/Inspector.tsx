import { pathArea, pathLength } from "../geometry/path";
import { updateMaterial, updateShapes, updateUnderlay } from "../model/ops";
import type { Material, Shape, Underlay } from "../model/types";
import { formatCubicYards, formatInches, formatLength, formatSquareFeet } from "../model/units";
import { editor, useEditor } from "../store/editor";
import { deleteSelection, duplicateSelection, reorderSelection } from "./actions";
import { LengthField, MaterialSwatch, NumberField } from "./fields";

export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const shapes = doc.objects.filter((o) => selection.includes(o.id));
  const underlay = doc.underlays.find((u) => selection.includes(u.id));

  if (underlay && shapes.length === 0) return <UnderlayInspector underlay={underlay} />;
  if (shapes.length === 0) return <NothingSelected />;
  return <ShapeInspector shapes={shapes} />;
}

function NothingSelected() {
  const activeMaterialId = useEditor((s) => s.activeMaterialId);
  const materials = useEditor((s) => s.doc.materials);
  return (
    <div className="inspector">
      <p className="muted">Nothing selected. Choose the material for the next shape you draw:</p>
      <MaterialPicker
        materials={materials}
        value={activeMaterialId}
        onChange={(id) => editor.set({ activeMaterialId: id })}
      />
    </div>
  );
}

function MaterialPicker({ materials, value, onChange }: { materials: Material[]; value: string | null | "mixed"; onChange: (id: string | null) => void }) {
  return (
    <div className="material-grid" role="radiogroup" aria-label="Material">
      <button type="button" role="radio" aria-checked={value === null} className="material-option" onClick={() => onChange(null)} title="Outline only (no fill)">
        <MaterialSwatch material={null} />
        <span>Outline only</span>
      </button>
      {materials.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={value === m.id} className="material-option" onClick={() => onChange(m.id)} title={m.name}>
          <MaterialSwatch material={m} />
          <span>{m.name}</span>
        </button>
      ))}
    </div>
  );
}

function ShapeInspector({ shapes }: { shapes: Shape[] }) {
  const doc = useEditor((s) => s.doc);
  const ids = shapes.map((s) => s.id);
  const single = shapes.length === 1 ? shapes[0] : null;
  const materialIds = new Set(shapes.map((s) => s.materialId));
  const materialValue = materialIds.size === 1 ? shapes[0].materialId : "mixed";
  const material = materialValue && materialValue !== "mixed" ? doc.materials.find((m) => m.id === materialValue) : undefined;
  const layerIds = new Set(shapes.map((s) => s.layerId));
  const area = shapes.reduce((sum, s) => sum + pathArea(s.path), 0);
  const perimeter = shapes.reduce((sum, s) => sum + pathLength(s.path), 0);
  const anyClosed = shapes.some((s) => s.path.closed);

  const patch = (p: Partial<Shape>, label: string) => editor.commit(updateShapes(editor.doc, ids, p), label);

  return (
    <div className="inspector">
      {single ? (
        <label className="row">
          <span>Name</span>
          <input
            id="shape-name"
            className="field"
            key={single.id}
            defaultValue={single.name}
            onBlur={(e) => e.target.value.trim() && e.target.value !== single.name && patch({ name: e.target.value.trim() }, "Rename")}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
      ) : (
        <p className="muted">{shapes.length} shapes selected</p>
      )}

      <div className="stats">
        <div>
          <span className="stat-label">{anyClosed ? "Area" : "Length"}</span>
          <span className="stat-value" data-testid="selection-area">{anyClosed ? formatSquareFeet(area) : formatLength(perimeter)}</span>
        </div>
        {anyClosed && (
          <div>
            <span className="stat-label">Perimeter</span>
            <span className="stat-value">{formatLength(perimeter)}</span>
          </div>
        )}
        {material?.unit === "cuyd" && (
          <div>
            <span className="stat-label">Volume</span>
            <span className="stat-value">{formatCubicYards(area * material.depth)}</span>
          </div>
        )}
      </div>

      <label className="row">
        <span>Layer</span>
        <select
          id="shape-layer"
          className="field"
          value={layerIds.size === 1 ? shapes[0].layerId : ""}
          onChange={(e) => patch({ layerId: e.target.value }, "Change layer")}
        >
          {layerIds.size > 1 && <option value="">Mixed</option>}
          {doc.layers.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </label>

      {anyClosed && (
        <>
          <h3 className="section-label">Material</h3>
          <MaterialPicker
            materials={doc.materials}
            value={materialValue}
            onChange={(id) => {
              patch({ materialId: id }, "Change material");
              editor.set({ activeMaterialId: id });
            }}
          />
          {material && (
            <div className="material-settings">
              <label className="row">
                <span>Rotate pattern</span>
                <span className="inline">
                  <NumberField id="pattern-angle" value={single?.patternAngle ?? 0} step={15} suffix="°" onCommit={(v) => patch({ patternAngle: v }, "Rotate pattern")} />
                  <button type="button" className="btn small" onClick={() => patch({ patternAngle: ((single?.patternAngle ?? 0) + 45) % 360 }, "Rotate pattern")}>+45°</button>
                </span>
              </label>
              {material.unit === "cuyd" && (
                <label className="row">
                  <span>Depth</span>
                  <LengthField
                    id="material-depth"
                    value={material.depth}
                    bareUnit="in"
                    format={formatInches}
                    onCommit={(v) => editor.commit(updateMaterial(editor.doc, material.id, { depth: v }), "Change depth")}
                  />
                </label>
              )}
              <p className="hint">Depth and price apply to all “{material.name}” in this plan.</p>
            </div>
          )}
        </>
      )}

      <h3 className="section-label">For 3D</h3>
      <label className="row">
        <span>Height</span>
        <LengthField id="shape-height" value={single?.height ?? 0} onCommit={(v) => patch({ height: v }, "Change height")} />
      </label>
      <label className="row">
        <span>Base elevation</span>
        <LengthField id="shape-elevation" value={single?.baseElevation ?? 0} onCommit={(v) => patch({ baseElevation: v }, "Change elevation")} />
      </label>
      <p className="hint">Stored now so the 3D walk-through can use it later.</p>

      <div className="button-row">
        {single && <button type="button" className="btn" onClick={() => editor.setTool("node")}>Edit points <kbd>A</kbd></button>}
        <button type="button" className="btn" onClick={duplicateSelection}>Duplicate <kbd>⌘D</kbd></button>
        <button type="button" className="btn" onClick={() => reorderSelection(1)}>To front <kbd>]</kbd></button>
        <button type="button" className="btn" onClick={() => reorderSelection(-1)}>To back <kbd>[</kbd></button>
        <button type="button" className="btn danger" onClick={deleteSelection}>Delete <kbd>Del</kbd></button>
      </div>
    </div>
  );
}

function UnderlayInspector({ underlay }: { underlay: Underlay }) {
  const patch = (p: Partial<Underlay>, label: string) => editor.commit(updateUnderlay(editor.doc, underlay.id, p), label);
  return (
    <div className="inspector">
      <p className="muted">Underlay image: <b>{underlay.name}</b></p>
      <div className="stats">
        <div>
          <span className="stat-label">Width</span>
          <span className="stat-value">{formatLength(underlay.width)}</span>
        </div>
        <div>
          <span className="stat-label">Height</span>
          <span className="stat-value">{formatLength(underlay.height)}</span>
        </div>
      </div>
      <button type="button" className="btn primary wide" onClick={() => editor.setTool("calibrate")}>
        Set scale…
      </button>
      <p className="hint">Click two points with a known distance (a property line, the house wall), then type that distance.</p>
      <label className="row">
        <span>Opacity</span>
        <input
          id="underlay-opacity"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={underlay.opacity}
          onChange={(e) => editor.preview(updateUnderlay(editor.doc, underlay.id, { opacity: Number(e.target.value) }))}
          onPointerUp={() => editor.commit(editor.doc, "Change opacity")}
          onKeyUp={() => editor.commit(editor.doc, "Change opacity")}
        />
      </label>
      <label className="row checkbox">
        <input id="underlay-locked" type="checkbox" checked={underlay.locked} onChange={(e) => patch({ locked: e.target.checked }, e.target.checked ? "Lock underlay" : "Unlock underlay")} />
        <span>Locked (can't be moved or selected on the plan)</span>
      </label>
      <div className="button-row">
        <button type="button" className="btn danger" onClick={deleteSelection}>Remove image</button>
      </div>
    </div>
  );
}
