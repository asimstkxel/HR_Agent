"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
            isUser
              ? "bg-primary text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {isUser ? "U" : "AI"}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-white rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          }`}
        >
          {formatContent(content)}
        </div>
      </div>
    </div>
  );
}

function formatContent(text: string) {
  // Convert markdown-style bold **text** to <strong>
  // Convert markdown links [text](url) to <a>
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, i) => {
    // Bold
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return <strong key={i} className="font-semibold">{boldMatch[1]}</strong>;
    }

    // Link
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:opacity-80`}
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}
