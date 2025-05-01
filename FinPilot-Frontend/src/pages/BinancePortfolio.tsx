import { Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import { Chart, registerables, ChartOptions } from 'chart.js';
import HoldingsTable from '../components/HoldingsTable';
import ApiService from '../services/apiService';

// Register Chart.js components
Chart.register(...registerables);

// Set up Chart.js global defaults
const chartDefaults = {
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#e2e8f0',
        font: {
          family: "'Inter', sans-serif",
          size: 12
        },
        boxWidth: 12,
        padding: 10
      }
    }
  },
  responsive: true,
  maintainAspectRatio: false
};

Chart.defaults.set('plugins.legend', chartDefaults.plugins.legend);

interface Holding {
  symbol: string;
  amount: number;
  price_usd: number;
  total_usd: number;
  change_24h?: number;
}

interface AssetAllocation {
  asset: string;
  percentage: number;
  value: number;
}

interface PortfolioData {
  total_value: number;
  change_24h: number;
  holdings_count: number;
  spot_value: number;
  margin_value: number;
  futures_value: number;
  asset_allocation?: AssetAllocation[];
  last_updated: string;
}

// Define interfaces for API response data types
interface SpotHoldingData {
  free: number;
  locked: number;
  total: number;
  total_usd: number;
  type: string;
  price_usd: number;
  [key: string]: any;
}

interface MarginHoldingData {
  net_asset: number;
  net_asset_usd: number;
  borrowed: number;
  type: string;
  price_usd: number;
  [key: string]: any;
}

interface FuturesHoldingData {
  amount: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_usd: number;
  leverage: number;
  usd_value: number;
  type: string;
  [key: string]: any;
}

interface PortfolioApiData {
  spot_holdings?: { [key: string]: SpotHoldingData };
  margin_holdings?: { [key: string]: MarginHoldingData };
  futures_holdings?: { [key: string]: FuturesHoldingData };
  total_value?: number;
  change_24h?: number;
  spot_value?: number;
  margin_value?: number;
  futures_value?: number;
  [key: string]: any;
}

