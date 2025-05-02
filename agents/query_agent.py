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
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime, timedelta
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from pydantic import Field


load_dotenv()


class DataDirectoryHandler(FileSystemEventHandler):
    def __init__(self, query_agent):
        self.query_agent = query_agent
        self.last_modified = {}  # Track file modification times

    def on_created(self, event):
        if not event.is_directory:
            print(f"File created: {event.src_path}")
            self.query_agent.update_vector_store()

    def on_modified(self, event):
        if not event.is_directory:
            # Check if file was actually modified (not just metadata)
            current_mtime = os.path.getmtime(event.src_path)
            if event.src_path not in self.last_modified or current_mtime != self.last_modified[event.src_path]:
                print(f"File modified: {event.src_path}")
                self.last_modified[event.src_path] = current_mtime
                self.query_agent.update_vector_store()

    def on_deleted(self, event):
        if not event.is_directory:
            print(f"File deleted: {event.src_path}")
            self.query_agent.update_vector_store()

class QueryAgent(BaseTool):
    name: str = "query_agent"
    description: str = "Handles data analysis, visualization, and natural language queries on investment data"
    data_dir: str = Field(default="data")
    vector_store: Any = Field(default=None)
    query_engine: Any = Field(default=None)
    observer: Any = Field(default=None)
    
    def __init__(self):
        super().__init__()
        self.initialize_vector_store()
        self.start_file_monitoring()
    
    def start_file_monitoring(self):
        """Start monitoring the data directory for changes"""
        try:
            event_handler = DataDirectoryHandler(self)
            self.observer = Observer()
            self.observer.schedule(event_handler, self.data_dir, recursive=False)
            self.observer.start()
            print(f"Started monitoring {self.data_dir} for changes")
        except Exception as e:
            print(f"Error starting file monitoring: {e}")
    
    def stop_file_monitoring(self):
        """Stop monitoring the data directory"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            print("Stopped monitoring data directory")
    
    def update_vector_store(self):
        """Update the vector store with current documents"""
        try:
            print("Updating vector store...")
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
            
            print("Vector store updated successfully")
        except Exception as e:
            print(f"Error updating vector store: {e}")
            self.vector_store = None
            self.query_engine = None
    
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
            
            self.update_vector_store()
            
        except Exception as e:
            print(f"Error initializing vector store: {e}")
            self.vector_store = None
            self.query_engine = None
    
    def _run(self, query: str) -> Dict[str, Any]:
        """Process queries using RAG"""
        try:
            if not self.query_engine:
                self.initialize_vector_store()
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
            print(f"Error in QueryAgent._run: {str(e)}")
            return {
                "status": "error",
                "data": {
                    "message": f"Error processing query: {str(e)}"
                }
            }
    
    async def _arun(self, query: str) -> Dict[str, Any]:
        """Async version of _run"""
        return self._run(query) 