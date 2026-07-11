import { tavily } from "tavily";

function getTavily() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY! });
}

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  publishedDate?: string;
}

function formatResults(results: TavilyResult[], label: string): string {
  const lines = [`${label} (Last 24 Hours):\n`];

  if (!results || results.length === 0) {
    lines.push(
      "No jobs found posted in the last 24 hours for this query.\n" +
      "Try broadening your search with different keywords, a wider location, or check back tomorrow.\n"
    );
    return lines.join("\n");
  }

  results.forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content || "No description available."}\n`
    );
  });
  return lines.join("\n");
}

export async function searchLinkedInJobs(query: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const response = await getTavily().search(`site:linkedin.com/jobs ${query} posted today ${today}`, {
    maxResults: 10,
    searchDepth: "advanced",
    includeAnswer: false,
    days: 1,
  });

  return formatResults(response.results as TavilyResult[], "LinkedIn Jobs");
}

export async function searchIndeedJobs(query: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const response = await getTavily().search(`site:indeed.com ${query} jobs posted today ${today}`, {
    maxResults: 10,
    searchDepth: "advanced",
    includeAnswer: false,
    days: 1,
  });

  return formatResults(response.results as TavilyResult[], "Indeed Jobs");
}

export async function searchRozeeJobs(query: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const response = await getTavily().search(`site:rozee.pk ${query} jobs ${today}`, {
    maxResults: 10,
    searchDepth: "advanced",
    includeAnswer: false,
    days: 1,
  });

  return formatResults(response.results as TavilyResult[], "Rozee.pk Jobs");
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
      name: "search_linkedin_jobs",
      description:
        "Search LinkedIn for job postings from the last 24 hours. Use for professional/corporate roles.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query. MUST include location and experience level from [Filters:] if present." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_indeed_jobs",
      description:
        "Search Indeed for job postings from the last 24 hours. Use for broad job market coverage.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query. MUST include location and experience level from [Filters:] if present." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_rozee_jobs",
      description:
        "Search Rozee.pk for job postings from the last 24 hours. Use for Pakistan-specific jobs (Lahore, Karachi, Islamabad, etc).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Job search query. MUST include location and experience level from [Filters:] if present." },
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
    case "search_linkedin_jobs":
      return searchLinkedInJobs(args.query);
    case "search_indeed_jobs":
      return searchIndeedJobs(args.query);
    case "search_rozee_jobs":
      return searchRozeeJobs(args.query);
    case "linkedin_company_lookup":
      return linkedinCompanyLookup(args.company_name);
    case "estimate_salary":
      return estimateSalary(args.role, args.location, args.experience_level || "mid");
    default:
      return `Unknown tool: ${name}`;
  }
}
