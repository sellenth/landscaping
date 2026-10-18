import type { ToolId } from "../store/editor";

const common = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function ToolIcon({ id }: { id: ToolId }) {
  switch (id) {
    case "select":
      return <svg {...common}><path d="M5 3l10 6.5-4.5 1L8.5 15z" /></svg>;
    case "node":
      return (
        <svg {...common}>
          <path d="M3 15C6 5 14 5 17 15" />
          <rect x="1.5" y="13.5" width="3" height="3" fill="currentColor" />
          <rect x="15.5" y="13.5" width="3" height="3" fill="currentColor" />
          <path d="M3 15L8 6" strokeDasharray="1.5 2" />
          <circle cx="8" cy="6" r="1.5" />
        </svg>
      );
    case "curve":
      return <svg {...common}><path d="M3 14c2-6 5-8 7-5s4 3 7-4" /><circle cx="3" cy="14" r="1.3" fill="currentColor" /></svg>;
    case "polygon":
      return <svg {...common}><path d="M4 15L7 4l9 3-2 9z" /></svg>;
    case "rect":
      return <svg {...common}><rect x="3.5" y="5" width="13" height="10" rx="0.5" /></svg>;
    case "ellipse":
      return <svg {...common}><circle cx="10" cy="10" r="6.5" /></svg>;
    case "measure":
      return <svg {...common}><path d="M3 13l10-10 4 4-10 10z" /><path d="M6 10l1.5 1.5M8.5 7.5L10 9M11 5l1.5 1.5" /></svg>;
    case "hand":
      return <svg {...common}><path d="M7 10V5a1.2 1.2 0 012.4 0v4M9.4 9V3.8a1.2 1.2 0 012.4 0V9M11.8 9V5a1.2 1.2 0 012.4 0v6c0 3-2 5-5 5-2 0-3-1-4.3-2.6L3.6 11a1.2 1.2 0 012-1.4L7 11" /></svg>;
    case "calibrate":
      return <svg {...common}><path d="M3 17L17 3" /><circle cx="3" cy="17" r="1.5" /><circle cx="17" cy="3" r="1.5" /></svg>;
  }
}

export const UndoIcon = () => <svg {...common}><path d="M7 5L3 9l4 4" /><path d="M3 9h9a5 5 0 010 10h-2" /></svg>;
export const RedoIcon = () => <svg {...common}><path d="M13 5l4 4-4 4" /><path d="M17 9H8a5 5 0 000 10h2" /></svg>;
export const EyeIcon = ({ off }: { off?: boolean }) => (
  <svg {...common}>
    <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
    <circle cx="10" cy="10" r="2.3" />
    {off && <path d="M3 17L17 3" />}
  </svg>
);
export const LockIcon = ({ open }: { open?: boolean }) => (
  <svg {...common}>
    <rect x="4.5" y="9" width="11" height="8" rx="1.2" />
    <path d={open ? "M7 9V6a3 3 0 015.8-1" : "M7 9V6a3 3 0 016 0v3"} />
  </svg>
);
