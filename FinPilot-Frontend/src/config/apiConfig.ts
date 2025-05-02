// API Configuration for FinPilot Backend

// Base URL for API requests
const API_BASE_URL = 'http://localhost:8000';

// API endpoints
const API_ENDPOINTS = {
  // General Finance Queries
  financeQuery: `${API_BASE_URL}/api/query`,

  // Binance Portfolio
  binancePortfolio: {
    query: `${API_BASE_URL}/api/binance/portfolio/query`,
    holdings: `${API_BASE_URL}/api/binance/portfolio/holdings`,
    summary: `${API_BASE_URL}/api/binance/portfolio/summary`,
    analysis: `${API_BASE_URL}/api/binance/portfolio/analysis`,
    update: `${API_BASE_URL}/api/binance/portfolio/update`,
  },

  // Kite Portfolio
  kitePortfolio: {
    query: `${API_BASE_URL}/api/kite/portfolio/query`,
    holdings: `${API_BASE_URL}/api/kite/portfolio/holdings`,
  },

  // System endpoints
  system: {
    health: `${API_BASE_URL}/api/health`,
    version: `${API_BASE_URL}/api/version`,
  }
};

export { API_BASE_URL, API_ENDPOINTS }; 