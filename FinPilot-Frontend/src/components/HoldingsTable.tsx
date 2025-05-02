import React from 'react';

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

interface HoldingsTableProps {
  holdings: Holding[];
}

function HoldingsTable({ holdings }: HoldingsTableProps) {
  // Format currency values without $ symbol
  const formatCurrency = (value: number) => {
    if (!isFinite(Number(value))) return '0.00 USDT';
    
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    
    return (
      <span>
        {formattedValue} <span className="text-xs text-slate-400">USDT</span>
      </span>
    );
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

  // Format combined value and percentage
  const formatValueWithPercentage = (value: number, percentage: number) => {
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    
    const formattedPercentage = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'always'
    }).format(percentage / 100);
    
    return (
      <div>
        <span>{formattedValue} </span>
        <span className="text-xs text-slate-400">USDT</span>
        <div className="text-xs mt-0.5">({formattedPercentage})</div>
      </div>
    );
  };

  // Get coin icon URL - use CoinGecko's free API
  const getCoinIconUrl = (symbol: string) => {
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
    return `https://assets.coingecko.com/coins/images/small/${coinId}.png`;
  };

  // Fallback icon in case the API URL fails
  const renderFallbackIcon = (symbol: string) => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/80 to-blue-600/50 flex items-center justify-center text-sm font-bold">
      {symbol.substring(0, 2)}
    </div>
  );

  return (
    <div className="overflow-x-auto">
      {holdings.length > 0 ? (
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="pb-3 pr-4 text-slate-300 font-medium text-base sticky left-0 bg-slate-900/30">
                <div className="border-b-2 border-blue-500 pb-1 inline-block">Asset</div>
              </th>
              <th className="pb-3 pr-4 text-slate-300 font-medium text-base">
                <div className="border-b-2 border-green-500 pb-1 inline-block">
                  <div>Holdings</div>
                  <div className="text-xs text-slate-400 mt-0.5">Value</div>
                </div>
              </th>
              <th className="pb-3 pr-4 text-slate-300 font-medium text-base">
                <div className="border-b-2 border-purple-500 pb-1 inline-block">
                  <div>Price</div>
                  <div className="text-xs text-slate-400 mt-0.5">Avg Buy</div>
                </div>
              </th>
              <th className="pb-3 pr-4 text-slate-300 font-medium text-base">
                <div className="border-b-2 border-orange-500 pb-1 inline-block">
                  <div>24h Change</div>
                </div>
              </th>
              <th className="pb-3 pr-4 text-slate-300 font-medium text-base">
                <div className="border-b-2 border-pink-500 pb-1 inline-block">
                  <div>PNL</div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <tr key={index} className={`group relative transition-all duration-200 hover:bg-slate-800/50 ${index !== 0 ? "border-t border-slate-700/20" : ""}`}>
                <td className="py-3 pr-4 sticky left-0 bg-slate-900/30 group-hover:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@bea1507f8c1d8d5d9b113170d5a5b05ca8c13009/128/color/${holding.symbol.toLowerCase()}.png`}
                      alt={holding.symbol}
                      className="w-8 h-8 rounded-full object-cover bg-slate-800/50"
                      onError={({currentTarget}) => {
                        // If the first URL fails, try CoinGecko URL
                        currentTarget.onerror = () => {
                          // If CoinGecko also fails, replace with fallback text icon
                          currentTarget.onerror = null;
                          currentTarget.style.display = 'none';
                          currentTarget.nextElementSibling!.style.display = 'flex';
                        };
                        currentTarget.src = getCoinIconUrl(holding.symbol);
                      }}
                    />
                    <div 
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/80 to-blue-600/50 flex items-center justify-center text-sm font-bold"
                      style={{ display: 'none' }}
                    >
                      {holding.symbol.substring(0, 2)}
                    </div>
                    <div className="text-lg font-bold text-white tracking-wide">
                      {holding.symbol}
                    </div>
                  </div>
                </td>
                
                <td className="py-3 pr-4">
                  <div className="text-base font-medium text-slate-200">
                    {formatNumber(holding.amount)} <span className="text-sm text-slate-400">{holding.symbol}</span>
                  </div>
                  <div className="text-sm text-slate-400 mt-0.5">
                    {formatCurrency(holding.total_usd)}
                  </div>
                </td>
                
                <td className="py-3 pr-4">
                  <div className="text-base font-medium text-slate-200">
                    {formatCurrency(holding.price_usd)}
                  </div>
                  <div className="text-sm text-slate-400 mt-0.5">
                    {holding.avg_buy_price ? formatCurrency(holding.avg_buy_price) : '-'}
                  </div>
                </td>
                
                <td className="py-3 pr-4">
                  {holding.change_24h !== undefined ? (
                    <div className={`text-base font-medium ${
                      holding.change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatValueWithPercentage(
                        holding.total_usd * (holding.change_24h / 100),
                        holding.change_24h
                      )}
                    </div>
                  ) : (
                    <div className="text-base text-slate-400">No data</div>
                  )}
                </td>
                
                <td className="py-3 pr-4">
                  {holding.pnl !== undefined && holding.pnl_percentage !== undefined ? (
                    <div className={`text-base font-medium ${
                      holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatValueWithPercentage(holding.pnl, holding.pnl_percentage)}
                    </div>
                  ) : (
                    <div className="text-base text-slate-400">No data</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="bg-slate-800/50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p className="text-slate-400">No holdings found in this category.</p>
          <p className="text-slate-500 text-sm mt-1">Holdings will appear here once you have assets in this section.</p>
        </div>
      )}
    </div>
  );
}

export default HoldingsTable;