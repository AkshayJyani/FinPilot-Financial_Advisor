# Financial Advisor AI Agent

A comprehensive financial advisor AI system that uses LLMs, multiple specialized agents, and parallel processes to provide real-time cryptocurrency intelligence and advice.

## Features

- **Core LLM Agent/Orchestrator**: Central brain that understands user queries and delegates tasks
- **Portfolio Agent**: Manages cryptocurrency portfolio tracking and Binance integration
- **Query Agent**: Handles data analysis, visualization, and natural language queries
- **Vector Store**: Stores and retrieves financial documents and knowledge
- **SQLite Database**: Stores structured portfolio data and technical indicators

## Setup

1. Clone the repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
```

4. Create necessary directories:
```bash
mkdir data
mkdir chroma_db
```

## Running the Application

Start the FastAPI server:
```bash
python main.py
```

The server will start at `http://localhost:8000`

## API Endpoints

### Query Processing
- `POST /query`: Process financial queries
- `GET /portfolio/summary`: Get portfolio summary
- `POST /documents/upload`: Upload financial documents
- `GET /documents/search`: Search financial documents

## Example Queries

1. Portfolio Analysis:
```json
{
    "query": "What's my average return in the last 6 months?",
    "context": {}
}
```

2. Technical Analysis:
```json
{
    "query": "Show me technical indicators for BTC",
    "context": {}
}
```

3. Market Data:
```json
{
    "query": "What's the current price of ETH?",
    "context": {}
}
```

## Features

### Portfolio Management
- Real-time balance tracking
- Transaction history
- Portfolio performance analysis
- Asset allocation visualization

### Technical Analysis
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Historical price data

### Data Analysis
- Natural language queries
- Document processing
- Visualization tools
- Market trend analysis

## Architecture

The system follows a hub-and-spoke model:
1. Core LLM Agent acts as the orchestrator
2. Specialized agents handle specific tasks
3. Shared memory maintains context
4. Vector store and SQLite database store knowledge and data

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT License 