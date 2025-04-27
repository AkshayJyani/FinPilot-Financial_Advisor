from typing import Dict, List, Any
import chromadb
from chromadb.config import Settings
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import enum
from datetime import datetime
from pydantic import Field

load_dotenv()

Base = declarative_base()

class TransactionType(enum.Enum):
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"

class PortfolioRecord(Base):
    __tablename__ = "portfolio_records"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(50), nullable=False)
    symbol = Column(String(20), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    transaction_type = Column(Enum(TransactionType))
    timestamp = Column(DateTime, default=datetime.utcnow)
    additional_data = Column(JSON)

class TechnicalIndicators(Base):
    __tablename__ = "technical_indicators"
    
    id = Column(Integer, primary_key=True)
    symbol = Column(String)
    timestamp = Column(DateTime)
    rsi = Column(Float)
    macd = Column(Float)
    bb_upper = Column(Float)
    bb_middle = Column(Float)
    bb_lower = Column(Float)
    additional_data = Column(JSON)

class FinancialStore:
    engine: Any = Field(default=None)
    session: Any = Field(default=None)
    chroma_client: Any = Field(default=None)
    collection: Any = Field(default=None)
    
    def __init__(self):
        try:
            # Initialize SQLite database
            database_url = os.getenv("DATABASE_URL", "sqlite:///financial_data.db")
            self.engine = create_engine(database_url)
            Base.metadata.create_all(self.engine)
            Session = sessionmaker(bind=self.engine)
            self.session = Session()
            
            # Initialize ChromaDB for vector storage
            self.chroma_client = chromadb.PersistentClient(path="chroma_db")
            self.collection = self.chroma_client.get_or_create_collection(
                name="financial_documents",
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            print(f"Error initializing FinancialStore: {e}")
            raise
    
    def store_portfolio_data(self, data: Dict[str, Any]):
        """Store portfolio data in SQLite database"""
        try:
            record = PortfolioRecord(
                user_id=data.get('user_id'),
                symbol=data.get('symbol'),
                quantity=data.get('quantity'),
                price=data.get('price'),
                transaction_type=data.get('transaction_type'),
                additional_data=data.get('additional_data', {})
            )
            self.session.add(record)
            self.session.commit()
        except Exception as e:
            print(f"Error storing portfolio data: {e}")
            self.session.rollback()
    
    def store_technical_indicators(self, data: Dict[str, Any]):
        """Store technical indicators in SQLite database"""
        try:
            record = TechnicalIndicators(
                symbol=data.get('symbol'),
                timestamp=data.get('timestamp'),
                rsi=data.get('rsi'),
                macd=data.get('macd'),
                bb_upper=data.get('bb_upper'),
                bb_middle=data.get('bb_middle'),
                bb_lower=data.get('bb_lower'),
                additional_data=data.get('additional_data', {})
            )
            self.session.add(record)
            self.session.commit()
        except Exception as e:
            print(f"Error storing technical indicators: {e}")
            self.session.rollback()
    
    def store_document(self, document: str, metadata: Dict[str, Any]):
        """Store document in vector store"""
        try:
            self.collection.add(
                documents=[document],
                metadatas=[metadata],
                ids=[f"doc_{len(self.collection.get()['ids'])}"]
            )
        except Exception as e:
            print(f"Error storing document: {e}")
    
    def query_portfolio(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query portfolio data from SQLite database"""
        try:
            results = self.session.query(PortfolioRecord).filter_by(**query).all()
            return [{
                'symbol': r.symbol,
                'quantity': r.quantity,
                'price': r.price,
                'transaction_type': r.transaction_type.value,
                'timestamp': r.timestamp,
                'additional_data': r.additional_data
            } for r in results]
        except Exception as e:
            print(f"Error querying portfolio: {e}")
            return []
    
    def query_technical_indicators(self, symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Query technical indicators for a symbol"""
        try:
            results = self.session.query(TechnicalIndicators)\
                .filter_by(symbol=symbol)\
                .order_by(TechnicalIndicators.timestamp.desc())\
                .limit(limit)\
                .all()
            
            return [{
                'timestamp': r.timestamp,
                'rsi': r.rsi,
                'macd': r.macd,
                'bb_upper': r.bb_upper,
                'bb_middle': r.bb_middle,
                'bb_lower': r.bb_lower,
                'additional_data': r.additional_data
            } for r in results]
        except Exception as e:
            print(f"Error querying technical indicators: {e}")
            return []
    
    def query_documents(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Query documents from vector store"""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            return [{
                'document': doc,
                'metadata': meta
            } for doc, meta in zip(results['documents'][0], results['metadatas'][0])]
        except Exception as e:
            print(f"Error querying documents: {e}")
            return []
    
    def get_sector_allocation(self) -> Dict[str, float]:
        """Get sector-wise allocation from portfolio data"""
        try:
            results = self.session.query(
                PortfolioRecord.sector,
                PortfolioRecord.quantity * PortfolioRecord.price
            ).all()
            
            total_value = sum(value for _, value in results)
            sector_allocation = {}
            
            for sector, value in results:
                if sector in sector_allocation:
                    sector_allocation[sector] += value
                else:
                    sector_allocation[sector] = value
            
            return {sector: value/total_value for sector, value in sector_allocation.items()}
        except Exception as e:
            print(f"Error getting sector allocation: {e}")
            return {}

    def add_portfolio_record(self, user_id: str, symbol: str, quantity: float, price: float, additional_data: dict = None):
        record = PortfolioRecord(
            user_id=user_id,
            symbol=symbol,
            quantity=quantity,
            price=price,
            additional_data=additional_data
        )
        self.session.add(record)
        self.session.commit()
        return record
    
    def get_portfolio_records(self, user_id: str):
        return self.session.query(PortfolioRecord).filter_by(user_id=user_id).all()
    
    def get_latest_portfolio_record(self, user_id: str, symbol: str):
        return self.session.query(PortfolioRecord)\
            .filter_by(user_id=user_id, symbol=symbol)\
            .order_by(PortfolioRecord.timestamp.desc())\
            .first()
    
    def close(self):
        self.session.close() 