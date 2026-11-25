import React, { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, X, Send, MessageSquare, Sparkles, AlertCircle, Info,
  ChefHat, Truck, ShieldAlert, ArrowRight, CornerDownLeft
} from "lucide-react";

interface Message {
  sender: "user" | "ai";
  text: string;
  isConfigError?: boolean;
}

interface AIChatbotProps {
  user: User | null;
}

export default function AIChatbot({ user }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "👋 Hello there! I am **Foodly AI**, your real-time digital food dispatcher and concierge. How can I help you navigate the platform today?"
    }
  ]);
  const [inputVal, setInputVal] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Dynamic Suggestion Chips based on User Roles
  const getSuggestions = (): string[] => {
    if (!user) return ["What restaurants are on the platform?", "What's on the menu today?"];
    switch (user.role) {
      case "customer":
        return [
          "Recommend top-rated restaurants ⭐",
          "What is the status of my order? 🕒",
          "Recommend spicy cuisines 🌶️",
          "What desserts can I order? 🍰 review"
        ];
      case "restaurant":
        return [
          "Check my active store orders 🧑‍🍳",
          "Show all dishes on my menu",
          "How can I boost my reviews?"
        ];
      case "delivery":
        return [
          "Show active dispatch orders 🚚",
          "Tell me about delivery addresses",
          "How do I claim a delivery incentive?"
        ];
      case "admin":
        return [
          "Give me an active platform statistics review 📊",
          "How many active delivery partners exist?",
          "Show a summary of global revenue"
        ];
      default:
        return ["Browse cuisines", "Find popular restaurants"];
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    // Add User Message
    const newUserMsg: Message = { sender: "user", text: textToSend };
    setMessages(prev => [...prev, newUserMsg]);
    setInputVal("");
    setLoading(true);

    try {
      // Formulate request with lightweight history
      const prevConversation = messages.slice(-8).map(m => ({
        role: m.sender === "user" ? "user" : "model",
        content: m.text
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: prevConversation,
          userId: user?.id || null
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with Foodly AI server.");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        sender: "ai", 
        text: data.text,
        isConfigError: data.isConfigError 
      }]);
    } catch (err: any) {
      console.error("AI Chatbot UI communication failure:", err);
      setMessages(prev => [...prev, {
        sender: "ai",
        text: "⚠️ I had trouble connecting with my intelligence center. Please check your network connection or try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (suggestion: string) => {
    // Strip trailing emojis for backend cleanly if preferred, or send directly
    handleSendMessage(suggestion);
  };

  // Convert markdown-like headers, bold, list to simple HTML view
  const formatText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let formatted = line;
      
      // Inline Code
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 font-mono text-[9px] rounded text-slate-800">$1</code>');
      
      // Bold items
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
      
      // Bullet lists
      if (formatted.trim().startsWith("- ")) {
        return (
          <li key={idx} className="ml-3.5 list-disc leading-relaxed text-slate-600 mt-1" 
              dangerouslySetInnerHTML={{ __html: formatted.trim().substring(2) }} />
        );
      }

      // Headers like ###
      if (formatted.trim().startsWith("### ")) {
        return (
          <h4 key={idx} className="font-display font-extrabold text-slate-900 text-xs mt-3 mb-1 uppercase tracking-tight" 
              dangerouslySetInnerHTML={{ __html: formatted.trim().substring(4) }} />
        );
      }

      // Empty lines or standard paragraphs
      if (!formatted.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="leading-relaxed mt-1" 
           dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          id="ai-chatbot-activator-btn"
          className="relative w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all border border-slate-800 cursor-pointer hover:scale-105 active:scale-95 group"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-300 rotate-90" />
          ) : (
            <div className="relative">
              <Bot className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 w-3 h-3 rounded-full border-2 border-slate-900 animate-ping" />
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 w-3 h-3 rounded-full border-2 border-slate-900" />
            </div>
          )}
          
          {/* Tooltip */}
          <span className="absolute right-16 bg-slate-900/95 text-slate-100 text-[10px] font-semibold tracking-wider font-mono px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none border border-slate-800">
            ASK FOODLY AI ✨
          </span>
        </button>
      </div>

      {/* Slide-In Conversational Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chatbot-drawer-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-2rem)] h-[540px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden font-sans border-b-4 border-b-amber-500"
          >
            {/* Panel Header */}
            <header className="bg-slate-900 text-slate-100 p-4 shrink-0 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 relative">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5">
                    Foodly AI Assistant
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono mt-0.5">
                    <span>● POWERED BY GEMINI 3.5</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Messages Stream Wrapper */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              
              {/* Dynamic Welcome Card */}
              {user && (
                <div className="bg-gradient-to-tr from-slate-900 to-slate-850 text-slate-200 p-3.5 rounded-xl text-xxs flex items-center justify-between border border-slate-800/80 shadow-md">
                  <div className="space-y-1">
                    <span className="font-bold text-amber-400 block font-mono text-[9px] uppercase tracking-wider">
                      Role Account Synced
                    </span>
                    <p className="font-medium text-white max-w-xs leading-normal">
                      Welcome back, <strong>{user.name}</strong> ({user.role.toUpperCase()})
                    </p>
                    <p className="text-gray-400 text-[10px] leading-relaxed">
                      I have custom-tailored suggestions matching your active workflow below.
                    </p>
                  </div>
                  <div className="w-10 h-10 aspect-square rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    {user.role === "customer" && <Bot className="w-5 h-5 text-amber-400" />}
                    {user.role === "restaurant" && <ChefHat className="w-5 h-5 text-amber-400" />}
                    {user.role === "delivery" && <Truck className="w-5 h-5 text-amber-400" />}
                    {user.role === "admin" && <Info className="w-5 h-5 text-amber-400" />}
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"} space-y-1`}>
                  
                  {/* Sender Badge */}
                  <span className="text-[8px] font-mono font-bold text-gray-400 tracking-wider uppercase px-1">
                    {m.sender === "user" ? "You" : "Foodly AI"}
                  </span>
                  
                  {/* Message Bubble */}
                  <div className={`max-w-[85%] rounded-2xl p-3 shadow-xs text-xxs font-sans break-words ${
                    m.sender === "user" 
                      ? "bg-slate-900 text-white rounded-tr-none" 
                      : "bg-white border border-gray-100 text-slate-700 rounded-tl-none shadow-sm"
                  }`}>
                    {/* Content formatted with helper */}
                    <div className="space-y-1.5 leading-relaxed font-sans">
                      {formatText(m.text)}
                    </div>

                    {/* Developer instructions for missing API key */}
                    {m.isConfigError && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-2 text-[10px] text-rose-800 font-sans">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-rose-900 uppercase tracking-wide text-xxs">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Configuration Instruction
                        </div>
                        <p className="leading-relaxed">
                          To resolve this error and give the chatbot cloud intelligence, please do the following:
                        </p>
                        <ol className="list-decimal pl-4.5 space-y-1">
                          <li>Open the <strong>Settings</strong> menu in Google AI Studio (top-right side of screen).</li>
                          <li>Navigate to the <strong>Secrets</strong> panel.</li>
                          <li>Add a variable named <strong>GEMINI_API_KEY</strong> and paste your actual Gemini API key there.</li>
                          <li>The platform will seamlessly inject your key and make the chatbot live instantly.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Bot thinking placeholder */}
              {loading && (
                <div className="flex flex-col items-start space-y-1">
                  <span className="text-[8px] font-mono font-bold text-gray-400 tracking-wider uppercase px-1">
                    Foodly AI is thinking...
                  </span>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-3 shadow-xs flex items-center gap-1.5 shrink-0 max-w-[80%]">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-amber-300 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips Strip */}
            <div className="px-4 py-2 border-t border-slate-50 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 flex gap-2 items-center bg-slate-50/50">
              {getSuggestions().map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(s)}
                  disabled={loading}
                  className="bg-white hover:bg-amber-50 border border-slate-150 text-slate-700 hover:text-amber-800 text-[10px] py-1.5 px-3 rounded-full transition-all shadow-2xs hover:shadow-xs hover:border-amber-200 cursor-pointer disabled:opacity-50 shrink-0 font-medium"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Chat Input Footer Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputVal);
              }}
              className="p-3 bg-white border-t border-gray-100 shrink-0 flex gap-2 items-center"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={loading}
                  placeholder={loading ? "Waiting for AI cortex..." : "Ask me anything about restaurants, menus or status..."}
                  className="w-full text-xxs font-sans text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 pl-3 pr-10 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:bg-white placeholder-gray-400 transition-all disabled:opacity-60"
                />
                
                {/* Visual suggestion key tip inside desktop input */}
                <span className="absolute inset-y-0 right-3 hidden sm:flex items-center text-slate-300 uppercase font-mono text-[8px] pointer-events-none gap-0.5">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                  Enter
                </span>
              </div>
              <button
                type="submit"
                disabled={loading || !inputVal.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl p-2.5 transition-colors cursor-pointer shrink-0 border border-slate-800 flex items-center justify-center shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
