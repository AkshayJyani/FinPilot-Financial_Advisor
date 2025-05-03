from typing import Dict, Any, List, Optional
from crewai import Crew, Process
from langchain.tools import BaseTool
from .agents import FinancialAgents
from .tasks import FinancialTasks
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PortfolioCrew:
    """
    Crew of agents for processing portfolio queries
    """
    
    def __init__(self, portfolio_tools: List[BaseTool], web_search_tools: List[BaseTool]):
        """
        Initialize the portfolio crew with tools
        
        Args:
            portfolio_tools: Tools for interacting with portfolio data
            web_search_tools: Tools for searching the web
        """
        # Initialize agents
        self.agents_manager = FinancialAgents()
        
        # Set up tools for each agent
        self.portfolio_researcher = self.agents_manager.portfolio_researcher()
        self.portfolio_researcher.tools = portfolio_tools
        
        self.market_researcher = self.agents_manager.market_researcher()
        self.market_researcher.tools = web_search_tools
        
        self.portfolio_advisor = self.agents_manager.portfolio_advisor()
        self.portfolio_advisor.tools = portfolio_tools + web_search_tools
        
        # Initialize tasks
        self.tasks_manager = FinancialTasks(
            agents=self.agents_manager
        )
        
        # Initialize the crew
        self.crew = None
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process a user query using the crew of agents
        
        Args:
            query: The user's query about their portfolio
            
        Returns:
            Dict containing the response from the crew
        """
        try:
            # Create tasks for the query
            portfolio_research_task = self.tasks_manager.research_portfolio(query)
            market_research_task = self.tasks_manager.research_market(query)
            provide_advice_task = self.tasks_manager.provide_advice(query)
            
            # Connect the tasks with dependencies
            provide_advice_task.dependencies = [
                portfolio_research_task,
                market_research_task
            ]
            
            # Create the crew with tasks
            self.crew = Crew(
                agents=[
                    self.portfolio_researcher,
                    self.market_researcher,
                    self.portfolio_advisor
                ],
                tasks=[
                    portfolio_research_task,
                    market_research_task,
                    provide_advice_task
                ],
                verbose=1,
                process=Process.sequential  # Process tasks sequentially
            )
            
            # Execute the crew and get the result
            result = self.crew.kickoff()
            
            return {
                "status": "success",
                "data": {
                    "message": result
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query with portfolio crew: {str(e)}"
                }
            }
    
    async def process_query_async(self, query: str) -> Dict[str, Any]:
        """
        Process a user query asynchronously using the crew of agents
        
        Args:
            query: The user's query about their portfolio
            
        Returns:
            Dict containing the response from the crew
        """
        # For now, we'll use the synchronous version
        # This could be improved with true async support in the future
        return self.process_query(query) 