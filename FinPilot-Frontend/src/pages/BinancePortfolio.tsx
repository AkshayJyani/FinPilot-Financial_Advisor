import { Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import { Chart, registerables, ChartOptions } from 'chart.js';
import HoldingsTable from '../components/HoldingsTable';
import ApiService from '../services/apiService';
import { toast } from 'react-hot-toast';

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
  avg_buy_price?: number;
  pnl?: number;
  pnl_percentage?: number;
  first_buy_time?: number;
  last_buy_time?: number;
}

interface AssetAllocation {
  asset: string;
  percentage: number;
  value: number;
  sector?: string;
}

interface PortfolioData {
  total_value: number;
  change_24h: number;
  holdings_count: number;
  spot_value: number;
  margin_value: number;
  futures_value: number;
  asset_allocation?: AssetAllocation[];
  sector_allocation?: AssetAllocation[];
  last_updated: string;
  spotCoinsCount?: number;
  marginCoinsCount?: number;
  futuresCoinsCount?: number;
}

// Define interfaces for API response data types
interface SpotHoldingData {
  free: number;
  locked: number;
  total: number;
  total_usd: number;
  type: string;
  price_usd: number;
  change_24h?: number;
  avg_buy_price?: number;
  pnl?: number;
  pnl_percentage?: number;
  first_buy_time?: number;
  last_buy_time?: number;
  [key: string]: any;
}

interface MarginHoldingData {
  net_asset: number;
  net_asset_usd: number;
  borrowed: number;
  type: string;
  price_usd: number;
  change_24h?: number;
  avg_buy_price?: number;
  pnl?: number;
  pnl_percentage?: number;
  first_buy_time?: number;
  last_buy_time?: number;
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
  change_24h?: number;
  avg_buy_price?: number;
  pnl?: number;
  pnl_percentage?: number;
  first_buy_time?: number;
  last_buy_time?: number;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'spot' | 'margin' | 'futures'>('spot');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Cache management
  const loadCachedData = () => {
    try {
      // Try to get cached portfolio data from localStorage
      const cachedDataStr = localStorage.getItem('binance_portfolio_data');
      const cachedSpotStr = localStorage.getItem('binance_spot_holdings');
      const cachedMarginStr = localStorage.getItem('binance_margin_holdings');
      const cachedFuturesStr = localStorage.getItem('binance_futures_holdings');
      
      console.log('Loading cached data');
      
      // Parse and set portfolio data if available
      if (cachedDataStr) {
        const cachedData = JSON.parse(cachedDataStr) as PortfolioData;
        // Add a note that this is cached data
        cachedData.last_updated = `${new Date(cachedData.last_updated).toLocaleTimeString()} (cached)`;
        setPortfolioData(cachedData);
        console.log('Loaded cached portfolio data');
      }
      
      // Parse and set holdings data if available
      if (cachedSpotStr) setSpotHoldings(JSON.parse(cachedSpotStr));
      if (cachedMarginStr) setMarginHoldings(JSON.parse(cachedMarginStr));
      if (cachedFuturesStr) setFuturesHoldings(JSON.parse(cachedFuturesStr));
      
      // Return true if we loaded any cached data
      return !!(cachedDataStr || cachedSpotStr || cachedMarginStr || cachedFuturesStr);
    } catch (error) {
      console.error('Error loading cached data:', error);
      return false;
    }
  };
  
  const saveDataToCache = (data: PortfolioData, spot: Holding[], margin: Holding[], futures: Holding[]) => {
    try {
      localStorage.setItem('binance_portfolio_data', JSON.stringify(data));
      localStorage.setItem('binance_spot_holdings', JSON.stringify(spot));
      localStorage.setItem('binance_margin_holdings', JSON.stringify(margin));
      localStorage.setItem('binance_futures_holdings', JSON.stringify(futures));
      console.log('Saved portfolio data to cache');
    } catch (error) {
      console.error('Error saving data to cache:', error);
    }
  };

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

  // Calculate total P&L for a set of holdings
  const calculateTotalPnL = (holdings: Holding[]): number => {
    return holdings.reduce((total, holding) => {
      if (holding.pnl !== undefined && isFinite(holding.pnl)) {
        return total + holding.pnl;
      }
      return total;
    }, 0);
  };

