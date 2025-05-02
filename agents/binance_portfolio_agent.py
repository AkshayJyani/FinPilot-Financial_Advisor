from typing import Dict, List, Any, Optional
import os
from dotenv import load_dotenv
from langchain.tools import BaseTool
from pydantic import Field
import time

# Import PortfolioManager from binance package
from agents.binance import PortfolioManager, PortfolioData

load_dotenv()

class PortfolioAgent(BaseTool):
    """Agent for managing Binance portfolio operations"""
    
    name: str = "portfolio_agent"
    description: str = "Handles portfolio management, Binance integration, and market data analysis"
    api_key: str = Field(default="")
    api_secret: str = Field(default="")
    portfolio_data: PortfolioData = None
    
    # Portfolio manager instance
    portfolio_manager: Optional[PortfolioManager] = None
    
    def __init__(self):
        """Initialize the portfolio agent"""
        super().__init__()
        self.api_key = os.getenv("BINANCE_API_KEY", "")
        self.api_secret = os.getenv("BINANCE_API_SECRET", "")
        
        start_time = time.time()
        
        # Initialize portfolio data only once
        self.portfolio_data = PortfolioData()
        
        # Pre-fetch holdings only once to avoid duplication
        # We'll do this in the portfolio agent to ensure it's only done once
        from agents.binance.client import BinanceClient
        binance_client = BinanceClient(self.api_key, self.api_secret)
        
        # Fetch holdings and store in portfolio_data
        try:
            print("Pre-fetching holdings data...")
            spot_holdings = binance_client.fetch_spot_holdings()
            margin_holdings = binance_client.fetch_margin_holdings()
            futures_holdings = binance_client.fetch_futures_holdings()
            
            # Get symbols for 24hr changes
            all_symbols = set()
            for symbol in list(spot_holdings.keys()) + list(margin_holdings.keys()) + list(futures_holdings.keys()):
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                all_symbols.add(base_symbol)
            
            # Fetch 24hr changes for all symbols
            changes_data = binance_client.fetch_24hr_changes(list(all_symbols))
            
            # Process and combine all holdings
            holdings = {}
            
            # Process spot holdings
            for symbol, data in spot_holdings.items():
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                if base_symbol in changes_data:
                    data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                holdings[f"{symbol}_spot"] = data
            
            # Process margin holdings
            for symbol, data in margin_holdings.items():
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                if base_symbol in changes_data:
                    data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                holdings[f"{symbol}_margin"] = data
            
            # Process futures holdings
            for symbol, data in futures_holdings.items():
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                if base_symbol in changes_data:
                    data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                holdings[f"{symbol}_futures"] = data
            
            # Store in portfolio_data
            self.portfolio_data.holdings = holdings
            print(f"Successfully pre-fetched {len(holdings)} holdings")
        except Exception as e:
            print(f"Error pre-fetching holdings: {e}")
            # If error, we'll continue with empty holdings and let PortfolioManager handle it
        
        # Initialize portfolio manager with the existing portfolio_data
        self.portfolio_manager = PortfolioManager(
            api_key=self.api_key, 
            api_secret=self.api_secret,
            portfolio_data=self.portfolio_data
        )

        end_time = time.time()
        print(f"Time taken to initialize PortfolioData: {end_time - start_time:.6f} seconds")
    
    def _run(self, query: str) -> Dict[str, Any]:
        """Process portfolio-related queries"""
        return self.portfolio_manager.process_query(query)
    
    async def _arun(self, query: str) -> Dict[str, Any]:
        """Async version of _run"""
        return await self.portfolio_manager.process_query_async(query)
    
    def get_holdings(self) -> Dict[str, Any]:
        """Get current portfolio holdings with market data and analysis"""
        return self.portfolio_manager.get_holdings()
    
    def get_portfolio_summary(self) -> Dict[str, Any]:
        """Get a summary of the portfolio including holdings and analysis"""
        return self.portfolio_manager.get_portfolio_summary()
    
    def analyze_portfolio(self) -> Dict[str, Any]:
        """Perform comprehensive portfolio analysis"""
        return self.portfolio_manager.analyze_portfolio()
    
    def update_portfolio_data(self) -> Dict[str, Any]:
        """Update portfolio data in vector store"""
        return self.portfolio_manager.update_portfolio_data() 