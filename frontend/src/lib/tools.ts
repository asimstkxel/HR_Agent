import { tavily } from "tavily";

function getTavily() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY! });
}

function isPostedWithinDays(result: TavilyResult, days: number = 1): boolean {
  // Check publishedDate field if available
  if (result.publishedDate) {
    try {
      const parsed = new Date(result.publishedDate);
      if (!isNaN(parsed.getTime())) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return parsed >= cutoff;
      }
    } catch { /* fall through to content check */ }
  }

  // Parse relative time from content text
  const text = (result.content || "").toLowerCase();
  const title = (result.title || "").toLowerCase();
  const combined = `${title} ${text}`;

  // Matches: "posted today", "1 hour ago", "5 hours ago", "just now", "minutes ago"
  // NOTE: bare "today" is excluded — "Apply today" doesn't mean "posted today"
  const recentPatterns = [
    /\bposted\s+today\b/,
    /\bjust\s+posted\b/,
    /\bjust now\b/,
    /\b\d+\s*(minute|min)s?\s*ago\b/,
    /\b\d+\s*hours?\s*ago\b/,
    /\b1\s*day\s*ago\b/,
    /\bposted\s*(just\s*)?now\b/,
    /\bnew\s+today\b/,
  ];

  // Check relative time mentions and compare against the allowed days range
  // Handle optional prefixes like "about", "approximately", "over", "~"
  const daysAgoMatch = combined.match(/\b(?:about|approximately|over|almost|~)?\s*(\d+)\s*days?\s*ago\b/);
  if (daysAgoMatch) {
    const mentionedDays = parseInt(daysAgoMatch[1], 10);
    return mentionedDays <= days;
  }
  const weeksAgoMatch = combined.match(/\b(?:about|approximately|over|almost|~)?\s*(\d+)\s*weeks?\s*ago\b/);
  if (weeksAgoMatch) {
    const mentionedDays = parseInt(weeksAgoMatch[1], 10) * 7;
    return mentionedDays <= days;
  }
  if (/\b(?:about|approximately|over|almost|~)?\s*\d+\s*months?\s*ago\b/.test(combined) ||
      /\b(?:about|approximately|over|almost|~)?\s*\d+\s*years?\s*ago\b/.test(combined)) {
    return false;
  }

  // Check for inline date like "posted on 2026-07-11" and validate it
  const inlineDateMatch = combined.match(/\bposted\s+on\s+(\d{4}-\d{2}-\d{2})\b/);
  if (inlineDateMatch) {
    const inlineDate = new Date(inlineDateMatch[1]);
    if (!isNaN(inlineDate.getTime())) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return inlineDate >= cutoff;
    }
  }

  // If content indicates it's recent, accept it
  for (const pattern of recentPatterns) {
    if (pattern.test(combined)) return true;
  }

  // No date info found — exclude by default (strict enforcement)
  return false;
}

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  publishedDate?: string;
}

function extractPostingAge(result: TavilyResult): { sortKey: number; label: string } {
  // Try publishedDate first
  if (result.publishedDate) {
    try {
      const parsed = new Date(result.publishedDate);
      if (!isNaN(parsed.getTime())) {
        const hoursAgo = Math.floor((Date.now() - parsed.getTime()) / 3_600_000);
        if (hoursAgo < 1) return { sortKey: 0, label: "Just now" };
        if (hoursAgo < 24) return { sortKey: hoursAgo, label: `${hoursAgo}h ago` };
        const daysAgo = Math.floor(hoursAgo / 24);
        return { sortKey: hoursAgo, label: `${daysAgo}d ago` };
      }
    } catch { /* fall through */ }
  }

  // Parse from content — handle optional "about/approximately/over" prefix
  const combined = `${result.title || ""} ${result.content || ""}`.toLowerCase();
  const prefix = /(?:about|approximately|over|almost|~)?\s*/;
  const minsMatch = combined.match(new RegExp(`\\b${prefix.source}(\\d+)\\s*(minute|min)s?\\s*ago\\b`));
  if (minsMatch) return { sortKey: 0, label: `${minsMatch[1]}m ago` };
  const hoursMatch = combined.match(new RegExp(`\\b${prefix.source}(\\d+)\\s*hours?\\s*ago\\b`));
  if (hoursMatch) return { sortKey: parseInt(hoursMatch[1], 10), label: `${hoursMatch[1]}h ago` };
  const daysMatch = combined.match(new RegExp(`\\b${prefix.source}(\\d+)\\s*days?\\s*ago\\b`));
  if (daysMatch) return { sortKey: parseInt(daysMatch[1], 10) * 24, label: `${daysMatch[1]}d ago` };
  const weeksMatch = combined.match(new RegExp(`\\b${prefix.source}(\\d+)\\s*weeks?\\s*ago\\b`));
  if (weeksMatch) return { sortKey: parseInt(weeksMatch[1], 10) * 168, label: `${weeksMatch[1]}w ago` };
  const monthsMatch = combined.match(new RegExp(`\\b${prefix.source}(\\d+)\\s*months?\\s*ago\\b`));
  if (monthsMatch) return { sortKey: parseInt(monthsMatch[1], 10) * 720, label: `${monthsMatch[1]}mo ago` };

  if (/\bposted\s+today\b|\bjust\s+posted\b|\bjust now\b/.test(combined)) return { sortKey: 0, label: "Today" };

  return { sortKey: 9999, label: "Recent" };
}

