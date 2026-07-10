"use client";

const SUGGESTIONS = [
  "SQA Manager jobs in Lahore",
  "Remote Python developer roles",
  "Data Analyst jobs in Karachi",
  "Frontend React developer in Islamabad",
  "Salary estimate for DevOps Engineer in Pakistan",
  "Tell me about Systems Limited on LinkedIn",
];

interface SidebarProps {
  onSuggestionClick: (suggestion: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({ onSuggestionClick, onNewChat }: SidebarProps) {
  return (
    <aside className="w-72 border-r border-border bg-card flex flex-col h-full shrink-0 hidden md:flex">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">HR Agent</h1>
        <p className="text-xs text-muted mt-1">AI-powered job search assistant</p>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-4 rounded-xl border border-border text-sm font-medium hover:bg-background transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Search
        </button>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-1">
          Try searching
        </p>
        <div className="space-y-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestionClick(s)}
              className="w-full text-left text-sm px-3 py-2.5 rounded-lg hover:bg-background transition-colors text-foreground/80 leading-snug"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Powered by LangGraph + Tavily
        </div>
      </div>
    </aside>
  );
}
