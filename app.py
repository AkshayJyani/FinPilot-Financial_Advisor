from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from agents.query_agent import QueryAgent
from agents.portfolio_agent import PortfolioAgent
from agents.watchlist_agent import WatchListAgent
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
watchlist_agent = WatchListAgent()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return FileResponse('templates/index.html')

@app.post("/api/query")
async def process_query(query: dict):
    try:
        response = query_agent._run(query["text"])
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/query")
async def process_portfolio_query(query: dict):
    try:
        response = portfolio_agent._run(query["text"])
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/holdings")
async def get_portfolio_holdings():
    try:
        response = portfolio_agent._run("fetch holdings")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/watchlist/query")
async def process_watchlist_query(query: dict):
    try:
        response = watchlist_agent._run(query["text"])
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/watchlist/import")
async def import_watchlist(file: UploadFile = File(...)):
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        # Save the uploaded file
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process the file
        response = watchlist_agent.import_from_excel(str(file_path))
        
        if response:
            return {
                "status": "success",
                "data": {
                    "message": "Successfully imported symbols from Excel",
                    "current_watchlist": watchlist_agent.watchlist_data.symbols
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to import symbols from Excel")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up the uploaded file
        if 'file_path' in locals():
            try:
                os.remove(file_path)
            except:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 