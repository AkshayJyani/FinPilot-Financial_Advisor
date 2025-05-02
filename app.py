from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from agents.query_agent import QueryAgent
from agents.binance_portfolio_agent import PortfolioAgent
from agents.kite_portfolio_agent import KitePortfolioAgent
import os
from pathlib import Path
from typing import Dict, Any, Union, Optional
from pydantic import BaseModel

# Define request and response models
class QueryRequest(BaseModel):
    text: str
    
    class Config:
        schema_extra = {
            "example": {
                "text": "What is the current trend for AAPL stock?"
            }
        }

class Response(BaseModel):
    status: str
    data: Dict[str, Any]
    
    class Config:
        schema_extra = {
            "example": {
                "status": "success",
                "data": {
                    "message": "Response message or data"
                }
            }
        }

# Initialize FastAPI app with metadata
app = FastAPI(
    title="FinPilot Financial Advisor",
    description="Your intelligent financial companion for portfolio analysis, market insights, and investment guidance",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Define your frontend URL - change this based on your React app's URL
FRONTEND_URL = "http://localhost:3000"  # Typical React development server port

# Add CORS middleware with specific origin for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "*"],  # Allow your React app and others during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents
query_agent = QueryAgent()
binance_portfolio_agent = PortfolioAgent()
kite_portfolio_agent = KitePortfolioAgent()

# Setup templates and static files
templates = Jinja2Templates(directory="templates")

# Mount static files if the directory exists
static_dir = Path("static")
if static_dir.exists() and static_dir.is_dir():
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Try to mount the React build folder if it exists
react_build_dir = Path("FinPilot-Frontend/build")
if react_build_dir.exists() and react_build_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(react_build_dir), html=True), name="react_app")

