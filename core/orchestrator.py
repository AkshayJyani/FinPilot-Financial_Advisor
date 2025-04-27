from typing import Dict, Any, List
from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools.render import format_tool_to_openai_function
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

class Orchestrator:
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-3",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.tools = []
        self.memory = {}
        
    def add_tool(self, tool: Any):
        """Add a new tool to the orchestrator's toolkit"""
        self.tools.append(tool)
        
    def create_agent(self):
        """Create the agent with all available tools"""
        functions = [format_tool_to_openai_function(t) for t in self.tools]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a financial advisor AI agent. Your role is to understand user queries and delegate tasks to appropriate sub-agents. Maintain context and provide comprehensive financial advice."),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        agent = (
            {
                "input": lambda x: x["input"],
                "agent_scratchpad": lambda x: format_to_openai_function_messages(
                    x["intermediate_steps"]
                ),
            }
            | prompt
            | self.llm.bind(functions=functions)
            | OpenAIFunctionsAgentOutputParser()
        )
        
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True)
    
    async def process_query(self, query: str) -> Dict[str, Any]:
        """Process a user query and return the response"""
        agent = self.create_agent()
        response = await agent.ainvoke({"input": query})
        return response
    
    def update_memory(self, key: str, value: Any):
        """Update the shared memory with new information"""
        self.memory[key] = value
    
    def get_memory(self, key: str) -> Any:
        """Retrieve information from shared memory"""
        return self.memory.get(key) 