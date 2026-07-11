import OpenAI from "openai";
import { toolDefinitions, executeTool } from "@/lib/tools";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are an expert HR recruitment assistant. Your job is to help users find relevant job opportunities and provide compensation insights.

CRITICAL RULES — YOU MUST FOLLOW THESE:
1. ONLY present jobs that appear in the tool results. NEVER invent, fabricate, or recall jobs from memory.
2. The tools already filter results by date. If the tool returns "No jobs found", tell the user — do NOT make up jobs.
3. DEFAULT: When no [Filters: ...] is present in the user message, ALWAYS use days=1 (last 24 hours). Say "last 24 hours" in your response. NEVER use days=7 or any other value unless the user explicitly sets a date filter.
4. When the user has filters (via [Filters: ...] at the end of their message), you MUST:
   - Pass the "days" parameter to search tools: 1 for "last 24 hours", 3 for "last 3 days", 7 for "last 7 days", 30 for "last 30 days"
   - Include location and experience level in the search query
   - Only show jobs matching the salary range if specified
5. NEVER show a job that was posted outside the user's date filter. If tool results say "posted 4 days ago" and the filter is "Last 24 hours", DO NOT include that job.
6. When the user asks for links or follow-up on previous results, use the URLs from the tool results already in the conversation. Do NOT generate new results without calling a tool.

Tools available:
1. search_jobs — Search for job listings (pass days parameter based on date filter)
2. linkedin_job_search — LinkedIn-specific job search (pass days parameter based on date filter)
3. linkedin_company_lookup — Research a company's LinkedIn profile
4. estimate_salary — Estimate salary ranges for a role in a location

PRESENTATION RULES:
- Present results SORTED by posting date (newest first) — the tool already sorts them, preserve this order.
- For each job include: job title, company, location, posting date (from "Posted:" field in tool output), key requirements, salary (if available), and application link.
- If location filter is set, ONLY show jobs that match that location. Skip results from other locations.
- If experience level filter is set, ONLY show jobs matching that level. Skip mismatched results.
- Always mention active filters at the top of your response.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history: ChatMessage[];
    };

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m: ChatMessage) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Agent loop: call OpenAI, execute tools, repeat until final response
    let maxIterations = 5;
    while (maxIterations > 0) {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4.1-nano",
        messages,
        tools: toolDefinitions,
        temperature: 0,
      });

      const choice = response.choices[0];
      const toolCalls = choice.message.tool_calls;

      if (choice.finish_reason === "tool_calls" && toolCalls && toolCalls.length > 0) {
        // Add assistant message with tool calls
        messages.push(choice.message);

        // Execute all tool calls
        for (const toolCall of toolCalls) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tc = toolCall as any;
          const fnName: string = tc.function?.name ?? tc.name ?? "";
          const fnArgs: string = tc.function?.arguments ?? "{}";
          const tcId: string = tc.id ?? "";

          const args = JSON.parse(fnArgs);
          const result = await executeTool(fnName, args);
          messages.push({
            role: "tool",
            tool_call_id: tcId,
            content: result,
          });
        }

        maxIterations--;
        continue;
      }

      // Final response (no more tool calls)
      return Response.json({ reply: choice.message.content || "" });
    }

    return Response.json({ reply: "I ran into an issue processing your request. Please try again." });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { reply: "An error occurred. Please check that API keys are configured in Vercel environment variables." },
      { status: 500 }
    );
  }
}
