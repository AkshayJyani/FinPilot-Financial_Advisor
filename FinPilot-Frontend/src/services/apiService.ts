import { API_ENDPOINTS } from '@config/apiConfig';

interface ApiResponse {
  status: string;
  data: any;
}

/**
 * ApiService - Handles all API requests to the backend
 */
class ApiService {
  /**
   * Process a general finance query
   * @param query - The query text to process
   */
  static async processFinanceQuery(query: string): Promise<ApiResponse> {
    try {
      console.log('Sending finance query to API:', query);
      console.log('Using endpoint:', API_ENDPOINTS.financeQuery);
      
      const response = await fetch(API_ENDPOINTS.financeQuery, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API error: ${response.status}`;
        
        // Try to parse error response as JSON if possible
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // If we can't parse as JSON, use the raw text if it exists
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const jsonData = await response.json();
      console.log('Finance query response data:', jsonData);
      
      // Format check - if the response has the correct structure
      if (jsonData.status === 'success') {
        // If the response is in the expected format
        if (typeof jsonData.data === 'object') {
          // If the response has the message property but not response
          if (jsonData.data.message && !jsonData.data.response) {
            // Create a response property with the message content
            return {
              status: 'success',
              data: {
                response: jsonData.data.message,
                message: jsonData.data.message
              }
            };
          }
        }
      } else if (jsonData.status === 'error') {
        // Format consistent error responses
        return {
          status: 'error',
          data: {
            message: jsonData.data?.message || jsonData.message || jsonData.error || 'Unknown API error',
            error: jsonData.data?.error || jsonData.error || 'Error processing your query'
          }
        };
      }
      
      return jsonData;
    } catch (error) {
      console.error('Finance query error:', error);
      return {
        status: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          error: 'Failed to process your query'
        }
      };
    }
  }

  /**
   * Get Binance holdings
   */
  static async getBinanceHoldings(): Promise<ApiResponse> {
    try {
      console.log('Fetching from:', API_ENDPOINTS.binancePortfolio.holdings);
      
      const response = await fetch(API_ENDPOINTS.binancePortfolio.holdings, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const jsonData = await response.json();
      console.log('Raw API response data:', jsonData);
      
      // Check for undefined or missing fields and add fallbacks
      if (jsonData.status === 'success' && jsonData.data) {
        // Set default empty arrays if any of these fields are missing
        if (!jsonData.data.spot_holdings) jsonData.data.spot_holdings = [];
        if (!jsonData.data.margin_holdings) jsonData.data.margin_holdings = [];
        if (!jsonData.data.futures_holdings) jsonData.data.futures_holdings = [];
        
        // Ensure these fields exist even if they're zero
        if (jsonData.data.total_value === undefined) jsonData.data.total_value = 0;
        if (jsonData.data.spot_value === undefined) jsonData.data.spot_value = 0;
        if (jsonData.data.margin_value === undefined) jsonData.data.margin_value = 0;
        if (jsonData.data.futures_value === undefined) jsonData.data.futures_value = 0;
        if (jsonData.data.change_24h === undefined) jsonData.data.change_24h = 0;
      }
      
      return jsonData;
    } catch (error) {
      console.error('Binance holdings error:', error);
      return {
        status: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          // Add empty arrays for holdings to prevent undefined errors
          spot_holdings: [],
          margin_holdings: [],
          futures_holdings: [],
          total_value: 0,
          spot_value: 0,
          margin_value: 0,
          futures_value: 0,
          change_24h: 0
        }
      };
    }
  }

  /**
   * Get Binance portfolio summary
   */
  static async getBinancePortfolioSummary(): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.binancePortfolio.summary, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Binance portfolio summary error:', error);
      return {
        status: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Analyze Binance portfolio
   */
  static async analyzeBinancePortfolio(): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.binancePortfolio.analysis, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Binance portfolio analysis error:', error);
      return {
        status: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update Binance portfolio data
   */
  static async updateBinancePortfolioData(): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.binancePortfolio.update, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Binance portfolio update error:', error);
      return {
        status: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Process a Binance portfolio query
   * @param query - The query text to process
   */
  static async processBinanceQuery(query: string): Promise<ApiResponse> {
    try {
      console.log('Sending Binance portfolio query to API:', query);
      console.log('Using endpoint:', API_ENDPOINTS.binancePortfolio.query);
      
      const response = await fetch(API_ENDPOINTS.binancePortfolio.query, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: query,
          source: 'portfolio_chat'
        }),
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API error: ${response.status}`;
        
        // Try to parse error response as JSON if possible
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // If we can't parse as JSON, use the raw text if it exists
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const jsonData = await response.json();
      console.log('Query response data:', jsonData);
      
      // Format check - if the response has the correct structure
      if (jsonData.status === 'success') {
        // If the response is in the expected format
        if (typeof jsonData.data === 'object') {
          // If the response has the message property but not response
          if (jsonData.data.message && !jsonData.data.response) {
            // Create a response property with the message content
            return {
              status: 'success',
              data: {
                response: jsonData.data.message,
                message: jsonData.data.message
              }
            };
          }
        }
      } else if (jsonData.status === 'error') {
        // Format consistent error responses
        return {
          status: 'error',
          data: {
            message: jsonData.data?.message || jsonData.message || jsonData.error || 'Unknown API error',
            error: jsonData.data?.error || jsonData.error || 'Error processing your query'
          }
        };
      }
      
      return jsonData;
    } catch (error) {
      console.error('Binance query error:', error);
      return {
        status: 'error',
        data: { 
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          error: 'Failed to process your query'
        }
      };
    }
  }

  /**
   * Get Kite holdings
   */
  static async getKiteHoldings(): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.kitePortfolio.holdings, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kite holdings error:', error);
      return {
        status: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Process a Kite portfolio query
   * @param query - The query text to process
   */
  static async processKiteQuery(query: string): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.kitePortfolio.query, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kite query error:', error);
      return {
        status: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check system health
   */
  static async checkHealth(): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.system.health, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get system version info
   */
  static async getVersionInfo(): Promise<ApiResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.system.version, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Version info error:', error);
      return {
        status: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

export default ApiService; 