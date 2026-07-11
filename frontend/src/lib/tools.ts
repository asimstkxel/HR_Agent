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
  const daysAgoMatch = combined.match(/\b(\d+)\s*days?\s*ago\b/);
  if (daysAgoMatch) {
    const mentionedDays = parseInt(daysAgoMatch[1], 10);
    return mentionedDays <= days;
  }
  const weeksAgoMatch = combined.match(/\b(\d+)\s*weeks?\s*ago\b/);
  if (weeksAgoMatch) {
    const mentionedDays = parseInt(weeksAgoMatch[1], 10) * 7;
    return mentionedDays <= days;
  }
  if (/\b\d+\s*months?\s*ago\b/.test(combined) || /\b\d+\s*years?\s*ago\b/.test(combined)) {
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

  recent.forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content || "No description available."}\n`
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
        "Search for job listings. Defaults to last 24 hours unless user specifies a different date range via filters.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query including role, location, experience level" },
          days: { type: "number", description: "Number of days to search back. Default 1 (24h). Use 3, 7, or 30 based on user's date filter." },
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
        "Search LinkedIn for job postings. Defaults to last 24 hours unless user specifies a different date range.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query including role, location, experience level" },
          days: { type: "number", description: "Number of days to search back. Default 1 (24h). Use 3, 7, or 30 based on user's date filter." },
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
