import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, BarChart3, MessageSquare, Bitcoin, TrendingUp } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

// Desktop navigation link with icon
interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  active: boolean;
  icon: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, active, icon }) => (
  <Link
    to={to}
    className={`px-4 py-2 rounded-full font-medium text-sm flex items-center space-x-1.5 transition-all duration-300 ${
      active 
        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20' 
        : 'text-slate-300 hover:bg-slate-700/50 hover:text-blue-300'
    }`}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
      {icon}
    </span>
    <span>{children}</span>
  </Link>
);

// Mobile navigation link with icon
interface MobileNavLinkProps {
  to: string;
  children: React.ReactNode;
  active: boolean;
  icon: React.ReactNode;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, children, active, icon }) => (
  <Link
    to={to}
    className={`flex items-center py-3 px-3 rounded-lg mb-1 transition-all duration-200 ${
      active 
        ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500' 
        : 'text-slate-300 hover:bg-slate-700/30 hover:pl-4'
    }`}
  >
    <span className="mr-3">{icon}</span>
    <span>{children}</span>
  </Link>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navigation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-slate-900/90 backdrop-blur-lg shadow-lg shadow-blue-900/10' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center group">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1 mr-2 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-blue-500/30">
                  <span className="px-1">FP</span>
                </div>
                <div>
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 group-hover:from-blue-300 group-hover:to-indigo-400 transition-all duration-300">
                    FinPilot
                  </span>
                  <span className="hidden sm:inline-block text-sm text-slate-400 ml-2 group-hover:text-slate-300 transition-colors duration-300">Financial Advisor</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center">
              <div className="flex space-x-1 bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-slate-700/30">
                <NavLink to="/" icon={<Home size={16} />} active={isActive('/')}>
                  Home
                </NavLink>
                <NavLink to="/portfolio" icon={<BarChart3 size={16} />} active={isActive('/portfolio')}>
                  Portfolio
                </NavLink>
                <NavLink to="/finance-query" icon={<MessageSquare size={16} />} active={isActive('/finance-query')}>
                  Finance Hub
                </NavLink>
                <NavLink to="/binance-portfolio" icon={<Bitcoin size={16} />} active={isActive('/binance-portfolio')}>
                  Binance
                </NavLink>
                <NavLink to="/kite-portfolio" icon={<TrendingUp size={16} />} active={isActive('/kite-portfolio')}>
                  Kite
                </NavLink>
              </div>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="md:hidden flex items-center justify-center text-slate-300 hover:text-blue-400 transition-colors duration-200 bg-slate-800/50 p-2 rounded-full hover:bg-slate-800/80"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="bg-slate-800/95 backdrop-blur-md border-t border-slate-700/30 px-6 py-4 shadow-lg">
            <MobileNavLink to="/" icon={<Home size={18} />} active={isActive('/')}>
              Home
            </MobileNavLink>
            <MobileNavLink to="/portfolio" icon={<BarChart3 size={18} />} active={isActive('/portfolio')}>
              Portfolio
            </MobileNavLink>
            <MobileNavLink to="/finance-query" icon={<MessageSquare size={18} />} active={isActive('/finance-query')}>
              Finance Hub
            </MobileNavLink>
            <MobileNavLink to="/binance-portfolio" icon={<Bitcoin size={18} />} active={isActive('/binance-portfolio')}>
              Binance
            </MobileNavLink>
            <MobileNavLink to="/kite-portfolio" icon={<TrendingUp size={18} />} active={isActive('/kite-portfolio')}>
              Kite
            </MobileNavLink>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 pt-28 pb-6">
        {children}
      </main>

      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-slate-700/30 py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center justify-center md:justify-start">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg p-1 mr-2">
                  <span className="px-1">FP</span>
                </div>
                <span className="text-xl font-bold text-blue-400">FinPilot</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">Your intelligent financial companion</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-slate-400 hover:text-blue-400 transition duration-200">
                Terms
              </a>
              <a href="#" className="text-slate-400 hover:text-blue-400 transition duration-200">
                Privacy
              </a>
              <a href="#" className="text-slate-400 hover:text-blue-400 transition duration-200">
                Support
              </a>
            </div>
          </div>
          <div className="mt-6 text-center md:text-left">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} FinPilot Financial Advisor. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 