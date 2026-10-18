import { useState } from "react";
import { addLayer, deleteLayer, updateLayer, updateMaterial, updateUnderlay } from "../model/ops";
import { computeQuantities } from "../model/quantities";
import { formatCount, formatInches, formatMoney, toSquareFeet } from "../model/units";
import { editor, useEditor } from "../store/editor";
import { exportBidCsv } from "./actions";
import { EyeIcon, LockIcon } from "./Icons";
import { MaterialSwatch, NumberField } from "./fields";

export function LayersPanel() {
  const doc = useEditor((s) => s.doc);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const selection = useEditor((s) => s.selection);
  const [renaming, setRenaming] = useState<string | null>(null);
  const counts = new Map<string, number>();
  for (const o of doc.objects) counts.set(o.layerId, (counts.get(o.layerId) ?? 0) + 1);

  return (
    <div className="layers">
      <ul className="layer-list">
        {[...doc.layers].reverse().map((l) => (
          <li key={l.id} className={l.id === activeLayerId ? "active" : ""}>
            <button
              type="button"
              className="icon-btn"
              aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`}
              aria-pressed={!l.visible}
              onClick={() => editor.commit(updateLayer(editor.doc, l.id, { visible: !l.visible }), l.visible ? "Hide layer" : "Show layer")}
            >
              <EyeIcon off={!l.visible} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={l.locked ? `Unlock ${l.name}` : `Lock ${l.name}`}
              aria-pressed={l.locked}
              onClick={() => editor.commit(updateLayer(editor.doc, l.id, { locked: !l.locked }), l.locked ? "Unlock layer" : "Lock layer")}
            >
              <LockIcon open={!l.locked} />
            </button>
            {renaming === l.id ? (
              <input
                id={`layer-name-${l.id}`}
                className="field"
                autoFocus
                defaultValue={l.name}
                onBlur={(e) => {
                  setRenaming(null);
                  const name = e.target.value.trim();
                  if (name && name !== l.name) editor.commit(updateLayer(editor.doc, l.id, { name }), "Rename layer");
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <button
                type="button"
                className="layer-name"
                onClick={() => editor.set({ activeLayerId: l.id })}
                onDoubleClick={() => setRenaming(l.id)}
                title="Click to draw on this layer · double-click to rename"
              >
                {l.name}
                <span className="count">{counts.get(l.id) ?? 0}</span>
              </button>
            )}
            {doc.layers.length > 1 && (
              <button
                type="button"
                className="icon-btn subtle"
                aria-label={`Delete ${l.name}`}
                title="Delete layer (its shapes move to the bottom layer)"
                onClick={() => editor.commit(deleteLayer(editor.doc, l.id), "Delete layer")}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn small"
        onClick={() => {
          const r = addLayer(editor.doc, `Layer ${doc.layers.length + 1}`);
          editor.commit(r.doc, "Add layer");
          editor.set({ activeLayerId: r.id });
          setRenaming(r.id);
        }}
      >
        + Add layer
      </button>

      {doc.underlays.length > 0 && (
        <>
          <h3 className="section-label">Underlay images</h3>
          <ul className="layer-list">
            {doc.underlays.map((u) => (
              <li key={u.id} className={selection.includes(u.id) ? "active" : ""}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={u.locked ? `Unlock ${u.name}` : `Lock ${u.name}`}
                  aria-pressed={u.locked}
                  onClick={() => editor.commit(updateUnderlay(editor.doc, u.id, { locked: !u.locked }), u.locked ? "Unlock underlay" : "Lock underlay")}
                >
                  <LockIcon open={!u.locked} />
                </button>
                <button type="button" className="layer-name" onClick={() => editor.select([u.id])}>
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function QuantitiesPanel() {
  const doc = useEditor((s) => s.doc);
  const { rows, total } = computeQuantities(doc);
  const [editing, setEditing] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="quantities">
        <p className="muted">Draw a closed shape and give it a material. Square footage, cubic yards and costs show up here as you draw.</p>
      </div>
    );
  }

  return (
    <div className="quantities" data-testid="quantities">
      <table>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className="num">Qty</th>
            <th scope="col" className="num">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.material.id} className={editing === r.material.id ? "editing" : ""}>
              <td>
                <button type="button" className="qty-item" onClick={() => setEditing(editing === r.material.id ? null : r.material.id)} title="Click to set price and depth">
                  <MaterialSwatch material={r.material} size={18} />
                  <span>
                    {r.material.name}
                    <small>
                      {r.unit === "cuyd" ? `${formatCount(toSquareFeet(r.area))} sq ft at ${formatInches(r.material.depth)} · ` : ""}
                      {formatMoney(r.material.unitCost)}/{r.unit === "cuyd" ? "cu yd" : "sq ft"}
                    </small>
                  </span>
                </button>
                {editing === r.material.id && (
                  <div className="qty-edit">
                    <label>
                      Price per {r.unit === "cuyd" ? "cu yd" : "sq ft"}
                      <NumberField
                        id={`price-${r.material.id}`}
                        value={r.material.unitCost}
                        step={0.25}
                        min={0}
                        prefix="$"
                        onCommit={(v) => editor.commit(updateMaterial(editor.doc, r.material.id, { unitCost: v }), "Change price")}
                      />
                    </label>
                    {r.unit === "cuyd" && (
                      <label>
                        Depth
                        <NumberField
                          id={`depth-${r.material.id}`}
                          value={r.material.depth}
                          step={0.5}
                          min={0}
                          suffix="in"
                          onCommit={(v) => editor.commit(updateMaterial(editor.doc, r.material.id, { depth: v }), "Change depth")}
                        />
                      </label>
                    )}
                  </div>
                )}
              </td>
              <td className="num" data-testid={`qty-${r.material.id}`}>
                {r.unit === "cuyd" ? r.quantity.toFixed(1) : formatCount(r.quantity)}
                <small>{r.unit === "cuyd" ? "cu yd" : "sq ft"}</small>
              </td>
              <td className="num">{formatMoney(r.cost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td />
            <td className="num total" data-testid="quantities-total">{formatMoney(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="hint">Prices are examples. Click an item to set your own price and depth.</p>
      <button type="button" className="btn wide" onClick={exportBidCsv}>Export bid (CSV)</button>
    </div>
  );
}
