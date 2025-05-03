from typing import Dict, Any, List, Optional
from langchain.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PortfolioTools:
    """
    Collection of LangChain tools for interacting with portfolio data
    """
    
    def __init__(self, portfolio_manager=None, vector_db_manager=None, web_search_tool=None):
        """
        Initialize the portfolio tools with managers
        """
        self.portfolio_manager = portfolio_manager
        self.vector_db_manager = vector_db_manager
        self.web_search_tool = web_search_tool
    
    def get_all_portfolio_tools(self) -> List[BaseTool]:
        """
        Get all tools for portfolio operations
        """
        return [
            self.query_portfolio_tool(),
            self.get_holdings_tool(),
            self.get_portfolio_summary_tool(),
            self.analyze_portfolio_tool()
        ]
    
    def get_all_web_search_tools(self) -> List[BaseTool]:
        """
        Get all tools for web search operations
        """
        return [
            self.web_search_tool()
        ]
    
    def query_portfolio_tool(self) -> BaseTool:
        """
        Tool for querying portfolio data
        """
        if not self.vector_db_manager:
            raise ValueError("Vector DB manager is required for query_portfolio_tool")
        
        def query_portfolio(query: str) -> str:
            """Query the portfolio data with a natural language query"""
            response = self.vector_db_manager.query(query)
            return str(response)
        
        return StructuredTool.from_function(
            func=query_portfolio,
            name="query_portfolio",
            description="Query portfolio data using natural language. Use this to get information about the portfolio holdings, performance, etc.",
            return_direct=False
        )
    
    def get_holdings_tool(self) -> BaseTool:
        """
        Tool for getting portfolio holdings
        """
        if not self.portfolio_manager:
            raise ValueError("Portfolio manager is required for get_holdings_tool")
        
        def get_holdings() -> str:
            """Get current portfolio holdings"""
            response = self.portfolio_manager.get_holdings()
            return json.dumps(response, indent=2)
        
        return StructuredTool.from_function(
            func=get_holdings,
            name="get_holdings",
            description="Get current portfolio holdings with details on each asset.",
            return_direct=False
        )
    
    def get_portfolio_summary_tool(self) -> BaseTool:
        """
        Tool for getting portfolio summary
        """
        if not self.portfolio_manager:
            raise ValueError("Portfolio manager is required for get_portfolio_summary_tool")
        
        def get_portfolio_summary() -> str:
            """Get a summary of the portfolio"""
            response = self.portfolio_manager.get_portfolio_summary()
            return json.dumps(response, indent=2)
        
        return StructuredTool.from_function(
            func=get_portfolio_summary,
            name="get_portfolio_summary",
            description="Get a comprehensive summary of the portfolio including holdings and analysis.",
            return_direct=False
        )
    
    def analyze_portfolio_tool(self) -> BaseTool:
        """
        Tool for analyzing portfolio
        """
        if not self.portfolio_manager:
            raise ValueError("Portfolio manager is required for analyze_portfolio_tool")
        
        def analyze_portfolio() -> str:
            """Perform comprehensive portfolio analysis"""
            response = self.portfolio_manager.analyze_portfolio()
            return json.dumps(response, indent=2)
        
        return StructuredTool.from_function(
            func=analyze_portfolio,
            name="analyze_portfolio",
            description="Perform comprehensive analysis on the portfolio including risk metrics and recommendations.",
            return_direct=False
        )
    
    def web_search_tool(self) -> BaseTool:
        """
        Tool for searching the web
        """
        if not self.web_search_tool:
            raise ValueError("Web search tool is required for web_search_tool")
        
        def search_web(query: str) -> str:
            """Search the web for market information"""
            response = self.web_search_tool.search(query)
            return json.dumps(response, indent=2)
        
        return StructuredTool.from_function(
            func=search_web,
            name="search_web",
            description="Search the web for market information, news, and trends. Use this to get the latest information about cryptocurrencies.",
            return_direct=False
        ) 