from typing import Dict, List, Any
import re
from .web_search_tool import WebSearchTool

# Import conditionally to handle missing crewai package
try:
    from .crew import PortfolioCrew
    from .crew.tools import PortfolioTools
    CREWAI_AVAILABLE = True
except ImportError:
    print("CrewAI not available. Multi-agent system will not be used.")
    CREWAI_AVAILABLE = False


class QueryProcessor:
    """Processes natural language queries about portfolio data using an advanced multi-agent system"""
    
    def __init__(self, vector_db_manager=None, portfolio_manager=None):
        """Initialize the query processor with required managers"""
        self.vector_db_manager = vector_db_manager
        self.portfolio_manager = portfolio_manager
        self.web_search_tool = WebSearchTool()
        
        # Initialize CrewAI components
        self.crew = None
        self.portfolio_tools = None
        
        # Try to initialize CrewAI
        if not CREWAI_AVAILABLE:
            print("ERROR: CrewAI is required but not available. Please install it with: pip install crewai")
            print("The advanced query engine cannot function without CrewAI.")
            return
        
        if not self.vector_db_manager:
            print("ERROR: Vector DB manager is required for the advanced query engine.")
            return
        
        if not self.portfolio_manager:
            print("ERROR: Portfolio manager is required for the advanced query engine.")
            return
        
        try:
            # Initialize portfolio tools
            self.portfolio_tools = PortfolioTools(
                portfolio_manager=self.portfolio_manager,
                vector_db_manager=self.vector_db_manager,
                web_search_tool=self.web_search_tool
            )
            
            # Get tools for each agent category
            portfolio_tools = self.portfolio_tools.get_all_portfolio_tools()
            web_search_tools = self.portfolio_tools.get_all_web_search_tools()
            
            # Initialize the crew
            self.crew = PortfolioCrew(
                portfolio_tools=portfolio_tools,
                web_search_tools=web_search_tools
            )
            
            print("Advanced multi-agent system (CrewAI) initialized successfully")
        except Exception as e:
            print(f"ERROR initializing CrewAI components: {e}")
            print("The advanced query engine cannot function without properly initialized CrewAI components.")
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """Process a portfolio query using the advanced multi-agent system"""
        try:
            # Special case for "fetch holdings" command
            if query.lower() == "fetch holdings":
                return {
                    "status": "success",
                    "data": {
                        "message": "Please use get_holdings() method to fetch portfolio holdings"
                    }
                }
            
            # Ensure CrewAI is properly initialized
            print(f"CrewAI initialized: {self.crew}")
            if not self.crew:
                return {
                    "status": "error",
                    "data": {
                        "message": "Advanced query engine is not initialized. Please check logs for details."
                    }
                }
            
            # Process query with the CrewAI system
            print(f"Processing query with advanced multi-agent system: {query}")
            return self.crew.process_query(query)
                
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query with advanced engine: {str(e)}"
                }
            }
    
    async def process_query_async(self, query: str) -> Dict[str, Any]:
        """Process a portfolio query asynchronously using the advanced multi-agent system"""
        try:
            # Special case for "fetch holdings" command
            if query.lower() == "fetch holdings":
                return {
                    "status": "success",
                    "data": {
                        "message": "Please use get_holdings() method to fetch portfolio holdings"
                    }
                }
            
            # Ensure CrewAI is properly initialized
            if not self.crew:
                return {
                    "status": "error",
                    "data": {
                        "message": "Advanced query engine is not initialized. Please check logs for details."
                    }
                }
            
            # Process query with the CrewAI system
            print(f"Processing async query with advanced multi-agent system: {query}")
            return await self.crew.process_query_async(query)
                
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing async query with advanced engine: {str(e)}"
                }
            } 