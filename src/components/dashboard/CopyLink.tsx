"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-paper p-1.5 pl-3.5">
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2 hover:text-ink">
        {url}
      </a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-ink-2"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
