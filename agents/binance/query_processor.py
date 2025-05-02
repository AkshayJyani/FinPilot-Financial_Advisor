from typing import Dict, List, Any
import re


class QueryProcessor:
    """Processes natural language queries about portfolio data"""
    
    def __init__(self, vector_db_manager=None):
        """Initialize the query processor with a vector DB manager"""
        self.vector_db_manager = vector_db_manager
    
    def _classify_query(self, query: str) -> str:
        """Classify the query into a specific category"""
        query = query.lower()
        
        # Common query categories
        categories = {
            "holdings": ["holdings", "portfolio", "assets", "balance", "hold"],
            "spot": ["spot", "trading"],
            "margin": ["margin", "cross margin", "borrowed"],
            "futures": ["futures", "leveraged", "contract", "perpetual"],
            "returns": ["returns", "performance", "profit", "loss", "pnl"],
            "technical": ["technical", "indicators", "rsi", "macd", "bollinger"],
            "allocation": ["allocation", "distribution", "diversification"],
            "fetch_holdings": ["fetch holdings"]
        }
        
        # Determine the best match
        best_category = "general"
        best_score = 0
        
        for category, keywords in categories.items():
            score = sum(1 for keyword in keywords if keyword in query)
            if score > best_score:
                best_score = score
                best_category = category
        
        return best_category
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """Process a portfolio query and return a response"""
        try:
            # Special case for "fetch holdings" command
            if query.lower() == "fetch holdings":
                return {
                    "status": "success",
                    "data": {
                        "message": "Please use get_holdings() method to fetch portfolio holdings"
                    }
                }
            
            # Classify the query
            query_type = self._classify_query(query)
            
            if not self.vector_db_manager:
                return {
                    "status": "error",
                    "data": {
                        "message": "Vector database manager is not initialized"
                    }
                }
            
            # Query the vector store for relevant information
            semantic_response = self.vector_db_manager.query(query)
            relevant_info = str(semantic_response)
            
            # Generate tailored response based on query type
            if query_type == "spot":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Spot Trading Holdings:\n\n{relevant_info}",
                        "investment_type": "spot"
                    }
                }
            
            elif query_type == "margin":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Cross Margin Holdings:\n\n{relevant_info}",
                        "investment_type": "spot_cross_margin"
                    }
                }
            
            elif query_type == "futures":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Futures Holdings:\n\n{relevant_info}",
                        "investment_type": "futures"
                    }
                }
            
            elif query_type == "holdings":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Portfolio Holdings:\n\n{relevant_info}"
                    }
                }
            
            elif query_type == "returns":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Portfolio Returns:\n\n{relevant_info}"
                    }
                }
            
            elif query_type == "technical":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Technical Indicators Analysis:\n\n{relevant_info}"
                    }
                }
            
            elif query_type == "allocation":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Portfolio Allocation Analysis:\n\n{relevant_info}"
                    }
                }
            
            # Default response
            return {
                "status": "success",
                "data": {
                    "message": f"Portfolio Analysis:\n\n{relevant_info}"
                }
            }
                
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query: {str(e)}"
                }
            }
    
    async def process_query_async(self, query: str) -> Dict[str, Any]:
        """Process a portfolio query asynchronously and return a response"""
        try:
            # Special case for "fetch holdings" command
            if query.lower() == "fetch holdings":
                return {
                    "status": "success",
                    "data": {
                        "message": "Please use get_holdings() method to fetch portfolio holdings"
                    }
                }
            
            # Classify the query
            query_type = self._classify_query(query)
            
            if not self.vector_db_manager:
                return {
                    "status": "error",
                    "data": {
                        "message": "Vector database manager is not initialized"
                    }
                }
            
            # Query the vector store for relevant information
            semantic_response = await self.vector_db_manager.aquery(query)
            relevant_info = str(semantic_response)
            
            # Generate tailored response based on query type
            if query_type == "spot":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Spot Trading Holdings:\n\n{relevant_info}",
                        "investment_type": "spot"
                    }
                }
            
            elif query_type == "margin":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Cross Margin Holdings:\n\n{relevant_info}",
                        "investment_type": "spot_cross_margin"
                    }
                }
            
            elif query_type == "futures":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Futures Holdings:\n\n{relevant_info}",
                        "investment_type": "futures"
                    }
                }
            
            elif query_type == "holdings":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Portfolio Holdings:\n\n{relevant_info}"
                    }
                }
            
            elif query_type == "returns":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Portfolio Returns:\n\n{relevant_info}"
                    }
                }
            
            elif query_type == "technical":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Technical Indicators Analysis:\n\n{relevant_info}"
                    }
                }
            
            elif query_type == "allocation":
                return {
                    "status": "success",
                    "data": {
                        "message": f"Portfolio Allocation Analysis:\n\n{relevant_info}"
                    }
                }
            
            # Default response
            return {
                "status": "success",
                "data": {
                    "message": f"Portfolio Analysis:\n\n{relevant_info}"
                }
            }
                
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query: {str(e)}"
                }
            } 