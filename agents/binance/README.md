# Binance Portfolio Agent

This package provides a modular implementation of the Binance portfolio agent to manage, analyze, and query Binance portfolio data.

## Structure

The package is organized into the following modules:

- `data_models.py`: Defines the data models used throughout the package
- `client.py`: Handles all communication with the Binance API
- `vector_db.py`: Manages the vector database for semantic search of portfolio data
- `portfolio_analysis.py`: Performs portfolio analysis and metrics calculation
- `query_processor.py`: Processes natural language queries about portfolio data

## Usage

The main entry point is still the `PortfolioAgent` class in `agents/binance_portfolio_agent.py`, which maintains the same API for backward compatibility.

```python
from agents.binance_portfolio_agent import PortfolioAgent

# Initialize the agent
agent = PortfolioAgent()

# Get current holdings
holdings = agent.get_holdings()

# Process a query
response = agent._run("Show me my portfolio holdings")

# Analyze portfolio
analysis = agent.analyze_portfolio()
```

## Dependencies

- binance-python: For Binance API interactions
- llama-index: For semantic search and query processing
- pandas: For data manipulation
- numpy: For numerical operations
- ta: For technical analysis indicators

## Prerequisites

1. Set up environment variables in `.env`:
   - `BINANCE_API_KEY`: Your Binance API key
   - `BINANCE_API_SECRET`: Your Binance API secret
   - `OPENAI_API_KEY`: OpenAI API key for semantic search

## Customization

You can customize the agent by directly working with the individual components:

```python
from agents.binance import BinanceClient, VectorDBManager, PortfolioAnalyzer, QueryProcessor

# Create custom components
client = BinanceClient(api_key, api_secret)
vector_db = VectorDBManager()
analyzer = PortfolioAnalyzer(client)
query_processor = QueryProcessor(vector_db)
``` 