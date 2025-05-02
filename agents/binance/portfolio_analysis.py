from typing import Dict, List, Any
import pandas as pd
import numpy as np
import ta
from datetime import datetime, timedelta


class PortfolioAnalyzer:
    """Analyzes portfolio data and provides insights"""
    
    def __init__(self, binance_client=None):
        """Initialize the portfolio analyzer with a Binance client"""
        self.binance_client = binance_client
    
    def get_historical_data(self, symbol: str, interval: str = '1d', limit: int = 30) -> pd.DataFrame:
        """Get historical price data for a symbol"""
        try:
            if not self.binance_client:
                return pd.DataFrame()
                
            klines = self.binance_client.get_historical_klines(symbol, interval, limit)
            
            if not klines:
                return pd.DataFrame()
                
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['close'] = df['close'].astype(float)
            return df
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return pd.DataFrame()
    
    def calculate_returns(self, symbol_or_holdings, period: str = "1M") -> Dict[str, float] or float:
        """Calculate returns for a given period
        
        Args:
            symbol_or_holdings: Either a single symbol (str) or a dictionary of holdings
            period: Time period for return calculation ("1M", "3M", "6M", "1Y")
            
        Returns:
            Dictionary of returns by symbol or a single float value for one symbol
        """
        try:
            if not self.binance_client:
                return {} if isinstance(symbol_or_holdings, dict) else 0.0
            
            # Set interval and limit based on period
            if period == "1M":
                interval = '1d'
                limit = 30
            elif period == "3M":
                interval = '1d'
                limit = 90
            elif period == "6M":
                interval = '1w'
                limit = 26
            else:  # 1Y
                interval = '1w'
                limit = 52
            
            # If we're processing a dictionary of holdings
            if isinstance(symbol_or_holdings, dict):
                returns = {}
                
                for symbol_key in symbol_or_holdings:
                    # Extract base symbol by removing any suffix
                    base_symbol = symbol_key.split('_')[0] if '_' in symbol_key else symbol_key
                    
                    # Skip USDT entry
                    if base_symbol == 'USDT':
                        continue
                    
                    # Add USDT suffix if not present
                    if 'USDT' not in base_symbol:
                        symbol_for_api = f"{base_symbol}USDT"
                    else:
                        symbol_for_api = base_symbol
                    
                    # Get historical data and calculate return
                    df = self.get_historical_data(symbol_for_api, interval, limit)
                    if df.empty:
                        returns[base_symbol] = 0.0
                        continue
                    
                    initial_price = df['close'].iloc[0]
                    final_price = df['close'].iloc[-1]
                    returns[base_symbol] = (final_price - initial_price) / initial_price
                
                return returns
            
            # If we're processing a single symbol
            else:
                symbol = symbol_or_holdings
                # Add USDT suffix if not present
                if 'USDT' not in symbol:
                    symbol = f"{symbol}USDT"
                
                df = self.get_historical_data(symbol, interval, limit)
                if df.empty:
                    return 0.0
                
                initial_price = df['close'].iloc[0]
                final_price = df['close'].iloc[-1]
                return (final_price - initial_price) / initial_price
        
        except Exception as e:
            print(f"Error calculating returns: {e}")
            return {} if isinstance(symbol_or_holdings, dict) else 0.0
    
    def get_technical_indicators(self, symbol_or_symbols) -> Dict[str, Dict[str, float]] or Dict[str, float]:
        """Get technical indicators for a symbol or list of symbols
        
        Args:
            symbol_or_symbols: Either a single symbol (str) or a list of symbols
            
        Returns:
            Dictionary of technical indicators by symbol or technical indicators for a single symbol
        """
        try:
            if not self.binance_client:
                return {} if isinstance(symbol_or_symbols, list) else {}
            
            # If we're processing a list of symbols
            if isinstance(symbol_or_symbols, list):
                all_indicators = {}
                
                for symbol in symbol_or_symbols:
                    # Add USDT suffix if not present
                    if 'USDT' not in symbol:
                        symbol_for_api = f"{symbol}USDT"
                    else:
                        symbol_for_api = symbol
                    
                    df = self.get_historical_data(symbol_for_api, '1d', 100)
                    if df.empty:
                        all_indicators[symbol] = {}
                        continue
                    
                    # Add technical indicators
                    df['rsi'] = ta.momentum.RSIIndicator(df['close']).rsi()
                    df['macd'] = ta.trend.MACD(df['close']).macd()
                    
                    # Bollinger Bands calculation
                    bb = ta.volatility.BollingerBands(df['close'])
                    df['bb_upper'] = bb.bollinger_hband()
                    df['bb_middle'] = bb.bollinger_mavg()
                    df['bb_lower'] = bb.bollinger_lband()
                    
                    all_indicators[symbol] = {
                        'rsi': float(df['rsi'].iloc[-1]),
                        'macd': float(df['macd'].iloc[-1]),
                        'bb_upper': float(df['bb_upper'].iloc[-1]),
                        'bb_middle': float(df['bb_middle'].iloc[-1]),
                        'bb_lower': float(df['bb_lower'].iloc[-1])
                    }
                
                return all_indicators
            
            # If we're processing a single symbol
            else:
                symbol = symbol_or_symbols
                # Add USDT suffix if not present
                if 'USDT' not in symbol:
                    symbol = f"{symbol}USDT"
                
                df = self.get_historical_data(symbol, '1d', 100)
                if df.empty:
                    return {}
                
                # Add technical indicators
                df['rsi'] = ta.momentum.RSIIndicator(df['close']).rsi()
                df['macd'] = ta.trend.MACD(df['close']).macd()
                
                # Bollinger Bands calculation
                bb = ta.volatility.BollingerBands(df['close'])
                df['bb_upper'] = bb.bollinger_hband()
                df['bb_middle'] = bb.bollinger_mavg()
                df['bb_lower'] = bb.bollinger_lband()
                
                return {
                    'rsi': float(df['rsi'].iloc[-1]),
                    'macd': float(df['macd'].iloc[-1]),
                    'bb_upper': float(df['bb_upper'].iloc[-1]),
                    'bb_middle': float(df['bb_middle'].iloc[-1]),
                    'bb_lower': float(df['bb_lower'].iloc[-1])
                }
                
        except Exception as e:
            print(f"Error calculating technical indicators: {e}")
            return {} if isinstance(symbol_or_symbols, list) else {}
    
    def analyze_portfolio(self, holdings: Dict[str, Dict[str, Any]], market_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform comprehensive portfolio analysis"""
        try:
            # Initialize market_data if not provided
            if market_data is None:
                market_data = {}
                
            # Calculate portfolio metrics
            total_value = 0.0
            returns = {}
            indicators = {}
            investment_types = {
                "spot": 0.0,
                "spot_cross_margin": 0.0,
                "futures": 0.0
            }
            
            symbols = [s.split('_')[0] for s in holdings.keys() if s != 'USDT']
            
            # Calculate returns and indicators for all symbols
            for symbol in symbols:
                returns[symbol] = self.calculate_returns(symbol)
                indicators[symbol] = self.get_technical_indicators(symbol)
            
            # Process holdings for value calculation if market data is available
            if market_data:
                for symbol, holding in holdings.items():
                    base_symbol = symbol.split('_')[0]
                    if base_symbol in market_data:
                        # Calculate value based on investment type
                        if holding['type'] == "spot":
                            quantity = holding.get('total', 0)
                            value = quantity * market_data[base_symbol].get('spot_price', 0)
                            investment_types["spot"] += value
                        elif holding['type'] == "spot_cross_margin":
                            value = holding.get('net_asset', 0) * market_data[base_symbol].get('spot_price', 0)
                            investment_types["spot_cross_margin"] += value
                        elif holding['type'] == "futures":
                            value = abs(holding.get('amount', 0)) * market_data[base_symbol].get('futures_price', 0)
                            investment_types["futures"] += value
                        
                        total_value += value
            
            # Calculate portfolio-level metrics
            portfolio_return = np.mean(list(returns.values())) if returns else 0.0
            portfolio_volatility = np.std(list(returns.values())) if returns else 0.0
            
            # Calculate investment type allocation
            investment_type_allocation = {
                inv_type: value/total_value if total_value > 0 else 0.0
                for inv_type, value in investment_types.items()
            }
            
            return {
                "total_value": total_value,
                "holdings": holdings,
                "market_data": market_data,
                "returns": returns,
                "technical_indicators": indicators,
                "investment_type_allocation": investment_type_allocation,
                "portfolio_metrics": {
                    "return": portfolio_return,
                    "volatility": portfolio_volatility,
                    "sharpe_ratio": portfolio_return / portfolio_volatility if portfolio_volatility > 0 else 0.0
                }
            }
        except Exception as e:
            print(f"Error analyzing portfolio: {e}")
            return {} 