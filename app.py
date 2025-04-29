from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from agents.query_agent import QueryAgent
from agents.portfolio_agent import PortfolioAgent
from agents.kite_portfolio_agent import KitePortfolioAgent
import os
from pathlib import Path

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents
query_agent = QueryAgent()
portfolio_agent = PortfolioAgent()
kite_portfolio_agent = KitePortfolioAgent()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/query")
async def process_query(query: dict):
    global query_agent
    try:
        # Check if query_agent is initialized
        if not query_agent:
            # Reinitialize the query agent
            query_agent = QueryAgent()
            
        # Check if the query has the expected format
        if "text" not in query:
            return {
                "status": "error",
                "data": {
                    "message": "Invalid query format. Expected 'text' field."
                }
            }
            
        response = query_agent._run(query["text"])
        return response
    except Exception as e:
        print(f"Error in process_query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/query")
async def process_portfolio_query(query: dict):
    try:
        response = portfolio_agent._run(query["text"])
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/holdings")
async def get_portfolio_holdings(request: dict = None):
    try:
        response = portfolio_agent._run("fetch holdings")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/kite-portfolio", response_class=HTMLResponse)
async def kite_portfolio_dash(request: Request):
    """Render the Kite portfolio page"""
    return templates.TemplateResponse("kite_portfolio.html", {"request": request})

@app.get("/kite_portfolio", response_class=HTMLResponse)
async def kite_portfolio_underscore(request: Request):
    """Render the Kite portfolio page"""
    return templates.TemplateResponse("kite_portfolio.html", {"request": request})

@app.get("/api/kite/portfolio/holdings")
async def get_kite_holdings():
    """Get Kite portfolio holdings"""
    try:
        holdings = kite_portfolio_agent.get_holdings()
        return holdings
    except Exception as e:
        return {
            'status': 'error',
            'data': {
                'message': str(e)
            }
        }

@app.post("/api/kite/portfolio/query")
async def process_kite_query(query: dict):
    """Process portfolio queries"""
    try:
        if "text" not in query:
            return {
                'status': 'error',
                'data': {
                    'message': 'Query text is required'
                }
            }
            
        response = kite_portfolio_agent.process_query(query["text"])
        return response
    except Exception as e:
        return {
            'status': 'error',
            'data': {
                'message': str(e)
            }
        }

@app.get("/portfolio", response_class=HTMLResponse)
async def portfolio(request: Request):
    return templates.TemplateResponse("portfolio.html", {"request": request})

@app.get("/query", response_class=HTMLResponse)
async def query(request: Request):
    return templates.TemplateResponse("query.html", {"request": request})

@app.get("/binance_portfolio", response_class=HTMLResponse)
async def binance_portfolio_underscore(request: Request):
    return templates.TemplateResponse("binance_portfolio.html", {"request": request})

@app.get("/binance-portfolio", response_class=HTMLResponse)
async def binance_portfolio_dash(request: Request):
    return templates.TemplateResponse("binance_portfolio.html", {"request": request})

@app.get("/finance-query", response_class=HTMLResponse)
async def finance_query(request: Request):
    return templates.TemplateResponse("finance_query.html", {"request": request})

@app.get("/finance_query", response_class=HTMLResponse)
async def finance_query_underscore(request: Request):
    return templates.TemplateResponse("finance_query.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 