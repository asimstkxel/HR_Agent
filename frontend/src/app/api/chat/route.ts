import OpenAI from "openai";
import { toolDefinitions, executeTool } from "@/lib/tools";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are an expert HR recruitment assistant. Your job is to help users find relevant job opportunities and provide compensation insights.

IMPORTANT: By default you show jobs posted within the last 24 hours. If the user applies filters (via [Filters: ...] at the end of their message), respect those filters:
- Location: include the specified location in the search query
- Date posted: adjust the time range (e.g. "last 3 days", "last 7 days", "last 30 days")
- Experience level: include the experience level in the search query and filter results accordingly
- Salary range (USD/year): filter results to only include jobs within the specified salary range. If salary info is not available, mention that and still show the job.

When presenting results, always mention the active filters. If no jobs match, suggest broadening the search.

Tools available:
1. search_jobs — General job search across the web.
2. linkedin_job_search — LinkedIn-specific job search.
3. linkedin_company_lookup — Research a company's LinkedIn profile.
4. estimate_salary — Estimate salary ranges for a role in a location.

Present results with job title, company, location, posting date, key requirements, salary (if available), and application links. Be conversational and helpful.`;

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
