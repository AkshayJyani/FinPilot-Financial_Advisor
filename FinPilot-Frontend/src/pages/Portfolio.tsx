import { Link } from 'react-router-dom';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import ApiService from '../services/apiService';

function Portfolio() {
  const [binanceData, setBinanceData] = useState({
    total_value: 0,
    change_24h: 0
  });
  const [kiteData, setKiteData] = useState({
    total_value: 0,
    change_24h: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch Binance data from API
        const binanceResponse = await ApiService.getBinanceHoldings();
        if (binanceResponse.status === 'success' && binanceResponse.data) {
          // Calculate total value either from API or calculate from holdings if needed
          let totalValue = binanceResponse.data.total_value || 0;
          const spotValue = binanceResponse.data.spot_value || 0;
          const marginValue = binanceResponse.data.margin_value || 0;
          const futuresValue = binanceResponse.data.futures_value || 0;
          
          // If total_value is not provided, calculate it from components
          if (totalValue === 0 && (spotValue > 0 || marginValue > 0 || futuresValue > 0)) {
            totalValue = spotValue + marginValue + futuresValue;
          }

          setBinanceData({
            total_value: totalValue,
            change_24h: binanceResponse.data.change_24h || 0
          });
        } else {
          console.error('Failed to fetch Binance data:', binanceResponse);
          if (binanceResponse.status === 'error') {
            setError(binanceResponse.data.message || 'Failed to load Binance portfolio');
          }
        }

        // Simulate fetching Kite data (keeping this as is for now)
        setKiteData({
          total_value: 12345.67,
          change_24h: -0.75
        });
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError('Failed to load portfolio data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  // Calculate total portfolio value
  const totalPortfolioValue = binanceData.total_value + kiteData.total_value;
  const totalPortfolioPercentage = ((binanceData.change_24h * binanceData.total_value + kiteData.change_24h * kiteData.total_value) / totalPortfolioValue);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Portfolio Analysis
            </h1>
            <p className="text-slate-400 mt-1">
              Analyze your investment portfolios with detailed insights
            </p>
          </div>
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </div>
      </header>

      {/* Portfolio Overview Card */}
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Portfolio Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Total Portfolio Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">24h Change</p>
            <p className={`text-2xl font-bold ${totalPortfolioPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(totalPortfolioPercentage)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Active Investments</p>
            <p className="text-2xl font-bold">2</p>
          </div>
        </div>
        {error && (
          <div className="mt-4 text-red-500 bg-red-900/20 rounded p-2">
            {error}
          </div>
        )}
        {isLoading && (
          <div className="mt-4 text-blue-400">
            Loading portfolio data...
          </div>
        )}
      </div>

      {/* Portfolio Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Binance Portfolio Card */}
        <Link
          to="/binance-portfolio"
          className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20 cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-900/20 rounded-xl p-4 inline-flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <span className="text-sm text-blue-400">View details →</span>
          </div>
          <h2 className="text-2xl font-semibold mb-3">Binance Portfolio</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-400 text-sm">Total Value</p>
              <p className="text-xl font-bold">{formatCurrency(binanceData.total_value)}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-400 text-sm">24h Change</p>
              <p className={`text-xl font-bold ${binanceData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(binanceData.change_24h)}
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            Track your crypto investments across spot, margin, and futures trading
          </p>
        </Link>

        {/* Kite Portfolio Card */}
        <Link
          to="/kite-portfolio"
          className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20 cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-900/20 rounded-xl p-4 inline-flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <span className="text-sm text-blue-400">View details →</span>
          </div>
          <h2 className="text-2xl font-semibold mb-3">Kite Portfolio</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-400 text-sm">Total Value</p>
              <p className="text-xl font-bold">{formatCurrency(kiteData.total_value)}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-400 text-sm">24h Change</p>
              <p className={`text-xl font-bold ${kiteData.change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(kiteData.change_24h)}
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            Monitor your stock market investments and trading positions
          </p>
        </Link>
      </div>
    </div>
  );
}

export default Portfolio;