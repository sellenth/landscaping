// Autosave and crash recovery. The current plan is written to IndexedDB a
// moment after every change, and restored on the next launch.

import { DocumentLoadError, loadDocument, serializeDocument } from "../model/migrate";
import type { LandscapeDocument } from "../model/types";
import type { Editor } from "./editor";

const DB_NAME = "landscaping";
const STORE = "autosave";
const KEY = "current";
const AUTOSAVE_DELAY_MS = 400;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function restoreAutosave(): Promise<LandscapeDocument | null> {
  try {
    const saved = await idbGet(KEY);
    return saved ? loadDocument(saved) : null;
  } catch (e) {
    console.warn("Could not restore the autosaved plan", e);
    return null;
  }
}

/** Starts autosaving. Returns a function that stops it. */
export function startAutosave(editor: Editor): () => void {
  let lastDoc = editor.doc;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    timer = null;
    const doc = editor.doc;
    try {
      await idbSet(KEY, serializeDocument(doc));
      if (editor.doc === doc) editor.set({ saveStatus: "saved" });
    } catch (e) {
      console.error("Autosave failed", e);
      editor.set({ saveStatus: "error" });
    }
  };

  const unsubscribe = editor.subscribe(() => {
    const doc = editor.getState().doc;
    if (doc === lastDoc || editor.history.inGesture) return;
    lastDoc = doc;
    if (editor.getState().saveStatus !== "saving") editor.set({ saveStatus: "saving" });
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
  });

  const onUnload = () => {
    if (timer) void flush();
  };
  window.addEventListener("beforeunload", onUnload);
  return () => {
    unsubscribe();
    window.removeEventListener("beforeunload", onUnload);
  };
}

export function downloadFile(filename: string, contents: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

export async function readPlanFile(file: File): Promise<LandscapeDocument> {
  const text = await file.text();
  return loadDocument(text);
}

export function safeFileName(name: string) {
  return name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "plan";
}

export { DocumentLoadError };
