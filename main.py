from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import uvicorn
from core.orchestrator import Orchestrator
from agents.portfolio_agent import PortfolioAgent
from agents.query_agent import QueryAgent
from database.store import FinancialStore
import os
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
import json

# Global variables
orchestrator = None
portfolio_agent = None
query_agent = None
financial_store = None

load_dotenv()

# Create necessary directories
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
os.makedirs("data", exist_ok=True)

app = FastAPI(title="Financial Advisor AI")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

def initialize_components():
    """Initialize or reinitialize all components"""
    global orchestrator, portfolio_agent, query_agent, financial_store
    
    # Initialize components
    financial_store = FinancialStore()
    portfolio_agent = PortfolioAgent()
    query_agent = QueryAgent()
    
    # Initialize orchestrator and add tools
    orchestrator = Orchestrator()
    orchestrator.add_tool(portfolio_agent)
    orchestrator.add_tool(query_agent)

# Initialize components on startup
initialize_components()

@app.on_event("startup")
async def startup_event():
    initialize_components()

class QueryRequest(BaseModel):
    query: str
    context: Dict[str, Any] = {}

class QueryResponse(BaseModel):
    response: Dict[str, Any]
    context: Dict[str, Any]

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        response = await orchestrator.process_query(request.query)
        return QueryResponse(
            response=response,
            context=request.context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolio/summary")
async def get_portfolio_summary():
    try:
        summary = portfolio_agent.get_portfolio_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/upload")
async def upload_document(document: str, metadata: Dict[str, Any]):
    try:
        result = financial_store.add_document(document, metadata)
        return {"status": "success", "message": "Document uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/search")
async def search_documents(query: str, n_results: int = 5):
    try:
        results = financial_store.search_documents(query, n_results)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/portfolio", response_class=HTMLResponse)
async def portfolio_page(request: Request):
    return templates.TemplateResponse("portfolio.html", {"request": request})

@app.get("/binance_portfolio", response_class=HTMLResponse)
async def binance_portfolio_page(request: Request):
    return templates.TemplateResponse("binance_portfolio.html", {"request": request})

@app.get("/kite_portfolio", response_class=HTMLResponse)
async def kite_portfolio_page(request: Request):
    return templates.TemplateResponse("kite_portfolio.html", {"request": request})

@app.get("/query", response_class=HTMLResponse)
async def query(request: Request):
    return templates.TemplateResponse("query.html", {"request": request})

@app.post("/api/portfolio/holdings")
async def get_holdings():
    try:
        holdings = portfolio_agent.get_holdings()
        return holdings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/query")
async def portfolio_query(request: dict):
    try:
        if "text" not in request:
            return {
                "status": "error",
                "data": {
                    "message": "Query text is required"
                }
            }
            
        response = portfolio_agent._run(request["text"])
        return response
    except Exception as e:
        return {
            "status": "error",
            "data": {
                "message": str(e)
            }
        }

@app.post("/api/query")
async def handle_query(query: Dict[str, str]) -> Dict[str, Any]:
    try:
        if "text" not in query:
            return {
                "status": "error",
                "data": {
                    "message": "Query text is required"
                }
            }
            
        response = query_agent._run(query["text"])
        return response
    except Exception as e:
        return {
            "status": "error",
            "data": {
                "message": str(e)
            }
        }

@app.post("/api/query/clear")
async def clear_conversation():
    try:
        query_agent.clear_conversation()
        return {"status": "success", "message": "Conversation cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 