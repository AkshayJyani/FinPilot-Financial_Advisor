import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import { Chart, registerables } from 'chart.js';
import HoldingsTable from '../components/HoldingsTable';

// Register Chart.js components
Chart.register(...registerables);

function KitePortfolio() {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const [chartInstance, setChartInstance] = useState<Chart | null>(null);
  const [portfolioData, setPortfolioData] = useState({
    total_value: 12345.67,
    change_24h: -0.75,
    holdings_count: 8,
    equity_value: 9876.54,
    mutual_fund_value: 2469.13,
    last_updated: new Date().toLocaleTimeString()
  });
  
  const [equityHoldings, setEquityHoldings] = useState([
    { symbol: 'RELIANCE', amount: 25, price_usd: 120.5, total_usd: 3012.5 },
    { symbol: 'INFY', amount: 50, price_usd: 45.23, total_usd: 2261.5 },
    { symbol: 'HDFC', amount: 15, price_usd: 78.35, total_usd: 1175.25 },
    { symbol: 'TCS', amount: 12, price_usd: 67.89, total_usd: 814.68 },
    { symbol: 'BHARTIARTL', amount: 35, price_usd: 23.45, total_usd: 820.75 },
    { symbol: 'HDFCBANK', amount: 20, price_usd: 89.65, total_usd: 1793.0 }
  ]);
  
  const [mutualFundHoldings, setMutualFundHoldings] = useState([
    { symbol: 'HDFC Mid-Cap Opportunities', amount: 150, price_usd: 8.45, total_usd: 1267.5 },
    { symbol: 'Axis Bluechip', amount: 200, price_usd: 6.01, total_usd: 1202.0 }
  ]);

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

  // Initialize chart
  useEffect(() => {
    let chart: Chart | null = null;

    const initChart = () => {
      if (!chartRef.current) return;

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Equity', 'Mutual Funds'],
          datasets: [{
            data: [
              portfolioData.equity_value, 
              portfolioData.mutual_fund_value
            ],
            backgroundColor: [
              '#3b82f6', // Blue for Equity
              '#f59e0b'  // Orange for Mutual Funds
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
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
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = portfolioData.total_value;
                  const percentage = ((value / total) * 100).toFixed(2);
                  return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
      
      setChartInstance(chart);
    };

    // Destroy existing chart before creating a new one
    if (chartInstance) {
      chartInstance.destroy();
    }

    setChartInstance(null);

    // Create new chart
    initChart();

    // Cleanup on unmount or before re-render
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, [portfolioData.equity_value, portfolioData.mutual_fund_value, portfolioData.total_value]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Kite Portfolio
            </h1>
            <p className="text-slate-400 mt-1">
              Analyze your stock market investments with detailed insights
            </p>
          </div>
          <Link to="/portfolio" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content - 2/3 width */}
        <div className="lg:w-2/3">
          {/* Portfolio Overview */}
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3">Portfolio Overview</h2>
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
                      <span className="text-slate-400 text-xs">Equity Value</span>
                      <span className="font-medium text-slate-200 text-sm">{formatCurrency(portfolioData.equity_value)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Mutual Fund Value</span>
                      <span className="font-medium text-slate-200 text-sm">{formatCurrency(portfolioData.mutual_fund_value)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Last Updated</span>
                      <span className="font-medium text-slate-200 text-sm">{portfolioData.last_updated}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Invested Value</span>
                      <span className="font-medium text-slate-200 text-sm">{formatCurrency(portfolioData.total_value * 0.92)}</span>
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
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3">Holdings</h2>
            
            {/* Equity Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3 text-blue-400">Equity Holdings</h3>
              <HoldingsTable holdings={equityHoldings} />
            </div>
            
            {/* Mutual Funds Section */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-blue-400">Mutual Funds</h3>
              <HoldingsTable holdings={mutualFundHoldings} />
            </div>
          </div>
        </div>

        {/* Chat Box - 1/3 width */}
        <div className="lg:w-1/3">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4 border-l-4 border-blue-500 pl-3">Portfolio Query</h2>
            <p className="text-slate-400 text-sm mb-4">
              Ask questions about your portfolio and get instant insights.
            </p>
            <ChatBox 
              initialMessage="Hello! I can help you analyze your Kite portfolio. What would you like to know?"
              placeholder="Ask about your portfolio..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default KitePortfolio;