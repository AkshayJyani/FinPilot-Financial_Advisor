import React from 'react';

interface Holding {
  symbol: string;
  amount: number;
  price_usd: number;
  total_usd: number;
  change_24h?: number;
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

  return (
    <div className="overflow-x-auto">
      {holdings.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-400 text-sm">
              <th className="pb-3">Asset</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Price (USD)</th>
              <th className="pb-3">Value (USD)</th>
              <th className="pb-3">24h Change</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <tr key={index} className="text-slate-300 border-t border-slate-700/40">
                <td className="py-3">{holding.symbol}</td>
                <td className="py-3">{formatNumber(holding.amount)}</td>
                <td className="py-3">{formatCurrency(holding.price_usd)}</td>
                <td className="py-3">{formatCurrency(holding.total_usd)}</td>
                <td className={`py-3 ${
                  holding.change_24h === undefined ? '' : 
                  holding.change_24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatPercentage(holding.change_24h)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-400 py-3 text-center">No holdings found.</p>
      )}
    </div>
  );
}

export default HoldingsTable;