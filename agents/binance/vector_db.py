from typing import Dict, List, Any, Optional
import os
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.settings import Settings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever


class VectorDBManager:
    """Manages vector database operations for portfolio data"""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """Initialize the vector database manager"""
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.vector_store = None
        self.query_engine = None
        self.initialize_query_engine()
    
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
            Settings.embed_model = OpenAIEmbedding(api_key=self.openai_api_key)
            
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
    
    def store_portfolio_data(self, holdings: Dict[str, Dict[str, Any]], 
                           market_data: Dict[str, Any] = None,
                           returns: Dict[str, float] = None,
                           indicators: Dict[str, Dict[str, float]] = None):
        """Store portfolio data in vector DB"""
        try:
            if not self.vector_store:
                print("Vector store not initialized, initializing now...")
                self.initialize_query_engine()
                if not self.vector_store:
                    print("Failed to initialize vector store")
                    return False

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
            spot_holdings = {k: v for k, v in holdings.items() if v.get('type') == "spot"}
            margin_holdings = {k: v for k, v in holdings.items() if v.get('type') == "spot_cross_margin"}
            futures_holdings = {k: v for k, v in holdings.items() if v.get('type') == "futures"}
            
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
            if market_data:
                market_text = "Market Data:\n"
                for symbol, data in market_data.items():
                    market_text += f"{symbol}: {data}\n"
                documents.append(Document(text=market_text))
            
            # Create returns document
            if returns:
                returns_text = "Portfolio Returns:\n"
                for symbol, ret in returns.items():
                    returns_text += f"{symbol}: {ret:.2%}\n"
                documents.append(Document(text=returns_text))
            
            # Create technical indicators document
            if indicators:
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
            return True
                
        except Exception as e:
            print(f"Error storing portfolio data in vector DB: {e}")
            return False
    
    def query(self, query_text: str) -> str:
        """Query the vector database for portfolio information"""
        try:
            if not self.query_engine:
                return "Query engine not initialized"
                
            response = self.query_engine.query(query_text)
            return str(response)
            
        except Exception as e:
            print(f"Error querying vector DB: {e}")
            return f"Error: {str(e)}"
    
    async def aquery(self, query_text: str) -> str:
        """Async query the vector database for portfolio information"""
        try:
            if not self.query_engine:
                return "Query engine not initialized"
                
            response = await self.query_engine.aquery(query_text)
            return str(response)
            
        except Exception as e:
            print(f"Error querying vector DB: {e}")
            return f"Error: {str(e)}" 