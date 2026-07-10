from langchain_core.tools import tool
from tavily import TavilyClient
from datetime import datetime, timedelta, timezone
import os


def _is_within_24_hours(date_str: str) -> bool:
    """Check if a date string falls within the last 24 hours."""
    if not date_str or date_str == "N/A":
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            parsed = datetime.strptime(date_str, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed >= cutoff
        except ValueError:
            continue
    return False


def _format_results(results: dict, source_label: str) -> str:
    output_parts = []

    if results.get("answer"):
        output_parts.append(f"Summary:\n{results['answer']}\n")

    # Filter to only last 24 hours
    recent = []
    for r in results.get("results", []):
        pub = r.get("published_date", "")
        if _is_within_24_hours(pub):
            recent.append(r)

    # If strict filtering returns nothing, include all results from Tavily's
    # days=1 filter (Tavily already limits to ~24h but date field may be missing)
    if not recent:
        recent = results.get("results", [])

    output_parts.append(f"{source_label} (Last 24 Hours):\n")
    for i, result in enumerate(recent, 1):
        published = result.get("published_date", "Recent")
        output_parts.append(
            f"{i}. {result['title']}\n"
            f"   URL: {result['url']}\n"
            f"   Posted: {published}\n"
            f"   {result.get('content', 'No description available.')}\n"
        )

    if not recent:
        output_parts.append("No jobs found posted in the last 24 hours for this query.\n")

    return "\n".join(output_parts)


@tool
def search_jobs(query: str) -> str:
    """Search for job listings posted in the last 24 hours based on user query.
    Use this tool to find the latest jobs matching a role, location, company, or
    skill set. Pass a descriptive search query like 'senior python developer remote'
    or 'data analyst jobs in New York'. Only returns jobs from the last 24 hours."""
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

    today = datetime.now().strftime("%Y-%m-%d")
    search_query = f"job listings hiring {query} posted {today}"
    results = client.search(
        query=search_query,
        max_results=10,
        search_depth="advanced",
        include_answer=True,
        days=1,
    )

    return _format_results(results, "Job Listings Found")
