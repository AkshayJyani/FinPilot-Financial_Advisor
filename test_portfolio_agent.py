"""
Test the refactored portfolio agent
"""
import os
import sys

# Check for required modules
required_modules = ['binance', 'dotenv', 'langchain', 'llama_index', 'ta']
missing_modules = []

for module in required_modules:
    try:
        __import__(module)
    except ImportError:
        missing_modules.append(module)

if missing_modules:
    print("The following required modules are missing:")
    for module in missing_modules:
        print(f"  - {module}")
    
    print("\nPlease install them using pip:")
    print(f"pip install {' '.join(missing_modules)}")
    sys.exit(1)

from dotenv import load_dotenv
from agents.binance_portfolio_agent import PortfolioAgent

# Load environment variables
load_dotenv()

def main():
    """Test the portfolio agent functionality"""
    print("Initializing portfolio agent...")
    agent = PortfolioAgent()
    
    print("\nTesting get_holdings()...")
    holdings = agent.get_holdings()
    print(f"Status: {holdings['status']}")
    print(f"Total value: ${holdings['data'].get('total_value', 0):,.2f}")
    print(f"Holdings count: {holdings['data'].get('holdings_count', 0)}")
    print(f"24h change: {holdings['data'].get('change_24h', 0):.2f}%")
    
    print("\nTesting _run() with query...")
    query_response = agent._run("Show me my portfolio holdings")
    print(f"Status: {query_response['status']}")
    print(f"Response: {query_response['data']['message'][:200]}...")
    
    print("\nTesting analyze_portfolio()...")
    analysis = agent.analyze_portfolio()
    print(f"Total value: ${analysis.get('total_value', 0):,.2f}")
    print(f"Investment types: {analysis.get('investment_type_allocation', {})}")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    main() 