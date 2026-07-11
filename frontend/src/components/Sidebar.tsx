"use client";

import { ChatSession } from "@/lib/history";

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
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

export default function Sidebar({
  onSuggestionClick,
  onNewChat,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
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

      <div className="flex-1 overflow-y-auto p-3">
        {/* Search History */}
        {sessions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-1">
              Search History
            </p>
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-1 rounded-lg transition-colors ${
                    s.id === activeSessionId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-background text-foreground/80"
                  }`}
                >
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className="flex-1 text-left text-sm px-3 py-2.5 leading-snug min-w-0"
                  >
                    <p className="truncate">{s.title}</p>
                    <p className="text-xs text-muted mt-0.5">{formatDate(s.createdAt)}</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-muted hover:text-red-500 transition-all shrink-0"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
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
