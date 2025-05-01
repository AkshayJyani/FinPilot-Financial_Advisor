import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from '@pages/Home';
import Portfolio from '@pages/Portfolio';
import FinanceQuery from '@pages/FinanceQuery';
import BinancePortfolio from '@pages/BinancePortfolio';
import KitePortfolio from '@pages/KitePortfolio';
import ApiService from '@services/apiService';
import Layout from '@components/Layout';

function App() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  // Check backend connectivity on app start
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const healthResponse = await ApiService.checkHealth();
        setBackendStatus(healthResponse.status === 'success' ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Backend connectivity error:', error);
        setBackendStatus('disconnected');
      }
    };

    checkBackendStatus();
    
    // Log that the component mounted for debugging
    console.log('App component mounted');
  }, []);


  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 text-slate-200">
        {backendStatus === 'checking' && (
          <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-2 text-center">
            Connecting to FinPilot backend...
          </div>
        )}
        
        {backendStatus === 'disconnected' && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-center">
            Warning: Backend connection failed. Some features may not work.
          </div>
        )}

        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/finance-query" element={<FinanceQuery />} />
            <Route path="/binance-portfolio" element={<BinancePortfolio />} />
            <Route path="/kite-portfolio" element={<KitePortfolio />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;