function BinancePortfolio() {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const [chartInstance, setChartInstance] = useState<Chart | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    total_value: 0,
    change_24h: 0,
    holdings_count: 0,
    spot_value: 0,
    margin_value: 0,
    futures_value: 0,
    last_updated: new Date().toLocaleTimeString()
  });
  
  const [spotHoldings, setSpotHoldings] = useState<Holding[]>([]);
  const [marginHoldings, setMarginHoldings] = useState<Holding[]>([]);
  const [futuresHoldings, setFuturesHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add custom CSS for the component
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(30, 41, 59, 0.5);
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #3b82f6;
        border-radius: 3px;
      }
      .card {
        transition: all 0.3s ease;
      }
      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      }
      .section-header {
        border-left: 4px solid #3b82f6;
        padding-left: 12px;
        margin-bottom: 16px;
      }
    `;
    
    // Append the style element to the document head
    document.head.appendChild(styleElement);
    
    // Clean up the style element when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Format currency values
  const formatCurrency = (value: number) => {
    // Check if value is a finite number
    if (!isFinite(value)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    // Check if value is a finite number
    if (!isFinite(value)) return '0.00%';
    
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.getBinanceHoldings();
      
      // Log the raw API response for debugging
      console.log('Raw API response:', response);
      
      if (response.status === 'success') {
        // Extract data from response
        const data = response.data;
        
        // Log the extracted data before validation
        console.log('API data before validation:', data);

        // Calculate values by investment type (similar to the HTML template)
        const calculateValues = () => {
          let totalSpotValue = 0;
          let totalMarginValue = 0;
          let totalFuturesValue = 0;
          let uniqueAssets = new Set<string>();
          let assetValues = new Map<string, number>();
          
          // Process spot holdings (object structure)
          const processedSpotHoldings: Holding[] = [];
          if (data.spot_holdings && typeof data.spot_holdings === 'object') {
            console.log('Processing spot holdings:', Object.keys(data.spot_holdings).length, 'items');
            Object.entries(data.spot_holdings).forEach(([key, holding]) => {
              if (holding && typeof holding === 'object') {
                // Extract asset symbol from the key (e.g., "BTC_spot" -> "BTC")
                const symbol = key.split('_')[0];
                const spotHolding = holding as SpotHoldingData;
                const amount = Number(spotHolding.total) || 0;
                const price_usd = Number(spotHolding.price_usd) || 0;
                const total_usd = Number(spotHolding.total_usd) || amount * price_usd;
                
                console.log(`Processing spot holding: ${symbol}, amount: ${amount}, price: ${price_usd}, total: ${total_usd}`);
                
                if (amount > 0 && isFinite(amount) && isFinite(price_usd) && total_usd > 0) {
                  totalSpotValue += total_usd;
                  uniqueAssets.add(symbol);
                  
                  // Track individual asset values for asset allocation
                  const currentValue = assetValues.get(symbol) || 0;
                  assetValues.set(symbol, currentValue + total_usd);
                  
                  processedSpotHoldings.push({
                    symbol: symbol,
                    amount: amount,
                    price_usd: price_usd,
                    total_usd: total_usd,
                    change_24h: undefined // Change data might not be available
                  });
                }
              }
            });
            console.log('Processed spot holdings:', processedSpotHoldings.length, 'items, total value:', totalSpotValue);
          }
          
          // Process margin holdings (object structure)
          const processedMarginHoldings: Holding[] = [];
          if (data.margin_holdings && typeof data.margin_holdings === 'object') {
            console.log('Processing margin holdings:', Object.keys(data.margin_holdings).length, 'items');
            Object.entries(data.margin_holdings).forEach(([key, holding]) => {
              if (holding && typeof holding === 'object') {
                // Extract asset symbol from the key (e.g., "BTC_margin" -> "BTC")
                const symbol = key.split('_')[0];
                const marginHolding = holding as MarginHoldingData;
                const amount = Number(marginHolding.net_asset) || 0;
                const price_usd = Number(marginHolding.price_usd) || 0;
                const total_usd = Number(marginHolding.net_asset_usd) || amount * price_usd;
                
                console.log(`Processing margin holding: ${symbol}, amount: ${amount}, price: ${price_usd}, total: ${total_usd}`);
                
                if (amount > 0 && isFinite(amount) && isFinite(price_usd) && total_usd > 0) {
                  totalMarginValue += total_usd;
                  uniqueAssets.add(symbol);
                  
                  // Track individual asset values for asset allocation
                  const currentValue = assetValues.get(symbol) || 0;
                  assetValues.set(symbol, currentValue + total_usd);
                  
                  processedMarginHoldings.push({
                    symbol: symbol,
                    amount: amount,
                    price_usd: price_usd,
                    total_usd: total_usd,
                    change_24h: undefined // Change data might not be available
                  });
                }
              }
            });
            console.log('Processed margin holdings:', processedMarginHoldings.length, 'items, total value:', totalMarginValue);
          }
          
          // Process futures holdings (object structure)
          const processedFuturesHoldings: Holding[] = [];
          if (data.futures_holdings && typeof data.futures_holdings === 'object') {
            console.log('Processing futures holdings:', Object.keys(data.futures_holdings).length, 'items');
            Object.entries(data.futures_holdings).forEach(([key, holding]) => {
              if (holding && typeof holding === 'object') {
                // Extract asset symbol from the key (e.g., "BTCUSDT_futures" -> "BTC")
                const fullSymbol = key.split('_')[0];
                const symbol = fullSymbol.replace('USDT', ''); // Remove the USDT part
                const futuresHolding = holding as FuturesHoldingData;
                const amount = Number(futuresHolding.amount) || 0;
                const price_usd = Number(futuresHolding.current_price) || 0;
                const total_usd = Number(futuresHolding.usd_value) || amount * price_usd;
                
                console.log(`Processing futures holding: ${symbol}, amount: ${amount}, price: ${price_usd}, total: ${total_usd}`);
                
                if (amount > 0 && isFinite(amount) && isFinite(price_usd) && total_usd > 0) {
                  totalFuturesValue += total_usd;
                  uniqueAssets.add(symbol);
                  
                  // Track individual asset values for asset allocation
                  const currentValue = assetValues.get(symbol) || 0;
                  assetValues.set(symbol, currentValue + total_usd);
                  
                  processedFuturesHoldings.push({
                    symbol: symbol,
                    amount: amount,
                    price_usd: price_usd,
                    total_usd: total_usd,
                    change_24h: undefined // Change data might not be available
                  });
                }
              }
            });
            console.log('Processed futures holdings:', processedFuturesHoldings.length, 'items, total value:', totalFuturesValue);
          }
          
          // Generate asset allocation data for the chart
          const calculatedTotalValue = totalSpotValue + totalMarginValue + totalFuturesValue;
          const generatedAssetAllocation: AssetAllocation[] = [];
          
          if (calculatedTotalValue > 0) {
            assetValues.forEach((value, asset) => {
              if (value > 0) {
                generatedAssetAllocation.push({
                  asset: asset,
                  value: value,
                  percentage: (value / calculatedTotalValue) * 100
                });
              }
            });
          }
          
          // Sort by value descending
          generatedAssetAllocation.sort((a, b) => b.value - a.value);
          
          // Update holdings with cleaned data
          setSpotHoldings(processedSpotHoldings);
          setMarginHoldings(processedMarginHoldings);
          setFuturesHoldings(processedFuturesHoldings);
          
          // Calculate total values
          return {
            totalValue: calculatedTotalValue,
            spotValue: totalSpotValue,
            marginValue: totalMarginValue,
            futuresValue: totalFuturesValue,
            uniqueAssetCount: uniqueAssets.size,
            assetAllocation: generatedAssetAllocation
          };
        };
        
        // Calculate portfolio values
        const calculatedValues = calculateValues();
        
        console.log('Calculated portfolio values:', calculatedValues);
        
        // Use the calculated total value instead of the one from the API (like in HTML template)
        // Fallback to API values if they exist and calculated values are invalid
        const validatedData = {
          total_value: calculatedValues.totalValue > 0 ? calculatedValues.totalValue : 0,
          change_24h: isFinite(Number(data.change_24h)) ? Number(data.change_24h) : 0,
          holdings_count: calculatedValues.uniqueAssetCount > 0 ? calculatedValues.uniqueAssetCount : 
                          (Object.keys(data.spot_holdings || {}).length + 
                           Object.keys(data.margin_holdings || {}).length + 
                           Object.keys(data.futures_holdings || {}).length),
          spot_value: calculatedValues.spotValue > 0 ? calculatedValues.spotValue : 0,
          margin_value: calculatedValues.marginValue > 0 ? calculatedValues.marginValue : 0,
          futures_value: calculatedValues.futuresValue > 0 ? calculatedValues.futuresValue : 0,
          asset_allocation: calculatedValues.assetAllocation,
          last_updated: new Date().toLocaleTimeString()
        };

        // Update portfolio data with validated values
        setPortfolioData(validatedData);
        
        // Log successful data fetch for debugging
        console.log('API data successfully processed', validatedData);
        console.log('Calculated values:', calculatedValues);
        console.log('Final holdings:', {
          spot: spotHoldings.length,
          margin: marginHoldings.length,
          futures: futuresHoldings.length
        });
        
      } else {
        throw new Error(response.data.message || 'Failed to fetch portfolio data');
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // Set fallback data if needed
      if (portfolioData.total_value === 0) {
        // Only set fallback data if we don't have any data yet
        setPortfolioData({
          total_value: 34567.89,
          change_24h: 2.5,
          holdings_count: 12,
          spot_value: 18932.45,
          margin_value: 8254.32,
          futures_value: 7381.12,
          last_updated: new Date().toLocaleTimeString()
        });
        
        setSpotHoldings([
          { symbol: 'BTC', amount: 0.45, price_usd: 42500, total_usd: 19125, change_24h: 2.3 },
          { symbol: 'ETH', amount: 3.25, price_usd: 2800, total_usd: 9100, change_24h: 1.8 },
          { symbol: 'SOL', amount: 42.8, price_usd: 135, total_usd: 5778, change_24h: -0.7 }
        ]);
        
        setMarginHoldings([
          { symbol: 'BTC', amount: 0.12, price_usd: 42500, total_usd: 5100, change_24h: 2.3 },
          { symbol: 'ETH', amount: 1.15, price_usd: 2800, total_usd: 3220, change_24h: 1.8 }
        ]);
        
        setFuturesHoldings([
          { symbol: 'BTC', amount: 0.08, price_usd: 42500, total_usd: 3400, change_24h: 2.3 },
          { symbol: 'ETH', amount: 1.42, price_usd: 2800, total_usd: 3976, change_24h: 1.8 }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return; // Ensure the ref is available

    // Cleanup function to destroy the chart instance
    const destroyChart = () => {
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }
    };

    // Always destroy any existing chart before initializing
    destroyChart();

    // Add a small delay to ensure clean DOM before creating a new chart
    const timer = setTimeout(() => {
      const ctx = chartRef.current?.getContext('2d');
      if (!ctx) return;

      try {
        console.log('Chart data to render:', {
          assetAllocation: portfolioData.asset_allocation ? portfolioData.asset_allocation.length : 0,
          spotValue: portfolioData.spot_value,
          marginValue: portfolioData.margin_value,
          futuresValue: portfolioData.futures_value,
          totalValue: portfolioData.total_value
        });

        // Check if we have valid asset allocation data
        const hasValidAssetAllocation = 
          portfolioData.asset_allocation && 
          Array.isArray(portfolioData.asset_allocation) && 
          portfolioData.asset_allocation.length > 0;

        // Check if we have valid investment type data
        const totalInvestmentValue = 
          (isFinite(portfolioData.spot_value) ? portfolioData.spot_value : 0) + 
          (isFinite(portfolioData.margin_value) ? portfolioData.margin_value : 0) + 
          (isFinite(portfolioData.futures_value) ? portfolioData.futures_value : 0);
        
        const hasValidInvestmentData = totalInvestmentValue > 0;

        // Create chart configuration based on available data
        let newChart: Chart | null = null;

        if (hasValidAssetAllocation && portfolioData.asset_allocation) {
          // Use asset allocation data from API
          const assetAllocation = portfolioData.asset_allocation;
          const assetLabels = assetAllocation.map(item => item.asset);
          const assetData = assetAllocation.map(item => item.value);
          const assetPercentages = assetAllocation.map(item => item.percentage.toFixed(2));
          
          // Create a color array based on the number of assets (using a predefined color palette)
          const colorPalette = [
            '#3b82f6', // Blue
            '#10b981', // Green
            '#f59e0b', // Orange
            '#ef4444', // Red
            '#8b5cf6', // Purple
            '#06b6d4', // Cyan
            '#ec4899', // Pink
            '#f97316', // Orange-red
            '#6366f1', // Indigo
            '#14b8a6'  // Teal
          ];
          
          const colors = assetLabels.map((_, index) => colorPalette[index % colorPalette.length]);
          
          newChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: assetLabels,
              datasets: [{
                data: assetData,
                backgroundColor: colors,
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.raw as number;
                      const percentage = assetPercentages[context.dataIndex];
                      return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        } else if (hasValidInvestmentData) {
          // Use investment type data (spot, margin, futures)
          // Only include values greater than zero
          const labels: string[] = [];
          const data: number[] = [];
          const colors: string[] = [];
          
          if (portfolioData.spot_value > 0) {
            labels.push('Spot');
            data.push(portfolioData.spot_value);
            colors.push('#3b82f6'); // Blue for Spot
          }
          
          if (portfolioData.margin_value > 0) {
            labels.push('Margin');
            data.push(portfolioData.margin_value);
            colors.push('#10b981'); // Green for Margin
          }
          
          if (portfolioData.futures_value > 0) {
            labels.push('Futures');
            data.push(portfolioData.futures_value);
            colors.push('#f59e0b'); // Orange for Futures
          }
          
          // Calculate percentages
          const percentages = data.map(value => ((value / totalInvestmentValue) * 100).toFixed(2));
          
          newChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: labels,
              datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.raw as number;
                      const percentage = percentages[context.dataIndex];
                      return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        } else {
          // No valid data, draw empty chart
          newChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['No Data Available'],
              datasets: [{
                data: [1],
                backgroundColor: ['#334155'], // Slate gray for empty chart
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function() {
                      return 'No portfolio data available';
                    }
                  }
                }
              }
            }
          });
        }
        
        if (newChart) {
          setChartInstance(newChart);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
        // If there's an error creating the chart, make sure we clean up
        destroyChart();
      }
    }, 50); // Small delay to ensure DOM is ready
    
    // Cleanup on unmount or before re-render
    return () => {
      clearTimeout(timer);
      destroyChart();
    };
  }, [portfolioData]);

  // Fetch data on initial load and set up refresh interval
  useEffect(() => {
    // Fetch data initially
    fetchPortfolioData();
    
    // Set up refresh interval - every 30 seconds
    const intervalId = setInterval(fetchPortfolioData, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Process Binance portfolio query
  const handlePortfolioQuery = async (query: string) => {
    try {
      // Log the query being sent
      console.log('Sending portfolio query:', query);
      setIsChatLoading(true);
      
      const response = await ApiService.processBinanceQuery(query);
      
      // Log the response for debugging
      console.log('Portfolio query response:', response);
      
      // Validate response structure and content
      if (response.status === 'success') {
        // Handle different response formats
        if (response.data && typeof response.data.response === 'string' && 
          response.data.response.trim() !== '') {
          return response;
        } else if (response.data && typeof response.data.message === 'string' && 
          response.data.message.trim() !== '') {
          // Handle format where message field contains the response
          return {
            status: 'success',
            data: { 
              response: response.data.message
            }
          };
        } else {
          // No recognizable message found, return a debug message
          console.warn('API returned success but with no message content:', response);
          return {
            status: 'success',
            data: { 
              response: "I received your query, but the API didn't provide a clear response. Please try asking in a different way." 
            }
          };
        }
      } else if (response.status === 'error') {
        // Return the actual error message from the API
        const errorMsg = response.data?.message || response.data?.error || 'Unknown API error';
        console.error('API returned error:', errorMsg);
        return {
          status: 'error',
          data: { 
            message: errorMsg,
            response: `Error: ${errorMsg}`
          }
        };
      } else {
        // Unexpected response status
        throw new Error(`Unexpected API response status: ${response.status}`);
      }
    } catch (error) {
      // Capture and return the actual error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error processing portfolio query:', error);
      return {
        status: 'error',
        data: { 
          message: errorMessage,
          response: `Error: ${errorMessage}`
        }
      };
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Binance Portfolio
            </h1>
            <p className="text-slate-400 mt-1">
              Analyze your Binance portfolio with detailed insights
            </p>
          </div>
          <Link to="/portfolio" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">Error: {error}</p>
          <button 
            onClick={fetchPortfolioData}
            className="mt-2 bg-red-500/30 hover:bg-red-500/50 px-3 py-1 rounded text-sm text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content - 2/3 width */}
        <div className="lg:w-2/3">
          {/* Portfolio Overview */}
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 mb-8 card">
            <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3 section-header">Portfolio Overview</h2>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-3/5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Total Value</p>
                    <p className="text-xl font-bold">{formatCurrency(portfolioData.total_value)}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">24h Change</p>
                    <p className={`text-xl font-bold ${portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(portfolioData.change_24h)}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Holdings</p>
                    <p className="text-xl font-bold">{portfolioData.holdings_count}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Spot Holdings</span>
                      <span className="font-medium text-slate-200 text-sm">{formatCurrency(portfolioData.spot_value)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Margin Holdings</span>
                      <span className="font-medium text-slate-200 text-sm">{formatCurrency(portfolioData.margin_value)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Futures Holdings</span>
                      <span className="font-medium text-slate-200 text-sm">{formatCurrency(portfolioData.futures_value)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Last Updated</span>
                      <span className="font-medium text-slate-200 text-sm">
                        {portfolioData.last_updated}
                        {isLoading && (
                          <span className="inline-block ml-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-2/5">
                <div className="h-40">
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>
            </div>
          </div>

          {/* Holdings */}
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 card">
            <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3 section-header">Holdings</h2>
            
            {/* Spot Trading Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3 text-blue-400">Spot Trading</h3>
              <div className="overflow-x-auto custom-scrollbar">
                {spotHoldings.length > 0 ? (
                  <HoldingsTable holdings={spotHoldings} />
                ) : (
                  <p className="text-slate-400 text-center py-4">No spot holdings found.</p>
                )}
              </div>
            </div>
            
            {/* Cross Margin Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3 text-blue-400">Cross Margin</h3>
              <div className="overflow-x-auto custom-scrollbar">
                {marginHoldings.length > 0 ? (
                  <HoldingsTable holdings={marginHoldings} />
                ) : (
                  <p className="text-slate-400 text-center py-4">No margin holdings found.</p>
                )}
              </div>
            </div>
            
            {/* Futures Section */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-blue-400">Futures</h3>
              <div className="overflow-x-auto custom-scrollbar">
                {futuresHoldings.length > 0 ? (
                  <HoldingsTable holdings={futuresHoldings} />
                ) : (
                  <p className="text-slate-400 text-center py-4">No futures holdings found.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Box - 1/3 width */}
        <div className="lg:w-1/3">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 sticky top-4 card">
            <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3 section-header">Portfolio Query</h2>
            <p className="text-slate-400 text-sm mb-4">
              Ask questions about your portfolio and get instant insights.
            </p>
            <ChatBox 
              initialMessage="Hello! I can help you analyze your Binance portfolio. What would you like to know? You can ask about your asset allocation, portfolio performance, specific holdings, or investment suggestions."
              placeholder="Ask about your portfolio..."
              onSendMessage={handlePortfolioQuery}
              isLoading={isChatLoading}
              additionalContext={
                portfolioData.total_value > 0 ? 
                `Your portfolio currently has ${portfolioData.holdings_count} holdings with a total value of ${formatCurrency(portfolioData.total_value)}.` : 
                undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BinancePortfolio;