from typing import Dict, Any, List, Optional
import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class WebSearchTool:
    """
    A tool for searching the web for financial and cryptocurrency information.
    Can use either SerpAPI or Tavily API based on what's available.
    """
    
    def __init__(self):
        """Initialize the web search tool with API keys"""
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        self.tavily_key = os.getenv("TAVILY_API_KEY")
        
        # Determine which API to use based on available keys
        if self.serpapi_key:
            self.api_provider = "serpapi"
            print("Using SerpAPI for web search in the advanced query engine")
        elif self.tavily_key:
            self.api_provider = "tavily"
            print("Using Tavily API for web search in the advanced query engine")
        else:
            self.api_provider = None
            print("ERROR: No API keys found for web search. The advanced query engine requires either SERPAPI_API_KEY or TAVILY_API_KEY to be set in your .env file.")
            print("Please add one of these API keys to enable web search functionality.")
    
    def search(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Search the web for information based on the query
        
        Args:
            query (str): The search query
            num_results (int): Number of results to return
            
        Returns:
            Dict containing search results and metadata
        """
        if not self.api_provider:
            return {
                "status": "error",
                "data": {
                    "message": "ERROR: No API keys found for web search. The advanced query engine requires either SERPAPI_API_KEY or TAVILY_API_KEY to be set in your .env file."
                }
            }
        
        try:
            # Append financial or crypto context to the query if not present
            if not any(keyword in query.lower() for keyword in ["crypto", "bitcoin", "ethereum", "binance", "trading", "market", "price", "finance", "cryptocurrency"]):
                query = f"{query} cryptocurrency market"
            
            if self.api_provider == "serpapi":
                return self._search_with_serpapi(query, num_results)
            else:
                return self._search_with_tavily(query, num_results)
                
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error performing web search: {str(e)}"
                }
            }
    
    def _search_with_serpapi(self, query: str, num_results: int) -> Dict[str, Any]:
        """
        Search using SerpAPI
        
        Args:
            query (str): The search query
            num_results (int): Number of results to return
            
        Returns:
            Dict containing search results from SerpAPI
        """
        url = "https://serpapi.com/search"
        params = {
            "api_key": self.serpapi_key,
            "q": query,
            "num": num_results,
            "tbm": "nws"  # News search
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        results = response.json()
        
        # Format the results
        formatted_results = []
        if "news_results" in results:
            for item in results["news_results"][:num_results]:
                formatted_results.append({
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "source": item.get("source", ""),
                    "date": item.get("date", "")
                })
        
        return {
            "status": "success",
            "data": {
                "query": query,
                "results": formatted_results,
                "source": "SerpAPI"
            }
        }
    
    def _search_with_tavily(self, query: str, num_results: int) -> Dict[str, Any]:
        """
        Search using Tavily API
        
        Args:
            query (str): The search query
            num_results (int): Number of results to return
            
        Returns:
            Dict containing search results from Tavily
        """
        url = "https://api.tavily.com/search"
        headers = {
            "content-type": "application/json",
            "api-key": self.tavily_key
        }
        
        payload = {
            "query": query,
            "max_results": num_results,
            "search_depth": "advanced",
            "include_domains": ["finance.yahoo.com", "bloomberg.com", "coindesk.com", "cointelegraph.com", "binance.com"]
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        results = response.json()
        
        # Format the results
        formatted_results = []
        if "results" in results:
            for item in results["results"][:num_results]:
                formatted_results.append({
                    "title": item.get("title", ""),
                    "link": item.get("url", ""),
                    "snippet": item.get("content", ""),
                    "source": item.get("source", "Tavily"),
                    "date": ""  # Tavily doesn't provide dates in the same format
                })
        
        return {
            "status": "success",
            "data": {
                "query": query,
                "results": formatted_results,
                "source": "Tavily"
            }
        }
    
    async def asearch(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Async version of the search method
        """
        # For simplicity, we'll use the synchronous version for now
        # This could be improved with aiohttp for truly async requests
        return self.search(query, num_results) 