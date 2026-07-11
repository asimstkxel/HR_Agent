import { tavily } from "tavily";

function getTavily() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY! });
}

function isPostedWithin24Hours(result: TavilyResult): boolean {
  // Check publishedDate field if available
  if (result.publishedDate) {
    try {
      const parsed = new Date(result.publishedDate);
      if (!isNaN(parsed.getTime())) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return parsed >= cutoff;
      }
    } catch { /* fall through to content check */ }
  }

  // Parse relative time from content text
  const text = (result.content || "").toLowerCase();
  const title = (result.title || "").toLowerCase();
  const combined = `${title} ${text}`;

  // Matches: "posted today", "1 hour ago", "5 hours ago", "just now", "minutes ago"
  const recentPatterns = [
    /\btoday\b/,
    /\bjust now\b/,
    /\b\d+\s*(minute|min)s?\s*ago\b/,
    /\b\d+\s*hours?\s*ago\b/,
    /\b1\s*day\s*ago\b/,
    /\bposted\s*(just\s*)?now\b/,
    /\bnew\b.*\btoday\b/,
  ];

  // Matches: "X days ago" (where X > 1), "weeks ago", "months ago"
  const stalePatterns = [
    /\b[2-9]\s*days?\s*ago\b/,
    /\b\d{2,}\s*days?\s*ago\b/,
    /\b\d+\s*weeks?\s*ago\b/,
    /\b\d+\s*months?\s*ago\b/,
    /\b\d+\s*years?\s*ago\b/,
  ];

  // If content explicitly says it's old, reject it
  for (const pattern of stalePatterns) {
    if (pattern.test(combined)) return false;
  }

  // If content indicates it's recent, accept it
  for (const pattern of recentPatterns) {
    if (pattern.test(combined)) return true;
  }

  // No date info found — exclude by default (strict 24h enforcement)
  return false;
}

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  publishedDate?: string;
}

function formatResults(results: TavilyResult[], label: string): string {
  const recent = results.filter((r) => isPostedWithin24Hours(r));

  const lines = [`${label} (Last 24 Hours):\n`];

  if (recent.length === 0) {
    lines.push(
      "No jobs found posted in the last 24 hours for this query.\n" +
      "Try broadening your search with different keywords, a wider location, or check back tomorrow.\n"
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

export async function searchJobs(query: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const response = await getTavily().search(`job listings hiring ${query} posted today ${today}`, {
    maxResults: 15,
    searchDepth: "advanced",
    includeAnswer: true,
    days: 1,
  });

  let output = "";
  if (response.answer) output += `Summary:\n${response.answer}\n\n`;
  output += formatResults(response.results as TavilyResult[], "Job Listings Found");
  return output;
}

export async function linkedinJobSearch(query: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const response = await getTavily().search(`site:linkedin.com/jobs ${query} posted today ${today}`, {
    maxResults: 15,
    searchDepth: "advanced",
    includeAnswer: true,
    days: 1,
  });

  let output = "";
  if (response.answer) output += `LinkedIn Summary:\n${response.answer}\n\n`;
  output += formatResults(response.results as TavilyResult[], "LinkedIn Job Listings");
  return output;
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
        "Search for job listings posted in the last 24 hours. Use for broad job queries.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Job search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "linkedin_job_search",
      description:
        "Search LinkedIn for job postings from the last 24 hours.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Job search query" } },
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
      return searchJobs(args.query);
    case "linkedin_job_search":
      return linkedinJobSearch(args.query);
    case "linkedin_company_lookup":
      return linkedinCompanyLookup(args.company_name);
    case "estimate_salary":
      return estimateSalary(args.role, args.location, args.experience_level || "mid");
    default:
      return `Unknown tool: ${name}`;
  }
}
