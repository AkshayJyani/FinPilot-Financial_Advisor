import React from 'react';

interface ExampleQueryProps {
  title: string;
  description: string;
  query: string;
  onClick?: (query: string) => void; // Add optional onClick prop
}

function ExampleQuery({ title, description, query, onClick }: ExampleQueryProps) {
  const handleClick = () => {
    // If an onClick handler is provided, use it directly
    if (onClick) {
      onClick(query);
      return;
    }
    
    // Otherwise, try to find and manipulate the chat input directly
    try {
      // Find the closest input in the chat box
      const chatInput = document.querySelector('.bg-slate-900\\/40 input[type="text"]') as HTMLInputElement;
      
      if (chatInput) {
        // Set the input value
        chatInput.value = query;
        
        // Update the input's internal value property
        const inputEvent = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(inputEvent);
        
        // Focus the input (important for mobile)
        chatInput.focus();
        
        // Find and click the send button (more reliable than simulating Enter key)
        const sendButton = chatInput.closest('.relative')?.querySelector('button');
        if (sendButton && !sendButton.disabled) {
          // A small delay to ensure the input event is processed
          setTimeout(() => {
            sendButton.click();
          }, 50);
        } else {
          console.warn('Send button not found or disabled');
        }
      } else {
        console.warn('Chat input not found');
      }
    } catch (error) {
      console.error('Error submitting example query:', error);
    }
  };

  return (
    <div 
      className="bg-slate-800/30 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-blue-900/20 hover:translate-x-1"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Use example query: ${title}`}
    >
      <h4 className="text-blue-400 font-medium">{title}</h4>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default ExampleQuery;