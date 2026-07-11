"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import TypingIndicator from "@/components/TypingIndicator";
import SearchFilters, { Filters, EMPTY_FILTERS } from "@/components/SearchFilters";
import {
  ChatSession,
  loadSessions,
  saveSession,
  deleteSession,
  generateId,
  extractTitle,
} from "@/lib/history";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function buildFilterContext(filters: Filters): string {
  const parts: string[] = [];
  if (filters.location) parts.push(`Location: ${filters.location}`);
  if (filters.datePosted !== "24h") {
    const labels: Record<string, string> = { "3d": "last 3 days", "7d": "last 7 days", "30d": "last 30 days" };
    parts.push(`Date posted: ${labels[filters.datePosted] || filters.datePosted}`);
  }
  if (filters.experienceLevel) parts.push(`Experience level: ${filters.experienceLevel}`);
  if (filters.salaryMin || filters.salaryMax) {
    const min = filters.salaryMin ? `$${Number(filters.salaryMin).toLocaleString()}` : "any";
    const max = filters.salaryMax ? `$${Number(filters.salaryMax).toLocaleString()}` : "any";
    parts.push(`Salary range (USD/year): ${min} - ${max}`);
  }
  if (parts.length === 0) return "";
  return `\n\n[Filters: ${parts.join(" | ")}]`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<Filters>(filters);
  filtersRef.current = filters;

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Save current session whenever messages change
  useEffect(() => {
    if (messages.length === 0 || !activeSessionId) return;
    const session: ChatSession = {
      id: activeSessionId,
      title: extractTitle(messages[0].content),
      messages,
      createdAt: sessions.find((s) => s.id === activeSessionId)?.createdAt || Date.now(),
    };
    saveSession(session);
    setSessions(loadSessions());
  }, [messages, activeSessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      // Always read latest filters from ref to avoid stale closures
      const filterContext = buildFilterContext(filtersRef.current);
      const fullMessage = text + filterContext;

      // Create a new session if none is active
      setActiveSessionId((prev) => {
        if (!prev) {
          const newId = generateId();
          return newId;
        }
        return prev;
      });

      setMessages((prev) => {
        const userMsg: Message = { role: "user", content: text };
        return [...prev, userMsg];
      });
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: fullMessage,
            history: messages,
          }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, something went wrong. Please check that API keys are configured and try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    const session = loadSessions().find((s) => s.id === id);
    if (session) {
      setMessages(session.messages);
      setActiveSessionId(session.id);
    }
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      deleteSession(id);
      setSessions(loadSessions());
      if (activeSessionId === id) {
        setMessages([]);
        setActiveSessionId(null);
      }
    },
    [activeSessionId],
  );

  return (
    <div className="flex h-full">
      <Sidebar
        onSuggestionClick={sendMessage}
        onNewChat={handleNewChat}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
            AI
          </div>
          <div>
            <h1 className="text-sm font-bold">HR Job Search Agent</h1>
            <p className="text-xs text-muted">Powered by AI</p>
          </div>
          <button onClick={handleNewChat} className="ml-auto text-xs text-primary font-medium">
            New Chat
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && !loading && <EmptyState onSuggestionClick={sendMessage} />}
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && <TypingIndicator />}
          </div>
        </div>

        {/* Filters + Input */}
        <div className="border-t border-border bg-card px-4 py-3">
          <SearchFilters filters={filters} onChange={setFilters} />
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
  const quickStarts = [
    { label: "Find Jobs", query: "Python developer jobs in Lahore" },
    { label: "LinkedIn Search", query: "SQA manager jobs in Lahore on LinkedIn" },
    { label: "Salary Estimate", query: "What is the salary for a React developer in Karachi?" },
    { label: "Company Research", query: "Tell me about Systems Limited" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2">HR Job Search Agent</h2>
      <p className="text-muted text-sm mb-8 max-w-md">
        Search jobs across the web and LinkedIn, estimate salaries, and research companies — all powered by AI.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {quickStarts.map((qs) => (
          <button
            key={qs.label}
            onClick={() => onSuggestionClick(qs.query)}
            className="text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <p className="text-sm font-medium">{qs.label}</p>
            <p className="text-xs text-muted mt-1 line-clamp-1">{qs.query}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
