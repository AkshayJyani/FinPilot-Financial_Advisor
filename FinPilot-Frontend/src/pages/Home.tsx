import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  LineChart, 
  PieChart
} from 'lucide-react';
import { useState, useEffect } from 'react';

function Home() {
  const [animated, setAnimated] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Trigger animations after component mounts
    setAnimated(true);
    
    // Optional: Add scroll reveal animations for elements
    const handleScroll = () => {
      const scrollElements = document.querySelectorAll('.scroll-reveal');
      scrollElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('revealed');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation handlers
  const goToPortfolio = (e) => {
    e.stopPropagation(); // Prevent the parent Link click event
    navigate('/portfolio');
  };
  
  const goToFinanceHub = (e) => {
    e.stopPropagation(); // Prevent the parent Link click event
    navigate('/finance-query');
  };
  
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className={`py-16 md:py-24 transition-all duration-1000 ease-out ${animated ? 'opacity-100' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto px-6 relative">
          {/* Background gradient orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full filter blur-3xl opacity-50"></div>
          
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600">
                Your Intelligent Financial Companion
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Unlock financial insights, optimize investments, and make smarter decisions with AI-powered portfolio analysis and personalized guidance.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <a 
                href="/portfolio" 
                className="px-8 py-4 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-full font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer min-w-[160px] inline-block text-center no-underline"
              >
                Explore Portfolio
              </a>
              <a 
                href="/finance-query" 
                className="px-8 py-4 text-blue-100 bg-blue-600/20 border border-blue-500/40 rounded-full font-semibold hover:bg-blue-600/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer min-w-[160px] inline-block text-center no-underline"
              >
                Finance Hub
              </a>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-center">
              <div className="animate-fade-in" style={{animationDelay: '200ms'}}>
                <div className="text-3xl font-bold text-blue-400">500+</div>
                <div className="text-sm text-slate-400">Securities Tracked</div>
              </div>
              <div className="animate-fade-in" style={{animationDelay: '400ms'}}>
                <div className="text-3xl font-bold text-blue-400">99%</div>
                <div className="text-sm text-slate-400">Data Accuracy</div>
              </div>
              <div className="animate-fade-in" style={{animationDelay: '600ms'}}>
                <div className="text-3xl font-bold text-blue-400">24/7</div>
                <div className="text-sm text-slate-400">Real-time Updates</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="py-16 scroll-reveal">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                Comprehensive Financial Solutions
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to manage your investments and financial decisions in one place
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Portfolio Analyzer Card */}
            <Link 
              to="/portfolio" 
              className="group bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-2xl p-8 flex flex-col h-full transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-900/20 overflow-hidden relative"
            >
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              
              <div className="bg-blue-900/20 rounded-2xl p-5 inline-flex items-center justify-center w-18 h-18 mb-6 group-hover:bg-blue-900/30 transition-all duration-300">
                <BarChart3 className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-blue-400 transition-colors duration-300">Portfolio Analyzer</h2>
              
              <p className="text-slate-400 mb-6 flex-grow text-lg">
                Analyze your investment portfolios with detailed insights on your investments across crypto, stocks, and other assets. Includes an AI assistant for portfolio-specific queries.
              </p>
              
              <ul className="space-y-3 text-slate-300 mb-8">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <LineChart className="h-5 w-5" />
                  </span>
                  <span>Track real-time performance metrics</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <PieChart className="h-5 w-5" />
                  </span>
                  <span>Visualize asset allocation and diversification</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <span>Identify trends and growth opportunities</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <span>Chat with your portfolio data</span>
                </li>
              </ul>
              
              <button
                onClick={goToPortfolio}
                className="mt-auto group-hover:translate-x-2 transition-transform duration-300 flex items-center text-blue-400 font-semibold hover:text-blue-300 focus:outline-none bg-transparent border-none cursor-pointer"
              >
                Explore Portfolio
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>

            {/* Finance Hub Card */}
            <Link 
              to="/finance-query" 
              className="group bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-2xl p-8 flex flex-col h-full transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-900/20 overflow-hidden relative"
            >
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              
              <div className="bg-blue-900/20 rounded-2xl p-5 inline-flex items-center justify-center w-18 h-18 mb-6 group-hover:bg-blue-900/30 transition-all duration-300">
                <MessageSquare className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-blue-400 transition-colors duration-300">Finance Hub</h2>
              
              <p className="text-slate-400 mb-6 flex-grow text-lg">
                Your centralized knowledge base for all financial matters. Get AI-powered insights on EMIs, real estate, taxes, and investments through an intuitive conversation interface.
              </p>
              
              <ul className="space-y-3 text-slate-300 mb-8">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <Zap className="h-5 w-5" />
                  </span>
                  <span>Fast answers to complex financial questions</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <span>Monitor EMI schedules and tax obligations</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <LineChart className="h-5 w-5" />
                  </span>
                  <span>Summarize financial assets and properties</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <span>Receive personalized financial advice</span>
                </li>
              </ul>
              
              <button
                onClick={goToFinanceHub}
                className="mt-auto group-hover:translate-x-2 transition-transform duration-300 flex items-center text-blue-400 font-semibold hover:text-blue-300 focus:outline-none bg-transparent border-none cursor-pointer"
              >
                Open Finance Hub
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Platform Features */}
      <section className="py-16 scroll-reveal">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                Why Choose FinPilot
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Powered by advanced AI to deliver the most accurate financial insights
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/50">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200">AI-Powered Insights</h3>
              <p className="text-slate-400">
                Our advanced AI analyzes your financial data to provide personalized recommendations and insights tailored to your goals.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/50">
              <div className="bg-gradient-to-r from-purple-600 to-purple-400 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200">Secure & Private</h3>
              <p className="text-slate-400">
                Your financial data is encrypted and protected. We prioritize your privacy and security above everything else.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/50">
              <div className="bg-gradient-to-r from-green-600 to-green-400 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200">Real-time Updates</h3>
              <p className="text-slate-400">
                Stay on top of your finances with real-time data updates and alerts for your investments and financial obligations.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-16 scroll-reveal">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-2xl p-8 md:p-12 text-center backdrop-blur-md shadow-xl border border-blue-700/20 max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to transform your financial future?</h2>
            <p className="text-xl text-blue-100/80 mb-8 max-w-2xl mx-auto">
              Start using FinPilot today and discover the power of AI-driven financial management
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="/portfolio" 
                className="px-8 py-4 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-full font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer min-w-[160px] inline-block text-center no-underline"
              >
                Get Started
              </a>
              <a 
                href="/finance-query" 
                className="px-8 py-4 text-blue-100 bg-blue-600/20 border border-blue-500/40 rounded-full font-semibold hover:bg-blue-600/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer min-w-[160px] inline-block text-center no-underline"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* CSS for scroll reveal animation */}
      <style jsx>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s ease-out;
        }
        
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

export default Home;