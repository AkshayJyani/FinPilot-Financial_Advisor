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
from agents.watchlist_agent import WatchListAgent

# Global variables
orchestrator = None
portfolio_agent = None
query_agent = None
financial_store = None
watchlist_agent = None

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
    global orchestrator, portfolio_agent, query_agent, financial_store, watchlist_agent
    
    # Clear existing components
    orchestrator = None
    portfolio_agent = None
    query_agent = None
    financial_store = None
    watchlist_agent = None
    
    # Initialize new components
    orchestrator = Orchestrator()
    portfolio_agent = PortfolioAgent()
    query_agent = QueryAgent()
    financial_store = FinancialStore()
    watchlist_agent = WatchListAgent()
    
    # Add agents to orchestrator
    orchestrator.add_tool(portfolio_agent)
    orchestrator.add_tool(query_agent)

# Initialize components on startup
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
    """Process a financial query and return the response"""
    try:
        # Ensure components are initialized
        if orchestrator is None:
            initialize_components()
            
        # Update orchestrator memory with context
        for key, value in request.context.items():
            orchestrator.update_memory(key, value)
        
        # Process the query
        response = await orchestrator.process_query(request.query)
        
        return QueryResponse(
            response=response,
            context=orchestrator.memory
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolio/summary")
async def get_portfolio_summary():
    """Get portfolio summary including holdings and sector allocation"""
    try:
        # Ensure components are initialized
        if portfolio_agent is None or financial_store is None:
            initialize_components()
            
        holdings = portfolio_agent._fetch_holdings()
        sector_allocation = financial_store.get_sector_allocation()
        
        return {
            "holdings": holdings,
            "sector_allocation": sector_allocation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/upload")
async def upload_document(document: str, metadata: Dict[str, Any]):
    """Upload a document to the vector store"""
    try:
        # Ensure components are initialized
        if financial_store is None:
            initialize_components()
            
        financial_store.store_document(document, metadata)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/search")
async def search_documents(query: str, n_results: int = 5):
    """Search documents in the vector store"""
    try:
        # Ensure components are initialized
        if financial_store is None:
            initialize_components()
            
        results = financial_store.search_documents(query, n_results)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render the home page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/portfolio", response_class=HTMLResponse)
async def portfolio(request: Request):
    return templates.TemplateResponse("portfolio.html", {"request": request})

@app.get("/query", response_class=HTMLResponse)
async def query(request: Request):
    return templates.TemplateResponse("query.html", {"request": request})

@app.get("/watchlist", response_class=HTMLResponse)
async def watchlist(request: Request):
    return templates.TemplateResponse("watchlist.html", {"request": request})

@app.post("/api/portfolio/holdings")
async def get_holdings():
    """Get current portfolio holdings"""
    try:
        if not portfolio_agent:
            initialize_components()
        
        # Fetch holdings directly from portfolio agent
        holdings = portfolio_agent._fetch_holdings()
        print("Fetched holdings:", holdings)  # Add logging
        
        # Organize holdings by type
        spot_holdings = {}
        margin_holdings = {}
        futures_holdings = {}
        
        for symbol, data in holdings.items():
            # Create a unique key for each holding type
            if data.get("type") == "spot":
                spot_holdings[symbol] = data
            elif data.get("type") == "spot_cross_margin":
                margin_holdings[symbol] = data
            elif data.get("type") == "futures":
                futures_holdings[symbol] = data
        
        response = {
            "status": "success",
            "data": {
                "spot_holdings": spot_holdings,
                "margin_holdings": margin_holdings,
                "futures_holdings": futures_holdings
            }
        }
        print("Response:", response)  # Add logging
        return response
    except Exception as e:
        print("Error:", str(e))  # Add logging
        return {
            "status": "error",
            "data": {
                "message": f"Error fetching holdings: {str(e)}"
            }
        }

@app.post("/api/portfolio/query")
async def portfolio_query(request: dict):
    """Process portfolio-related queries"""
    try:
        if not portfolio_agent:
            initialize_components()
        
        query = request.get("text", "")
        
        if not query:
            return {
                "status": "error",
                "data": {
                    "message": "No query provided"
                }
            }
        
        # Process the query using the portfolio agent
        response = portfolio_agent._run(query)
        return response
        
    except Exception as e:
        print("Error processing portfolio query:", str(e))
        return {
            "status": "error",
            "data": {
                "message": f"Error processing query: {str(e)}"
            }
        }

@app.post("/api/watchlist/analyze")
async def analyze_watchlist(request: QueryRequest):
    try:
        response = await watchlist_agent._arun(request.query)
        return {
            "status": "success",
            "data": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def handle_query(query: Dict[str, str]) -> Dict[str, Any]:
    """Handle general queries"""
    try:
        # Ensure components are initialized
        if query_agent is None:
            initialize_components()
        
        # Check if query parameter exists
        if "query" not in query and "text" not in query:
            return {
                "status": "error",
                "data": {
                    "message": "No query provided. Please provide a 'query' or 'text' parameter."
                }
            }
        
        # Get the query text from either parameter
        query_text = query.get("query", query.get("text", ""))
        
        # Process the query
        response = await query_agent._arun(query_text)
        
        # Return the response
        return {
            "status": "success",
            "data": response.get("data", {}).get("message", "No response generated.")
        }
    except Exception as e:
        print(f"Error in handle_query: {str(e)}")
        return {
            "status": "error",
            "data": {
                "message": f"Error processing query: {str(e)}"
            }
        }

@app.post("/api/query/clear")
async def clear_conversation():
    try:
        query_agent.clear_history()
        return {"status": "success", "message": "Conversation cleared"}
    except Exception as e:
        print(f"Error in clear_conversation: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 