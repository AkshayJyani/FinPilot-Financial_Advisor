from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from kiteconnect import KiteConnect
from dotenv import load_dotenv
import os
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KitePortfolioAgent:
    """Agent for managing Kite portfolio data and analysis"""
    
    def __init__(self):
        """Initialize the Kite portfolio agent"""
        self.api_key = os.getenv('KITE_API_KEY')
        self.api_secret = os.getenv('KITE_API_SECRET')
        self.access_token = os.getenv('KITE_ACCESS_TOKEN')
        self.kite = None
        self.initialize_kite()
        
    def initialize_kite(self):
        """Initialize Kite connection"""
        try:
            if self.api_key and self.api_secret and self.access_token:
                self.kite = KiteConnect(api_key=self.api_key)
                self.kite.set_access_token(self.access_token)
                logger.info("Kite connection initialized successfully")
            else:
                logger.warning("Kite credentials not found in environment variables")
        except Exception as e:
            logger.error(f"Error initializing Kite connection: {str(e)}")
            self.kite = None
            
    def get_holdings(self) -> Dict[str, Any]:
        """Get all holdings from Kite"""
        try:
            if not self.kite:
                return self._get_sample_holdings()
                
            # Get equity holdings
            holdings = self.kite.holdings()
            
            # Get mutual fund holdings
            mf_holdings = self.kite.mutualfunds()
            
            # Process and format holdings
            processed_holdings = self._process_holdings(holdings, mf_holdings)
            
            return {
                'status': 'success',
                'data': processed_holdings
            }
            
        except Exception as e:
            logger.error(f"Error fetching holdings: {str(e)}")
            return {
                'status': 'error',
                'data': {
                    'message': str(e)
                }
            }
            
    def _process_holdings(self, holdings: List[Dict], mf_holdings: List[Dict]) -> Dict[str, Any]:
        """Process and format holdings data"""
        try:
            # Process equity holdings
            equity_holdings = {}
            total_value = 0
            holdings_count = 0
            
            for holding in holdings:
                if holding['quantity'] > 0:
                    symbol = holding['tradingsymbol']
                    quantity = holding['quantity']
                    avg_price = holding['average_price']
                    current_price = holding['last_price']
                    value = quantity * current_price
                    pnl = (current_price - avg_price) * quantity
                    pnl_percentage = ((current_price - avg_price) / avg_price) * 100
                    
                    equity_holdings[symbol] = {
                        'quantity': quantity,
                        'avg_price': avg_price,
                        'current_price': current_price,
                        'value': value,
                        'pnl': pnl,
                        'pnl_percentage': pnl_percentage
                    }
                    
                    total_value += value
                    holdings_count += 1
            
            # Process mutual fund holdings
            mf_holdings_dict = {}
            for mf in mf_holdings:
                if mf['units'] > 0:
                    symbol = mf['tradingsymbol']
                    units = mf['units']
                    nav = mf['nav']
                    value = units * nav
                    
                    mf_holdings_dict[symbol] = {
                        'units': units,
                        'nav': nav,
                        'value': value
                    }
                    
                    total_value += value
                    holdings_count += 1
            
            # Calculate asset allocation
            asset_allocation = self._calculate_asset_allocation(equity_holdings, mf_holdings_dict)
            
            return {
                'equity_holdings': equity_holdings,
                'mf_holdings': mf_holdings_dict,
                'total_value': total_value,
                'holdings_count': holdings_count,
                'asset_allocation': asset_allocation
            }
            
        except Exception as e:
            logger.error(f"Error processing holdings: {str(e)}")
            raise
            
    def _calculate_asset_allocation(self, equity_holdings: Dict, mf_holdings: Dict) -> List[Dict]:
        """Calculate asset allocation percentages"""
        total_value = sum(holding['value'] for holding in equity_holdings.values())
        total_value += sum(holding['value'] for holding in mf_holdings.values())
        
        if total_value == 0:
            return []
            
        allocation = []
        
        # Add equity allocations
        for symbol, holding in equity_holdings.items():
            percentage = (holding['value'] / total_value) * 100
            allocation.append({
                'asset': symbol,
                'type': 'Equity',
                'percentage': percentage
            })
            
        # Add mutual fund allocations
        for symbol, holding in mf_holdings.items():
            percentage = (holding['value'] / total_value) * 100
            allocation.append({
                'asset': symbol,
                'type': 'Mutual Fund',
                'percentage': percentage
            })
            
        return sorted(allocation, key=lambda x: x['percentage'], reverse=True)
        
    def _get_sample_holdings(self) -> Dict[str, Any]:
        """Return sample holdings data for demonstration"""
        return {
            'status': 'success',
            'data': {
                'equity_holdings': {
                    'RELIANCE': {
                        'quantity': 10,
                        'avg_price': 2500.00,
                        'current_price': 2600.00,
                        'value': 26000.00,
                        'pnl': 1000.00,
                        'pnl_percentage': 4.00
                    },
                    'TCS': {
                        'quantity': 5,
                        'avg_price': 3500.00,
                        'current_price': 3600.00,
                        'value': 18000.00,
                        'pnl': 500.00,
                        'pnl_percentage': 2.86
                    }
                },
                'mf_holdings': {
                    'ICICI_PRU_BLUECHIP': {
                        'units': 100,
                        'nav': 50.00,
                        'value': 5000.00
                    }
                },
                'total_value': 49000.00,
                'holdings_count': 3,
                'asset_allocation': [
                    {'asset': 'RELIANCE', 'type': 'Equity', 'percentage': 53.06},
                    {'asset': 'TCS', 'type': 'Equity', 'percentage': 36.73},
                    {'asset': 'ICICI_PRU_BLUECHIP', 'type': 'Mutual Fund', 'percentage': 10.21}
                ]
            }
        }
        
    def process_query(self, query: str) -> Dict[str, Any]:
        """Process user queries about portfolio"""
        try:
            # For now, return a simple response
            return {
                'status': 'success',
                'data': {
                    'message': f"Processing query: {query}. This is a placeholder response."
                }
            }
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return {
                'status': 'error',
                'data': {
                    'message': str(e)
                }
            } 