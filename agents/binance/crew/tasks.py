from typing import Dict, Any, List, Optional
from crewai import Task
from .agents import FinancialAgents

class FinancialTasks:
    """
    Collection of tasks for the financial agents in the CrewAI system
    """
    
    def __init__(self, agents: FinancialAgents):
        """Initialize with the financial agents"""
        self.agents = agents
    
    def research_portfolio(self, query: str) -> Task:
        """
        Task for researching the user's portfolio
        
        Args:
            query (str): The user's query
            
        Returns:
            Task: The portfolio research task
        """
        return Task(
            description=f"""
            Research the user's portfolio based on the query: {query}
            
            1. Extract relevant portfolio information from the vector database
            2. Analyze holdings, allocations, and performance data
            3. Identify key metrics related to the query
            4. Compile a comprehensive analysis of the portfolio aspects related to the query
            
            Your final answer should be a detailed report of the portfolio information
            relevant to the user's query.
            """,
            agent=self.agents.portfolio_researcher(),
            expected_output="A comprehensive portfolio analysis report with data from the user's holdings.",
            async_execution=True
        )
    
    def research_market(self, query: str) -> Task:
        """
        Task for researching current market conditions
        
        Args:
            query (str): The user's query
            
        Returns:
            Task: The market research task
        """
        return Task(
            description=f"""
            Research current market conditions relevant to the query: {query}
            
            1. Search for the latest news and market data related to cryptocurrencies
            2. Focus on information that's relevant to the user's portfolio
            3. Analyze market trends, sentiment, and price movements
            4. Find expert opinions and forecasts that might be valuable
            
            Your final answer should be a detailed market report with the most
            relevant and recent information that could impact the user's portfolio.
            """,
            agent=self.agents.market_researcher(),
            expected_output="A comprehensive market research report with the latest relevant information.",
            async_execution=True
        )
    
    def provide_advice(self, query: str) -> Task:
        """
        Task for providing portfolio advice
        
        Args:
            query (str): The user's query
            
        Returns:
            Task: The portfolio advice task
        """
        return Task(
            description=f"""
            Synthesize portfolio and market research to provide advice for the query: {query}
            
            1. Review both the portfolio research and market research
            2. Identify opportunities, risks, and areas for improvement
            3. Develop actionable recommendations based on the data
            4. Provide a clear, concise, and personalized response to the user's query
            
            Your final answer should directly address the user's query with relevant
            insights and recommendations, backed by the research conducted.
            """,
            agent=self.agents.portfolio_advisor(),
            expected_output="A personalized response to the user's query with actionable advice and insights.",
            context=[
                "You will receive research from both the portfolio researcher and market researcher.",
                "Make sure to synthesize these inputs to provide a comprehensive and personalized response.",
                "Always explain your reasoning and provide clear, actionable advice."
            ]
        ) 