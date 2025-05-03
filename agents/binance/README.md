# Binance Portfolio Agent

An advanced AI-powered portfolio management and analysis system for Binance cryptocurrency holdings, featuring multi-agent architecture, real-time market data integration, and personalized investment insights.

## Overview

The Binance Portfolio Agent provides a comprehensive solution for managing, analyzing, and querying your Binance portfolio data. It combines powerful RAG (Retrieval-Augmented Generation) capabilities with a multi-agent architecture powered by CrewAI to deliver personalized insights, market intelligence, and investment recommendations.

## Architecture

The system follows this advanced architecture:

```
[ User Input ]
      |
      v
[ LLM (Prompt) ]
      |
      |--- Uses ---> [Tool 1: Vector DB Retriever (Your Crypto Data)]
      |
      |--- Uses ---> [Tool 2: Web Search Tool (SerpAPI / Tavily)]
      |
      v
[ LangChain RAG Pipeline with CrewAI ]
      |
      v
[ LLM Output: Answer with Insights ]
```

## Key Features

- **Multi-Agent Intelligence**: Utilizes specialized AI agents for different aspects of portfolio analysis
- **Real-Time Market Data**: Integrates with web search tools to fetch latest market information
- **Comprehensive Portfolio Analysis**: Analyzes holdings, performance metrics, and risk factors
- **Investment Recommendations**: Provides personalized investment advice based on portfolio data
- **Natural Language Interface**: Intuitive query system for asking complex financial questions

## Components

### Core Components

1. **PortfolioManager**: The main entry point that orchestrates all operations
   - Manages communication with the Binance API
   - Coordinates portfolio analysis and query processing
   - Handles data storage and retrieval

2. **QueryProcessor**: Orchestrates the multi-agent system for processing user queries
   - Routes all queries through the advanced pipeline
   - Integrates portfolio data with market information

3. **VectorDBManager**: Manages the vector database for semantic search
   - Stores portfolio data in an embeddings-based vector database
   - Enables semantic searching of portfolio information

4. **WebSearchTool**: Integrates with SerpAPI or Tavily for real-time market data
   - Fetches current news and market information
   - Enriches portfolio analysis with external data

### Multi-Agent System (CrewAI)

1. **PortfolioCrew**: Manages the interaction between specialized agents
   - Orchestrates complex workflows involving multiple agents
   - Ensures information flows properly between agents

2. **Specialized Agents**:
   - **Portfolio Researcher**: Analyzes user's portfolio data and metrics
   - **Market Researcher**: Researches market conditions and trends
   - **Portfolio Advisor**: Synthesizes information and provides advice

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Valid API keys for:
  - OpenAI API
  - Either SerpAPI or Tavily API
  - Binance API (optional, sample data available)

### Quick Installation

1. **Install required packages**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API keys in `.env` file**

   ```
   OPENAI_API_KEY="your_openai_api_key_here"
   BINANCE_API_KEY="your_binance_api_key_here"
   BINANCE_API_SECRET="your_binance_api_secret_here"
   
   # Choose ONE of these web search APIs and uncomment:
   # SERPAPI_API_KEY="your_serpapi_key_here"
   # TAVILY_API_KEY="your_tavily_key_here"
   ```

For detailed installation instructions, see the [INSTALLATION.md](INSTALLATION.md) file.

## Usage

### Basic Usage

```python
from agents.binance.portfolio_manager import PortfolioManager

# Initialize the portfolio manager
portfolio_manager = PortfolioManager(
    api_key="your_binance_api_key",  # Optional
    api_secret="your_binance_api_secret"  # Optional
)

# Process a natural language query
response = portfolio_manager.process_query("What is my current portfolio worth?")
print(response)

# Get holdings data
holdings = portfolio_manager.get_holdings()

# Get portfolio summary
summary = portfolio_manager.get_portfolio_summary()

# Analyze portfolio
analysis = portfolio_manager.analyze_portfolio()

# Update portfolio data
portfolio_manager.update_portfolio_data()
```

### Sample Queries

The system excels at handling complex queries like:

1. "How is my portfolio performing compared to the current market trends, and what adjustments would you recommend?"

2. "Given the latest news about Bitcoin, should I rebalance my holdings to reduce risk?"

3. "Compare the performance of my spot and futures investments, and suggest which area I should focus on expanding."

4. "What's the current market sentiment for Ethereum and how does it affect my holdings?"

5. "Based on my current allocation, what's the best strategy for the next three months?"

## Data Models

The system uses several data models:

- **PortfolioData**: Stores overall portfolio information
- **InvestmentType**: Enum for different investment types (SPOT, SPOT_CROSS_MARGIN, FUTURES)
- **HoldingData**: Information about individual holdings

## Dependencies

Required core packages:
- crewai: For multi-agent orchestration
- langchain: For tools and agents
- llama-index: For semantic search and RAG
- serpapi or tavily-python: For web search capabilities
- requests: For API calls
- python-binance: For Binance API interactions
- python-dotenv: For environment variable management
- openai: For LLM interactions

## Structure

The package is organized into the following modules:

```
agents/binance/
├── __init__.py
├── client.py               # Handles Binance API communication
├── data_models.py          # Defines data models
├── portfolio_analysis.py   # Portfolio analysis functions
├── portfolio_manager.py    # Main manager class
├── query_processor.py      # Query processing with multi-agent system
├── vector_db.py            # Vector database for semantic search
├── web_search_tool.py      # Web search integration
├── crew/                   # CrewAI components
│   ├── __init__.py
│   ├── agents.py           # Agent definitions
│   ├── portfolio_crew.py   # Crew orchestration
│   ├── tasks.py            # Task definitions
│   └── tools.py            # LangChain tools
└── README.md               # This file
```

## Extending the System

The system is designed to be extensible. Here are some ways to extend it:

1. Add new agent roles in `crew/agents.py`
2. Create new tasks in `crew/tasks.py`
3. Enhance the web search capability in `web_search_tool.py`
4. Add new analysis methods in `portfolio_analysis.py`
5. Customize the query processor in `query_processor.py`

## Error Handling

The system provides detailed error messages and fallbacks:

- If CrewAI is not available, you'll receive clear installation instructions
- If web search API keys are missing, appropriate error messages are shown
- If Binance API credentials are invalid, sample data will be used instead

## API Documentation

### PortfolioManager

- `__init__(api_key, api_secret, portfolio_data)`: Initialize with optional API credentials
- `fetch_and_store_data()`: Fetch portfolio data and store in vector DB
- `fetch_holdings()`: Fetch all holdings from different account types
- `get_portfolio_summary()`: Get a summary of the portfolio
- `get_holdings()`: Get current portfolio holdings with market data
- `process_query(query)`: Process natural language queries about the portfolio
- `analyze_portfolio()`: Perform comprehensive portfolio analysis
- `update_portfolio_data()`: Update portfolio data in vector store

### QueryProcessor

- `__init__(vector_db_manager, portfolio_manager)`: Initialize with required managers
- `process_query(query)`: Process portfolio queries using multi-agent system
- `process_query_async(query)`: Async version of process_query

### VectorDBManager

- `__init__(openai_api_key)`: Initialize with OpenAI API key
- `store_portfolio_data(holdings, market_data, returns, indicators)`: Store data in vector DB
- `query(query_text)`: Query the vector database
- `aquery(query_text)`: Async version of query

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [CrewAI](https://github.com/joaomdmoura/crewai)
- Uses [LangChain](https://github.com/langchain-ai/langchain) for tools
- Uses [LlamaIndex](https://github.com/jerryjliu/llama_index) for semantic search 