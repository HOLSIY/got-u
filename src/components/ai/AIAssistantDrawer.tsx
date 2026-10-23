import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { safeFetch } from '../../utils/apiClient';
import {
  Sparkles,
  X,
  Languages,
  Bot,
  ListTodo,
  FileText,
  Plane,
  GraduationCap,
  Volume2,
  Mic,
  MessageSquare,
  Wand2,
  Calendar,
  CheckSquare,
  DollarSign,
  MapPin,
  Clock,
  ArrowRight,
  Smile,
  Heart,
  Briefcase,
  Laugh,
  Copy,
  Check,
  Loader2,
  Send,
  User as UserIcon,
  RotateCcw,
} from 'lucide-react';
import { Chat, Message, User } from '../../types';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chat?: Chat;
  messages?: Message[];
  currentUser: User;
  initialInputText?: string;
  onApplyToInput?: (text: string) => void;
  onSendMessage?: (text: string) => void;
  onConvertToEventGroup?: (eventData: any) => void;
}

interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  chat,
  messages = [],
  currentUser,
  initialInputText = '',
  onApplyToInput,
  onSendMessage,
  onConvertToEventGroup,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'writer' | 'summary' | 'replies' | 'planners' | 'detected'>('chat');
  const [loading, setLoading] = useState(false);
  
  // Interactive Chat State with Real Send Button
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: chat
        ? `Hello! I am your AI assistant for "${chat.name}". Ask me to summarize recent messages, draft replies, extract action items, or answer any question.`
        : 'Hello! I am your got u AI Assistant. How can I help you refine your thoughts or craft messages today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Other tools state
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [repliesResult, setRepliesResult] = useState<{
    professional?: string;
    funny?: string;
    romantic?: string;
    polite?: string;
  } | null>(null);
  const [planResult, setPlanResult] = useState<any | null>(null);
  const [detectedInfo, setDetectedInfo] = useState<{
    dates?: string[];
    locations?: string[];
    budget?: string;
    attendees?: string[];
    tasks?: string[];
    deadlines?: string[];
    birthdays?: string[];
    itemsToBring?: string[];
  } | null>(null);

  // Rewrite & Translate input
  const [customInput, setCustomInput] = useState(initialInputText);
  const [rewriteResult, setRewriteResult] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);

  // In-flight request cancellation reference
  const activeAbortRef = useRef<AbortController | null>(null);

  // Clean up any in-flight requests when drawer closes or unmounts
  useEffect(() => {
    return () => {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
        activeAbortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen && activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialInputText) {
      setCustomInput(initialInputText);
    }
  }, [initialInputText]);

  useEffect(() => {
    if (isOpen && messages.length > 0 && activeTab === 'detected') {
      handleAutoDetectInfo();
    }
  }, [isOpen, messages, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory, activeTab]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const callAiApi = async (prompt: string, systemInstruction?: string, retries = 1): Promise<string> => {
    // Abort previous in-flight request if user triggered a new one
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    activeAbortRef.current = abortCtrl;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await safeFetch<any>('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, systemInstruction }),
          signal: abortCtrl.signal,
        });

        if (res && res.result && typeof res.result === 'string') {
          return res.result;
        }
        if (res && res.text && typeof res.text === 'string') {
          return res.text;
        }
        if (res && res.data) {
          if (typeof res.data === 'string' && res.data.trim()) return res.data;
          if (typeof res.data.result === 'string') return res.data.result;
          if (typeof res.data.text === 'string') return res.data.text;
        }
        if (res && res.error) {
          throw new Error(res.error);
        }
        throw new Error('AI response is currently empty. Please try again.');
      } catch (err: any) {
        if (err.name === 'AbortError' || abortCtrl.signal.aborted) {
          throw new Error('Request cancelled');
        }
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          continue;
        }
        console.warn('AI Assistant Notice:', err?.message || err);
        throw err;
      } finally {
        if (activeAbortRef.current === abortCtrl) {
          activeAbortRef.current = null;
        }
      }
    }
    throw new Error('AI service is temporarily unavailable. Please try again shortly.');
  };

  // 1. Interactive Ask AI with Real Send Button
  const handleSendAiChat = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || aiChatInput).trim();
    if (!textToSend || loading) return;

    const userMsg: AIChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiChatHistory((prev) => [...prev, userMsg]);
    setAiChatInput('');
    setLoading(true);

    try {
      // Build conversation context
      let promptWithContext = '';
      if (chat && messages.length > 0) {
        const recentMessagesText = messages
          .slice(-25)
          .map((m) => `${m.senderName || 'Member'}: ${m.content}`)
          .join('\n');

        promptWithContext = `You are an AI Assistant inside the got u messaging app, operating within the chat named "${chat.name}".
The user is ${currentUser?.fullName || 'User'} (@${currentUser?.username || 'user'}).

Recent Chat Transcript:
${recentMessagesText}

User Query:
${textToSend}

Provide a helpful, precise, and polite answer. If asked to summarize, give clear key points. If asked to draft a message, provide natural and polished response text.`;
      } else {
        promptWithContext = `You are an AI Assistant inside got u messaging app.
User: ${currentUser?.fullName || 'User'}
Query: ${textToSend}`;
      }

      const systemInstruction = 'You are an intelligent, friendly AI conversational co-pilot for got u. Provide concise, clear, helpful answers.';
      const aiResponse = await callAiApi(promptWithContext, systemInstruction);

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setAiChatHistory((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: AIChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I ran into an issue answering that. Please try again or rephrase your request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Summarize Conversation
  const handleSummarize = async (unreadOnly = false) => {
    setLoading(true);
    setSummaryResult(null);
    try {
      const recentMessages = unreadOnly
        ? messages.slice(-Math.max(chat?.unreadCount || 5, 5))
        : messages.slice(-20);

      const chatContext = recentMessages
        .map((m) => `${m.senderName || 'User'}: ${m.content}`)
        .join('\n');

      const prompt = `Summarize the following ${unreadOnly ? 'unread' : 'recent'} messages from a chat named "${chat?.name || 'Conversation'}":\n\n${chatContext}`;
      const systemInstruction = 'You are an intelligent chat assistant inside got u. Provide concise bullet points summarizing main topics, agreements, and key takeaways.';

      const result = await callAiApi(prompt, systemInstruction);
      setSummaryResult(result);
    } catch (err) {
      setSummaryResult('Unable to generate summary right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Generate Smart Reply Suggestions
  const handleSuggestReplies = async () => {
    setLoading(true);
    setRepliesResult(null);
    try {
      const lastFew = messages.slice(-5).map((m) => `${m.senderName}: ${m.content}`).join('\n');
      const prompt = `Based on these recent chat messages:\n${lastFew}\n\nGenerate 4 distinct quick reply suggestions for ${currentUser?.fullName || 'the user'} in JSON format with keys "professional", "funny", "romantic", and "polite". Return ONLY JSON.`;

      const resultText = await callAiApi(prompt, 'You are a smart conversation reply generator. Return valid JSON only.');
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setRepliesResult(JSON.parse(jsonMatch[0]));
        } else {
          setRepliesResult({
            professional: 'Thank you for updating me. I will review this shortly.',
            funny: "That sounds like a plot twist I wasn't prepared for! 😂",
            romantic: "Can't wait to hear more about this in person ❤️",
            polite: 'Sounds great! Thanks for letting me know.',
          });
        }
      } catch (e) {
        setRepliesResult({
          professional: 'Understood. I will follow up on this soon.',
          funny: "Wait, really? That's hilarious! 😆",
          romantic: 'Always happy to talk with you! ✨',
          polite: 'Appreciate the heads up!',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Writing Assistant & Refinement
  const handleRewrite = async (mode: 'grammar' | 'spelling' | 'rewrite' | 'professional' | 'friendly' | 'romantic' | 'funny' | 'shorten' | 'expand' | 'tone' | 'emoji') => {
    if (!customInput.trim()) return;
    setLoading(true);
    setRewriteResult(null);
    try {
      const instructions: Record<string, string> = {
        grammar: 'Fix all grammar, punctuation, and sentence structure errors while keeping natural tone.',
        spelling: 'Correct any spelling mistakes while preserving original meaning.',
        rewrite: 'Rewrite and polish this message to be clear, elegant, and engaging.',
        professional: 'Rewrite this message to sound polished, clear, respectful, and professional.',
        friendly: 'Rewrite this message to sound warm, friendly, casual, and approachable.',
        romantic: 'Rewrite this message with a romantic, affectionate, and thoughtful tone.',
        funny: 'Rewrite this message with a humorous, playful, and witty tone with emojis.',
        shorten: 'Shorten and condense this text while preserving the core message.',
        expand: 'Expand and elaborate on this message with helpful details.',
        tone: 'Improve overall tone to be confident, clear, and persuasive.',
        emoji: 'Add relevant, expressive emojis naturally throughout this text.',
      };

      const systemInstruction = `You are a writing co-pilot for got u messaging app. Your duty is to edit, refine, translate, or format the text provided by the user. Analyze ONLY the provided text. Output ONLY the exact revised text string.`;

      const prompt = `Task: ${instructions[mode]}\nInput Text:\n"${customInput}"`;
      const result = await callAiApi(prompt, systemInstruction);
      setRewriteResult(result);
    } catch (err) {
      setRewriteResult('Unable to process writing request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Translate Message
  const handleTranslate = async () => {
    if (!customInput.trim()) return;
    setLoading(true);
    setRewriteResult(null);
    try {
      const prompt = `Detect the language of this text and translate it into ${targetLanguage}:\n\n"${customInput}"`;
      const result = await callAiApi(prompt, 'You are a high-precision multi-language translator.');
      setRewriteResult(result);
    } catch (err) {
      setRewriteResult('Error translating text.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Smart Planners
  const handleCreatePlan = async (type: 'meeting' | 'shopping' | 'travel' | 'study') => {
    setLoading(true);
    setPlanResult(null);
    try {
      const chatContext = messages.slice(-25).map((m) => `${m.senderName}: ${m.content}`).join('\n');
      const planTypes = {
        meeting: 'Extract meeting notes, action items, decisions, and dates discussed.',
        shopping: 'Create an organized shopping list with categories and quantities based on the chat.',
        travel: 'Create an itinerary travel plan with destination, dates, budget estimate, and packing checklist based on the chat.',
        study: 'Create a study schedule with key topics, milestone dates, and study materials mentioned.',
      };

      const result = await callAiApi(
        `Based on this conversation:\n${chatContext}\n\n${planTypes[type]}`,
        'You are an expert organizing assistant. Return clean, formatted Markdown.'
      );
      setPlanResult({ type, content: result });
    } catch (err) {
      setPlanResult({ type, content: 'Failed to generate plan.' });
    } finally {
      setLoading(false);
    }
  };

  // 7. Auto Detect Info
  const handleAutoDetectInfo = async () => {
    if (messages.length === 0) return;
    try {
      const text = messages.slice(-30).map((m) => `${m.senderName}: ${m.content}`).join('\n');
      const prompt = `Analyze this chat history and extract structured event details in JSON format with keys:
- "dates": list of dates/times mentioned
- "locations": list of places/addresses mentioned
- "budget": total estimated budget if discussed (or null)
- "attendees": list of people attending
- "tasks": list of checkable tasks or action items
- "deadlines": list of deadlines
- "birthdays": list of birthdays mentioned
- "itemsToBring": list of things to bring or shopping items

Text:\n${text}`;

      const res = await callAiApi(prompt, 'You extract structured event information from chat messages. Return JSON only.');
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setDetectedInfo(JSON.parse(jsonMatch[0]));
      }
    } catch (err) {
      console.warn('Auto detect failed:', err);
    }
  };

  // Text-To-Voice Synthesis
  const handleTextToVoice = (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis not supported or blocked:', e);
    }
  };

  // Speech-To-Text Recognition
  const handleVoiceToTextToggle = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    if (typeof window === 'undefined') return;

    // Prefer webkitSpeechRecognition as it has a valid constructor in WebKit/Chromium
    const SpeechRecognitionClass =
      (window as any).webkitSpeechRecognition ||
      (typeof (window as any).SpeechRecognition === 'function' ? (window as any).SpeechRecognition : null);

    if (!SpeechRecognitionClass) {
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        if (activeTab === 'chat') {
          setAiChatInput(text);
        } else {
          setCustomInput(text);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
        {/* Backdrop overlay dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Drawer Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 bg-white dark:bg-[#12141d] border-t border-slate-200 dark:border-white/10 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/95 dark:bg-[#12141d]/95 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  got u AI Assistant
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                    Chat Co-Pilot
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {chat ? `Conversing in ${chat.name}` : 'Personal chat & writing assistant'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation Bar */}
          <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-[#0a0b0e]/60 border-b border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar">
            {[
              { id: 'chat', label: 'Ask AI', icon: Bot },
              { id: 'writer', label: 'Writing Tools', icon: Wand2 },
              { id: 'replies', label: 'Smart Replies', icon: MessageSquare },
              { id: 'summary', label: 'Summarize', icon: FileText },
              { id: 'planners', label: 'Planners', icon: ListTodo },
              { id: 'detected', label: 'Events & Info', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Drawer Body Content */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 min-h-[340px] max-h-[60vh]">
            {/* Tab 0: Primary Interactive Chat with AI with Real Send Button */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full space-y-3">
                {/* Quick Suggestion Pills */}
                {chat && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {[
                      'Summarize this conversation',
                      'What did we agree on?',
                      'Draft a polite follow-up',
                      'Find dates & locations',
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendAiChat(suggestion)}
                        disabled={loading}
                        className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* AI Chat History */}
                <div className="space-y-3 overflow-y-auto pr-1 max-h-[300px]">
                  {aiChatHistory.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div
                          className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                            isUser
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-slate-100 dark:bg-[#0a0b0e] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>

                        {/* AI Message Action Buttons */}
                        {!isUser && msg.id !== 'welcome' && (
                          <div className="flex items-center gap-2 pt-0.5 px-1 text-[11px]">
                            {onApplyToInput && (
                              <button
                                onClick={() => {
                                  onApplyToInput(msg.text);
                                  onClose();
                                }}
                                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                Insert into chat
                              </button>
                            )}

                            {onSendMessage && (
                              <button
                                onClick={() => {
                                  onSendMessage(msg.text);
                                  onClose();
                                }}
                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                Send as message
                              </button>
                            )}

                            <button
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedIndex === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              {copiedIndex === msg.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-[#0a0b0e] border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-indigo-500 dark:text-indigo-400 w-fit">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Explicit Chat Input with Real Send Button */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiChat();
                  }}
                  className="relative flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10"
                >
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    placeholder={chat ? `Ask anything about ${chat.name}...` : 'Ask AI a question or request...'}
                    disabled={loading}
                    className="flex-1 bg-slate-100 dark:bg-[#0a0b0e] border border-slate-300 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={handleVoiceToTextToggle}
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 animate-pulse'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!aiChatInput.trim() || loading}
                    className="h-9 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Tab 1: Writing Tools */}
            {activeTab === 'writer' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Your Message / Input Text</span>
                    <button
                      onClick={handleVoiceToTextToggle}
                      className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 border transition-all cursor-pointer ${
                        isListening
                          ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/40 animate-pulse'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      {isListening ? 'Listening...' : 'Voice Input'}
                    </button>
                  </div>

                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Type or paste text to refine..."
                    rows={3}
                    className="w-full p-3 bg-white dark:bg-[#0a0b0e] border border-slate-300 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                {/* 11 Writing Action Chips */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block">
                    Choose Assistant Action:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'grammar', label: '✨ Grammar Check' },
                      { id: 'spelling', label: '🔤 Spell Check' },
                      { id: 'rewrite', label: '📝 Rewrite & Polish' },
                      { id: 'professional', label: '💼 Professional' },
                      { id: 'friendly', label: '😊 Friendly' },
                      { id: 'romantic', label: '❤️ Romantic' },
                      { id: 'funny', label: '😂 Funny' },
                      { id: 'shorten', label: '⚡ Shorten' },
                      { id: 'expand', label: '📖 Expand' },
                      { id: 'tone', label: '🎯 Improve Tone' },
                      { id: 'emoji', label: '😄 Add Emojis' },
                    ].map((act) => (
                      <button
                        key={act.id}
                        onClick={() => handleRewrite(act.id as any)}
                        disabled={loading || !customInput.trim()}
                        className="px-3 py-1.5 bg-white dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-white/20 text-slate-900 dark:text-slate-100 text-xs rounded-xl font-bold border border-slate-300 dark:border-white/15 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Translation Row */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Translate to:</span>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="p-1.5 bg-white dark:bg-[#0a0b0e] border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs rounded-xl focus:outline-none cursor-pointer"
                    >
                      {['English', 'Afaan Oromo', 'Amharic', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Russian'].map(
                        (lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTranslate}
                      disabled={loading || !customInput.trim()}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Translate
                    </button>
                  </div>
                </div>

                {/* Result output */}
                {rewriteResult && !loading && (
                  <div className="p-4 bg-slate-100 dark:bg-[#0a0b0e] border border-slate-300 dark:border-white/10 rounded-2xl space-y-3 shadow-md">
                    <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold border-b border-slate-200 dark:border-white/10 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Revision Result
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTextToVoice(rewriteResult)}
                          className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Speak
                        </button>

                        <button
                          onClick={() => copyToClipboard(rewriteResult, 'rewrite')}
                          className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer"
                        >
                          {copiedIndex === 'rewrite' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedIndex === 'rewrite' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-900 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                      {rewriteResult}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {onApplyToInput && (
                        <button
                          onClick={() => {
                            onApplyToInput(rewriteResult);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Apply to Message Input
                        </button>
                      )}

                      {onSendMessage && (
                        <button
                          onClick={() => {
                            onSendMessage(rewriteResult);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send directly
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Summarize */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSummarize(false)}
                    disabled={loading}
                    className="p-3 bg-slate-100 dark:bg-neutral-800/70 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-300 dark:border-neutral-700/60 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-900 dark:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" /> : <Bot className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />}
                    Summarize Conversation
                  </button>

                  <button
                    onClick={() => handleSummarize(true)}
                    disabled={loading}
                    className="p-3 bg-slate-100 dark:bg-neutral-800/70 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-300 dark:border-neutral-700/60 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-900 dark:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-purple-500 dark:text-purple-400" /> : <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />}
                    Summarize Unread
                  </button>
                </div>

                {summaryResult && (
                  <div className="p-4 bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-2xl space-y-2 relative">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800/60 pb-2">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Summary
                      </span>
                      <button
                        onClick={() => copyToClipboard(summaryResult, 'sum')}
                        className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        {copiedIndex === 'sum' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedIndex === 'sum' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-900 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">{summaryResult}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Smart Replies */}
            {activeTab === 'replies' && (
              <div className="space-y-4">
                <button
                  onClick={handleSuggestReplies}
                  disabled={loading}
                  className="w-full p-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Smart Reply Tones
                </button>

                {repliesResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'professional', label: 'Professional', icon: Briefcase, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
                      { key: 'funny', label: 'Funny', icon: Laugh, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
                      { key: 'romantic', label: 'Romantic', icon: Heart, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' },
                      { key: 'polite', label: 'Polite', icon: Smile, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
                    ].map((item) => {
                      const text = repliesResult[item.key as keyof typeof repliesResult];
                      if (!text) return null;
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className={`p-3 rounded-2xl border ${item.bg} flex flex-col justify-between gap-2.5 group hover:scale-[1.01] transition-transform`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold flex items-center gap-1.5 ${item.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {item.label}
                            </span>
                            <button
                              onClick={() => {
                                onSendMessage?.(text);
                                onClose();
                              }}
                              className="text-[11px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Send className="w-3 h-3" /> Send
                            </button>
                          </div>
                          <p className="text-xs text-slate-900 dark:text-neutral-200 font-medium italic">"{text}"</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Planners */}
            {activeTab === 'planners' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'meeting', label: 'Meeting Notes', icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
                    { id: 'shopping', label: 'Shopping List', icon: ListTodo, color: 'text-emerald-600 dark:text-emerald-400' },
                    { id: 'travel', label: 'Travel Plan', icon: Plane, color: 'text-sky-600 dark:text-sky-400' },
                    { id: 'study', label: 'Study Plan', icon: GraduationCap, color: 'text-amber-600 dark:text-amber-400' },
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleCreatePlan(p.id as any)}
                        disabled={loading}
                        className="p-3 bg-slate-100 dark:bg-neutral-800/70 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-300 dark:border-neutral-700/60 rounded-2xl flex flex-col items-center gap-1.5 text-center transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Icon className={`w-5 h-5 ${p.color}`} />
                        <span className="text-xs font-semibold text-slate-900 dark:text-neutral-200">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {planResult && !loading && (
                  <div className="p-4 bg-slate-100 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-neutral-800 pb-2">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> {planResult.type} Plan
                      </span>
                      <button
                        onClick={() => copyToClipboard(planResult.content, 'plan')}
                        className="text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        {copiedIndex === 'plan' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedIndex === 'plan' ? 'Copied' : 'Copy Plan'}
                      </button>
                    </div>
                    <div className="text-xs text-slate-900 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed font-medium">
                      {planResult.content}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Events & Detected Info */}
            {activeTab === 'detected' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Auto-Detected Event & Key Info
                  </h4>
                  <button
                    onClick={handleAutoDetectInfo}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Re-scan Chat
                  </button>
                </div>

                {detectedInfo ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {detectedInfo.dates && detectedInfo.dates.length > 0 && (
                        <div className="p-2.5 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-300 dark:border-neutral-800">
                          <span className="text-slate-500 dark:text-neutral-500 text-[10px] uppercase font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Dates Detected
                          </span>
                          <p className="text-slate-900 dark:text-neutral-200 mt-1 font-medium">{detectedInfo.dates.join(', ')}</p>
                        </div>
                      )}

                      {detectedInfo.locations && detectedInfo.locations.length > 0 && (
                        <div className="p-2.5 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-300 dark:border-neutral-800">
                          <span className="text-slate-500 dark:text-neutral-500 text-[10px] uppercase font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500 dark:text-rose-400" /> Locations
                          </span>
                          <p className="text-slate-900 dark:text-neutral-200 mt-1 font-medium">{detectedInfo.locations.join(', ')}</p>
                        </div>
                      )}

                      {detectedInfo.budget && (
                        <div className="p-2.5 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-300 dark:border-neutral-800">
                          <span className="text-slate-500 dark:text-neutral-500 text-[10px] uppercase font-bold flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Budget
                          </span>
                          <p className="text-slate-900 dark:text-neutral-200 mt-1 font-medium">{detectedInfo.budget}</p>
                        </div>
                      )}

                      {detectedInfo.attendees && detectedInfo.attendees.length > 0 && (
                        <div className="p-2.5 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-300 dark:border-neutral-800">
                          <span className="text-slate-500 dark:text-neutral-500 text-[10px] uppercase font-bold">People Attending</span>
                          <p className="text-slate-900 dark:text-neutral-200 mt-1 font-medium">{detectedInfo.attendees.join(', ')}</p>
                        </div>
                      )}
                    </div>

                    {detectedInfo.tasks && detectedInfo.tasks.length > 0 && (
                      <div className="p-3 bg-slate-100 dark:bg-neutral-950 rounded-2xl border border-slate-300 dark:border-neutral-800 text-xs">
                        <span className="text-slate-600 dark:text-neutral-400 text-[11px] font-semibold flex items-center gap-1.5 mb-2">
                          <CheckSquare className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" /> Tasks & Checklist
                        </span>
                        <ul className="space-y-1 text-slate-800 dark:text-neutral-300 font-medium">
                          {detectedInfo.tasks.map((task, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:purple-400" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Convert to Event Group */}
                    <button
                      onClick={() => {
                        onConvertToEventGroup?.(detectedInfo);
                        onClose();
                      }}
                      className="w-full p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      Convert Discussion into Organized Event Group
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-neutral-500 space-y-2">
                    <p>No specific dates or event details detected in recent messages.</p>
                    <p className="text-[11px] text-slate-400 dark:text-neutral-600">Start talking about trips, birthdays, meetings, or dinners to auto-extract details!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
