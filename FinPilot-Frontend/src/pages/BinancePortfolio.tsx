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

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Binance Portfolio
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Analyze your Binance portfolio with detailed insights
            </p>
          </div>
          <Link to="/portfolio" className="text-blue-400 hover:text-blue-300 transition-colors">
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
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-4 mb-5 card">
            <h2 className="text-xl font-semibold mb-3 border-l-4 border-blue-500 pl-3 section-header">Portfolio Overview</h2>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-800 rounded-lg p-3 shadow-lg hover:shadow-blue-900/20 transition-all">
                <p className="text-slate-400 text-sm mb-1">Total Value</p>
                <p className="text-xl font-bold text-white">{formatCurrency(portfolioData.total_value)}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 shadow-lg hover:shadow-blue-900/20 transition-all">
                <p className="text-slate-400 text-sm mb-1">24h Change</p>
                <p className={`text-xl font-bold ${portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercentage(portfolioData.change_24h)}
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 shadow-lg hover:shadow-blue-900/20 transition-all">
                <p className="text-slate-400 text-sm mb-1">Holdings</p>
                <p className="text-xl font-bold text-white">{portfolioData.holdings_count}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 shadow-lg hover:shadow-blue-900/20 transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Last Updated</span>
                  {(isLoading || isRefreshing) && (
                    <span className="inline-flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-75 mr-1" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.4s' }}></div>
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-300 mt-1">{portfolioData.last_updated}</p>
              </div>
            </div>
            
            {/* Portfolio Composition & Charts */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Portfolio Composition with 24h changes */}
              <div className="md:w-1/2">
                <div className="bg-slate-800/50 rounded-lg p-3 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 text-sm font-medium">Spot Holdings</span>
                    <div className="text-right">
                      <span className="font-medium text-slate-200 text-sm block">{formatCurrency(portfolioData.spot_value)}</span>
                      <span className={`text-xs ${spotHoldings.length > 0 && spotHoldings[0].change_24h !== undefined ? 
                        (spotHoldings[0].change_24h >= 0 ? 'text-green-500' : 'text-red-500') : 
                        (portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500')}`}>
                        {spotHoldings.length > 0 && spotHoldings[0].change_24h !== undefined ? 
                          formatPercentage(spotHoldings[0].change_24h) : 
                          formatPercentage(portfolioData.change_24h)} (24h)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/50 h-2 rounded-full">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(portfolioData.spot_value / portfolioData.total_value * 100) || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>{spotHoldings.length} coins</span>
                    <span>{Math.round((portfolioData.spot_value / portfolioData.total_value * 100) || 0)}% of portfolio</span>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-3 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 text-sm font-medium">Margin Holdings</span>
                    <div className="text-right">
                      <span className="font-medium text-slate-200 text-sm block">{formatCurrency(portfolioData.margin_value)}</span>
                      <span className={`text-xs ${marginHoldings.length > 0 && marginHoldings[0].change_24h !== undefined ? 
                        (marginHoldings[0].change_24h >= 0 ? 'text-green-500' : 'text-red-500') : 
                        (portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500')}`}>
                        {marginHoldings.length > 0 && marginHoldings[0].change_24h !== undefined ? 
                          formatPercentage(marginHoldings[0].change_24h) : 
                          formatPercentage(portfolioData.change_24h)} (24h)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/50 h-2 rounded-full">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(portfolioData.margin_value / portfolioData.total_value * 100) || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>{marginHoldings.length} coins</span>
                    <span>{Math.round((portfolioData.margin_value / portfolioData.total_value * 100) || 0)}% of portfolio</span>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 text-sm font-medium">Futures Holdings</span>
                    <div className="text-right">
                      <span className="font-medium text-slate-200 text-sm block">{formatCurrency(portfolioData.futures_value)}</span>
                      <span className={`text-xs ${futuresHoldings.length > 0 && futuresHoldings[0].change_24h !== undefined ? 
                        (futuresHoldings[0].change_24h >= 0 ? 'text-green-500' : 'text-red-500') : 
                        (portfolioData.change_24h >= 0 ? 'text-green-500' : 'text-red-500')}`}>
                        {futuresHoldings.length > 0 && futuresHoldings[0].change_24h !== undefined ? 
                          formatPercentage(futuresHoldings[0].change_24h) : 
                          formatPercentage(portfolioData.change_24h)} (24h)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/50 h-2 rounded-full">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${(portfolioData.futures_value / portfolioData.total_value * 100) || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>{futuresHoldings.length} coins</span>
                    <span>{Math.round((portfolioData.futures_value / portfolioData.total_value * 100) || 0)}% of portfolio</span>
                  </div>
                </div>
              </div>
              
              {/* Investment Type Chart */}
              <div className="md:w-1/2">
                <h3 className="text-sm font-medium text-slate-300 mb-2 text-center">Investment Distribution</h3>
                <div className="h-52 flex items-center justify-center">
                  <canvas ref={chartRef}></canvas>
                </div>
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
    </div>
  );
}

export default BinancePortfolio;