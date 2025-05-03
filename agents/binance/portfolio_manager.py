from typing import Dict, List, Any, Optional
import os
from .client import BinanceClient
from .vector_db import VectorDBManager
from .portfolio_analysis import PortfolioAnalyzer
from .query_processor import QueryProcessor
from .data_models import PortfolioData, InvestmentType

class PortfolioManager:
    """
    Manages all portfolio-related operations by integrating the BinanceClient,
    VectorDBManager, PortfolioAnalyzer, and QueryProcessor.
    """
    
    def __init__(self, api_key: str = "", api_secret: str = "", portfolio_data: 'PortfolioData' = None):
        """Initialize the portfolio manager with API credentials"""
        self.api_key = api_key
        self.api_secret = api_secret
        
        # Initialize components
        self.binance_client = BinanceClient(self.api_key, self.api_secret)
        self.vector_db_manager = VectorDBManager()
        self.portfolio_analyzer = PortfolioAnalyzer(self.binance_client)
        
        # Use provided portfolio_data or create a new one if not provided
        self.portfolio_data = portfolio_data if portfolio_data is not None else PortfolioData()
        
        # Initialize the query processor last, after other components are ready
        self.query_processor = QueryProcessor(
            vector_db_manager=self.vector_db_manager,
            portfolio_manager=self  # Pass self to the query processor
        )
        
        # Fetch and store initial data
        self.fetch_and_store_data()
    
    def fetch_and_store_data(self):
        """Fetch all portfolio data and store in vector DB"""
        try:
            print("Fetching and storing portfolio data...")
            
            # Check if portfolio_data already has holdings
            if hasattr(self.portfolio_data, 'holdings') and self.portfolio_data.holdings:
                print("Using existing holdings from portfolio_data...")
                holdings = self.portfolio_data.holdings
            else:
                # Fetch holdings if not already available
                holdings = self.fetch_holdings()
            
            print("___________________________________________________________________________________________")
            print("holdings:",holdings)
            # Extract symbols (remove suffixes)
            symbols = []
            for symbol in holdings.keys():
                # Extract base symbol
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                # Remove any USDT suffix
                base_symbol = base_symbol.replace('USDT', '')
                if base_symbol != 'USDT':
                    symbols.append(base_symbol)
            
            print("___________________________________________________________________________________________")
            print("symbols:",symbols)
            # Calculate returns, and indicators
            returns = self.portfolio_analyzer.calculate_returns(holdings)
            indicators = self.portfolio_analyzer.get_technical_indicators(symbols)

            print("___________________________________________________________________________________________")
            print("returns:",returns)
            print("___________________________________________________________________________________________")
            print("indicators:",indicators)
            
            # Store data in vector DB
            self.vector_db_manager.store_portfolio_data(holdings, {}, returns, indicators)
            
            # Save holdings to portfolio_data for future use
            if not hasattr(self.portfolio_data, 'holdings'):
                self.portfolio_data.holdings = holdings
            
            print("Portfolio data fetched and stored successfully")
            return True
        except Exception as e:
            print(f"Error fetching and storing portfolio data: {e}")
            return False
    
    def fetch_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch all holdings from different account types"""
        try:
            holdings = {}
            
            # Check if API credentials are available
            if not self.api_key or not self.api_secret:
                print("No API credentials available. Using sample data.")
                # Use sample data
                holdings = self.binance_client.generate_sample_data()
                return holdings
            
            # Fetch real data from Binance
            spot_holdings = self.binance_client.fetch_spot_holdings()
            margin_holdings = self.binance_client.fetch_margin_holdings()
            futures_holdings = self.binance_client.fetch_futures_holdings()
            
            # Get symbols for 24hr changes
            all_symbols = set()
            for symbol in list(spot_holdings.keys()) + list(margin_holdings.keys()) + list(futures_holdings.keys()):
                # Extract the base symbol without any suffix
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                all_symbols.add(base_symbol)
            
            # Fetch 24hr changes for all symbols
            changes_data = self.binance_client.fetch_24hr_changes(list(all_symbols))
            
            # Add spot holdings with unique keys and 24hr change
            for symbol, data in spot_holdings.items():
                # Extract base symbol for 24hr data
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                
                # Add 24hr change if available
                if base_symbol in changes_data:
                    data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                
                holdings[f"{symbol}_spot"] = data
            
            # Add margin holdings with unique keys and 24hr change
            for symbol, data in margin_holdings.items():
                # Extract base symbol for 24hr data
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                
                # Add 24hr change if available
                if base_symbol in changes_data:
                    data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                
                holdings[f"{symbol}_margin"] = data
            
            # Add futures holdings with unique keys and 24hr change
            for symbol, data in futures_holdings.items():
                # Extract base symbol for 24hr data
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                
                # Add 24hr change if available
                if base_symbol in changes_data:
                    data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                
                holdings[f"{symbol}_futures"] = data
            
            return holdings
            
        except Exception as e:
            print(f"Error fetching holdings: {e}")
            return {}
    
    def get_portfolio_summary(self) -> Dict[str, Any]:
        """Get a summary of the portfolio including holdings and analysis"""
        try:
            holdings_response = self.get_holdings()
            if holdings_response["status"] == "error":
                return holdings_response
                
            # Get additional analysis through the portfolio analyzer
            holdings_data = holdings_response["data"]
            
            # Add risk metrics and investment recommendations
            analysis = self.portfolio_analyzer.analyze_portfolio(holdings_data)
            
            # Merge holdings data with analysis
            holdings_data.update({
                "risk_metrics": analysis.get("risk_metrics", {}),
                "recommendations": analysis.get("recommendations", [])
            })
            
            return {
                "status": "success",
                "data": holdings_data
            }
            
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error generating portfolio summary: {str(e)}"
                }
            }
    
    def get_holdings(self) -> Dict[str, Any]:
        """Get current portfolio holdings with market data and analysis"""
        try:
            # Fetch holdings
            holdings = self.fetch_holdings()
            
            # Calculate total value and holdings count
            total_value = 0
            holdings_count = 0
            spot_holdings = {}
            margin_holdings = {}
            futures_holdings = {}
            
            # Fetch 24hr changes for all symbols if not already present
            all_symbols = set()
            for symbol in holdings.keys():
                # Extract the base symbol without any suffix
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                # Remove USDT suffix if present (for futures symbols)
                base_symbol = base_symbol.replace('USDT', '')
                all_symbols.add(base_symbol)
            
            # Only fetch if we have symbols and change_24h is missing from any holding
            should_fetch_changes = any('change_24h' not in data for data in holdings.values())
            changes_data = {}
            if all_symbols and should_fetch_changes:
                print(f"Fetching 24hr changes for symbols: {list(all_symbols)}")
                changes_data = self.binance_client.fetch_24hr_changes(list(all_symbols))
            
            # Organize holdings by type
            for symbol, data in holdings.items():
                # Add change_24h if missing and we have the data
                if 'change_24h' not in data and changes_data:
                    # Extract base symbol for 24hr data
                    base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                    base_symbol = base_symbol.replace('USDT', '')
                    
                    # Add 24hr change if available
                    if base_symbol in changes_data:
                        data['change_24h'] = changes_data[base_symbol]['priceChangePercent']
                
                if data.get("type") == InvestmentType.SPOT:
                    spot_holdings[symbol] = data
                    total_value += data.get('total_usd', 0)
                    holdings_count += 1
                elif data.get("type") == InvestmentType.SPOT_CROSS_MARGIN:
                    margin_holdings[symbol] = data
                    total_value += data.get('net_asset_usd', 0)
                    holdings_count += 1
                elif data.get("type") == InvestmentType.FUTURES:
                    futures_holdings[symbol] = data
                    total_value += data.get('usd_value', 0)
                    holdings_count += 1
            
            # Calculate 24h change (weighted average)
            total_change = 0
            total_weight = 0
            
            # Process spot holdings
            for data in spot_holdings.values():
                value = data.get('total_usd', 0)
                change = data.get('change_24h', 0) or 0
                if value > 0:
                    total_change += change * value
                    total_weight += value
            
            # Process margin holdings
            for data in margin_holdings.values():
                value = data.get('net_asset_usd', 0)
                change = data.get('change_24h', 0) or 0
                if value > 0:
                    total_change += change * value
                    total_weight += value
            
            # Process futures holdings
            for data in futures_holdings.values():
                value = data.get('usd_value', 0)
                change = data.get('change_24h', 0) or 0
                if value > 0:
                    total_change += change * value
                    total_weight += value
            
            # Calculate weighted average change
            change_24h = total_change / total_weight if total_weight > 0 else 0
            
            # Calculate asset allocation
            asset_allocation = []
            for symbol, data in holdings.items():
                value = 0
                if data.get("type") == InvestmentType.SPOT:
                    value = data.get('total_usd', 0)
                elif data.get("type") == InvestmentType.SPOT_CROSS_MARGIN:
                    value = data.get('net_asset_usd', 0)
                elif data.get("type") == InvestmentType.FUTURES:
                    value = data.get('usd_value', 0)
                
                if value > 0:
                    percentage = (value / total_value * 100) if total_value > 0 else 0
                    asset_allocation.append({
                        "asset": symbol,
                        "percentage": percentage
                    })
            
            # If no holdings found, use sample data
            if total_value == 0 and holdings_count == 0:
                total_value = 50000.0
                change_24h = 2.5
                holdings_count = 6
                asset_allocation = [
                    {"asset": "BTC", "percentage": 50.0},
                    {"asset": "ETH", "percentage": 20.0},
                    {"asset": "BNB", "percentage": 10.0},
                    {"asset": "ADA", "percentage": 8.0},
                    {"asset": "SOL", "percentage": 7.0},
                    {"asset": "DOT", "percentage": 5.0}
                ]
            
            return {
                "status": "success",
                "data": {
                    "spot_holdings": spot_holdings,
                    "margin_holdings": margin_holdings,
                    "futures_holdings": futures_holdings,
                    "total_value": total_value,
                    "change_24h": change_24h,
                    "holdings_count": holdings_count,
                    "asset_allocation": asset_allocation
                }
            }
            
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error fetching holdings: {str(e)}"
                }
            }
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """Process portfolio-related queries using stored data"""
        return self.query_processor.process_query(query)
    
    async def process_query_async(self, query: str) -> Dict[str, Any]:
        """Async version of process_query"""
        return await self.query_processor.process_query_async(query)
    
    def analyze_portfolio(self) -> Dict[str, Any]:
        """Perform comprehensive portfolio analysis"""
        try:
            # Fetch current data
            holdings = self.fetch_holdings()
            symbols = [s.split('_')[0] for s in holdings.keys() if not s.startswith('USDT')]
            
            # Use the portfolio analyzer to analyze the portfolio
            analysis = self.portfolio_analyzer.analyze_portfolio(holdings, {})
            
            return {
                "status": "success",
                "data": analysis
            }
            
        except Exception as e:
            print(f"Error analyzing portfolio: {e}")
            return {
                "status": "error",
                "data": {
                    "message": f"Error analyzing portfolio: {str(e)}"
                }
            }
    
    def update_portfolio_data(self) -> Dict[str, Any]:
        """Update portfolio data in vector store"""
        try:
            success = self.fetch_and_store_data()
            if success:
                return {
                    "status": "success",
                    "data": {
                        "message": "Portfolio data updated successfully"
                    }
                }
            else:
                return {
                    "status": "error",
                    "data": {
                        "message": "Failed to update portfolio data"
                    }
                }
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error updating portfolio data: {str(e)}"
                }
            } 