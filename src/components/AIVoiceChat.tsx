import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, MessageCircle, X, Loader2, Phone, PhoneOff, Send, MessageSquare
} from 'lucide-react';
import { openaiRealtimeService, RealtimeEvent } from '../services/openaiRealtimeService';
import { aiAssistantService } from '../services/aiAssistantService';
import { sendToInstacart } from '../services/instacartAgentService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useRetailerSelection } from '../hooks/useRetailerSelection';

interface AIVoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIVoiceChat({ isOpen, onClose }: AIVoiceChatProps) {
  const { user } = useAuth();
  const { selectedRetailer } = useRetailerSelection();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Add Instacart items directly to the shopping list database
  const addItemsToLocalShoppingList = async (items: string[]) => {
    console.log('🔴 addItemsToLocalShoppingList CALLED with:', items);
    console.log('🔴 User object:', user);
    
    if (!user) {
      console.error('❌ No user found, cannot add items to shopping list');
      return;
    }

    if (!items || items.length === 0) {
      console.warn('⚠️ No items provided to add');
      return;
    }

    console.log('🛒 Starting to add items to local shopping list:', items);

    for (const item of items) {
      try {
        console.log(`🛒 Attempting to add item: "${item}" for user: ${user.id}`);
        
        const insertData = {
          user_id: user.id,
          item: item.trim(),
          category: 'other',
          quantity: 1,
          completed: false,
          urgent: false,
        };
        
        console.log('🛒 Insert data:', insertData);
        
        // Direct database insert
        const { data, error } = await supabase
          .from('shopping_lists')
          .insert([insertData])
          .select();

        if (error) {
          console.error(`❌ Supabase error adding "${item}":`, error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
        } else {
          console.log(`✅ Successfully added "${item}" to shopping list`);
          console.log('✅ Returned data:', data);
        }
      } catch (e) {
        console.error(`❌ Exception adding "${item}":`, e);
      }
    }

    console.log('🛒 Finished processing all items');
  };
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<RealtimeEvent[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(false);
  const [inConversation, setInConversation] = useState(false);
  const [chatMode, setChatMode] = useState<'voice' | 'text'>('voice');

  // Handle mode switching - stop wake word detection when switching to text
  useEffect(() => {
    if (chatMode === 'text') {
      openaiRealtimeService.stopWakeWordDetection?.();
      setIsWaitingForWakeWord(false);
      setInConversation(false);
    } else if (chatMode === 'voice' && isConnected) {
      openaiRealtimeService.startWakeWordDetection?.();
      setIsWaitingForWakeWord(true);
    }
  }, [chatMode, isConnected]);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper functions for Instacart URL handling
  const extractFirstUrl = (text: string): string | null => {
    const match = text.match(/https?:\/\/[^\s)]+/i);
    return match?.[0] ?? null;
  };

  const stripInstacartUrlLine = (text: string): string => {
    // removes the "You can open it here:" line (keeps the rest)
    return text
      .split('\n')
      .filter((line) => !line.toLowerCase().includes('you can open it here:'))
      .join('\n')
      .trim();
  };

  const isInstacartCartUrl = (url: string) =>
    url.includes('instacart') || url.includes('instacart.tools');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initializingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (!isOpen || !user) return;
    if (initializingRef.current) return;

    initializingRef.current = true;
    setError(null);

    (async () => {
      try {
        setIsConnecting(true);

        // 1) Feature check
        if (typeof openaiRealtimeService.isSupported === 'function') {
          if (!openaiRealtimeService.isSupported()) {
            throw new Error('WebRTC is not supported in this browser');
          }
        }

        // 2) Wire event handlers BEFORE/AS initialize
        openaiRealtimeService.onEvent(handleRealtimeEvent);
        openaiRealtimeService.onConnectionStateChange((state) => {
          setConnectionState(state);
          setIsConnected(state === 'connected');
          if (state === 'connected' && chatMode === 'voice') {
            setIsWaitingForWakeWord(true);
          }
        });

        // 3) Set up wake word detection
        openaiRealtimeService.onWakeWordDetected(() => {
          console.log('🎤 Wake word detected, starting conversation');
          setIsWaitingForWakeWord(false);
          setInConversation(true);
          openaiRealtimeService.startConversation?.();
        });

        // 3) Initialize (server should mint ephemeral token, set up WebRTC)
        await openaiRealtimeService.initialize(user.id);

        // 4) Audio element from service
        const audioEl = openaiRealtimeService.getAudioElement?.();
        if (audioEl) audioRef.current = audioEl;

        setError(null);
        // intentionally leave isConnecting as true until state flips via onConnectionStateChange
      } catch (e: any) {
        console.error('❌ OpenAI Realtime initialization failed:', e);
        setError(e?.message || 'Failed to initialize AI voice chat');
        setIsConnecting(false);
        initializingRef.current = false;
      }
    })();

    // Cleanup ALWAYS on unmount/close
    return () => {
      try {
        openaiRealtimeService.offEvent?.(handleRealtimeEvent);
        openaiRealtimeService.disconnect?.();
      } catch {}
      setIsConnected(false);
      setConnectionState('closed');
      setConversation([]);
      setCurrentResponse('');
      setIsListening(false);
      setIsMuted(false);
      setIsConnecting(false);
      initializingRef.current = false;
    };
  }, [isOpen, user]);

  // Flip connecting spinner if we reach a terminal state
  useEffect(() => {
    if (connectionState === 'connected' || connectionState === 'failed' || connectionState === 'closed') {
      setIsConnecting(false);
    }
  }, [connectionState]);

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    // console.debug('📨 Realtime event:', event.type, event);
    setConversation(prev => [...prev, event]);

    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        break;

      case 'conversation.item.created':
        // could update UI for assistant/user items here
        break;

      // 🟡 Instacart voice flow started
      case 'instacart.order.started': {
        const text = (event as any).text as string | undefined;

        // Optionally show a little status message in text chat history
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sending your order to Instacart…',
          },
        ]);
        break;
      }

      // 🟢 Instacart voice result
      case 'instacart.order.result': {
        console.log('🔍🔍🔍 INSTACART ORDER RESULT EVENT RECEIVED');
        console.log('🛒🛒🛒 Full event:', JSON.stringify(event, null, 2));
        
        const result = (event as any).data as {
          status: 'success' | 'error';
          items?: Array<string | { name?: string; displayText?: string }>;
          instacart_list_url?: string;
          message?: string;
        };

        console.log('🟢🟢🟢 Result object:', result);
        console.log('🟢 Result.items:', result.items);
        console.log('🟢 Result.items is array?', Array.isArray(result.items));
        console.log('🟢 Result.items length:', result.items?.length);

        if (result.status === 'success') {
          console.log('🟢 Success status confirmed - extracting item names');
          
          // ✅ Extract clean item names from objects or strings
          const itemNames = result.items && result.items.length
            ? result.items.map((item, idx) => {
                console.log(`📦 Item ${idx} raw value:`, item, `type: ${typeof item}`);
                
                if (typeof item === 'string') {
                  console.log(`📦 Item ${idx} is string:`, item);
                  return item;
                }
                if (item && typeof item === 'object') {
                  const name = item.name || item.displayText || 'item';
                  console.log(`📦 Item ${idx} is object, extracted name:`, name);
                  return name;
                }
                console.log(`📦 Item ${idx} is neither string nor object, using default`);
                return 'item';
              }).filter((name, idx) => {
                const keep = name && name !== 'item';
                console.log(`🔍 Filter check ${idx}: "${name}" -> keep = ${keep}`);
                return keep;
              })
            : [];

          console.log('🟢🟢🟢 FINAL EXTRACTED ITEM NAMES:', itemNames);
          console.log('🟢 Total items to add:', itemNames.length);

          const summary = itemNames.length > 0
            ? `I created an Instacart list with ${itemNames.join(', ')}.`
            : 'I created an Instacart list for you.';

          const urlPart = result.instacart_list_url
            ? `\nYou can open it here: ${result.instacart_list_url}`
            : '';

          console.log('🟢 Setting chat message:', summary);
          setChatMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: summary + urlPart,
            },
          ]);

          // 🛒 CRITICAL: Add items to local shopping list
          if (itemNames.length > 0) {
            console.log('🛒🛒🛒 ABOUT TO CALL addItemsToLocalShoppingList');
            console.log('🛒 Items:', itemNames);
            console.log('🛒 User ID:', user?.id);
            console.log('🛒 User email:', user?.email);
            
            // Call it immediately
            addItemsToLocalShoppingList(itemNames)
              .then(() => {
                console.log('✅✅✅ addItemsToLocalShoppingList COMPLETED SUCCESSFULLY');
              })
              .catch((e) => {
                console.error('❌❌❌ addItemsToLocalShoppingList FAILED:', e);
                console.error('❌ Error message:', e.message);
                console.error('❌ Error stack:', e.stack);
              });
          } else {
            console.warn('⚠️⚠️⚠️ NO ITEM NAMES EXTRACTED - skipping local shopping list sync');
          }
        } else {
          console.error('❌ Result status is not success:', result.status);
          setChatMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content:
                result.message ??
                'Something went wrong sending this to Instacart. Please try again.',
            },
          ]);
        }
        break;
      }

      // 🔴 Instacart voice error
      case 'instacart.order.error': {
        const err = (event as any).error as string | undefined;

        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Sorry, I couldn’t send that to Instacart. ' +
              (err || 'Please try again.'),
          },
        ]);

        break;
      }

      case 'response.text.delta':
        if (event.delta) setCurrentResponse(prev => prev + event.delta);
        break;

      case 'response.done':
        setCurrentResponse('');
        // End conversation and return to wake word detection
        setTimeout(() => {
          setInConversation(false);
          setIsWaitingForWakeWord(true);
          openaiRealtimeService.stopConversation?.();
        }, 1000);
        break;

      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;

      case 'error':
        setError(event.error?.message || 'An error occurred');
        break;
    }
  };

  const sendTextMessage = async (text: string) => {
    if (chatMode === 'text') {
    if (!text.trim() || isProcessing) return;

    const trimmed = text.trim();
    const userMessage = { role: 'user' as const, content: trimmed };

    // Add user message to chat immediately
    setChatMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);

    try {
      const lower = trimmed.toLowerCase();

      // 🛒 Instacart detection for TEXT chat
      if (
        lower.includes('instacart') ||
        lower.includes('add to cart') ||
        lower.includes('shopping list') ||
        lower.includes('grocery')
      ) {
        try {
          const result = await sendToInstacart(trimmed, selectedRetailer);

          if (result.status === 'success') {
            const itemNames = result.items && result.items.length
              ? result.items
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                      return item.name || item.displayText || 'item';
                    }
                    return 'item';
                  })
                  .filter((name: string) => name && name !== 'item')
              : [];

            const summary =
              itemNames.length > 0
                ? `I created an Instacart list with ${itemNames.join(', ')}.`
                : 'I created an Instacart list for you.';

            const urlPart = result.instacart_list_url
              ? `\nYou can open it here: ${result.instacart_list_url}`
              : '';

            setChatMessages(prev => [
              ...prev,
              { role: 'assistant' as const, content: summary + urlPart },
            ]);

            // 🛒 Also sync to local shopping list
            if (itemNames.length > 0) {
              await addItemsToLocalShoppingList(itemNames);
            }
          } else {
            setChatMessages(prev => [
              ...prev,
              {
                role: 'assistant' as const,
                content:
                  result.message ??
                  'Something went wrong sending this to Instacart. Please try again.',
              },
            ]);
          }
        } catch (err: any) {
          console.error('❌ Instacart text flow failed:', err);
          setChatMessages(prev => [
            ...prev,
            {
              role: 'assistant' as const,
              content:
                'I had trouble talking to Instacart. Your items might not be in the cart yet. Please try again from the Shopping tab.',
            },
          ]);
        } finally {
          setIsProcessing(false);
        }

        // ⛔ Important: stop here, don't fall through to Sara's brain
        return;
      }

      // 🧠 Non-Instacart text → Sara as usual
      const result = await aiAssistantService.processUserMessage(
        trimmed,
        user!.id,
        chatMessages,
      );
      const assistantMessage = {
        role: 'assistant' as const,
        content: result.message,
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('❌ Sara text handler error:', err);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content:
            'I ran into a problem handling that request. Please try again in a moment.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  } else {
    // Voice mode - send to realtime service (unchanged)
    if (!isConnected) {
      setError('Not connected to Sarah. Please wait for connection.');
      return;
    }

    openaiRealtimeService.sendMessage?.(text);

    setConversation(prev => [
      ...prev,
      { type: 'user_message', content: text, timestamp: Date.now() } as RealtimeEvent,
    ]);
  }
  };

  const toggleMute = async () => {
    try {
      if (!isConnected) return;
      if (isMuted) {
        await openaiRealtimeService.unmute?.();
        setIsMuted(false);
      } else {
        await openaiRealtimeService.mute?.();
        setIsMuted(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not toggle mute');
    }
  };

  const startVoiceConversation = () => {
    if (isConnected && !inConversation) {
      setIsWaitingForWakeWord(false);
      setInConversation(true);
      openaiRealtimeService.startConversation?.();
    }
  };

  const endConversation = () => {
    if (isConnected) {
      setInConversation(false);
      setIsWaitingForWakeWord(true);
      openaiRealtimeService.stopConversation?.();
    }
  };

  const interruptAI = () => {
    if (isConnected) openaiRealtimeService.interrupt?.();
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected':
      case 'failed':
      case 'closed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'new': return 'Initializing...';
      case 'connecting': return 'Connecting to Sarah...';
      case 'connected': return 'Connected to Sarah';
      case 'disconnected': return 'Disconnected';
      case 'failed': return 'Connection failed';
      case 'closed': return 'Connection closed';
      default: return 'Unknown';
    }
  };

  const handleSendTextMessage = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTextMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-rose-900 bg-opacity-40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Sarah Assistant</h3>
                <p className={`text-sm font-medium ${connectionState === 'connected' ? 'text-green-100' : connectionState === 'connecting' ? 'text-yellow-100' : 'text-rose-100'}`}>
                  {chatMode === 'text' ? 'Text Chat Mode' : getConnectionStatusText()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Mode Toggle */}
              <div className="flex bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-1">
                <button
                  onClick={() => setChatMode('voice')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    chatMode === 'voice'
                      ? 'bg-white text-rose-600'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                  title="Voice Mode"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChatMode('text')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    chatMode === 'text'
                      ? 'bg-white text-rose-600'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                  title="Text Mode"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-rose-50 to-white dark:from-gray-800 dark:to-gray-900">
          {/* Text Chat Mode */}
          {chatMode === 'text' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Text Chat with Sarah</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Type your message below to start chatting</p>
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 border-2 border-rose-200 dark:border-rose-700 p-4 rounded-2xl max-w-sm mx-auto">
                      <p className="text-sm text-rose-800 dark:text-rose-200 font-medium">
                        💡 Ask me to schedule events, add shopping items, create tasks, and more!
                      </p>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                {chatMessages.map((message, index) => {
                  const url = message.role === 'assistant' ? extractFirstUrl(message.content) : null;
                  const showCartButton = !!url && isInstacartCartUrl(url);
                  const displayText =
                    url && showCartButton ? stripInstacartUrlLine(message.content) : message.content;

                  return (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-rose-400 to-pink-400 text-white'
                            : 'bg-white dark:bg-gray-700 border-2 border-rose-100 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{displayText}</p>

                        {showCartButton && url && (
                          <div className="mt-3">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 transition"
                            >
                              Open Cart
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border-2 border-rose-100 dark:border-gray-600 p-4 rounded-2xl">
                      <Loader2 className="w-5 h-5 animate-spin text-rose-600 dark:text-rose-400" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Voice Mode */}
          {chatMode === 'voice' && (
          <div className="p-6">
          {!isConnected && (
            <div className="text-center py-8">
              {isConnecting ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">Connecting to Sarah...</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Setting up real-time voice connection</p>
                </>
              ) : error ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-lg font-semibold text-rose-600 dark:text-rose-400 mb-2">Connection Error</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setIsConnecting(true);
                      // re-run init
                      (async () => {
                        try {
                          await openaiRealtimeService.initialize(user!.id);
                        } catch (e: any) {
                          setError(e?.message || 'Failed to initialize AI voice chat');
                        } finally {
                          setIsConnecting(false);
                        }
                      })();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    Retry Connection
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">Ready to talk to Sarah</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Click the microphone to start talking</p>
                </>
              )}
            </div>
          )}

          {/* Wake Word Status */}
          {isConnected && isWaitingForWakeWord && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg">
                    <Mic className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-rose-400 to-pink-400 rounded-full animate-ping opacity-20"></div>
                </div>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Listening for wake word</p>
                <p className="text-base text-gray-600 dark:text-gray-400 mb-4">Say <strong className="text-rose-600 dark:text-rose-400">"Hey, Sarah"</strong> to start</p>
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 border-2 border-rose-200 dark:border-rose-700 p-4 rounded-2xl">
                  <p className="text-sm text-rose-800 dark:text-rose-200 font-medium">
                    💡 Sarah is waiting for you to say the wake word before she starts listening to your requests
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Conversation */}
          {isConnected && inConversation && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle className="w-12 h-12 text-white" />
                </div>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Conversation Active</p>
                <p className="text-base text-gray-600 dark:text-gray-400">I'm listening and ready to help!</p>
              </div>
            </div>
          )}

          {/* Conversation Display */}
          {isConnected && inConversation && (
            <div className="space-y-4">
              {currentResponse && (
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 border-2 border-rose-200 dark:border-rose-700 p-4 rounded-2xl">
                  <p className="text-sm text-rose-900 dark:text-rose-200">
                    <span className="font-semibold">Sarah is responding:</span> {currentResponse}
                  </p>
                </div>
              )}

              {isListening && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 p-4 rounded-2xl flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                  <p className="text-sm text-green-900 dark:text-green-200 font-semibold">Listening...</p>
                </div>
              )}
            </div>
          )}
          </div>
          )}
        </div>

        {/* Text Input Area for Text Chat Mode */}
        {chatMode === 'text' && (
          <div className="p-6 bg-white dark:bg-gray-800 border-t-2 border-rose-100 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendTextMessage}
                disabled={!textInput.trim() || isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Controls - Only show in voice mode */}
        {chatMode === 'voice' && (
        <div className="p-6 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border-t-2 border-rose-100 dark:border-gray-700 flex items-center justify-center space-x-4">
          <button
            onClick={toggleMute}
            disabled={!isConnected}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg ${
              isMuted
                ? 'bg-gradient-to-br from-red-400 to-red-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:border-rose-300 dark:hover:border-rose-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={startVoiceConversation}
            disabled={!isConnected || inConversation}
            className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Start voice conversation"
          >
            <Phone className="w-7 h-7" />
          </button>

          <button
            onClick={endConversation}
            disabled={!isConnected || !inConversation}
            className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="End conversation"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-2 text-sm font-medium text-rose-700 dark:text-rose-400">
            <MessageCircle className="w-5 h-5" />
            <span>
              {isWaitingForWakeWord ? 'Say "Hey, Sarah"' : inConversation ? 'In conversation' : 'Talk to Sarah'}
            </span>
          </div>
        </div>
        )}

        {/* WebRTC Not Supported Warning - Only show in voice mode */}
        {chatMode === 'voice' && typeof openaiRealtimeService.isSupported === 'function' && !openaiRealtimeService.isSupported() && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-t-2 border-amber-300 dark:border-amber-700">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              ⚠️ WebRTC is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
