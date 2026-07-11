"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import TypingIndicator from "@/components/TypingIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = { role: "user", content: text };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
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
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar onSuggestionClick={sendMessage} onNewChat={handleNewChat} />

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

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={loading} />
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
