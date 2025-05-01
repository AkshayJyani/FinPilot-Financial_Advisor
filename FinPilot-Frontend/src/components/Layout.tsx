import React from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-900 border-b border-slate-700 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-400">
                FinPilot
              </Link>
              <span className="text-sm text-slate-400 ml-2">Financial Advisor</span>
            </div>
            <nav className="flex space-x-6">
              <Link to="/" className="text-slate-300 hover:text-blue-400 transition duration-200 font-medium">
                Home
              </Link>
              <Link to="/finance-query" className="text-slate-300 hover:text-blue-400 transition duration-200 font-medium">
                Query
              </Link>
              <Link to="/portfolio" className="text-slate-300 hover:text-blue-400 transition duration-200 font-medium">
                Portfolio
              </Link>
              <Link to="/binance-portfolio" className="text-slate-300 hover:text-blue-400 transition duration-200 font-medium">
                Binance
              </Link>
              <Link to="/kite-portfolio" className="text-slate-300 hover:text-blue-400 transition duration-200 font-medium">
                Kite
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="bg-slate-900 border-t border-slate-700 py-4">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          <p>FinPilot Financial Advisor © {new Date().getFullYear()}</p>
          <p className="mt-1">Your intelligent financial companion</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 