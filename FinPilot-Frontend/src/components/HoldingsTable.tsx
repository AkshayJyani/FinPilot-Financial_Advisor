import React from 'react';

interface Holding {
  symbol: string;
  amount: number;
  price_usd: number;
  total_usd: number;
  change_24h?: number;
  avg_buy_price?: number;
  pnl_percentage?: number;
  first_buy_time?: number;
  last_buy_time?: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
}

function HoldingsTable({ holdings }: HoldingsTableProps) {
  // Format currency values
  const formatCurrency = (value: number) => {
    if (!isFinite(Number(value))) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format number with appropriate decimals
  const formatNumber = (value: number, decimals = 6) => {
    if (!isFinite(Number(value))) return '0';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: value < 0.1 ? decimals : 2,
      maximumFractionDigits: value < 0.1 ? decimals : 2
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value?: number) => {
    if (value === undefined || !isFinite(Number(value))) return '-';
    
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'always'
    }).format(value / 100);
  };

  // Format timestamp
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="overflow-x-auto">
      {holdings.length > 0 ? (
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="pb-2 pr-2 text-slate-300 font-medium text-sm w-1/6">
                <div className="border-b-2 border-blue-500 pb-1 inline-block">Asset</div>
              </th>
              <th className="pb-2 pr-2 text-slate-300 font-medium text-sm w-1/4">
                <div className="border-b-2 border-green-500 pb-1 inline-block">
                  <div>Value</div>
                  <div className="text-xs text-slate-400 mt-0.5">Price</div>
                </div>
              </th>
              <th className="pb-2 pr-2 text-slate-300 font-medium text-sm w-1/4">
                <div className="border-b-2 border-orange-500 pb-1 inline-block">
                  <div>24h Change</div>
                  <div className="text-xs text-slate-400 mt-0.5">Total</div>
                </div>
              </th>
              <th className="pb-2 pr-2 text-slate-300 font-medium text-sm w-1/4">
                <div className="border-b-2 border-purple-500 pb-1 inline-block">
                  <div>PNL</div>
                  <div className="text-xs text-slate-400 mt-0.5">Avg Buy</div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <React.Fragment key={index}>
                <tr className={`text-slate-300 ${index !== 0 ? "border-t border-slate-700/10" : ""} hover:bg-slate-800/20 transition-colors`}>
                  <td className="py-1 pr-2 font-medium" rowSpan={2}>
                    <div className="text-sm font-semibold flex items-center">
                      <div className="w-1 h-1 rounded-full bg-blue-500 mr-1"></div>
                      {holding.symbol}
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <div className="font-semibold text-sm">{formatCurrency(holding.total_usd)}</div>
                  </td>
                  <td className="py-1 pr-2">
                    <div className={`font-semibold text-sm ${
                      holding.change_24h === undefined ? 'text-slate-400' : 
                      holding.change_24h >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {holding.change_24h !== undefined && holding.change_24h >= 0 ? '▲' : holding.change_24h !== undefined ? '▼' : ''} {formatPercentage(holding.change_24h)}
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    {holding.pnl !== undefined ? (
                      <div className={`font-semibold text-sm ${holding.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(holding.pnl)}
                      </div>
                    ) : (
                      <div className="font-semibold text-sm text-slate-400">-</div>
                    )}
                  </td>
                </tr>
                <tr className="text-slate-300 hover:bg-slate-800/20 transition-colors">
                  <td className="py-1 pr-2">
                    <div className="text-xs text-slate-400">{formatCurrency(holding.price_usd)}</div>
                  </td>
                  <td className="py-1 pr-2">
                    {holding.pnl_percentage !== undefined && holding.pnl_percentage !== null ? (
                      <div className={`text-xs ${holding.pnl_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {holding.pnl_percentage >= 0 ? '▲' : '▼'} {formatPercentage(holding.pnl_percentage)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">-</div>
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    {holding.avg_buy_price ? (
                      <div className="text-xs text-slate-400 group relative">
                        {formatCurrency(holding.avg_buy_price)}
                        {holding.first_buy_time && (
                          <div className="absolute left-0 -bottom-8 bg-slate-800 text-xs text-slate-300 px-1.5 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            First buy: {formatDate(holding.first_buy_time)}
                            {holding.last_buy_time && holding.last_buy_time !== holding.first_buy_time && 
                              ` | Last buy: ${formatDate(holding.last_buy_time)}`
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">-</div>
                    )}
                  </td>
                </tr>
                {/* Add a smaller separator between different coins */}
                {index < holdings.length - 1 && (
                  <tr className="h-1">
                    <td colSpan={4} className="border-b border-slate-700/10"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-400 py-2 text-center">No holdings found.</p>
      )}
    </div>
  );
}

export default HoldingsTable;