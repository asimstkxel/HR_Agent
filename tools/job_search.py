import re
from langchain_core.tools import tool
from tavily import TavilyClient
from datetime import datetime, timedelta, timezone
import os


RECENT_PATTERNS = [
    re.compile(r"\bposted\s+today\b", re.IGNORECASE),
    re.compile(r"\bjust\s+posted\b", re.IGNORECASE),
    re.compile(r"\bjust now\b", re.IGNORECASE),
    re.compile(r"\b\d+\s*(minute|min)s?\s*ago\b", re.IGNORECASE),
    re.compile(r"\b\d+\s*hours?\s*ago\b", re.IGNORECASE),
    re.compile(r"\b1\s*day\s*ago\b", re.IGNORECASE),
    re.compile(r"\bposted\s*(just\s*)?now\b", re.IGNORECASE),
    re.compile(r"\bnew\s+today\b", re.IGNORECASE),
]

STALE_PATTERNS = [
    re.compile(r"\b[2-9]\s*days?\s*ago\b", re.IGNORECASE),
    re.compile(r"\b\d{2,}\s*days?\s*ago\b", re.IGNORECASE),
    re.compile(r"\b\d+\s*weeks?\s*ago\b", re.IGNORECASE),
    re.compile(r"\b\d+\s*months?\s*ago\b", re.IGNORECASE),
    re.compile(r"\b\d+\s*years?\s*ago\b", re.IGNORECASE),
]


def _is_posted_within_24_hours(result: dict) -> bool:
    """Check if a job result was posted within the last 24 hours."""
    # Check published_date field
    pub = result.get("published_date", "")
    if pub:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z"):
            try:
                parsed = datetime.strptime(pub, fmt)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return parsed >= cutoff
            except ValueError:
                continue

    # Parse relative time from content text
    combined = f"{result.get('title', '')} {result.get('content', '')}".lower()

    # If content says it's old, reject
    for pattern in STALE_PATTERNS:
        if pattern.search(combined):
            return False

    # Check for inline date like "posted on 2026-07-11" and validate it
    inline_match = re.search(r"\bposted\s+on\s+(\d{4}-\d{2}-\d{2})\b", combined)
    if inline_match:
        try:
            inline_date = datetime.strptime(inline_match.group(1), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            return inline_date >= cutoff
        except ValueError:
            pass

    # If content says it's recent, accept
    for pattern in RECENT_PATTERNS:
        if pattern.search(combined):
            return True

    # No date info — exclude (strict 24h enforcement)
    return False


def _format_results(results: dict, source_label: str) -> str:
    output_parts = []

    if results.get("answer"):
        output_parts.append(f"Summary:\n{results['answer']}\n")

    # Strict 24-hour filter — no fallback to stale results
    recent = [r for r in results.get("results", []) if _is_posted_within_24_hours(r)]

    output_parts.append(f"{source_label} (Last 24 Hours):\n")

    if not recent:
        output_parts.append(
            "No jobs found posted in the last 24 hours for this query.\n"
            "Try broadening your search with different keywords, a wider location, or check back tomorrow.\n"
        )
        return "\n".join(output_parts)

    for i, result in enumerate(recent, 1):
        output_parts.append(
            f"{i}. {result['title']}\n"
            f"   URL: {result['url']}\n"
            f"   {result.get('content', 'No description available.')}\n"
        )

    return "\n".join(output_parts)


@tool
def search_jobs(query: str) -> str:
    """Search for job listings posted in the last 24 hours based on user query.
    Use this tool to find the latest jobs matching a role, location, company, or
    skill set. Pass a descriptive search query like 'senior python developer remote'
    or 'data analyst jobs in New York'. Only returns jobs from the last 24 hours."""
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

    today = datetime.now().strftime("%Y-%m-%d")
    search_query = f"job listings hiring {query} posted today {today}"
    results = client.search(
        query=search_query,
        max_results=15,
        search_depth="advanced",
        include_answer=True,
        days=1,
    )

    return _format_results(results, "Job Listings Found")
