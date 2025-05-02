from typing import Dict, List, Any
import time
import hmac
import hashlib
import requests
from binance.client import Client
from binance.exceptions import BinanceAPIException
from .data_models import InvestmentType


class BinanceClient:
    """Client for interacting with Binance API"""
    
    def __init__(self, api_key: str = "", api_secret: str = ""):
        """Initialize the Binance client with API credentials"""
        self.api_key = api_key
        self.api_secret = api_secret
        self.client = Client(api_key, api_secret) if api_key and api_secret else None
    
    def fetch_buy_trades(self, symbol: str) -> Dict[str, Any]:
        """Fetch buy trades for a specific symbol to determine average buy price"""
        try:
            # Format the symbol for API call if needed
            trading_pair = symbol
            if not symbol.endswith('USDT'):
                trading_pair = f"{symbol}USDT"
                
            # Define query parameters
            timestamp = int(time.time() * 1000)
            query_string = f"symbol={trading_pair}&timestamp={timestamp}"
            
            # Generate signature
            signature = hmac.new(
                self.api_secret.encode(), 
                query_string.encode(), 
                hashlib.sha256
            ).hexdigest()
            
            # Define headers and URL
            headers = {'X-MBX-APIKEY': self.api_key}
            url = f"https://api.binance.com/api/v3/myTrades?{query_string}&signature={signature}"
            
            # Make API request
            print(f"Fetching trade history for {trading_pair}")
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                trades = response.json()
                
                # Filter for buy trades only
                buy_trades = [t for t in trades if t.get('isBuyer', False)]
                
                if not buy_trades:
                    print(f"No buy trades found for {trading_pair}")
                    return {
                        'avg_buy_price': None,
                        'first_buy_time': None,
                        'last_buy_time': None,
                        'total_qty_bought': 0
                    }
                
                # Calculate total quantity and cost
                total_qty = sum(float(t['qty']) for t in buy_trades)
                total_cost = sum(float(t['qty']) * float(t['price']) for t in buy_trades)
                
                # Calculate average buy price
                avg_buy_price = total_cost / total_qty if total_qty > 0 else 0
                
                # Get first and last buy times
                buy_times = [int(t['time']) for t in buy_trades]
                first_buy_time = min(buy_times) if buy_times else None
                last_buy_time = max(buy_times) if buy_times else None
                
                print(f"Calculated average buy price for {trading_pair}: {avg_buy_price}")
                
                return {
                    'avg_buy_price': avg_buy_price,
                    'first_buy_time': first_buy_time,
                    'last_buy_time': last_buy_time,
                    'total_qty_bought': total_qty
                }
            else:
                print(f"Error fetching trades for {trading_pair}: {response.text}")
                return {
                    'avg_buy_price': None,
                    'first_buy_time': None,
                    'last_buy_time': None,
                    'total_qty_bought': 0
                }
                
        except Exception as e:
            print(f"Error in fetch_buy_trades for {symbol}: {e}")
            return {
                'avg_buy_price': None,
                'first_buy_time': None,
                'last_buy_time': None,
                'total_qty_bought': 0
            }
    
    def fetch_spot_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch spot trading holdings"""
        try:
            if not self.client:
                return {}
                
            account = self.client.get_account()
            holdings = {}
            for balance in account['balances']:
                if float(balance['free']) > 0 or float(balance['locked']) > 0:
                    # Get the current price of the asset in USD
                    symbol = f"{balance['asset']}USDT"
                    try:
                        ticker = self.client.get_symbol_ticker(symbol=symbol)
                        price_usd = float(ticker['price'])
                    except:
                        # If the asset doesn't have a direct USDT pair, try to get it through BTC
                        try:
                            btc_ticker = self.client.get_symbol_ticker(symbol=f"{balance['asset']}BTC")
                            btc_price = float(btc_ticker['price'])
                            usdt_ticker = self.client.get_symbol_ticker(symbol="BTCUSDT")
                            usdt_price = float(usdt_ticker['price'])
                            price_usd = btc_price * usdt_price
                        except:
                            # If we can't get the price, use 0
                            price_usd = 0
                    
                    # Calculate USD values
                    free = float(balance['free'])
                    locked = float(balance['locked'])
                    total = free + locked
                    usd_value = total * price_usd
                    
                    # Get buy price information
                    buy_data = self.fetch_buy_trades(balance['asset'])
                    avg_buy_price = buy_data.get('avg_buy_price')
                    
                    # Calculate PNL if buy price is available
                    pnl = None
                    pnl_percentage = None
                    if avg_buy_price is not None and avg_buy_price > 0:
                        pnl = (price_usd - avg_buy_price) * total
                        pnl_percentage = ((price_usd / avg_buy_price) - 1) * 100
                    
                    holdings[balance['asset']] = {
                        'free': free,
                        'locked': locked,
                        'total': total,
                        'total_usd': usd_value,
                        'type': InvestmentType.SPOT,
                        'price_usd': price_usd,
                        'avg_buy_price': avg_buy_price,
                        'pnl': pnl,
                        'pnl_percentage': pnl_percentage,
                        'first_buy_time': buy_data.get('first_buy_time'),
                        'last_buy_time': buy_data.get('last_buy_time')
                    }
            return holdings
        except BinanceAPIException as e:
            print(f"Error fetching spot holdings: {e}")
            return {}
    
    def fetch_margin_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch margin trading holdings"""
        try:
            if not self.client:
                return {}
                
            margin_account = self.client.get_margin_account()
            holdings = {}
            for asset in margin_account['userAssets']:
                if float(asset['netAsset']) > 0:
                    # Get the current price of the asset in USD
                    symbol = f"{asset['asset']}USDT"
                    try:
                        ticker = self.client.get_symbol_ticker(symbol=symbol)
                        price_usd = float(ticker['price'])
                    except:
                        # If the asset doesn't have a direct USDT pair, try to get it through BTC
                        try:
                            btc_ticker = self.client.get_symbol_ticker(symbol=f"{asset['asset']}BTC")
                            btc_price = float(btc_ticker['price'])
                            usdt_ticker = self.client.get_symbol_ticker(symbol="BTCUSDT")
                            usdt_price = float(usdt_ticker['price'])
                            price_usd = btc_price * usdt_price
                        except:
                            # If we can't get the price, use 0
                            price_usd = 0
                    
                    # Calculate USD value
                    net_asset = float(asset['netAsset'])
                    usd_value = net_asset * price_usd
                    
                    # Get buy price information
                    buy_data = self.fetch_buy_trades(asset['asset'])
                    avg_buy_price = buy_data.get('avg_buy_price')
                    
                    # Calculate PNL if buy price is available
                    pnl = None
                    pnl_percentage = None
                    if avg_buy_price is not None and avg_buy_price > 0:
                        pnl = (price_usd - avg_buy_price) * net_asset
                        pnl_percentage = ((price_usd / avg_buy_price) - 1) * 100
                    
                    holdings[asset['asset']] = {
                        'net_asset': net_asset,
                        'net_asset_usd': usd_value,
                        'borrowed': float(asset['borrowed']),
                        'type': InvestmentType.SPOT_CROSS_MARGIN,
                        'price_usd': price_usd,
                        'avg_buy_price': avg_buy_price,
                        'pnl': pnl,
                        'pnl_percentage': pnl_percentage,
                        'first_buy_time': buy_data.get('first_buy_time'),
                        'last_buy_time': buy_data.get('last_buy_time')
                    }
            return holdings
        except BinanceAPIException as e:
            print(f"Error fetching margin holdings: {e}")
            return {}
    
    def fetch_futures_holdings(self) -> Dict[str, Dict[str, Any]]:
        """Fetch futures trading holdings"""
        try:
            if not self.client:
                return {}
                
            futures_account = self.client.futures_account()
            holdings = {}
            for position in futures_account['positions']:
                if float(position['positionAmt']) != 0:
                    # Get the current price of the asset in USD
                    symbol = position['symbol']
                    try:
                        ticker = self.client.futures_symbol_ticker(symbol=symbol)
                        price_usd = float(ticker['price'])
                    except:
                        # If we can't get the price, use 0
                        price_usd = 0
                    
                    # Calculate USD values
                    amount = float(position['positionAmt'])
                    entry_price = float(position['entryPrice'])
                    unrealized_pnl = float(position.get('unRealizedProfit', 0.0))
                    leverage = int(position.get('leverage', 1))
                    
                    # Calculate the USD value of the position
                    usd_value = abs(amount) * price_usd
                    
                    holdings[position['symbol']] = {
                        'amount': amount,
                        'entry_price': entry_price,
                        'current_price': price_usd,
                        'unrealized_pnl': unrealized_pnl,
                        'unrealized_pnl_usd': unrealized_pnl,  # Already in USD
                        'leverage': leverage,
                        'usd_value': usd_value,
                        'type': InvestmentType.FUTURES
                    }
            return holdings
        except BinanceAPIException as e:
            print(f"Error fetching futures holdings: {e}")
            return {}
    
    def fetch_24hr_changes(self, symbols: List[str] = None) -> Dict[str, Dict[str, float]]:
        """Fetch 24-hour price changes for given symbols"""
        try:
            if not symbols:
                return {}
                
            changes_data = {}
            
            for symbol in symbols:
                # Remove any suffix like _spot or _margin to get the base symbol
                base_symbol = symbol.split('_')[0] if '_' in symbol else symbol
                
                # Skip USDT as it's the quote currency
                if base_symbol == 'USDT':
                    continue
                    
                # Format the symbol for the API call
                # If the symbol already contains USDT (like BTCUSDT), use it directly
                if 'USDT' in base_symbol:
                    trading_pair = base_symbol
                else:
                    trading_pair = f"{base_symbol}USDT"
                
                try:
                    # Call the 24hr ticker endpoint
                    url = f'https://api.binance.com/api/v3/ticker/24hr?symbol={trading_pair}'
                    print(f"Calling Binance API: {url}")
                    response = requests.get(url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        # Store the data under the base symbol without USDT suffix
                        store_symbol = base_symbol.replace('USDT', '')
                        changes_data[store_symbol] = {
                            'priceChange': float(data['priceChange']),
                            'priceChangePercent': float(data['priceChangePercent']),
                            'lastPrice': float(data['lastPrice']),
                            'volume': float(data['volume']),
                            'quoteVolume': float(data['quoteVolume'])
                        }
                        print(f"Got change data for {store_symbol}: {changes_data[store_symbol]['priceChangePercent']}%")
                except Exception as e:
                    print(f"Error fetching 24hr change for {trading_pair}: {e}")
                    # If we can't get the data, we'll just skip this symbol
            
            return changes_data
        except Exception as e:
            print(f"Error fetching 24hr changes: {e}")
            return {}
    
    def get_historical_klines(self, symbol: str, interval: str = '1d', limit: int = 30):
        """Get historical kline data for a symbol"""
        try:
            if not self.client:
                return []
                
            # Format the symbol for API call if needed
            trading_pair = symbol
            if not symbol.endswith('USDT'):
                trading_pair = f"{symbol}USDT"
                
            return self.client.get_historical_klines(
                trading_pair,
                interval,
                limit=limit
            )
        except BinanceAPIException as e:
            print(f"Error fetching historical klines for {symbol}: {e}")
            return []

    def generate_sample_data(self) -> Dict[str, Dict[str, Any]]:
        """Generate sample data when API credentials are not available"""
        # Sample data for demonstration
        return {
            # Spot Trading Holdings
            "BTC_spot": {
                "free": 0.5,
                "locked": 0.0,
                "total": 0.5,
                "total_usd": 25000.0,
                "type": "spot",
                "price_usd": 50000.0,
                "change_24h": 2.5,  # 24h change
                "avg_buy_price": 45000.0,  # Average buy price
                "pnl": 2500.0,  # Profit/Loss in USD
                "pnl_percentage": 11.11,  # Percentage gain/loss
                "first_buy_time": 1609459200000,  # Example timestamp
                "last_buy_time": 1625097600000  # Example timestamp
            },
            "ETH_spot": {
                "free": 2.0,
                "locked": 0.0,
                "total": 2.0,
                "total_usd": 4000.0,
                "type": "spot",
                "price_usd": 2000.0,
                "change_24h": 1.8,  # 24h change
                "avg_buy_price": 1800.0,  # Average buy price
                "pnl": 400.0,  # Profit/Loss in USD
                "pnl_percentage": 11.11,  # Percentage gain/loss
                "first_buy_time": 1609459200000,  # Example timestamp
                "last_buy_time": 1625097600000  # Example timestamp
            },
            # Cross Margin Holdings
            "BNB_margin": {
                "net_asset": 10.0,
                "net_asset_usd": 5000.0,
                "borrowed": 0.0,
                "type": "spot_cross_margin",
                "price_usd": 500.0,
                "change_24h": -0.5,  # 24h change
                "avg_buy_price": 450.0,  # Average buy price
                "pnl": 500.0,  # Profit/Loss in USD
                "pnl_percentage": 11.11,  # Percentage gain/loss
                "first_buy_time": 1609459200000,  # Example timestamp
                "last_buy_time": 1625097600000  # Example timestamp
            },
            "ADA_margin": {
                "net_asset": 1000.0,
                "net_asset_usd": 3000.0,
                "borrowed": 0.0,
                "type": "spot_cross_margin",
                "price_usd": 3.0,
                "change_24h": 3.2,  # 24h change
                "avg_buy_price": 2.5,  # Average buy price
                "pnl": 500.0,  # Profit/Loss in USD
                "pnl_percentage": 20.0,  # Percentage gain/loss
                "first_buy_time": 1609459200000,  # Example timestamp
                "last_buy_time": 1625097600000  # Example timestamp
            },
            # Futures Holdings already have entry price, so no need to add avg_buy_price
            "SOL_futures": {
                "amount": 100.0,
                "entry_price": 100.0,
                "current_price": 120.0,
                "unrealized_pnl": 2000.0,
                "unrealized_pnl_usd": 2000.0,
                "leverage": 5,
                "usd_value": 12000.0,
                "type": "futures",
                "change_24h": 5.8
            },
            "DOT_futures": {
                "amount": 50.0,
                "entry_price": 20.0,
                "current_price": 25.0,
                "unrealized_pnl": 250.0,
                "unrealized_pnl_usd": 250.0,
                "leverage": 3,
                "usd_value": 1250.0,
                "type": "futures",
                "change_24h": -1.2
            }
        } 