# Helper functions
def create_response(status: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a standardized response format"""
    return {"status": status, "data": data}

#############################
# ---- WEB UI ROUTES ---- #
#############################

# These routes are kept for backward compatibility with the template-based UI
@app.get("/old", response_class=HTMLResponse, tags=["UI"])
async def read_root(request: Request):
    """Home page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/old/portfolio", response_class=HTMLResponse, tags=["UI"])
async def portfolio_page(request: Request):
    """Portfolio analysis page"""
    return templates.TemplateResponse("portfolio.html", {"request": request})

@app.get("/old/query", response_class=HTMLResponse, tags=["UI"])
async def query_page(request: Request):
    """Query page"""
    return templates.TemplateResponse("query.html", {"request": request})

@app.get("/old/kite-portfolio", response_class=HTMLResponse, tags=["UI"])
async def kite_portfolio_dash(request: Request):
    """Kite portfolio page with dash format"""
    return templates.TemplateResponse("kite_portfolio.html", {"request": request})


@app.get("/old/binance-portfolio", response_class=HTMLResponse, tags=["UI"])
async def binance_portfolio_dash(request: Request):
    """Binance portfolio page with dash format"""
    return templates.TemplateResponse("binance_portfolio.html", {"request": request})


@app.get("/old/finance-query", response_class=HTMLResponse, tags=["UI"])
async def finance_query_dash(request: Request):
    """Finance query page with dash format"""
    return templates.TemplateResponse("finance_query.html", {"request": request})


##############################
# ---- API ROUTES ---- #
##############################

# ---- General Finance API Routes ----
@app.post("/api/query", response_model=Response, tags=["Finance Queries"])
async def process_query(query: QueryRequest):
    """
    Process a general financial query
    
    - **text**: The query text to process
    
    Returns a response with insights and data related to the query
    """
    global query_agent
    try:
        # Check if query_agent is initialized
        if not query_agent:
            # Reinitialize the query agent
            query_agent = QueryAgent()
        
        response = query_agent._run(query.text)
        return response
    except Exception as e:
        print(f"Error in process_query: {str(e)}")
        return create_response("error", {"message": str(e)})

# ---- Binance Portfolio API Routes ----
@app.post("/api/binance/portfolio/query", response_model=Response, tags=["Binance Portfolio"])
async def process_binance_portfolio_query(query: QueryRequest):
    """
    Process a Binance portfolio-specific query
    
    - **text**: The query text about your Binance portfolio data
    
    Returns insights and analysis about your Binance portfolio based on the query
    """
    try:
        response = binance_portfolio_agent._run(query.text)
        return response
    except Exception as e:
        return create_response("error", {"message": str(e)})

@app.get("/api/binance/portfolio/holdings", response_model=Response, tags=["Binance Portfolio"])
async def get_binance_holdings():
    """
    Get all Binance portfolio holdings
    
    Returns a list of all holdings in your Binance portfolio with details
    """
    try:
        response = binance_portfolio_agent.get_holdings()
        return response
    except Exception as e:
        return create_response("error", {"message": str(e)})

# Add these new endpoints for the Binance portfolio
@app.get("/api/binance/portfolio/summary", response_model=Response, tags=["Binance Portfolio"])
async def get_binance_portfolio_summary():
    """
    Get a comprehensive summary of the Binance portfolio
    
    Returns a detailed summary of your Binance portfolio including holdings, analysis, and metrics
    """
    try:
        response = binance_portfolio_agent.get_portfolio_summary()
        return response
    except Exception as e:
        return create_response("error", {"message": str(e)})

@app.get("/api/binance/portfolio/analysis", response_model=Response, tags=["Binance Portfolio"])
async def analyze_binance_portfolio():
    """
    Perform comprehensive analysis on the Binance portfolio
    
    Returns in-depth analysis of your Binance portfolio including risk metrics and recommendations
    """
    try:
        response = binance_portfolio_agent.analyze_portfolio()
        return response
    except Exception as e:
        return create_response("error", {"message": str(e)})

@app.post("/api/binance/portfolio/update", response_model=Response, tags=["Binance Portfolio"])
async def update_binance_portfolio_data():
    """
    Update the Binance portfolio data
    
    Fetches the latest data from Binance and updates the portfolio information
    """
    try:
        response = binance_portfolio_agent.update_portfolio_data()
        return response
    except Exception as e:
        return create_response("error", {"message": str(e)})

# ---- Kite Portfolio API Routes ----
@app.get("/api/kite/portfolio/holdings", response_model=Response, tags=["Kite Portfolio"])
async def get_kite_holdings():
    """
    Get Kite portfolio holdings
    
    Returns a list of all holdings in your Kite portfolio with details
    """
    try:
        holdings = kite_portfolio_agent.get_holdings()
        return holdings
    except Exception as e:
        return create_response("error", {"message": str(e)})

@app.post("/api/kite/portfolio/query", response_model=Response, tags=["Kite Portfolio"])
async def process_kite_query(query: QueryRequest):
    """
    Process Kite portfolio queries
    
    - **text**: The query text related to your Kite portfolio
    
    Returns analysis and insights about your Kite portfolio based on the query
    """
    try:
        response = kite_portfolio_agent.process_query(query.text)
        return response
    except Exception as e:
        return create_response("error", {"message": str(e)})

# ---- System API Routes ----
@app.get("/api/health", tags=["System"])
async def health_check():
    """
    Health check endpoint
    
    Returns the status of the application and its components
    """
    try:
        # Check if all agents are initialized
        agents_status = {
            "query_agent": query_agent is not None,
            "portfolio_agent": binance_portfolio_agent is not None,
            "kite_portfolio_agent": kite_portfolio_agent is not None
        }
        
        return create_response("success", {
            "status": "healthy",
            "agents": agents_status,
        })
    except Exception as e:
        return create_response("error", {"message": str(e)})

@app.get("/api/version", tags=["System"])
async def version_info():
    """
    Get application version and environment info
    
    Returns version information about the application
    """
    return create_response("success", {
        "app_name": "FinPilot Financial Advisor",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    })

# Route to handle React routing - this allows React Router to handle routes
@app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
async def serve_react_app(full_path: str):
    """
    Catch-all route to support React Router
    
    Returns the React index.html for all non-api routes
    """
    # Check if the request is for an API route
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    # Check if React build folder exists
    react_index = Path("FinPilot-Frontend/build/index.html")
    if react_index.exists():
        return FileResponse(str(react_index))
    
    # Fallback to templates
    return FileResponse("templates/index.html")

if __name__ == "__main__":
    import uvicorn
    print("\n==================================")
    print("FinPilot Financial Advisor starting up!")
    print("Access your application at:")
    print(" • http://localhost:8000")
    print(" • http://127.0.0.1:8000")
    print(" • API Documentation: http://localhost:8000/api/docs")
    print("==================================\n")
    uvicorn.run(app, host="0.0.0.0", port=8000) 