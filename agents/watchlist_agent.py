from typing import Dict, List, Any, Optional
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
import yfinance as yf
from newsapi import NewsApiClient
import json
from pathlib import Path
from llama_index.core import Document
from llama_index.core import VectorStoreIndex
from llama_index.core.settings import Settings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever

load_dotenv()

class WatchListData(BaseModel):
    symbols: List[str] = Field(default_factory=list)
    analysis: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    news: Dict[str, List[Dict[str, str]]] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.now)

class WatchListAgent(BaseTool):
    name: str = "watchlist_agent"
    description: str = "Monitors and analyzes stocks from a watchlist, providing performance metrics and news updates"
    watchlist_file: str = Field(default="data/watchlist.json")
    news_api_key: str = Field(default="")
    watchlist_data: WatchListData = Field(default_factory=WatchListData)
    
    def __init__(self):
        super().__init__()
        self.news_api_key = os.getenv("NEWS_API_KEY", "")
        self.news_client = NewsApiClient(api_key=self.news_api_key)
        self.load_watchlist()
        self.initialize_query_engine()
    
    def load_watchlist(self):
        """Load watchlist from file"""
        try:
            if os.path.exists(self.watchlist_file):
                with open(self.watchlist_file, 'r') as f:
                    data = json.load(f)
                    self.watchlist_data = WatchListData(**data)
            else:
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(self.watchlist_file), exist_ok=True)
                self.save_watchlist()
        except Exception as e:
            print(f"Error loading watchlist: {e}")
    
    def save_watchlist(self):
        """Save watchlist to file"""
        try:
            with open(self.watchlist_file, 'w') as f:
                json.dump(self.watchlist_data.dict(), f, default=str)
        except Exception as e:
            print(f"Error saving watchlist: {e}")
    
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
                Document(text="Transaction history includes buy/sell orders, timestamps, and execution prices.")
            ]
            
            # Initialize settings with embedding model
            Settings.embed_model = OpenAIEmbedding(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Create vector store index
            vector_store = VectorStoreIndex.from_documents(knowledge_base)
            
            # Configure retriever
            retriever = VectorIndexRetriever(
                index=vector_store,
                similarity_top_k=3,
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
            
        except Exception as e:
            print(f"Error initializing query engine: {e}")
            self.query_engine = None
    
    def add_symbols(self, symbols: List[str]):
        """Add symbols to watchlist"""
        for symbol in symbols:
            if symbol not in self.watchlist_data.symbols:
                self.watchlist_data.symbols.append(symbol)
        self.save_watchlist()
    
    def remove_symbols(self, symbols: List[str]):
        """Remove symbols from watchlist"""
        self.watchlist_data.symbols = [s for s in self.watchlist_data.symbols if s not in symbols]
        self.save_watchlist()
    
    def import_from_excel(self, file_path: str):
        """Import symbols from Excel file"""
        try:
            df = pd.read_excel(file_path)
            if 'symbol' in df.columns:
                symbols = df['symbol'].tolist()
                self.add_symbols(symbols)
                return True
            return False
        except Exception as e:
            print(f"Error importing from Excel: {e}")
            return False
    
    def get_historical_data(self, symbol: str, period: str = "1d") -> Optional[pd.DataFrame]:
        """Get historical price data for a symbol"""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
            return df
        except Exception as e:
            print(f"Error fetching historical data for {symbol}: {e}")
            return None
    
    def calculate_metrics(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate performance metrics from historical data"""
        try:
            if df.empty:
                return {}
            
            # Calculate returns
            returns = df['Close'].pct_change()
            
            # Calculate volatility
            volatility = returns.std() * np.sqrt(252)  # Annualized
            
            # Calculate technical indicators
            df['rsi'] = ta.momentum.RSIIndicator(df['Close']).rsi()
            df['macd'] = ta.trend.MACD(df['Close']).macd()
            df['bb_upper'], df['bb_middle'], df['bb_lower'] = ta.volatility.BollingerBands(df['Close']).bollinger_bands()
            
            return {
                "current_price": float(df['Close'].iloc[-1]),
                "daily_return": float(returns.iloc[-1]),
                "volatility": float(volatility),
                "rsi": float(df['rsi'].iloc[-1]),
                "macd": float(df['macd'].iloc[-1]),
                "bb_upper": float(df['bb_upper'].iloc[-1]),
                "bb_middle": float(df['bb_middle'].iloc[-1]),
                "bb_lower": float(df['bb_lower'].iloc[-1]),
                "volume": int(df['Volume'].iloc[-1])
            }
        except Exception as e:
            print(f"Error calculating metrics: {e}")
            return {}
    
    def get_news(self, symbol: str) -> List[Dict[str, str]]:
        """Get news articles for a symbol"""
        try:
            if not self.news_api_key:
                return []
            
            # Get news from the last 24 hours
            news = self.news_client.get_everything(
                q=symbol,
                language='en',
                sort_by='relevancy',
                from_param=(datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            )
            
            return [
                {
                    "title": article['title'],
                    "description": article['description'],
                    "url": article['url'],
                    "published_at": article['publishedAt']
                }
                for article in news['articles'][:5]  # Get top 5 articles
            ]
        except Exception as e:
            print(f"Error fetching news for {symbol}: {e}")
            return []
    
    def analyze_watchlist(self):
        """Analyze all symbols in watchlist"""
        try:
            analysis = {}
            news = {}
            
            for symbol in self.watchlist_data.symbols:
                # Get data for different time periods
                data_1d = self.get_historical_data(symbol, "1d")
                data_2d = self.get_historical_data(symbol, "2d")
                data_1w = self.get_historical_data(symbol, "1w")
                
                # Calculate metrics for each period
                metrics_1d = self.calculate_metrics(data_1d) if data_1d is not None else {}
                metrics_2d = self.calculate_metrics(data_2d) if data_2d is not None else {}
                metrics_1w = self.calculate_metrics(data_1w) if data_1w is not None else {}
                
                # Get news
                news[symbol] = self.get_news(symbol)
                
                # Combine all metrics
                analysis[symbol] = {
                    "1d": metrics_1d,
                    "2d": metrics_2d,
                    "1w": metrics_1w
                }
            
            self.watchlist_data.analysis = analysis
            self.watchlist_data.news = news
            self.watchlist_data.last_updated = datetime.now()
            self.save_watchlist()
            
            return True
        except Exception as e:
            print(f"Error analyzing watchlist: {e}")
            return False
    
    def _run(self, query: str) -> Dict[str, Any]:
        """Process watchlist-related queries"""
        try:
            # First, analyze the watchlist
            self.analyze_watchlist()
            
            # Process the query
            if "add" in query.lower():
                symbols = [s.strip().upper() for s in query.split("add")[1].split(",")]
                self.add_symbols(symbols)
                return {
                    "status": "success",
                    "data": {
                        "message": f"Added symbols to watchlist: {', '.join(symbols)}",
                        "current_watchlist": self.watchlist_data.symbols,
                        "analysis": self.watchlist_data.analysis,
                        "news": self.watchlist_data.news
                    }
                }
            
            elif "remove" in query.lower():
                symbols = [s.strip().upper() for s in query.split("remove")[1].split(",")]
                self.remove_symbols(symbols)
                return {
                    "status": "success",
                    "data": {
                        "message": f"Removed symbols from watchlist: {', '.join(symbols)}",
                        "current_watchlist": self.watchlist_data.symbols,
                        "analysis": self.watchlist_data.analysis,
                        "news": self.watchlist_data.news
                    }
                }
            
            elif "import" in query.lower():
                file_path = query.split("import")[1].strip()
                if self.import_from_excel(file_path):
                    return {
                        "status": "success",
                        "data": {
                            "message": "Successfully imported symbols from Excel",
                            "current_watchlist": self.watchlist_data.symbols,
                            "analysis": self.watchlist_data.analysis,
                            "news": self.watchlist_data.news
                        }
                    }
                else:
                    return {
                        "status": "error",
                        "data": {
                            "message": "Failed to import symbols from Excel"
                        }
                    }
            
            # Default response with analysis
            if not self.watchlist_data.symbols:
                return {
                    "status": "success",
                    "data": {
                        "message": "Watchlist is empty. Add symbols using 'add SYMBOL' command.",
                        "current_watchlist": []
                    }
                }
            
            return {
                "status": "success",
                "data": {
                    "message": "Watchlist analysis",
                    "last_updated": self.watchlist_data.last_updated,
                    "current_watchlist": self.watchlist_data.symbols,
                    "analysis": self.watchlist_data.analysis,
                    "news": self.watchlist_data.news
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
        return self._run(query) 