  // Calculate total P&L percentage for a set of holdings
  const calculateTotalPnLPercentage = (holdings: Holding[]): string => {
    const totalInvestment = holdings.reduce((total, holding) => {
      // Use total_usd for investment value
      return total + holding.total_usd;
    }, 0);
    
    const totalPnL = calculateTotalPnL(holdings);
    
    if (totalInvestment > 0) {
      const percentage = (totalPnL / totalInvestment) * 100;
      return percentage.toFixed(2);
    }
    
    return '0.00';
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

  // Format timestamps
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '-';
    
    // Convert milliseconds timestamp to Date object
    const date = new Date(timestamp);
    
    // Format as local date string
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get coin icon URL - tries multiple sources with fallbacks
  const getCoinIconUrl = (symbol: string) => {
    // Normalize the symbol to lowercase
    const normalizedSymbol = symbol.toLowerCase();
    
    // Return the cryptocurrency-icons library URL
    return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@bea1507f8c1d8d5d9b113170d5a5b05ca8c13009/128/color/${normalizedSymbol}.png`;
  };

  // Get CoinGecko URL as a fallback
  const getCoinGeckoIconUrl = (symbol: string) => {
    // Normalize the symbol to lowercase
    const normalizedSymbol = symbol.toLowerCase();
    
    // Map some common symbols that might have different IDs in CoinGecko
    const symbolMap: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'sol': 'solana',
      'avax': 'avalanche-2',
      'dot': 'polkadot',
      'link': 'chainlink',
      'ada': 'cardano',
      'xrp': 'ripple',
      'ltc': 'litecoin',
      'doge': 'dogecoin',
      'bnb': 'binancecoin',
      'luna': 'terra-luna-2',
      'matic': 'matic-network',
      'shib': 'shiba-inu',
      'uni': 'uniswap',
      'cake': 'pancakeswap-token'
    };
    
    // Use the mapped ID if available, otherwise just use the symbol
    const coinId = symbolMap[normalizedSymbol] || normalizedSymbol;
    
    // Return the CoinGecko icon URL
    return `https://assets.coingecko.com/coins/images/1/${coinId}.png`;
  };

  // Add a function to map crypto assets to sectors
  const mapAssetToSector = (asset: string): string => {
    // This is a simple mapping - in a real app, you might want to fetch this data from an API
    const sectorMap: {[key: string]: string} = {
      'BTC': 'Store of Value',
      'ETH': 'Smart Contract Platform',
      'BNB': 'Exchange Token',
      'SOL': 'Smart Contract Platform',
      'ADA': 'Smart Contract Platform',
      'DOT': 'Interoperability',
      'AVAX': 'Smart Contract Platform',
      'LINK': 'Oracle',
      'UNI': 'DeFi',
      'AAVE': 'DeFi',
      'COMP': 'DeFi',
      'MKR': 'DeFi',
      'SUSHI': 'DeFi',
      'CAKE': 'DeFi',
      'MATIC': 'Layer 2',
      'LTC': 'Payments',
      'XLM': 'Payments',
      'XRP': 'Payments',
      'DOGE': 'Meme',
      'SHIB': 'Meme',
      'FTT': 'Exchange Token',
      'CRO': 'Exchange Token',
      'FTM': 'Smart Contract Platform',
      'ATOM': 'Interoperability',
      'ALGO': 'Smart Contract Platform',
      'NEAR': 'Smart Contract Platform',
      'ICP': 'Internet Services',
      'FIL': 'Storage',
      'XTZ': 'Smart Contract Platform',
      'AXS': 'Gaming',
      'MANA': 'Metaverse',
      'SAND': 'Metaverse',
      'ENJ': 'Gaming',
      'THETA': 'Media',
      'CHZ': 'Sports',
      'BAT': 'Advertising',
      'XMR': 'Privacy',
      'ZEC': 'Privacy',
      'DASH': 'Privacy',
    };
    
    return sectorMap[asset] || 'Other';
  };

  // Fetch portfolio data
  const fetchPortfolioData = async (isBackgroundRefresh = false) => {
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      // Get detailed portfolio summary instead of just holdings
      const response = await ApiService.getBinancePortfolioSummary();
      
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
          
          // For calculating weighted average of 24h changes
          let totalWeightedChange = 0;
          let totalValueWithChange = 0;
          
          // Count the number of coins in each sector
          let spotCoinsCount = 0;
          let marginCoinsCount = 0;
          let futuresCoinsCount = 0;
          
          // Process spot holdings (object structure)
          const processedSpotHoldings: Holding[] = [];
          if (data.spot_holdings && typeof data.spot_holdings === 'object') {
            console.log('Processing spot holdings:', Object.keys(data.spot_holdings).length, 'items');
            spotCoinsCount = Object.keys(data.spot_holdings).length;
            Object.entries(data.spot_holdings).forEach(([key, holding]) => {
              if (holding && typeof holding === 'object') {
                // Extract asset symbol from the key (e.g., "BTC_spot" -> "BTC")
                const symbol = key.split('_')[0];
                const spotHolding = holding as SpotHoldingData;
                const amount = Number(spotHolding.total) || 0;
                const price_usd = Number(spotHolding.price_usd) || 0;
                const total_usd = Number(spotHolding.total_usd) || amount * price_usd;
                const change_24h = spotHolding.change_24h !== undefined ? Number(spotHolding.change_24h) : undefined;
                
                console.log(`Processing spot holding: ${symbol}, amount: ${amount}, price: ${price_usd}, total: ${total_usd}, change_24h: ${change_24h !== undefined ? change_24h + '%' : 'undefined'}`);
                
                if (amount > 0 && isFinite(amount) && isFinite(price_usd) && total_usd > 0) {
                  totalSpotValue += total_usd;
                  uniqueAssets.add(symbol);
                  
                  // Track individual asset values for asset allocation
                  const currentValue = assetValues.get(symbol) || 0;
                  assetValues.set(symbol, currentValue + total_usd);
                  
                  // Calculate weighted 24h change
                  if (change_24h !== undefined && isFinite(change_24h)) {
                    totalWeightedChange += change_24h * total_usd;
                    totalValueWithChange += total_usd;
                  }
                  
                  processedSpotHoldings.push({
                    symbol: symbol,
                    amount: amount,
                    price_usd: price_usd,
                    total_usd: total_usd,
                    change_24h: change_24h, // Use the 24h change from API
                    avg_buy_price: spotHolding.avg_buy_price,
                    pnl: spotHolding.pnl,
                    pnl_percentage: spotHolding.pnl_percentage,
                    first_buy_time: spotHolding.first_buy_time,
                    last_buy_time: spotHolding.last_buy_time
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
            marginCoinsCount = Object.keys(data.margin_holdings).length;
            Object.entries(data.margin_holdings).forEach(([key, holding]) => {
              if (holding && typeof holding === 'object') {
                // Extract asset symbol from the key (e.g., "BTC_margin" -> "BTC")
                const symbol = key.split('_')[0];
                const marginHolding = holding as MarginHoldingData;
                const amount = Number(marginHolding.net_asset) || 0;
                const price_usd = Number(marginHolding.price_usd) || 0;
                const total_usd = Number(marginHolding.net_asset_usd) || amount * price_usd;
                const change_24h = marginHolding.change_24h !== undefined ? Number(marginHolding.change_24h) : undefined;
                
                console.log(`Processing margin holding: ${symbol}, amount: ${amount}, price: ${price_usd}, total: ${total_usd}, change_24h: ${change_24h !== undefined ? change_24h + '%' : 'undefined'}`);
                
                if (amount > 0 && isFinite(amount) && isFinite(price_usd) && total_usd > 0) {
                  totalMarginValue += total_usd;
                  uniqueAssets.add(symbol);
                  
                  // Track individual asset values for asset allocation
                  const currentValue = assetValues.get(symbol) || 0;
                  assetValues.set(symbol, currentValue + total_usd);
                  
                  // Calculate weighted 24h change
                  if (change_24h !== undefined && isFinite(change_24h)) {
                    totalWeightedChange += change_24h * total_usd;
                    totalValueWithChange += total_usd;
                  }
                  
                  processedMarginHoldings.push({
                    symbol: symbol,
                    amount: amount,
                    price_usd: price_usd,
                    total_usd: total_usd,
                    change_24h: change_24h, // Use the 24h change from API
                    avg_buy_price: marginHolding.avg_buy_price,
                    pnl: marginHolding.pnl,
                    pnl_percentage: marginHolding.pnl_percentage,
                    first_buy_time: marginHolding.first_buy_time,
                    last_buy_time: marginHolding.last_buy_time
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
            futuresCoinsCount = Object.keys(data.futures_holdings).length;
            Object.entries(data.futures_holdings).forEach(([key, holding]) => {
              if (holding && typeof holding === 'object') {
                // Extract asset symbol from the key (e.g., "BTCUSDT_futures" -> "BTC")
                const fullSymbol = key.split('_')[0];
                const symbol = fullSymbol.replace('USDT', ''); // Remove the USDT part
                const futuresHolding = holding as FuturesHoldingData;
                const amount = Number(futuresHolding.amount) || 0;
                const price_usd = Number(futuresHolding.current_price) || 0;
                const total_usd = Number(futuresHolding.usd_value) || amount * price_usd;
                const change_24h = futuresHolding.change_24h !== undefined ? Number(futuresHolding.change_24h) : undefined;
                
                console.log(`Processing futures holding: ${symbol}, amount: ${amount}, price: ${price_usd}, total: ${total_usd}, change_24h: ${change_24h !== undefined ? change_24h + '%' : 'undefined'}`);
                
                if (amount > 0 && isFinite(amount) && isFinite(price_usd) && total_usd > 0) {
                  totalFuturesValue += total_usd;
                  uniqueAssets.add(symbol);
                  
                  // Track individual asset values for asset allocation
                  const currentValue = assetValues.get(symbol) || 0;
                  assetValues.set(symbol, currentValue + total_usd);
                  
                  // Calculate weighted 24h change
                  if (change_24h !== undefined && isFinite(change_24h)) {
                    totalWeightedChange += change_24h * total_usd;
                    totalValueWithChange += total_usd;
                  }
                  
                  processedFuturesHoldings.push({
                    symbol: symbol,
                    amount: amount,
                    price_usd: price_usd,
                    total_usd: total_usd,
                    change_24h: change_24h, // Use the 24h change from API
                    avg_buy_price: futuresHolding.entry_price, // Use entry_price as avg_buy_price for futures
                    pnl: futuresHolding.unrealized_pnl, // Use unrealized_pnl as pnl for futures
                    pnl_percentage: futuresHolding.unrealized_pnl_usd / total_usd * 100 // Calculate pnl_percentage for futures
                  });
                }
              }
            });
            console.log('Processed futures holdings:', processedFuturesHoldings.length, 'items, total value:', totalFuturesValue);
          }
          
          // Calculate weighted average 24h change across all holdings
          const averageChange = totalValueWithChange > 0 ? totalWeightedChange / totalValueWithChange : 0;
          console.log('Calculated weighted average 24h change:', averageChange);
          
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
          
          // Generate sector allocation data
          const sectorValues = new Map<string, number>();
          if (calculatedTotalValue > 0) {
            assetValues.forEach((value, asset) => {
              if (value > 0) {
                const sector = mapAssetToSector(asset);
                const currentValue = sectorValues.get(sector) || 0;
                sectorValues.set(sector, currentValue + value);
              }
            });
          }
          
          // Convert sector values map to array
          const generatedSectorAllocation: AssetAllocation[] = [];
          if (calculatedTotalValue > 0) {
            sectorValues.forEach((value, sector) => {
              if (value > 0) {
                generatedSectorAllocation.push({
                  asset: sector,
                  value: value,
                  percentage: (value / calculatedTotalValue) * 100
                });
              }
            });
          }
          
          // Sort by value descending
          generatedSectorAllocation.sort((a, b) => b.value - a.value);
          
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
            assetAllocation: generatedAssetAllocation,
            sectorAllocation: generatedSectorAllocation,
            spotCoinsCount: spotCoinsCount,
            marginCoinsCount: marginCoinsCount,
            futuresCoinsCount: futuresCoinsCount,
            averageChange: averageChange
          };
        };
        
        // Calculate portfolio values
        const calculatedValues = calculateValues();
        
        console.log('Calculated portfolio values:', calculatedValues);
        
        // Use the calculated total value instead of the one from the API
        // Fallback to API values if they exist and calculated values are invalid
        const validatedData = {
          total_value: calculatedValues.totalValue > 0 ? calculatedValues.totalValue : 0,
          change_24h: calculatedValues.averageChange !== undefined && isFinite(calculatedValues.averageChange) ? 
                     calculatedValues.averageChange : 
                     (isFinite(Number(data.change_24h)) ? Number(data.change_24h) : 0),
          holdings_count: calculatedValues.uniqueAssetCount > 0 ? calculatedValues.uniqueAssetCount : 
                          (Object.keys(data.spot_holdings || {}).length + 
                           Object.keys(data.margin_holdings || {}).length + 
                           Object.keys(data.futures_holdings || {}).length),
          spot_value: calculatedValues.spotValue > 0 ? calculatedValues.spotValue : 0,
          margin_value: calculatedValues.marginValue > 0 ? calculatedValues.marginValue : 0,
          futures_value: calculatedValues.futuresValue > 0 ? calculatedValues.futuresValue : 0,
          asset_allocation: calculatedValues.assetAllocation,
          sector_allocation: calculatedValues.sectorAllocation,
          last_updated: new Date().toLocaleTimeString()
        };

        // Update portfolio data with validated values
        setPortfolioData(validatedData);
        
        // Cache the fresh data
        saveDataToCache(
          validatedData,
          spotHoldings,
          marginHoldings,
          futuresHoldings
        );
        
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
      
      if (!isBackgroundRefresh) {
        // Only show error to user if it's not a background refresh
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        
        // If no cached data was loaded earlier and this is the initial load,
        // set fallback data
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
      }
    } finally {
      if (isBackgroundRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Update chart initialization to show only investment types
  useEffect(() => {
    if (!chartRef.current) return;

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
        // Check if we have valid investment type data
        const totalInvestmentValue = 
          (isFinite(portfolioData.spot_value) ? portfolioData.spot_value : 0) + 
          (isFinite(portfolioData.margin_value) ? portfolioData.margin_value : 0) + 
          (isFinite(portfolioData.futures_value) ? portfolioData.futures_value : 0);
        
        const hasValidInvestmentData = totalInvestmentValue > 0;

        // Create investment type chart
        let newChart: Chart | null = null;

        if (hasValidInvestmentData) {
          // Use investment type data (spot, margin, futures)
          // Only include values greater than zero
          const labels: string[] = [];
          const data: number[] = [];
          const colors: string[] = [];
          const coinCounts: number[] = [];
          
          if (portfolioData.spot_value > 0) {
            labels.push('Spot');
            data.push(portfolioData.spot_value);
            colors.push('#3b82f6'); // Blue for Spot
            coinCounts.push(spotHoldings.length); // Use actual holdings length
          }
          
          if (portfolioData.margin_value > 0) {
            labels.push('Margin');
            data.push(portfolioData.margin_value);
            colors.push('#10b981'); // Green for Margin
            coinCounts.push(marginHoldings.length); // Use actual holdings length
          }
          
          if (portfolioData.futures_value > 0) {
            labels.push('Futures');
            data.push(portfolioData.futures_value);
            colors.push('#f59e0b'); // Orange for Futures
            coinCounts.push(futuresHoldings.length); // Use actual holdings length
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
                      const coinCount = coinCounts[context.dataIndex];
                      return [
                        `${label}: ${formatCurrency(value)} (${percentage}%)`,
                        `Coins: ${coinCount}`
                      ];
                    }
                  }
                },
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
    // First try to load cached data for immediate display
    const hasCachedData = loadCachedData();
    
    // Then fetch fresh data (with different loading behavior based on cache)
    if (hasCachedData) {
      // If we have cached data, fetch in the background
      fetchPortfolioData(true);
    } else {
      // If no cached data, show the loading spinner
      fetchPortfolioData(false);
    }
    
    // Set up refresh interval - every 30 seconds
    const intervalId = setInterval(() => fetchPortfolioData(true), 30000);
    
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

  // Analyze portfolio function - add after formatTimestamp function
  const analyzePortfolio = async () => {
    setIsAnalysisLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.analyzeBinancePortfolio();
      
      console.log('Portfolio analysis response:', response);
      
      if (response.status === 'success') {
        setAnalysisData(response.data);
        
        // Show success notification
        toast.success('Portfolio analysis completed successfully', {
          position: 'top-right',
          autoClose: 3000,
        });
      } else {
        setError(response.data?.message || 'Failed to analyze portfolio');
        toast.error('Failed to analyze portfolio', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Error analyzing portfolio: ${errorMessage}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsAnalysisLoading(false);
    }
  };
  
  // Update portfolio data function - add after analyzePortfolio function
  const updatePortfolioData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.updateBinancePortfolioData();
      
      console.log('Portfolio update response:', response);
      
      if (response.status === 'success') {
        toast.success('Portfolio data updated successfully', {
          position: 'top-right',
          autoClose: 3000,
        });
        
        // Reload portfolio data with the updated information
        await fetchPortfolioData();
      } else {
        setError(response.data?.message || 'Failed to update portfolio data');
        toast.error('Failed to update portfolio data', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Error updating portfolio data: ${errorMessage}`, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-500/90 rounded-full flex items-center justify-center mr-3 shadow-lg">
              <svg viewBox="0 0 24 24" focusable="false" className="w-8 h-8">
                <path 
                  d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm0-9.8405l2.7175 2.7164-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm-4.6356 4.6595l-2.718-2.7154-2.7156 2.7164 2.7156 2.7154 2.718-2.7164z"
                  fill="#000"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
                Binance Portfolio
              </h1>
              <p className="text-slate-400 text-sm mt-1 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Real-time crypto portfolio analysis and insights
              </p>
            </div>
          </div>
          <Link to="/portfolio" className="text-blue-400 hover:text-blue-300 transition-colors p-2 bg-slate-800/50 rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">Error: {error}</p>
          <button 
            onClick={() => fetchPortfolioData(false)}
            className="mt-2 bg-red-500/30 hover:bg-red-500/50 px-3 py-1 rounded text-xs text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:w-2/3">
          {/* Portfolio Overview */}
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-5 mb-5 card shadow-lg hover:shadow-blue-900/10">
            <h2 className="text-2xl font-bold mb-4 border-l-4 border-blue-500 pl-3 section-header flex items-center">
              Portfolio Overview

              <div className="flex items-center ml-auto">
                {/* Analysis button */}
                <button 
                  onClick={analyzePortfolio}
                  disabled={isAnalysisLoading || isLoading}
                  className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg mr-2 transition-colors flex items-center"
                >
                  {isAnalysisLoading ? (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Analyze</span>
                    </>
                  )}
                </button>
                
                {/* Update button */}
                <button 
                  onClick={updatePortfolioData}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg mr-4 transition-colors flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Update</span>
                    </>
                  )}
                </button>
                
                {/* Last Updated text */}
                <span className="text-sm font-normal text-slate-400 flex items-center">
                  {(isLoading || isRefreshing) && (
                    <span className="inline-flex items-center mr-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-75 mr-1" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.4s' }}></div>
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Last Updated: {portfolioData.last_updated}
                </span>
              </div>
            </h2>
            
            {/* Total Value Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 shadow-md hover:shadow-blue-900/20 transition-all border border-slate-700/50 mb-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-bl-full"></div>
              <div className="absolute top-2 right-2 w-10 h-10 bg-yellow-500/70 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" focusable="false" className="w-6 h-6">
                  <path 
                    d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm0-9.8405l2.7175 2.7164-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm-4.6356 4.6595l-2.718-2.7154-2.7156 2.7164 2.7156 2.7154 2.718-2.7164z"
                    fill="#000"
                  />
                </svg>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">Total Portfolio Value</p>
                  <div className="flex items-center">
                    <p className="text-3xl font-bold text-white">{formatCurrency(portfolioData.total_value)}</p>
                    <span className={`text-sm font-medium ml-3 px-2 py-1 rounded-full ${portfolioData.change_24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {formatPercentage(portfolioData.change_24h)} (24h)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center text-slate-400 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {portfolioData.holdings_count} assets across {spotHoldings.length + marginHoldings.length + futuresHoldings.length} positions
                </div>
                <div className="text-sm text-slate-400 flex items-center">
                  
                  {/* Last updated: {portfolioData.last_updated} */}
                </div>
              </div>
            </div>

            {/* Holding Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Spot Holding Card */}
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-xl p-4 border border-blue-500/30 shadow-md hover:shadow-blue-900/20 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
                <div className="flex items-center mb-2">
                  {/* Replace the colored dot with top coin icon if available */}
                  {spotHoldings.length > 0 ? (
                    <div className="w-8 h-8 mr-2 relative">
                      <img
                        src={getCoinIconUrl(spotHoldings[0].symbol)}
                        alt={spotHoldings[0].symbol}
                        className="w-8 h-8 rounded-full object-cover bg-blue-900/30 border border-blue-500/30"
                        onError={({currentTarget}) => {
                          // If the first URL fails, try CoinGecko URL
                          currentTarget.onerror = () => {
                            // If CoinGecko also fails, replace with fallback icon
                            currentTarget.onerror = null;
                            currentTarget.style.display = 'none';
                            currentTarget.nextElementSibling!.style.display = 'flex';
                          };
                          currentTarget.src = getCoinGeckoIconUrl(spotHoldings[0].symbol);
                        }}
                      />
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/80 to-blue-600/50 flex items-center justify-center text-sm font-bold"
                        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                      >
                        <span className="inline-block w-4 h-4 bg-blue-500 rounded-full"></span>
                      </div>
                      
                      {/* If there are multiple coins, show a stacked effect */}
                      {spotHoldings.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-800 border border-blue-500 flex items-center justify-center text-xs text-white font-bold">
                          +{spotHoldings.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-block w-4 h-4 bg-blue-500 rounded-full mr-2"></span>
                  )}
                  <h3 className="text-lg font-bold text-blue-400">Spot</h3>
                </div>
                
                <div className="mb-2">
                  <p className="text-slate-400 text-xs mb-1">Total Investment</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(portfolioData.spot_value)}</p>
                </div>
                
                <div className="mb-2">
                  <p className="text-slate-400 text-xs mb-1">24h Change</p>
                  <p className={`text-base font-semibold ${portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(portfolioData.change_24h)}
                    <span className="text-slate-400 text-xs ml-1">({spotHoldings.length > 0 && spotHoldings[0].change_24h ? formatCurrency(portfolioData.spot_value * portfolioData.change_24h / 100) : '$0.00'})</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-slate-400 text-xs mb-1">Total P&L</p>
                  {spotHoldings.length > 0 && spotHoldings.some(h => h.pnl !== undefined) ? (
                    <p className={`text-base font-semibold ${calculateTotalPnL(spotHoldings) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(calculateTotalPnL(spotHoldings))}
                      <span className="text-slate-400 text-xs ml-1">
                        ({calculateTotalPnLPercentage(spotHoldings)}%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-base font-semibold text-slate-400">Not available</p>
                  )}
                </div>
                
                <div className="mt-3 text-xs text-slate-400 flex justify-between items-center">
                  <span>{spotHoldings.length} coins</span>
                  <span>{Math.round((portfolioData.spot_value / portfolioData.total_value * 100) || 0)}% of portfolio</span>
                </div>
              </div>
              
              {/* Margin Holding Card */}
              <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 rounded-xl p-4 border border-green-500/30 shadow-md hover:shadow-green-900/20 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full"></div>
                <div className="flex items-center mb-2">
                  {/* Replace the colored dot with top coin icon if available */}
                  {marginHoldings.length > 0 ? (
                    <div className="w-8 h-8 mr-2 relative">
                      <img
                        src={getCoinIconUrl(marginHoldings[0].symbol)}
                        alt={marginHoldings[0].symbol}
                        className="w-8 h-8 rounded-full object-cover bg-green-900/30 border border-green-500/30"
                        onError={({currentTarget}) => {
                          // If the first URL fails, try CoinGecko URL
                          currentTarget.onerror = () => {
                            // If CoinGecko also fails, replace with fallback icon
                            currentTarget.onerror = null;
                            currentTarget.style.display = 'none';
                            currentTarget.nextElementSibling!.style.display = 'flex';
                          };
                          currentTarget.src = getCoinGeckoIconUrl(marginHoldings[0].symbol);
                        }}
                      />
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/80 to-green-600/50 flex items-center justify-center text-sm font-bold"
                        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                      >
                        <span className="inline-block w-4 h-4 bg-green-500 rounded-full"></span>
                      </div>
                      
                      {/* If there are multiple coins, show a stacked effect */}
                      {marginHoldings.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-800 border border-green-500 flex items-center justify-center text-xs text-white font-bold">
                          +{marginHoldings.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                  )}
                  <h3 className="text-lg font-bold text-green-400">Margin</h3>
                </div>
                
                <div className="mb-2">
                  <p className="text-slate-400 text-xs mb-1">Total Investment</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(portfolioData.margin_value)}</p>
                </div>
                
                <div className="mb-2">
                  <p className="text-slate-400 text-xs mb-1">24h Change</p>
                  <p className={`text-base font-semibold ${portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(portfolioData.change_24h)}
                    <span className="text-slate-400 text-xs ml-1">({marginHoldings.length > 0 && marginHoldings[0].change_24h ? formatCurrency(portfolioData.margin_value * portfolioData.change_24h / 100) : '$0.00'})</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-slate-400 text-xs mb-1">Total P&L</p>
                  {marginHoldings.length > 0 && marginHoldings.some(h => h.pnl !== undefined) ? (
                    <p className={`text-base font-semibold ${calculateTotalPnL(marginHoldings) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(calculateTotalPnL(marginHoldings))}
                      <span className="text-slate-400 text-xs ml-1">
                        ({calculateTotalPnLPercentage(marginHoldings)}%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-base font-semibold text-slate-400">Not available</p>
                  )}
                </div>
                
                <div className="mt-3 text-xs text-slate-400 flex justify-between items-center">
                  <span>{marginHoldings.length} coins</span>
                  <span>{Math.round((portfolioData.margin_value / portfolioData.total_value * 100) || 0)}% of portfolio</span>
                </div>
              </div>
              
              {/* Futures Holding Card */}
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-xl p-4 border border-orange-500/30 shadow-md hover:shadow-orange-900/20 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full"></div>
                <div className="flex items-center mb-2">
                  {/* Replace the colored dot with top coin icon if available */}
                  {futuresHoldings.length > 0 ? (
                    <div className="w-8 h-8 mr-2 relative">
                      <img
                        src={getCoinIconUrl(futuresHoldings[0].symbol)}
                        alt={futuresHoldings[0].symbol}
                        className="w-8 h-8 rounded-full object-cover bg-orange-900/30 border border-orange-500/30"
                        onError={({currentTarget}) => {
                          // If the first URL fails, try CoinGecko URL
                          currentTarget.onerror = () => {
                            // If CoinGecko also fails, replace with fallback icon
                            currentTarget.onerror = null;
                            currentTarget.style.display = 'none';
                            currentTarget.nextElementSibling!.style.display = 'flex';
                          };
                          currentTarget.src = getCoinGeckoIconUrl(futuresHoldings[0].symbol);
                        }}
                      />
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/80 to-orange-600/50 flex items-center justify-center text-sm font-bold"
                        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                      >
                        <span className="inline-block w-4 h-4 bg-orange-500 rounded-full"></span>
                      </div>
                      
                      {/* If there are multiple coins, show a stacked effect */}
                      {futuresHoldings.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-800 border border-orange-500 flex items-center justify-center text-xs text-white font-bold">
                          +{futuresHoldings.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-block w-4 h-4 bg-orange-500 rounded-full mr-2"></span>
                  )}
                  <h3 className="text-lg font-bold text-orange-400">Futures</h3>
                </div>
                
                <div className="mb-2">
                  <p className="text-slate-400 text-xs mb-1">Total Investment</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(portfolioData.futures_value)}</p>
                </div>
                
                <div className="mb-2">
                  <p className="text-slate-400 text-xs mb-1">24h Change</p>
                  <p className={`text-base font-semibold ${portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(portfolioData.change_24h)}
                    <span className="text-slate-400 text-xs ml-1">({futuresHoldings.length > 0 && futuresHoldings[0].change_24h ? formatCurrency(portfolioData.futures_value * portfolioData.change_24h / 100) : '$0.00'})</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-slate-400 text-xs mb-1">Total P&L</p>
                  {futuresHoldings.length > 0 && futuresHoldings.some(h => h.pnl !== undefined) ? (
                    <p className={`text-base font-semibold ${calculateTotalPnL(futuresHoldings) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(calculateTotalPnL(futuresHoldings))}
                      <span className="text-slate-400 text-xs ml-1">
                        ({calculateTotalPnLPercentage(futuresHoldings)}%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-base font-semibold text-slate-400">Not available</p>
                  )}
                </div>
                
                <div className="mt-3 text-xs text-slate-400 flex justify-between items-center">
                  <span>{futuresHoldings.length} coins</span>
                  <span>{Math.round((portfolioData.futures_value / portfolioData.total_value * 100) || 0)}% of portfolio</span>
                </div>
              </div>
            </div>

            {/* Holdings Section with Tabs */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-5 mt-6 card">
              <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3 section-header">Holdings</h2>
              
              <div className="flex border-b border-slate-700/50 mb-5">
                <button 
                  className={`flex-1 text-base py-2 px-4 focus:outline-none font-medium transition-colors ${
                    activeTab === 'spot' 
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' 
                      : 'border-b-2 border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                  }`}
                  onClick={() => setActiveTab('spot')}
                >
                  Spot Trading
                </button>
                <button 
                  className={`flex-1 text-base py-2 px-4 focus:outline-none font-medium transition-colors ${
                    activeTab === 'margin' 
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' 
                      : 'border-b-2 border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                  }`}
                  onClick={() => setActiveTab('margin')}
                >
                  Cross Margin
                </button>
                <button 
                  className={`flex-1 text-base py-2 px-4 focus:outline-none font-medium transition-colors ${
                    activeTab === 'futures' 
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' 
                      : 'border-b-2 border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                  }`}
                  onClick={() => setActiveTab('futures')}
                >
                  Futures
                </button>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                {activeTab === 'spot' && (
                  <>
                    {spotHoldings.length > 0 ? (
                      <div className="bg-slate-900/30 rounded-lg p-1">
                        <HoldingsTable holdings={spotHoldings} />
                      </div>
                    ) : (
                      <div className="bg-slate-900/30 rounded-lg p-6">
                        <p className="text-slate-400 text-center py-4 flex items-center justify-center">
                          {isLoading ? (
                            <>
                              <span className="mr-2">Fetching spot holdings</span>
                              <span className="inline-flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-75 mr-1" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.4s' }}></div>
                              </span>
                            </>
                          ) : (
                            "No spot holdings found."
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {activeTab === 'margin' && (
                  <>
                    {marginHoldings.length > 0 ? (
                      <div className="bg-slate-900/30 rounded-lg p-1">
                        <HoldingsTable holdings={marginHoldings} />
                      </div>
                    ) : (
                      <div className="bg-slate-900/30 rounded-lg p-6">
                        <p className="text-slate-400 text-center py-4 flex items-center justify-center">
                          {isLoading ? (
                            <>
                              <span className="mr-2">Fetching margin holdings</span>
                              <span className="inline-flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-75 mr-1" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.4s' }}></div>
                              </span>
                            </>
                          ) : (
                            "No margin holdings found."
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {activeTab === 'futures' && (
                  <>
                    {futuresHoldings.length > 0 ? (
                      <div className="bg-slate-900/30 rounded-lg p-1">
                        <HoldingsTable holdings={futuresHoldings} />
                      </div>
                    ) : (
                      <div className="bg-slate-900/30 rounded-lg p-6">
                        <p className="text-slate-400 text-center py-4 flex items-center justify-center">
                          {isLoading ? (
                            <>
                              <span className="mr-2">Fetching futures holdings</span>
                              <span className="inline-flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-75 mr-1" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.4s' }}></div>
                              </span>
                            </>
                          ) : (
                            "No futures holdings found."
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Box - 1/3 width - make it more compact */}
        <div className="lg:w-1/3">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-5 sticky top-4 card">
            <h2 className="text-xl font-semibold mb-3 border-l-4 border-blue-500 pl-3 section-header">Portfolio Query</h2>
            <p className="text-slate-400 text-sm mb-4">
              Ask questions about your portfolio to get instant insights about your holdings, performance, and trends.
            </p>
            <div className="bg-slate-900/30 rounded-lg p-2">
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

      {/* Add Analysis Results Section */}
      {analysisData && (
        <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 rounded-xl p-5 border border-indigo-500/30 shadow-md hover:shadow-indigo-900/20 transition-all mt-6">
          <h3 className="text-xl font-bold text-indigo-400 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Portfolio Analysis Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Metrics */}
            {analysisData.risk_metrics && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/30">
                <h4 className="text-lg font-semibold text-indigo-300 mb-3">Risk Metrics</h4>
                <div className="space-y-2">
                  {Object.entries(analysisData.risk_metrics).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-slate-400">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-white font-medium">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {analysisData.recommendations && analysisData.recommendations.length > 0 && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/30">
                <h4 className="text-lg font-semibold text-indigo-300 mb-3">Recommendations</h4>
                <ul className="space-y-2 list-disc pl-5 text-slate-300">
                  {analysisData.recommendations.map((recommendation: string, index: number) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Sector Exposure */}
            {analysisData.sector_exposure && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/30">
                <h4 className="text-lg font-semibold text-indigo-300 mb-3">Sector Exposure</h4>
                <div className="space-y-2">
                  {Object.entries(analysisData.sector_exposure).map(([sector, percentage]: [string, any]) => (
                    <div key={sector} className="flex justify-between items-center">
                      <span className="text-slate-400">{sector}</span>
                      <span className="text-white font-medium">{typeof percentage === 'number' ? formatPercentage(percentage * 100) : percentage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Asset Performance */}
            {analysisData.asset_performance && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/30">
                <h4 className="text-lg font-semibold text-indigo-300 mb-3">Asset Performance</h4>
                <div className="space-y-2">
                  {Object.entries(analysisData.asset_performance).map(([asset, performance]: [string, any]) => (
                    <div key={asset} className="flex justify-between items-center">
                      <span className="text-slate-400">{asset}</span>
                      <span className={`font-medium ${performance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {typeof performance === 'number' ? formatPercentage(performance * 100) : performance}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BinancePortfolio;