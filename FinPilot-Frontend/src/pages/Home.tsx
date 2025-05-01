import { Link } from 'react-router-dom';
import { BarChart3, MessageSquare } from 'lucide-react';

function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 mb-4">
          FINANCIAL ADVISOR AI
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Your intelligent financial companion for portfolio analysis, market insights, EMIs, salary, real estate, tax and investment guidance
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Portfolio Analyzer Card */}
        <Link 
          to="/portfolio" 
          className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 flex flex-col h-full transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20"
        >
          <div className="bg-blue-900/20 rounded-xl p-4 inline-flex items-center justify-center w-16 h-16 mb-4">
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Portfolio Analyzer</h2>
          <p className="text-slate-400 mb-4 flex-grow">
            Analyze your investment portfolios with detailed insights on your investments across crypto, stocks, and other assets. Includes a chat box for portfolio-specific queries.
          </p>
          <ul className="space-y-2 text-sm text-slate-300 mb-6">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>View holdings by investment type</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Track performance metrics</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Visualize asset allocation</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Chat with your portfolio data</span>
            </li>
          </ul>
          <div className="mt-auto">
            <button className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:translate-y-[-2px]">
              Open Portfolio Analyzer
            </button>
          </div>
        </Link>

        {/* Finance Query Box Card */}
        <Link 
          to="/finance-query" 
          className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 flex flex-col h-full transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20"
        >
          <div className="bg-blue-900/20 rounded-xl p-4 inline-flex items-center justify-center w-16 h-16 mb-4">
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Finance Query Box</h2>
          <p className="text-slate-400 mb-4 flex-grow">
            Manage and analyze all your investment documents and financial data through a unified knowledge base. Easily query your EMIs, real estate holdings, and various investments with AI-powered insights.
          </p>
          <ul className="space-y-2 text-sm text-slate-300 mb-6">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Search across investment types</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Monitor EMI schedules and payments</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Summarize real estate assets</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">•</span>
              <span>Chat directly with your financial data</span>
            </li>
          </ul>
          <div className="mt-auto">
            <button className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:translate-y-[-2px]">
              Open Finance Query
            </button>
          </div>
        </Link>
      </div>

    </div>
  );
}

export default Home;