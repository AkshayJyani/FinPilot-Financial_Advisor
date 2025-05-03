# Installation Guide for Advanced Binance Portfolio Query Engine

This guide will help you set up the advanced Binance portfolio query engine with multi-agent capabilities.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Valid API keys for:
  - OpenAI API
  - Either SerpAPI or Tavily API
  - Binance API (if using real portfolio data)

## Installation Steps

1. **Clone the repository (if you haven't already)**

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install required packages**

   ```bash
   pip install -r requirements.txt
   ```

   This will install all required packages, including CrewAI, LangChain, and other dependencies.

3. **Configure API keys**

   Create or edit the `.env` file in the root directory and add your API keys:

   ```
   OPENAI_API_KEY="your_openai_api_key_here"
   BINANCE_API_KEY="your_binance_api_key_here"
   BINANCE_API_SECRET="your_binance_api_secret_here"
   
   # Choose ONE of these web search APIs and uncomment:
   # SERPAPI_API_KEY="your_serpapi_key_here"
   # TAVILY_API_KEY="your_tavily_key_here"
   ```

   **Important Notes:**
   - The OpenAI API key is required for the LLM functionality
   - Either SerpAPI or Tavily API key is required for web search functionality
   - Binance API credentials are required for accessing actual portfolio data (sample data will be used if not provided)

4. **Verify installation**

   Run a simple test to verify the installation:

   ```bash
   python -c "from agents.binance.portfolio_manager import PortfolioManager; \
   pm = PortfolioManager(); \
   response = pm.process_query('What is my portfolio worth?'); \
   print(response)"
   ```

   If successful, you should see a response with portfolio information.

## Troubleshooting

If you encounter any issues during installation or execution:

1. **CrewAI not found**

   If you see an error about CrewAI not being available, ensure it's properly installed:

   ```bash
   pip install crewai==0.28.8
   ```

2. **Web search not working**

   If you see errors about web search not working, ensure you've added either a SerpAPI or Tavily API key to your `.env` file and uncommented the appropriate line.

3. **OpenAI API errors**

   Ensure your OpenAI API key is valid and has sufficient credits.

## Obtaining API Keys

- **OpenAI API**: Sign up at [https://platform.openai.com](https://platform.openai.com)
- **SerpAPI**: Sign up at [https://serpapi.com](https://serpapi.com)
- **Tavily API**: Sign up at [https://tavily.com](https://tavily.com)
- **Binance API**: Create API keys in your Binance account settings

## Next Steps

Once you've completed the installation, check out the main README file for information on how to use the query engine and examples of the types of queries it can handle. 