function stripStaleContent(content: string, days: number): string {
  if (!content) return content;
  // Split content into sentences/segments and remove ones with stale time references
  const segments = content.split(/(?<=[.!?\n])\s+/);
  const maxDays = days;
  const filtered = segments.filter((seg) => {
    const lower = seg.toLowerCase();
    // Check for "X months/years ago"
    if (/(?:about|approximately|over|almost|~)?\s*\d+\s*months?\s*ago/.test(lower)) return false;
    if (/(?:about|approximately|over|almost|~)?\s*\d+\s*years?\s*ago/.test(lower)) return false;
    // Check for "X weeks ago" beyond range
    const wm = lower.match(/(?:about|approximately|over|almost|~)?\s*(\d+)\s*weeks?\s*ago/);
    if (wm && parseInt(wm[1], 10) * 7 > maxDays) return false;
    // Check for "X days ago" beyond range
    const dm = lower.match(/(?:about|approximately|over|almost|~)?\s*(\d+)\s*days?\s*ago/);
    if (dm && parseInt(dm[1], 10) > maxDays) return false;
    return true;
  });
  return filtered.join(" ").trim() || "No recent details available.";
}

function formatResults(results: TavilyResult[], label: string, days: number = 1): string {
  const recent = results.filter((r) => isPostedWithinDays(r, days));
  const timeLabel = days === 1 ? "Last 24 Hours" : `Last ${days} Days`;

  const lines = [`${label} (${timeLabel}):\n`];

  if (recent.length === 0) {
    lines.push(
      `No jobs found posted in the ${timeLabel.toLowerCase()} for this query.\n` +
      "Try broadening your search with different keywords, a wider location, or check back later.\n"
    );
    return lines.join("\n");
  }

  // Sort by posting date: newest first
  const sorted = recent
    .map((r) => ({ ...r, age: extractPostingAge(r) }))
    .sort((a, b) => a.age.sortKey - b.age.sortKey);

  sorted.forEach((r, i) => {
    const cleanContent = stripStaleContent(r.content || "", days);
    lines.push(
      `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Posted: ${r.age.label}\n   ${cleanContent}\n`
    );
  });
  return lines.join("\n");
}

export async function searchJobs(query: string, days: number = 1): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const timeHint = days <= 1 ? `posted today ${today}` : `posted recently ${today}`;
  const response = await getTavily().search(`job listings hiring ${query} ${timeHint}`, {
    maxResults: 15,
    searchDepth: "advanced",
    includeAnswer: false,
    days,
  });

  return formatResults(response.results as TavilyResult[], "Job Listings Found", days);
}

export async function linkedinJobSearch(query: string, days: number = 1): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const timeHint = days <= 1 ? `posted today ${today}` : `posted recently ${today}`;
  const response = await getTavily().search(`site:linkedin.com/jobs ${query} ${timeHint}`, {
    maxResults: 15,
    searchDepth: "advanced",
    includeAnswer: false,
    days,
  });

  return formatResults(response.results as TavilyResult[], "LinkedIn Job Listings", days);
}

export async function linkedinCompanyLookup(companyName: string): Promise<string> {
  const response = await getTavily().search(
    `site:linkedin.com/company ${companyName} about employees`,
    { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
  );

  const lines: string[] = [];
  if (response.answer) lines.push(`Company Overview:\n${response.answer}\n`);
  lines.push("LinkedIn Company Results:\n");
  (response.results as TavilyResult[]).forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content || "No description available."}\n`);
  });
  return lines.join("\n");
}

export async function estimateSalary(role: string, location: string, experienceLevel: string = "mid"): Promise<string> {
  const response = await getTavily().search(
    `${role} salary ${location} ${experienceLevel} level 2024 2025`,
    { maxResults: 6, searchDepth: "advanced", includeAnswer: true }
  );

  const marketData: string[] = [];
  if (response.answer) marketData.push(response.answer);
  (response.results as TavilyResult[]).forEach((r) => {
    marketData.push(`Source: ${r.title} — ${r.content || ""}`);
  });

  return `Salary data for ${role} in ${location} (${experienceLevel} level):\n\n${marketData.join("\n\n")}`;
}

// Tool definitions for OpenAI function calling
export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "search_jobs",
      description:
        "Search for job listings. IMPORTANT: Always pass days=1 unless the user explicitly sets a different date filter via [Filters: Date posted: ...].",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query including role, location, experience level" },
          days: { type: "number", description: "MUST be 1 (24h) by default. Only use 3, 7, or 30 if user explicitly sets a date filter. Never default to 7." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "linkedin_job_search",
      description:
        "Search LinkedIn for job postings. IMPORTANT: Always pass days=1 unless the user explicitly sets a different date filter via [Filters: Date posted: ...].",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query including role, location, experience level" },
          days: { type: "number", description: "MUST be 1 (24h) by default. Only use 3, 7, or 30 if user explicitly sets a date filter. Never default to 7." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "linkedin_company_lookup",
      description:
        "Look up a company on LinkedIn to get company info, size, and industry.",
      parameters: {
        type: "object",
        properties: { company_name: { type: "string", description: "Company name" } },
        required: ["company_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "estimate_salary",
      description:
        "Estimate salary range for a job role in a specific location.",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", description: "Job title" },
          location: { type: "string", description: "City or country" },
          experience_level: { type: "string", enum: ["junior", "mid", "senior", "lead"], description: "Experience level" },
        },
        required: ["role", "location"],
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case "search_jobs":
      return searchJobs(args.query, Number(args.days) || 1);
    case "linkedin_job_search":
      return linkedinJobSearch(args.query, Number(args.days) || 1);
    case "linkedin_company_lookup":
      return linkedinCompanyLookup(args.company_name);
    case "estimate_salary":
      return estimateSalary(args.role, args.location, args.experience_level || "mid");
    default:
      return `Unknown tool: ${name}`;
  }
}
