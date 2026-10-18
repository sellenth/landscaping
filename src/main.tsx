import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { editor } from "./store/editor";
import { restoreAutosave, startAutosave } from "./store/persist";
import { App } from "./ui/App";
import "./styles.css";

async function boot() {
  const restored = await restoreAutosave();
  if (restored) editor.load(restored);
  startAutosave(editor);
  (window as unknown as { __editor: typeof editor }).__editor = editor;
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
