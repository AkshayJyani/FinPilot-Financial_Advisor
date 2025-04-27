from typing import Dict, List, Any
import pandas as pd
import numpy as np
from langchain.tools import BaseTool
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.settings import Settings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from pydantic import Field

load_dotenv()

class QueryAgent(BaseTool):
    name: str = "query_agent"
    description: str = "Handles data analysis, visualization, and natural language queries on investment data"
    data_dir: str = Field(default="data")
    vector_store: Any = Field(default=None)
    query_engine: Any = Field(default=None)
    
    def __init__(self):
        super().__init__()
        self.initialize_vector_store()
    
    def initialize_vector_store(self):
        """Initialize the vector store with documents"""
        try:
            # Create data directory if it doesn't exist
            if not os.path.exists(self.data_dir):
                os.makedirs(self.data_dir)
                print(f"Created data directory at {self.data_dir}")
            
            # Check if there are any files in the data directory
            if not os.listdir(self.data_dir):
                print(f"Warning: No files found in {self.data_dir}. Vector store will be empty.")
                return
            
            # Load documents
            documents = SimpleDirectoryReader(self.data_dir).load_data()
            
            # Initialize settings with embedding model
            Settings.embed_model = OpenAIEmbedding(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Create vector store index
            self.vector_store = VectorStoreIndex.from_documents(documents)
            
            # Configure retriever
            retriever = VectorIndexRetriever(
                index=self.vector_store,
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
            print(f"Error initializing vector store: {e}")
            self.vector_store = None
            self.query_engine = None
    
    def process_excel(self, file_path: str) -> pd.DataFrame:
        """Process Excel file and return DataFrame"""
        try:
            return pd.read_excel(file_path)
        except Exception as e:
            print(f"Error processing Excel file: {e}")
            return pd.DataFrame()
    
    def process_csv(self, file_path: str) -> pd.DataFrame:
        """Process CSV file and return DataFrame"""
        try:
            return pd.read_csv(file_path)
        except Exception as e:
            print(f"Error processing CSV file: {e}")
            return pd.DataFrame()
    
    def calculate_average_return(self, df: pd.DataFrame, period: str) -> float:
        """Calculate average return for a given period"""
        end_date = datetime.now()
        if period == "6M":
            start_date = end_date - timedelta(days=180)
        elif period == "1Y":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        mask = (df['date'] >= start_date) & (df['date'] <= end_date)
        return df.loc[mask, 'return'].mean()
    
    def get_top_performers(self, df: pd.DataFrame, n: int = 3) -> List[Dict[str, Any]]:
        """Get top n performing stocks"""
        return df.nlargest(n, 'return').to_dict('records')
    
    def identify_underperformers(self, df: pd.DataFrame, threshold: float = -0.05) -> List[Dict[str, Any]]:
        """Identify underperforming SIPs/stocks"""
        return df[df['return'] < threshold].to_dict('records')
    
    def create_visualization(self, data: pd.DataFrame, viz_type: str) -> str:
        """Create visualization based on data and type"""
        if viz_type == "pie":
            fig = px.pie(data, values='value', names='category')
        elif viz_type == "bar":
            fig = px.bar(data, x='category', y='value')
        elif viz_type == "heatmap":
            fig = px.imshow(data.corr())
        else:
            return "Unsupported visualization type"
        
        return fig.to_html()
    
    def _run(self, query: str) -> Dict[str, Any]:
        """Process queries using RAG"""
        try:
            if not self.query_engine:
                return {
                    "status": "error",
                    "data": {
                        "message": "Query engine not initialized. Please check if data directory contains documents."
                    }
                }
            
            # Get response from query engine
            response = self.query_engine.query(query)
            
            # Format the response
            return {
                "status": "success",
                "data": {
                    "message": str(response)
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