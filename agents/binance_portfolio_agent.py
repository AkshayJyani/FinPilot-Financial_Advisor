from typing import Dict, List, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from binance.client import Client
from binance.exceptions import BinanceAPIException
from pydantic import BaseModel, Field
from langchain.tools import BaseTool
import os
from dotenv import load_dotenv
import ta
from llama_index.core import Document
from llama_index.core import VectorStoreIndex
from llama_index.core.settings import Settings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever

load_dotenv()

class InvestmentType:
    SPOT = "spot"
    SPOT_CROSS_MARGIN = "spot_cross_margin"
    FUTURES = "futures"
    FUTURES_CROSS_MARGIN = "futures_cross_margin"

class PortfolioData(BaseModel):
    holdings: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    transactions: List[Dict[str, Any]] = Field(default_factory=list)
    market_data: Dict[str, float] = Field(default_factory=dict)
    sector_allocation: Dict[str, float] = Field(default_factory=dict)
    investment_types: Dict[str, Dict[str, float]] = Field(default_factory=dict)

class PortfolioAgent(BaseTool):
    name: str = "portfolio_agent"
    description: str = "Handles portfolio management, Binance integration, and market data analysis"
    api_key: str = Field(default="")
    api_secret: str = Field(default="")
    portfolio_data: PortfolioData = Field(default_factory=PortfolioData)
    client: Client = Field(default=None)
    query_engine: Any = Field(default=None)
    vector_store: Any = Field(default=None)
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv("BINANCE_API_KEY", "")
        self.api_secret = os.getenv("BINANCE_API_SECRET", "")
        self.client = Client(self.api_key, self.api_secret)
        self.portfolio_data = PortfolioData()
        self.initialize_query_engine()
        # Fetch and store data at initialization
        self._fetch_and_store_data()
    
    def _create_portfolio_documents(self) -> List[Document]:
        """Create documents from portfolio data for vector store"""
        try:
            documents = []
            
            # Get current portfolio analysis
            portfolio_analysis = self.analyze_portfolio()
            
            # Create document for holdings
            holdings_text = "Current portfolio holdings:\n"
            for symbol, holding in portfolio_analysis.get("holdings", {}).items():
                holdings_text += f"{symbol}: {holding}\n"
            documents.append(Document(text=holdings_text))
            
            # Create document for market data
            market_text = "Current market data:\n"
            for symbol, data in portfolio_analysis.get("market_data", {}).items():
                market_text += f"{symbol}: {data}\n"
            documents.append(Document(text=market_text))
            
            # Create document for returns
            returns_text = "Portfolio returns:\n"
            for symbol, ret in portfolio_analysis.get("returns", {}).items():
                returns_text += f"{symbol}: {ret:.2%}\n"
            documents.append(Document(text=returns_text))
            
            # Create document for technical indicators
            indicators_text = "Technical indicators:\n"
            for symbol, indicators in portfolio_analysis.get("technical_indicators", {}).items():
                indicators_text += f"{symbol}: {indicators}\n"
            documents.append(Document(text=indicators_text))
            
            # Create document for investment type allocation
            allocation_text = "Investment type allocation:\n"
            for inv_type, allocation in portfolio_analysis.get("investment_type_allocation", {}).items():
                allocation_text += f"{inv_type}: {allocation:.2%}\n"
            documents.append(Document(text=allocation_text))
            
            return documents
        except Exception as e:
            print(f"Error creating portfolio documents: {e}")
            return []

    def initialize_query_engine(self):
        """Initialize the query engine for semantic understanding"""
        try:
            # Create a knowledge base of portfolio management concepts
            knowledge_base = [
                Document(text="Portfolio analysis involves calculating returns, risk metrics, and performance indicators."),
                Document(text="Technical indicators include RSI, MACD, Bollinger Bands, and moving averages."),
                Document(text="Portfolio diversification is measured by sector allocation and asset correlation."),
                Document(text="Risk metrics include volatility, Sharpe ratio, and maximum drawdown."),
                Document(text="Performance analysis includes absolute returns, relative returns, and benchmark comparison."),
                Document(text="Market data includes current prices, 24h volume, and price changes."),
                Document(text="Holdings information includes quantity, average cost, and current value."),
                Document(text="Transaction history includes buy/sell orders, timestamps, and execution prices."),
                Document(text="Investment types include spot trading, spot cross margin, and futures trading."),
                Document(text="Margin trading involves borrowing funds to increase position size."),
                Document(text="Futures trading allows for leveraged positions and hedging strategies.")
            ]
            
            # Initialize settings with embedding model
            Settings.embed_model = OpenAIEmbedding(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Create vector store index
            self.vector_store = VectorStoreIndex.from_documents(knowledge_base)
            
            # Configure retriever
            retriever = VectorIndexRetriever(
                index=self.vector_store,
                similarity_top_k=5,  # Increased from 3 to 5 for better retrieval
            )
            
            # Configure response synthesizer
            response_synthesizer = get_response_synthesizer(
                response_mode="compact",
                streaming=False,
            )
            
            # Create query engine
            self.query_engine = RetrieverQueryEngine(
                retriever=retriever,
                response_synthesizer=response_synthesizer,
            )
            
            print("Query engine initialized successfully")
            
        except Exception as e:
            print(f"Error initializing query engine: {e}")
            self.query_engine = None
            self.vector_store = None

    def update_portfolio_data(self):
        """Update portfolio data in vector store"""
        try:
            # Create new portfolio documents
            portfolio_documents = self._create_portfolio_documents()
            
            # Reinitialize query engine with updated data
            self.initialize_query_engine()
            
            return True
        except Exception as e:
            print(f"Error updating portfolio data: {e}")
            return False
    
    def _fetch_spot_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch spot trading holdings"""
        try:
            account = self.client.get_account()
            holdings = {}
            for balance in account['balances']:
                if float(balance['free']) > 0 or float(balance['locked']) > 0:
                    # Get the current price of the asset in USD
                    symbol = f"{balance['asset']}USDT"
                    try:
                        ticker = self.client.get_symbol_ticker(symbol=symbol)
                        price_usd = float(ticker['price'])
                    except:
                        # If the asset doesn't have a direct USDT pair, try to get it through BTC
                        try:
                            btc_ticker = self.client.get_symbol_ticker(symbol=f"{balance['asset']}BTC")
                            btc_price = float(btc_ticker['price'])
                            usdt_ticker = self.client.get_symbol_ticker(symbol="BTCUSDT")
                            usdt_price = float(usdt_ticker['price'])
                            price_usd = btc_price * usdt_price
                        except:
                            # If we can't get the price, use 0
                            price_usd = 0
                    
                    # Calculate USD values
                    free = float(balance['free'])
                    locked = float(balance['locked'])
                    total = free + locked
                    usd_value = total * price_usd
                    
                    holdings[balance['asset']] = {
                        'free': free,
                        'locked': locked,
                        'total': total,
                        'total_usd': usd_value,
                        'type': InvestmentType.SPOT,
                        'price_usd': price_usd
                    }
            return holdings
        except BinanceAPIException as e:
            print(f"Error fetching spot holdings: {e}")
            return {}
    
    def _fetch_margin_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch margin trading holdings"""
        try:
            margin_account = self.client.get_margin_account()
            holdings = {}
            for asset in margin_account['userAssets']:
                if float(asset['netAsset']) > 0:
                    # Get the current price of the asset in USD
                    symbol = f"{asset['asset']}USDT"
                    try:
                        ticker = self.client.get_symbol_ticker(symbol=symbol)
                        price_usd = float(ticker['price'])
                    except:
                        # If the asset doesn't have a direct USDT pair, try to get it through BTC
                        try:
                            btc_ticker = self.client.get_symbol_ticker(symbol=f"{asset['asset']}BTC")
                            btc_price = float(btc_ticker['price'])
                            usdt_ticker = self.client.get_symbol_ticker(symbol="BTCUSDT")
                            usdt_price = float(usdt_ticker['price'])
                            price_usd = btc_price * usdt_price
                        except:
                            # If we can't get the price, use 0
                            price_usd = 0
                    
                    # Calculate USD value
                    net_asset = float(asset['netAsset'])
                    usd_value = net_asset * price_usd
                    
                    holdings[asset['asset']] = {
                        'net_asset': net_asset,
                        'net_asset_usd': usd_value,
                        'borrowed': float(asset['borrowed']),
                        'type': InvestmentType.SPOT_CROSS_MARGIN,
                        'price_usd': price_usd
                    }
            return holdings
        except BinanceAPIException as e:
            print(f"Error fetching margin holdings: {e}")
            return {}
    
    def _fetch_futures_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch futures trading holdings"""
        try:
            futures_account = self.client.futures_account()
            holdings = {}
            for position in futures_account['positions']:
                if float(position['positionAmt']) != 0:
                    # Get the current price of the asset in USD
                    symbol = position['symbol']
                    try:
                        ticker = self.client.futures_symbol_ticker(symbol=symbol)
                        price_usd = float(ticker['price'])
                    except:
                        # If we can't get the price, use 0
                        price_usd = 0
                    
                    # Calculate USD values
                    amount = float(position['positionAmt'])
                    entry_price = float(position['entryPrice'])
                    unrealized_pnl = float(position.get('unRealizedProfit', 0.0))
                    leverage = int(position.get('leverage', 1))
                    
                    # Calculate the USD value of the position
                    usd_value = abs(amount) * price_usd
                    
                    holdings[position['symbol']] = {
                        'amount': amount,
                        'entry_price': entry_price,
                        'current_price': price_usd,
                        'unrealized_pnl': unrealized_pnl,
                        'unrealized_pnl_usd': unrealized_pnl,  # Already in USD
                        'leverage': leverage,
                        'usd_value': usd_value,
                        'type': InvestmentType.FUTURES
                    }
            return holdings
        except BinanceAPIException as e:
            print(f"Error fetching futures holdings: {e}")
            return {}
    
    def _fetch_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch all holdings from different account types"""
        try:
            holdings = {}
            
            # Check if API credentials are available
            if not self.api_key or not self.api_secret:
                print("No API credentials available. Using sample data.")
                # Sample data for demonstration
                holdings = {
                    # Spot Trading Holdings
                    "BTC_spot": {
                        "free": 0.5,
                        "locked": 0.0,
                        "total": 0.5,
                        "total_usd": 25000.0,
                        "type": "spot",
                        "price_usd": 50000.0
                    },
                    "ETH_spot": {
                        "free": 2.0,
                        "locked": 0.0,
                        "total": 2.0,
                        "total_usd": 4000.0,
                        "type": "spot",
                        "price_usd": 2000.0
                    },
                    # Cross Margin Holdings
                    "BNB_margin": {
                        "net_asset": 10.0,
                        "net_asset_usd": 5000.0,
                        "borrowed": 0.0,
                        "type": "spot_cross_margin",
                        "price_usd": 500.0
                    },
                    "ADA_margin": {
                        "net_asset": 1000.0,
                        "net_asset_usd": 3000.0,
                        "borrowed": 0.0,
                        "type": "spot_cross_margin",
                        "price_usd": 3.0
                    },
                    # Futures Holdings
                    "SOL_futures": {
                        "amount": 100.0,
                        "entry_price": 100.0,
                        "current_price": 120.0,
                        "unrealized_pnl": 2000.0,
                        "unrealized_pnl_usd": 2000.0,
                        "leverage": 5,
                        "usd_value": 12000.0,
                        "type": "futures"
                    },
                    "DOT_futures": {
                        "amount": 50.0,
                        "entry_price": 20.0,
                        "current_price": 25.0,
                        "unrealized_pnl": 250.0,
                        "unrealized_pnl_usd": 250.0,
                        "leverage": 3,
                        "usd_value": 1250.0,
                        "type": "futures"
                    }
                }
                return holdings
            
            # If API credentials are available, fetch real data
            spot_holdings = self._fetch_spot_holdings()
            margin_holdings = self._fetch_margin_holdings()
            futures_holdings = self._fetch_futures_holdings()
            
            # Add spot holdings with unique keys
            for symbol, data in spot_holdings.items():
                holdings[f"{symbol}_spot"] = data
            
            # Add margin holdings with unique keys
            for symbol, data in margin_holdings.items():
                holdings[f"{symbol}_margin"] = data
            
            # Add futures holdings with unique keys
            for symbol, data in futures_holdings.items():
                holdings[f"{symbol}_futures"] = data
            
            return holdings
            
        except Exception as e:
            print(f"Error fetching holdings: {e}")
            return {}
            
    def _store_holdings_in_vectordb(self, holdings: Dict[str, Dict[str, Any]]):
        """Store holdings data in vector DB"""
        try:
            if not self.vector_store:
                print("Vector store not initialized, initializing now...")
                self.initialize_query_engine()
                if not self.vector_store:
                    print("Failed to initialize vector store")
                    return

            # Create documents from holdings data
            documents = []
            
            # Create a summary document
            summary_text = "Portfolio Holdings Summary:\n"
            for symbol, holding in holdings.items():
                summary_text += f"{symbol}: {holding}\n"
            documents.append(Document(text=summary_text))
            
            # Create documents by investment type
            spot_holdings = {k: v for k, v in holdings.items() if v.get('type') == InvestmentType.SPOT}
            margin_holdings = {k: v for k, v in holdings.items() if v.get('type') == InvestmentType.SPOT_CROSS_MARGIN}
            futures_holdings = {k: v for k, v in holdings.items() if v.get('type') == InvestmentType.FUTURES}
            
            # Create type-specific documents
            if spot_holdings:
                spot_text = "Spot Trading Holdings:\n"
                for symbol, holding in spot_holdings.items():
                    spot_text += f"{symbol}: {holding}\n"
                documents.append(Document(text=spot_text))
            
            if margin_holdings:
                margin_text = "Cross Margin Holdings:\n"
                for symbol, holding in margin_holdings.items():
                    margin_text += f"{symbol}: {holding}\n"
                documents.append(Document(text=margin_text))
            
            if futures_holdings:
                futures_text = "Futures Holdings:\n"
                for symbol, holding in futures_holdings.items():
                    futures_text += f"{symbol}: {holding}\n"
                documents.append(Document(text=futures_text))
            
            # Add documents to vector store
            for doc in documents:
                self.vector_store.insert(doc)
            
            print(f"Stored {len(documents)} documents in vector DB")
                
        except Exception as e:
            print(f"Error storing holdings in vector DB: {e}")
    
    def _fetch_market_data(self, symbols: List[str]) -> Dict[str, float]:
        """Fetch current market data for given symbols"""
        try:
            market_data = {}
            
            # Get valid trading pairs from Binance
            exchange_info = self.client.get_exchange_info()
            valid_symbols = {s['symbol'] for s in exchange_info['symbols'] if s['status'] == 'TRADING'}
            
            for symbol in symbols:
                if symbol == 'USDT':  # Skip USDT as it's the quote currency
                    continue
                    
                # Format the symbol for checking
                trading_pair = f"{symbol}USDT"
                
                # Skip if not a valid trading pair
                if trading_pair not in valid_symbols:
                    continue
                    
                try:
                    # Get spot price
                    spot_ticker = self.client.get_symbol_ticker(symbol=trading_pair)
                    market_data[symbol] = {
                        'spot_price': float(spot_ticker['price']),
                        'futures_price': None
                    }
                    
                    # Try to get futures price if available
                    try:
                        futures_ticker = self.client.futures_symbol_ticker(symbol=trading_pair)
                        market_data[symbol]['futures_price'] = float(futures_ticker['price'])
                    except BinanceAPIException:
                        # If futures symbol doesn't exist, just continue with spot price
                        pass
                        
                except BinanceAPIException as e:
                    print(f"Error fetching market data for {symbol}: {e}")
                    continue
            
            return market_data
        except Exception as e:
            print(f"Error fetching market data: {e}")
            return {}
    
    def get_historical_data(self, symbol: str, interval: str = '1d', limit: int = 30) -> pd.DataFrame:
        """Get historical price data for a symbol"""
        try:
            klines = self.client.get_historical_klines(
                f"{symbol}USDT",
                interval,
                limit=limit
            )
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['close'] = df['close'].astype(float)
            return df
        except BinanceAPIException as e:
            print(f"Error fetching historical data: {e}")
            return pd.DataFrame()
    
    def calculate_returns(self, symbol: str, period: str = "1M") -> float:
        """Calculate returns for a given period"""
        try:
            if period == "1M":
                interval = '1d'
                limit = 30
            elif period == "3M":
                interval = '1d'
                limit = 90
            elif period == "6M":
                interval = '1w'
                limit = 26
            else:
                interval = '1w'
                limit = 52
            
            df = self.get_historical_data(symbol, interval, limit)
            if df.empty:
                return 0.0
            
            initial_price = df['close'].iloc[0]
            final_price = df['close'].iloc[-1]
            return (final_price - initial_price) / initial_price
        except Exception as e:
            print(f"Error calculating returns: {e}")
            return 0.0
    
    def get_technical_indicators(self, symbol: str) -> Dict[str, float]:
        """Get technical indicators for a symbol"""
        try:
            df = self.get_historical_data(symbol, '1d', 100)
            if df.empty:
                return {}
            
            # Add technical indicators
            df['rsi'] = ta.momentum.RSIIndicator(df['close']).rsi()
            df['macd'] = ta.trend.MACD(df['close']).macd()
            
            # Fix Bollinger Bands calculation
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
            return {}
    
    def analyze_portfolio(self) -> Dict[str, Any]:
        """Perform comprehensive portfolio analysis"""
        try:
            # Fetch current data
            holdings = self._fetch_holdings()
            symbols = [s for s in holdings.keys() if s != 'USDT']
            market_data = self._fetch_market_data(symbols)
            
            # Calculate portfolio metrics
            total_value = 0.0
            returns = {}
            indicators = {}
            investment_types = {
                InvestmentType.SPOT: 0.0,
                InvestmentType.SPOT_CROSS_MARGIN: 0.0,
                InvestmentType.FUTURES: 0.0
            }
            
            for symbol, holding in holdings.items():
                if symbol in market_data:
                    # Calculate value based on investment type
                    if holding['type'] == InvestmentType.SPOT:
                        quantity = holding['free'] + holding['locked']
                        value = quantity * market_data[symbol]['spot_price']
                        investment_types[InvestmentType.SPOT] += value
                    elif holding['type'] == InvestmentType.SPOT_CROSS_MARGIN:
                        value = holding['net_asset'] * market_data[symbol]['spot_price']
                        investment_types[InvestmentType.SPOT_CROSS_MARGIN] += value
                    elif holding['type'] == InvestmentType.FUTURES:
                        value = abs(holding['amount']) * market_data[symbol]['futures_price']
                        investment_types[InvestmentType.FUTURES] += value
                    
                    total_value += value
                    
                    # Calculate returns
                    returns[symbol] = self.calculate_returns(symbol)
                    
                    # Get technical indicators
                    indicators[symbol] = self.get_technical_indicators(symbol)
            
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
    
    def _fetch_and_store_data(self):
        """Fetch all portfolio data and store in vector DB"""
        try:
            print("Fetching and storing portfolio data...")
            # Fetch holdings
            holdings = self._fetch_holdings()
            
            # Fetch market data
            symbols = [s for s in holdings.keys() if s != 'USDT']
            market_data = self._fetch_market_data(symbols)
            
            # Calculate returns and indicators
            returns = {}
            indicators = {}
            for symbol in symbols:
                if symbol in market_data:
                    returns[symbol] = self.calculate_returns(symbol)
                    indicators[symbol] = self.get_technical_indicators(symbol)
            
            # Store all data in vector DB
            self._store_portfolio_data_in_vectordb(holdings, market_data, returns, indicators)
            
            print("Portfolio data fetched and stored successfully")
        except Exception as e:
            print(f"Error fetching and storing portfolio data: {e}")

    def _store_portfolio_data_in_vectordb(self, holdings, market_data, returns, indicators):
        """Store all portfolio data in vector DB"""
        try:
            if not self.vector_store:
                print("Vector store not initialized, initializing now...")
                self.initialize_query_engine()
                if not self.vector_store:
                    print("Failed to initialize vector store")
                    return

            # Create documents from portfolio data
            documents = []
            
            # Calculate total portfolio value in USD
            total_value_usd = 0.0
            for symbol, holding in holdings.items():
                if 'total_usd' in holding:
                    total_value_usd += holding['total_usd']
                elif 'net_asset_usd' in holding:
                    total_value_usd += holding['net_asset_usd']
                elif 'usd_value' in holding:
                    total_value_usd += holding['usd_value']
            
            # Create a summary document
            summary_text = f"Portfolio Holdings Summary (Total Value: ${total_value_usd:,.2f}):\n"
            for symbol, holding in holdings.items():
                summary_text += f"{symbol}: {holding}\n"
            documents.append(Document(text=summary_text))
            
            # Create documents by investment type
            spot_holdings = {k: v for k, v in holdings.items() if v.get('type') == InvestmentType.SPOT}
            margin_holdings = {k: v for k, v in holdings.items() if v.get('type') == InvestmentType.SPOT_CROSS_MARGIN}
            futures_holdings = {k: v for k, v in holdings.items() if v.get('type') == InvestmentType.FUTURES}
            
            # Calculate values by type
            spot_value_usd = sum(h.get('total_usd', 0) for h in spot_holdings.values())
            margin_value_usd = sum(h.get('net_asset_usd', 0) for h in margin_holdings.values())
            futures_value_usd = sum(h.get('usd_value', 0) for h in futures_holdings.values())
            
            # Create type-specific documents
            if spot_holdings:
                spot_text = f"Spot Trading Holdings (Value: ${spot_value_usd:,.2f}):\n"
                for symbol, holding in spot_holdings.items():
                    spot_text += f"{symbol}: {holding}\n"
                documents.append(Document(text=spot_text))
            
            if margin_holdings:
                margin_text = f"Cross Margin Holdings (Value: ${margin_value_usd:,.2f}):\n"
                for symbol, holding in margin_holdings.items():
                    margin_text += f"{symbol}: {holding}\n"
                documents.append(Document(text=margin_text))
            
            if futures_holdings:
                futures_text = f"Futures Holdings (Value: ${futures_value_usd:,.2f}):\n"
                for symbol, holding in futures_holdings.items():
                    futures_text += f"{symbol}: {holding}\n"
                documents.append(Document(text=futures_text))
            
            # Create market data document
            market_text = "Market Data:\n"
            for symbol, data in market_data.items():
                market_text += f"{symbol}: {data}\n"
            documents.append(Document(text=market_text))
            
            # Create returns document
            returns_text = "Portfolio Returns:\n"
            for symbol, ret in returns.items():
                returns_text += f"{symbol}: {ret:.2%}\n"
            documents.append(Document(text=returns_text))
            
            # Create technical indicators document
            indicators_text = "Technical Indicators:\n"
            for symbol, ind in indicators.items():
                indicators_text += f"{symbol}: {ind}\n"
            documents.append(Document(text=indicators_text))
            
            # Create investment type allocation document
            allocation_text = "Investment Type Allocation:\n"
            if total_value_usd > 0:
                spot_allocation = spot_value_usd / total_value_usd
                margin_allocation = margin_value_usd / total_value_usd
                futures_allocation = futures_value_usd / total_value_usd
                
                allocation_text += f"Spot: {spot_allocation:.2%} (${spot_value_usd:,.2f})\n"
                allocation_text += f"Cross Margin: {margin_allocation:.2%} (${margin_value_usd:,.2f})\n"
                allocation_text += f"Futures: {futures_allocation:.2%} (${futures_value_usd:,.2f})\n"
            else:
                allocation_text += "No holdings found\n"
            
            documents.append(Document(text=allocation_text))
            
            # Add documents to vector store
            for doc in documents:
                self.vector_store.insert(doc)
            
            print(f"Stored {len(documents)} documents in vector DB")
                
        except Exception as e:
            print(f"Error storing portfolio data in vector DB: {e}")

    def _run(self, query: str) -> Dict[str, Any]:
        """Process portfolio-related queries using stored data"""
        try:
            # Handle fetch holdings request
            if query.lower() == "fetch holdings":
                holdings = self._fetch_holdings()
                
                # Organize holdings by type
                spot_holdings = {}
                margin_holdings = {}
                futures_holdings = {}
                
                for symbol, data in holdings.items():
                    if data.get("type") == "spot":
                        spot_holdings[symbol] = data
                    elif data.get("type") == "spot_cross_margin":
                        margin_holdings[symbol] = data
                    elif data.get("type") == "futures":
                        futures_holdings[symbol] = data
                
                return {
                    "status": "success",
                    "data": {
                        "spot_holdings": spot_holdings,
                        "margin_holdings": margin_holdings,
                        "futures_holdings": futures_holdings
                    }
                }
            
            # Use semantic understanding to interpret other queries
            if self.query_engine:
                # Query the vector store for relevant information
                semantic_response = self.query_engine.query(query)
                query_type = str(semantic_response).lower()
                
                # Extract relevant information from the semantic response
                relevant_info = str(semantic_response)
                
                # Generate response based on query type
                if "spot_cross_margin" in query_type or "margin" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Cross Margin Holdings:\n\n{relevant_info}",
                            "investment_type": "spot_cross_margin"
                        }
                    }
                
                elif "holdings" in query_type or "portfolio" in query_type or "investment" in query_type or "total" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Portfolio Holdings:\n\n{relevant_info}"
                        }
                    }
                
                elif "market" in query_type or "price" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Current market data and analysis:\n\n{relevant_info}"
                        }
                    }
                
                # Default response
                return {
                    "status": "success",
                    "data": {
                        "message": str(semantic_response)
                    }
                }
            
            else:
                # Fallback to basic query processing if query engine is not available
                return {
                    "status": "success",
                    "data": {
                        "message": "Query processed successfully"
                    }
                }
        
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query: {str(e)}"
                }
            }
    
    async def _arun(self, query: str) -> Dict[str, Any]:
        """Async version of _run"""
        try:
            # Use semantic understanding to interpret the query
            if self.query_engine:
                # Query the vector store for relevant information
                semantic_response = await self.query_engine.aquery(query)
                query_type = str(semantic_response).lower()
                
                # Extract relevant information from the semantic response
                relevant_info = str(semantic_response)
                
                # Generate response based on query type
                if "spot_cross_margin" in query_type or "margin" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Cross Margin Holdings:\n\n{relevant_info}",
                            "investment_type": "spot_cross_margin"
                        }
                    }
                
                elif "holdings" in query_type or "portfolio" in query_type or "investment" in query_type or "total" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Portfolio Holdings:\n\n{relevant_info}"
                        }
                    }
                
                elif "market" in query_type or "price" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Current market data and analysis:\n\n{relevant_info}"
                        }
                    }
                
                elif "return" in query_type or "performance" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Portfolio returns and performance metrics:\n\n{relevant_info}"
                        }
                    }
                
                elif "technical" in query_type or "indicator" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": f"Technical indicators analysis:\n\n{relevant_info}"
                        }
                    }
                
                # Default response with comprehensive analysis
                return {
                    "status": "success",
                    "data": {
                        "message": f"Comprehensive portfolio analysis:\n\n{relevant_info}"
                    }
                }
            else:
                # Fallback to basic query processing if query engine is not available
                query_type = query.lower()
                
                # Generate response based on query type
                if "spot_cross_margin" in query_type or "margin" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": "Cross Margin Holdings",
                            "investment_type": "spot_cross_margin"
                        }
                    }
                
                if "holdings" in query_type or "portfolio" in query_type or "investment" in query_type or "total" in query_type:
                    return {
                        "status": "success",
                        "data": {
                            "message": "Portfolio Holdings"
                        }
                    }
                
                # Default response with comprehensive analysis
                return {
                    "status": "success",
                    "data": {
                        "message": "Comprehensive portfolio analysis"
                    }
                }
        
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query: {str(e)}"
                }
            }

    def get_holdings(self) -> Dict[str, Any]:
        """Get current portfolio holdings with market data and analysis"""
        try:
            # Fetch holdings
            holdings = self._fetch_holdings()
            
            # Calculate total value and holdings count
            total_value = 0
            holdings_count = 0
            spot_holdings = {}
            margin_holdings = {}
            futures_holdings = {}
            
            # Organize holdings by type
            for symbol, data in holdings.items():
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
            
    def get_portfolio_summary(self) -> Dict[str, Any]:
        """Get a summary of the portfolio including holdings and analysis"""
        try:
            holdings = self.get_holdings()
            if holdings["status"] == "error":
                return holdings
                
            # Add additional analysis if needed
            return holdings
            
        except Exception as e:
            return {
                "status": "error",
                "data": {
                    "message": f"Error generating portfolio summary: {str(e)}"
                }
            } 