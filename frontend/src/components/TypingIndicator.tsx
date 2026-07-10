"use client";

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold bg-emerald-600 text-white">
          AI
        </div>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
