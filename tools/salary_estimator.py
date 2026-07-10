from langchain_core.tools import tool
from tavily import TavilyClient
from langchain_openai import ChatOpenAI
import os


@tool
def estimate_salary(role: str, location: str, experience_level: str = "mid") -> str:
    """Estimate the salary range for a given job role, location, and experience level.
    Use this when the user asks about salary, pay, compensation, or package for a role.

    Args:
        role: Job title like 'SQA Manager' or 'Python Developer'.
        location: City or country like 'Lahore' or 'Pakistan'.
        experience_level: One of 'junior', 'mid', 'senior', 'lead'. Defaults to 'mid'.
    """
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

    results = client.search(
        query=f"{role} salary {location} {experience_level} level 2024 2025",
        max_results=6,
        search_depth="advanced",
        include_answer=True,
    )

    market_data = []
    if results.get("answer"):
        market_data.append(results["answer"])
    for r in results.get("results", []):
        market_data.append(f"Source: {r['title']} — {r.get('content', '')}")

    context = "\n\n".join(market_data)

    llm = ChatOpenAI(model="gpt-4.1-nano", temperature=0)
    response = llm.invoke([
        {
            "role": "system",
            "content": (
                "You are a compensation analyst. Based on the market data provided, "
                "give a structured salary estimate. Include:\n"
                "- Monthly salary range (local currency)\n"
                "- Annual salary range (local currency)\n"
                "- USD equivalent if not already in USD\n"
                "- Key factors affecting the range\n"
                "- Data sources referenced\n"
                "Be specific with numbers. If data is limited, state that clearly."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Role: {role}\n"
                f"Location: {location}\n"
                f"Experience Level: {experience_level}\n\n"
                f"Market Data:\n{context}"
            ),
        },
    ])

    return response.content
