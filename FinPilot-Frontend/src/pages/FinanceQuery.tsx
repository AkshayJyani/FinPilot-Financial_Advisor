import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, CreditCard, TrendingUp, ShoppingCart, Briefcase, FileText } from 'lucide-react';
import { useState, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import ExampleQuery from '../components/ExampleQuery';
import ApiService from '../services/apiService';

function FinanceQuery() {
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef<{ sendMessage: (text: string) => void } | null>(null);

  const exampleQueries = [
    {
      title: "Real Estate Summary",
      description: "Get an overview of your real estate assets and their current valuations.",
      query: "Summarize my real estate holdings and their current market value."
    },
    {
      title: "EMI Schedule",
      description: "View your upcoming EMI payments and payment history.",
      query: "Show me my EMI payment schedule for the next 6 months."
    },
    {
      title: "Investment Summary",
      description: "Get a comprehensive view of your investments across different types.",
      query: "What is the total value of my investments across different categories?"
    },
    {
      title: "Fund Performance",
      description: "Analyze the performance of your mutual fund investments.",
      query: "Compare the performance of my mutual funds over the last year."
    },
    {
      title: "Tax Documents",
      description: "Find information about required documents for tax filing.",
      query: "What documents do I need for my upcoming tax filing?"
    }
  ];

  // Handle finance query
  const handleFinanceQuery = async (query: string) => {
    try {
      // Log the query being sent
      console.log('Sending finance query:', query);
      setIsLoading(true);
      
      const response = await ApiService.processFinanceQuery(query);
      
      // Log the response for debugging
      console.log('Finance query response:', response);
      
      // Validate response structure and content
      if (response.status === 'success') {
        // Handle different response formats
        if (response.data && typeof response.data.response === 'string' && 
          response.data.response.trim() !== '') {
          return response;
        } else if (response.data && typeof response.data.message === 'string' && 
          response.data.message.trim() !== '') {
          // Handle format where message field contains the response
          return {
            status: 'success',
            data: { 
              response: response.data.message
            }
          };
        } else {
          // No recognizable message found, return a debug message
          console.warn('API returned success but with no message content:', response);
          return {
            status: 'success',
            data: { 
              response: "I received your query, but I don't have enough information to provide a specific answer. Could you please try asking in a different way?" 
            }
          };
        }
      } else if (response.status === 'error') {
        // Return the actual error message from the API
        const errorMsg = response.data?.message || response.data?.error || 'Unknown API error';
        console.error('API returned error:', errorMsg);
        return {
          status: 'error',
          data: { 
            message: errorMsg,
            response: `Error: ${errorMsg}`
          }
        };
      } else {
        // Unexpected response status
        throw new Error(`Unexpected API response status: ${response.status}`);
      }
    } catch (error) {
      // Capture and return the actual error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error processing finance query:', error);
      return {
        status: 'error',
        data: { 
          message: errorMessage,
          response: `Error: ${errorMessage}`
        }
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle example query click - this will be passed to the ExampleQuery component
  const handleExampleClick = (query: string) => {
    console.log('Example query clicked:', query);
    
    // If we have a ref to the ChatBox, use it directly
    if (chatBoxRef.current) {
      chatBoxRef.current.sendMessage(query);
      return;
    }
    
    // Fallback to DOM manipulation if ref isn't working
    try {
      // Find the chat input and set its value
      const chatInput = document.querySelector('.bg-slate-900\\/40 input[type="text"]') as HTMLInputElement;
      if (chatInput) {
        // Set the value and trigger the input event
        chatInput.value = query;
        const inputEvent = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(inputEvent);
        
        // Submit the query after a brief delay
        setTimeout(() => {
          const sendButton = chatInput.closest('.relative')?.querySelector('button');
          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          } else {
            console.warn('Send button not found or is disabled');
          }
        }, 50);
      } else {
        console.warn('Chat input element not found');
      }
    } catch (error) {
      console.error('Error handling example query click:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Finance Hub
            </h1>
            <p className="text-slate-400 mt-1">
              Ask questions about your finances and get AI-powered insights
            </p>
          </div>
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Financial Cards - Left Side (2/3 width) */}
        <div className="lg:w-2/3">
          {/* Sector Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* EMIs Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">EMIs</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total EMI</span>
                  <span className="font-medium text-slate-200">₹45,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Loans</span>
                  <span className="font-medium text-slate-200">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next Due</span>
                  <span className="font-medium text-slate-200">15th May</span>
                </div>
              </div>
            </div>

            {/* Salary Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mr-4">
                  <CreditCard className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">Salary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly</span>
                  <span className="font-medium text-slate-200">₹85,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">YTD Earnings</span>
                  <span className="font-medium text-slate-200">₹765,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next Credit</span>
                  <span className="font-medium text-slate-200">1st June</span>
                </div>
              </div>
            </div>

            {/* Investments Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center mr-4">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">Investments</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Value</span>
                  <span className="font-medium text-slate-200">₹2.5L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly SIP</span>
                  <span className="font-medium text-slate-200">₹25,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Returns YTD</span>
                  <span className="font-medium text-green-400">+12.5%</span>
                </div>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                  <ShoppingCart className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">Expenses</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Avg</span>
                  <span className="font-medium text-slate-200">₹35,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">This Month</span>
                  <span className="font-medium text-slate-200">₹42,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Top Category</span>
                  <span className="font-medium text-slate-200">Food & Dining</span>
                </div>
              </div>
            </div>

            {/* Savings Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-900/30 rounded-full flex items-center justify-center mr-4">
                  <Briefcase className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">Savings</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Savings</span>
                  <span className="font-medium text-slate-200">₹1.2L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Goal</span>
                  <span className="font-medium text-slate-200">₹20,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-medium text-green-400">85%</span>
                </div>
              </div>
            </div>

            {/* Taxes Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg hover:shadow-blue-900/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-900/30 rounded-full flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">Taxes</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">FY 2023-24</span>
                  <span className="font-medium text-slate-200">₹1.5L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid</span>
                  <span className="font-medium text-slate-200">₹1.2L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Due Date</span>
                  <span className="font-medium text-slate-200">31st July</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Box - Right Side (1/3 width) */}
        <div className="lg:w-1/3">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/30 rounded-xl p-6 mb-8 sticky top-4">
            <h2 className="text-2xl font-semibold mb-4 text-slate-200">Finance Assistant</h2>
            <p className="text-slate-400 text-sm mb-4">
              Ask questions about your EMIs, investments, taxes, and other financial matters.
            </p>
            <div id="finance-chatbox">
              <ChatBox 
                ref={chatBoxRef}
                initialMessage="Hello! I'm your finance assistant. Ask me anything about your EMIs, investments, savings, or other financial matters."
                placeholder="Ask about your finances..."
                onSendMessage={handleFinanceQuery}
                isLoading={isLoading}
                additionalContext="Your monthly income is ₹85,000 with total investments of ₹2.5L and monthly expenses of ₹35,000."
              />
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 text-slate-300">Example Queries</h3>
              <div className="space-y-3">
                {exampleQueries.map((example, index) => (
                  <ExampleQuery 
                    key={index}
                    title={example.title}
                    description={example.description}
                    query={example.query}
                    onClick={handleExampleClick}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceQuery;