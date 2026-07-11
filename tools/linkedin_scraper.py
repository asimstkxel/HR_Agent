from langchain_core.tools import tool
from tavily import TavilyClient
from datetime import datetime
import os
from tools.job_search import _format_results


@tool
def linkedin_job_search(query: str) -> str:
    """Search LinkedIn specifically for job postings from the last 24 hours.
    Use this tool when the user wants LinkedIn results or wants to find jobs
    on LinkedIn. Pass a query like 'SQA manager Lahore' or 'frontend developer Karachi'.
    Only returns jobs from the last 24 hours."""
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

    today = datetime.now().strftime("%Y-%m-%d")
    results = client.search(
        query=f"site:linkedin.com/jobs {query} posted today {today}",
        max_results=15,
        search_depth="advanced",
        include_answer=True,
        days=1,
    )

    return _format_results(results, "LinkedIn Job Listings")


@tool
def linkedin_company_lookup(company_name: str) -> str:
    """Look up a company's LinkedIn profile to get company info, size, industry,
    and recent activity. Use when the user asks about a specific company or wants
    to research an employer before applying."""
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

    results = client.search(
        query=f"site:linkedin.com/company {company_name} about employees",
        max_results=5,
        search_depth="advanced",
        include_answer=True,
    )

    output_parts = []
    if results.get("answer"):
        output_parts.append(f"Company Overview:\n{results['answer']}\n")

    output_parts.append("LinkedIn Company Results:\n")
    for i, result in enumerate(results.get("results", []), 1):
        output_parts.append(
            f"{i}. {result['title']}\n"
            f"   URL: {result['url']}\n"
            f"   {result.get('content', 'No description available.')}\n"
        )

    return "\n".join(output_parts)
