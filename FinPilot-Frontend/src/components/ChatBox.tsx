import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send } from 'lucide-react';

interface ChatMessage {
  text: string;
  isUser: boolean;
}

interface ChatBoxProps {
  initialMessage: string;
  placeholder: string;
  onSendMessage?: (query: string) => Promise<any>;
  isLoading?: boolean;
  additionalContext?: string;
  ref?: React.Ref<{ sendMessage: (text: string) => void }>;
}

// Use forwardRef to expose methods to parent components
const ChatBox = forwardRef(({ 
  initialMessage, 
  placeholder, 
  onSendMessage, 
  isLoading: externalLoading, 
  additionalContext 
}: ChatBoxProps, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: initialMessage, isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use external loading state if provided
  const loadingState = externalLoading !== undefined ? externalLoading : isLoading;

  // Expose the sendMessage method to parent components
  useImperativeHandle(ref, () => ({
    sendMessage: (text: string) => {
      if (text && text.trim() !== '') {
        setInputValue(text);
        // Use setTimeout to ensure state update completes
        setTimeout(() => {
          handleSendMessage(text);
        }, 0);
      }
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    // Use provided text or input value
    const messageText = text || inputValue;
    if (messageText.trim() === '') return;

    // Add user message
    setMessages(prev => [...prev, { text: messageText, isUser: true }]);
    const userQuery = messageText;
    
    // Clear input only if we're using the input value (not an externally provided text)
    if (!text) {
      setInputValue('');
    }
    
    // Only set local loading if external loading is not provided
    if (externalLoading === undefined) {
      setIsLoading(true);
    }

    try {
      if (onSendMessage) {
        // Use the provided API service function
        // If we have additional context, add it to the query
        const enhancedQuery = additionalContext ? 
          `${userQuery} (Portfolio Context: ${additionalContext})` : 
          userQuery;
          
        const response = await onSendMessage(enhancedQuery);
        console.log('Chat response:', response);
        
        if (response.status === 'success') {
          let responseText = '';
          
          // Handle different response formats
          if (response.data && typeof response.data.response === 'string') {
            responseText = response.data.response;
          } else if (response.data && typeof response.data.message === 'string') {
            responseText = response.data.message;
          } else {
            // If we don't have any recognizable response, show a generic message with debug info
            responseText = "The API returned a success response but without any readable message. Check the console for more details.";
            console.warn("API returned success but with unrecognized data format:", response);
          }
          
          // Add AI response from the API
          setMessages(prev => [...prev, { 
            text: responseText, 
            isUser: false 
          }]);
        } else {
          // Handle error response with the actual error message
          const errorMsg = response.data?.message || response.data?.error || 'Unknown error occurred';
          console.error('API Error:', errorMsg, response);
          
          setMessages(prev => [...prev, { 
            text: `Error: ${errorMsg}`, 
            isUser: false 
          }]);
        }
      } else {
        // Fallback to mock responses if no API function provided
        // Simulate API call delay
        setTimeout(() => {
          // Mock AI response based on query
          let response = '';
          const query = userQuery.toLowerCase();

          if (query.includes('portfolio')) {
            response = "Your portfolio is well-diversified with assets across different markets. The current allocation is approximately 55% in stocks, 25% in crypto, and 20% in mutual funds.";
          } else if (query.includes('crypto') || query.includes('bitcoin') || query.includes('binance')) {
            response = "Your crypto assets have grown by 12.5% this month. Bitcoin comprises 45% of your crypto portfolio, followed by Ethereum at 30% and other altcoins at 25%.";
          } else if (query.includes('stock') || query.includes('equity') || query.includes('kite')) {
            response = "Your stock portfolio has shown steady growth with a 6.8% increase YTD. The technology sector makes up 35% of your equity holdings, followed by finance at 20%.";
          } else if (query.includes('risk')) {
            response = "Based on your current asset allocation, your portfolio has a moderate risk profile. Consider increasing your bond allocation if you want to reduce overall portfolio volatility.";
          } else if (query.includes('recommend') || query.includes('suggestion')) {
            response = "Based on your investment goals and risk profile, I would recommend increasing your exposure to dividend-paying stocks and considering a small allocation to emerging markets.";
          } else if (query.includes('performance')) {
            response = "Your portfolio is performing well with a 9.5% return year-to-date, outperforming the benchmark index by 1.2%. Your best performing assets are in the technology sector.";
          } else {
            response = "I'm here to help analyze your portfolio data. You can ask about performance, asset allocation, risk assessment, or specific investments.";
          }

          // Add AI response
          setMessages(prev => [...prev, { text: response, isUser: false }]);
        }, 1500);
      }
    } catch (error) {
      // Show the actual error message in the chat
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error in chat processing:', error);
      
      setMessages(prev => [...prev, { 
        text: `Error: ${errorMessage}`, 
        isUser: false 
      }]);
    } finally {
      // Only update local loading if external loading is not provided
      if (externalLoading === undefined) {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatMessage = (text: string) => {
    // Add simple formatting for messages (could be expanded)
    return text.replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-[450px] bg-slate-900/40 rounded-xl border border-slate-700/30 overflow-hidden" id="chatbox-container">
      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-3 ${
              message.isUser
                ? 'ml-auto bg-blue-900/30 border border-blue-700/30'
                : 'mr-auto bg-slate-800/80 border border-slate-700/30'
            } px-4 py-3 rounded-xl max-w-[85%]`}
          >
            <div dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }} />
          </div>
        ))}
        {loadingState && (
          <div className="mb-3 mr-auto bg-slate-800/80 border border-slate-700/30 px-4 py-3 rounded-xl max-w-[85%]">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-slate-700/50 p-4 bg-slate-800/40">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full bg-slate-800/70 border border-slate-700/40 rounded-lg py-3 px-4 pr-10 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            disabled={loadingState}
            data-testid="chat-input"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loadingState || inputValue.trim() === ''}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 ${
              loadingState || inputValue.trim() === '' ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-400'
            }`}
            data-testid="send-button"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});

// Add a display name for the forwarded ref component
ChatBox.displayName = 'ChatBox';

export default ChatBox;