export interface ChatSession {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string }[];
  createdAt: number;
}

const STORAGE_KEY = "hr-agent-history";
const MAX_SESSIONS = 50;

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function clearAllSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function extractTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/\[Filters:.*\]$/, "").trim();
  return clean.length > 50 ? clean.slice(0, 50) + "..." : clean;
}
