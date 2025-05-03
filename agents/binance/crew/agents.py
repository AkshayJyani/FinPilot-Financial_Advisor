from typing import Dict, Any, List, Optional
from crewai import Agent
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key for OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class FinancialAgents:
    """
    Collection of financial agents that work together in the CrewAI system
    """
    
    def __init__(self):
        """Initialize the financial agents with appropriate configurations"""
        pass
        
    def portfolio_researcher(self) -> Agent:
        """
        Agent responsible for researching portfolio data and market information
        from the vector database of user's holdings
        """
        return Agent(
            role='Portfolio Research Specialist',
            goal='Provide accurate and detailed information about user portfolio holdings',
            backstory="""
            You are an expert in portfolio analysis with years of experience 
            in the cryptocurrency industry. You have deep knowledge of Binance trading and
            can provide valuable insights into a portfolio's performance, allocations, and
            potential improvements.
            """,
            verbose=True,
            allow_delegation=True,
            tools=[],  # Tools will be set later when instantiated
            llm_config={
                "model": "gpt-3",
                "temperature": 0.2
            }
        )
    
    def market_researcher(self) -> Agent:
        """
        Agent responsible for researching current market conditions
        using web search tools
        """
        return Agent(
            role='Market Research Specialist',
            goal='Find the most up-to-date and relevant market information from the web',
            backstory="""
            You are a market research expert with a specialization in cryptocurrency markets.
            You constantly monitor news, trends, and market indicators to provide
            the most relevant and timely information about market conditions that might
            affect a user's portfolio.
            """,
            verbose=True,
            allow_delegation=True,
            tools=[],  # Tools will be set later when instantiated
            llm_config={
                "model": "gpt-3",
                "temperature": 0.3
            }
        )
    
    def portfolio_advisor(self) -> Agent:
        """
        Agent responsible for synthesizing information and providing advice
        """
        return Agent(
            role='Portfolio Advisor',
            goal='Provide personalized financial advice based on portfolio data and market research',
            backstory="""
            You are a seasoned portfolio advisor with expertise in cryptocurrency investing.
            You analyze portfolio data and market research to provide tailored advice to clients.
            Your recommendations are always data-driven, actionable, and personalized to the
            specific situation of each client.
            """,
            verbose=True,
            allow_delegation=True,
            tools=[],  # Tools will be set later when instantiated
            llm_config={
                "model": "gpt-3",
                "temperature": 0.1
            }
        ) 