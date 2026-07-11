import OpenAI from "openai";
import { toolDefinitions, executeTool } from "@/lib/tools";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are an expert HR recruitment assistant. You help users find job opportunities and provide compensation insights.

RULES:
1. ONLY present jobs from tool results. NEVER invent or fabricate jobs.
2. All searches return jobs from the last 24 hours only. Always mention this.
3. If the tool returns "No jobs found", tell the user — do NOT make up results.
4. When [Filters: ...] is present at the end of the user message, include those filters (location, experience level) in the search query. ALWAYS use filters from the LATEST message only — ignore earlier messages.
5. When the user asks for links or follow-up, use URLs already in the conversation.

Tools:
1. search_linkedin_jobs — Search LinkedIn for jobs (last 24 hours). Best for professional/corporate roles.
2. search_indeed_jobs — Search Indeed for jobs (last 24 hours). Best for broad job market coverage.
3. search_rozee_jobs — Search Rozee.pk for jobs (last 24 hours). Best for Pakistan-specific jobs (Lahore, Karachi, Islamabad).
4. linkedin_company_lookup — Research a company on LinkedIn.
5. estimate_salary — Estimate salary ranges for a role in a location.

When searching for jobs, call MULTIPLE search tools in parallel to get results from different sources. For Pakistan locations, always include search_rozee_jobs. Present results grouped by source with: job title, company, location, key requirements, salary (if available), and application link.`;

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
