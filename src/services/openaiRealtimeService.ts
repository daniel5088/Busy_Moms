import { aiAssistantService } from './aiAssistantService';
import { calendarContextService } from './calendarContext';
import { sendToInstacart } from './instacartAgentService';
import { supabase } from "../lib/supabase";
import { IngredientParser } from '../utils/ingredientParser';
import { aiVoicePreferencesService, AIPersonality } from './aiVoicePreferences';
import { weatherService } from './weatherService';
import { extractEventDateInfo, normalizeTime as normalizeTimeString, detectDate, EventDateInfo } from '../utils/dateDetection';

// Fallback minimal speech types (safe for TS projects without full lib.dom)
interface MinimalSpeechResult { transcript: string }
interface MinimalSpeechEvent { results?: Array<Array<MinimalSpeechResult>> }
interface MinimalSpeechErrorEvent { error?: string }
interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: MinimalSpeechEvent) => void;
  onerror?: (e: MinimalSpeechErrorEvent) => void;
  onend?: () => void;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;
type WindowSpeech = { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };

export interface OpenAIRealtimeConfig {
  model: string;
  wakeWord?: string; // e.g. "hey sara"
  vadThreshold?: number; // amplitude gate
  voice?: 'ash' | 'echo' | 'coral' | 'sage' | 'marin' | 'shimmer';
  instructions?: string;
  detectedLanguage?: string;
}

export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

class Emitter {
  private listeners = new Map<string, Array<(ev: RealtimeEvent) => void>>();
  on(type: string, fn: (ev: RealtimeEvent) => void) {
    const arr = this.listeners.get(type) || [];
    arr.push(fn);
    this.listeners.set(type, arr);
  }
  off(type: string, fn: (ev: RealtimeEvent) => void) {
    const arr = this.listeners.get(type) || [];
    this.listeners.set(type, arr.filter(f => f !== fn));
  }
  emit(ev: RealtimeEvent) {
    const arr = this.listeners.get(ev.type) || [];
    for (const f of arr) f(ev);
  }
}

const RTC_URL = import.meta.env.VITE_OPENAI_REALTIME_URL as string | undefined;
const EPHEMERAL_URL = import.meta.env.VITE_OPENAI_EPHEMERAL_URL as string | undefined;
const FUNCTIONS_BASE = String(import.meta.env.VITE_FUNCTIONS_URL ?? '').replace(/\/+$/, '');
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');

export class OpenAIRealtimeService extends Emitter {
  private pc?: RTCPeerConnection;
  private dc?: RTCDataChannel;
  private micStream?: MediaStream;
  private audioEl?: HTMLAudioElement;
  private recognition?: MinimalSpeechRecognition;
  private wakeWordRecognition?: MinimalSpeechRecognition;
  private vadThreshold: number;
  private buffer: Float32Array[] = [];
  private currentUserId?: string;
  private connected = false;
  private lastTokenFetchError?: string;
  private sessionConfigured = false;
  private pendingFunctionCalls = new Map<string, any>();
  private lastUserTranscript: string = '';
  private lastUserAudio: string = '';
  private audioTranscriptBuffer: string = '';
  private detectedLanguage: string = 'en';

  // Callbacks required by UI
  private onEventCb?: (event: RealtimeEvent) => void;
  private onConnStateCb?: (state: RTCPeerConnectionState) => void;
  private onWakeWordDetectedCb?: () => void;
  private isListeningForWakeWordFlag = false;

  constructor(private config: OpenAIRealtimeConfig) {
    super();
    this.vadThreshold = config.vadThreshold ?? 0.03;
  }

  updateConfig(newConfig: Partial<OpenAIRealtimeConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.detectedLanguage) {
      this.detectedLanguage = newConfig.detectedLanguage;
    }
    if (this.sessionConfigured && this.dc && this.dc.readyState === 'open') {
      this.sessionConfigured = false;
      this.configureSession();
    }
  }

  getDetectedLanguage(): string {
    return this.detectedLanguage;
  }

  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase().trim();

    const spanishPatterns = /\b(hola|buenos días|buenas tardes|buenas noches|gracias|por favor|sí|no|cómo|qué|cuándo|dónde|quién|necesito|quiero|ayuda|hacer|tener)\b/i;
    const frenchPatterns = /\b(bonjour|bonsoir|merci|s'il vous plaît|oui|non|comment|quoi|quand|où|qui|besoin|veux|aide|faire|avoir)\b/i;
    const germanPatterns = /\b(hallo|guten morgen|guten tag|guten abend|danke|bitte|ja|nein|wie|was|wann|wo|wer|brauche|will|hilfe|machen|haben)\b/i;
    const italianPatterns = /\b(ciao|buongiorno|buonasera|grazie|per favore|sì|no|come|cosa|quando|dove|chi|bisogno|voglio|aiuto|fare|avere)\b/i;
    const portuguesePatterns = /\b(olá|bom dia|boa tarde|boa noite|obrigado|obrigada|por favor|sim|não|como|o que|quando|onde|quem|preciso|quero|ajuda|fazer|ter)\b/i;
    const japanesePatterns = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    const koreanPatterns = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    const chinesePatterns = /[\u4E00-\u9FFF]/;

    if (spanishPatterns.test(lowerText)) return 'es';
    if (frenchPatterns.test(lowerText)) return 'fr';
    if (germanPatterns.test(lowerText)) return 'de';
    if (italianPatterns.test(lowerText)) return 'it';
    if (portuguesePatterns.test(lowerText)) return 'pt';
    if (japanesePatterns.test(text)) return 'ja';
    if (koreanPatterns.test(text)) return 'ko';
    if (chinesePatterns.test(text)) return 'zh';

    return 'en';
  }

  // == Public API expected by UI ==
  onEvent(cb: (event: RealtimeEvent) => void) { this.onEventCb = cb; }
  offEvent(_cb?: (event: RealtimeEvent) => void) { this.onEventCb = undefined; } // single-subscriber is fine here
  onConnectionStateChange(cb: (state: RTCPeerConnectionState) => void) { this.onConnStateCb = cb; }
  onWakeWordDetected(cb: () => void) { this.onWakeWordDetectedCb = cb; }

  isSupported(): boolean { return typeof RTCPeerConnection !== 'undefined'; }
  isConnected(): boolean { return this.connected; }
  getAudioElement(): HTMLAudioElement | undefined { return this.audioEl; }

  async initialize(userId: string) {
    this.currentUserId = userId;

    try {
      const prefs = await aiVoicePreferencesService.getOrCreatePreferences(userId);
      if (prefs) {
        const personalityInstructions = aiVoicePreferencesService.getPersonalityInstructions(prefs.personality as AIPersonality);
        const baseInstructions = this.config.instructions || '';
        const updatedInstructions = `${personalityInstructions}\n\n${baseInstructions}`;

        this.updateConfig({
          voice: prefs.voice as any,
          instructions: updatedInstructions,
        });
      }
    } catch (error) {
      console.error('Error loading AI voice preferences:', error);
    }

    await this.connectRealtime();
    await this.startWakeWordDetection();
  }

  async startConversation() { await this.startRecording(); }
  async stopConversation() { this.stopRecording(); }
  async disconnect() { await this.disconnectRealtime(); }
  async mute() { if (this.micStream) this.micStream.getAudioTracks().forEach(t => (t.enabled = false)); }
  async unmute() { if (this.micStream) this.micStream.getAudioTracks().forEach(t => (t.enabled = true)); }
  async interrupt() { this.buffer = []; }

  sendMessage(text: string) {
    const lower = text.toLowerCase();
    this.lastUserTranscript = text;
    this.lastUserAudio = '';

    // Detect Instacart request ONLY for explicit Instacart mentions
    if (
      lower.includes("instacart") ||
      lower.includes("send to instacart") ||
      lower.includes("order from instacart")
    ) {

      // Emit UI event so the chat bubble appears immediately
      this.emitUI({ type: "instacart.order.started", text });

      sendToInstacart(text)
        .then((result) => this.emitUI({ type: "instacart.order.result", data: result }))
        .catch((error) =>
          this.emitUI({
            type: "instacart.order.error",
            error: error?.message ?? String(error),
          })
        );

      // ❗ DO NOT send this to the AI assistant (Sara)
      return;
    }

    // 🧠 Non-Instacart messages go to Sara normally
    if (!this.dc || this.dc.readyState !== "open") {
      console.error("Data channel not ready");
      return;
    }

    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: "response.create" }));
  }

  // == Internals ==
  private emitUI(event: RealtimeEvent) {
    this.onEventCb?.(event);
    this.emit(event);
  }
  private emitConn(state: RTCPeerConnectionState) { this.onConnStateCb?.(state); this.emitUI({ type: 'connection.state', state }); }

  private getFunctionTools() {
    return [
      {
        type: 'function',
        name: 'create_calendar_event',
        description: 'Create a new calendar event/meeting/appointment. Can be assigned to family members by name.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title/name of the event' },
            date: { type: 'string', description: 'The date in YYYY-MM-DD format or natural language like "today", "tomorrow"' },
            start_time: { type: 'string', description: 'The start time in HH:MM format or natural language like "2pm", "14:30"' },
            end_time: { type: 'string', description: 'The end time in HH:MM format or natural language like "3pm", "15:30"' },
            location: { type: 'string', description: 'The location of the event' },
            participants: { type: 'array', items: { type: 'string' }, description: 'List of participants' },
            assigned_to: { type: 'string', description: 'CRITICAL: Name of family member to assign this event to. Extract from patterns like: "schedule [EVENT] for [NAME]" → NAME, "[NAME]\'s [EVENT]" → NAME. Examples: "schedule dentist appointment for Jack" → assigned_to: "Jack", "Sarah\'s piano recital" → assigned_to: "Sarah"' }
          },
          required: ['title', 'date']
        }
      },
      {
        type: 'function',
        name: 'get_schedule',
        description: 'CRITICAL: Get comprehensive schedule including events, tasks, and reminders organized by time. ALWAYS use this when user asks "what\'s my schedule", "what do I have today/tomorrow", "what\'s on my calendar". This is the PRIMARY schedule query function.',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date to get schedule for. Can be "today", "tomorrow", or a specific date like "2026-01-20" or "Monday". REQUIRED.'
            },
            include_shopping: {
              type: 'boolean',
              description: 'Whether to include shopping list overview. Default: false'
            }
          },
          required: ['date']
        }
      },
      {
        type: 'function',
        name: 'query_calendar',
        description: 'CRITICAL: Use this to FIND/SEARCH for existing events. When user asks "when is my [EVENT]?" or "do I have a [EVENT]?", use query_type="search" with search_term=event name. DO NOT ask user for dates - just search!',
        parameters: {
          type: 'object',
          properties: {
            query_type: {
              type: 'string',
              enum: ['today', 'week', 'availability', 'search', 'next'],
              description: 'Type of query: today (today\'s events), week (upcoming events), availability (check if free), search (IMPORTANT: use for "when is my X?" questions - finds events by name), next (next upcoming event)'
            },
            date: { type: 'string', description: 'Date to check (for availability queries only)' },
            search_term: { type: 'string', description: 'REQUIRED for search queries. The event name to find. E.g., for "when is my dentist appointment?", use search_term="dentist"' }
          },
          required: ['query_type']
        }
      },
      {
        type: 'function',
        name: 'update_calendar_event',
        description: 'Update an existing calendar event',
        parameters: {
          type: 'object',
          properties: {
            search_term: { type: 'string', description: 'Term to find the event to update' },
            updates: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'New date' },
                start_time: { type: 'string', description: 'New start time' },
                end_time: { type: 'string', description: 'New end time' },
                location: { type: 'string', description: 'New location' },
                title: { type: 'string', description: 'New title' }
              }
            }
          },
          required: ['search_term', 'updates']
        }
      },
      {
        type: 'function',
        name: 'delete_calendar_event',
        description: 'Delete a calendar event',
        parameters: {
          type: 'object',
          properties: {
            search_term: { type: 'string', description: 'Term to find the event to delete' },
            date: { type: 'string', description: 'Date of the event (optional, helps narrow down)' }
          },
          required: ['search_term']
        }
      },
      {
        type: 'function',
        name: 'create_reminder',
        description: 'CRITICAL: ALWAYS call this function when user asks to be reminded of something OR to remind a family member. DO NOT just respond with text - ACTUALLY CREATE the reminder by calling this function. Examples: "remind me to drink water", "remind Jack to do homework", "remind Cody to get bread", "set a reminder for Sarah to call mom"',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'What to be reminded about. CRITICAL: Extract as a clean action without possessive pronouns or articles. REMOVE "his", "her", "their", "the", "a", "an" from the title. Examples: "remind Rio to do his homework" → "do homework" (NOT "do his homework"), "remind Jack to take his medicine" → "take medicine" (NOT "take his medicine"), "tell Sarah to finish her project" → "finish project" (NOT "finish her project")'
            },
            date: {
              type: 'string',
              description: 'Date for the reminder in YYYY-MM-DD format or natural language like "today", "tomorrow", "Sunday". REQUIRED - always extract date from user\'s request.'
            },
            time: {
              type: 'string',
              description: 'Time for the reminder in formats like "4pm", "16:00", "2:30pm". Extract from user\'s request if specified.'
            },
            assigned_to: {
              type: 'string',
              description: 'CRITICAL: Name of the family member to assign this reminder to. ALWAYS extract the name from patterns like: "remind [NAME]" → NAME, "tell [NAME]" → NAME, "[NAME] needs to" → NAME. Examples: "remind Rio to..." → assigned_to: "Rio", "remind Jack to..." → assigned_to: "Jack", "tell Cody to..." → assigned_to: "Cody". If phrase is "remind me", leave this field null.'
            }
          },
          required: ['title', 'date']
        }
      },
      {
        type: 'function',
        name: 'add_shopping_item',
        description: 'Add an item to the shopping list and optionally assign to a family member. Parse the full item description to extract quantity, unit, and item name. Examples: "add bread", "remind Cody to get bread", "tell Jack to buy milk"',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The complete item description including quantity and unit (e.g., "5 gallons of water", "2 pounds chicken", "bread")' },
            category: {
              type: 'string',
              enum: ['dairy', 'produce', 'meat', 'bakery', 'baby', 'household', 'other'],
              description: 'Category of the item'
            },
            quantity: { type: 'number', description: 'Quantity number (extracted from title if needed)' },
            unit: { type: 'string', description: 'Unit of measurement (e.g., gallons, pounds, cups, each)' },
            assigned_to: { type: 'string', description: 'CRITICAL: Name of family member to assign this shopping item to. Extract from patterns like: "tell [NAME] to get..." → NAME, "remind [NAME] to buy..." → NAME. Examples: "tell Cody to get bread" → assigned_to: "Cody", "remind Jack to buy milk" → assigned_to: "Jack"' }
          },
          required: ['title']
        }
      },
      {
        type: 'function',
        name: 'create_task',
        description: 'Create a new task or todo item for family members. Examples: "create a task for John to clean his room", "assign homework task to Sarah", "tell Jack to mow the lawn"',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title/name of the task (e.g., "clean room", "do homework", "mow lawn")' },
            description: { type: 'string', description: 'Detailed description of the task' },
            category: {
              type: 'string',
              enum: ['chores', 'homework', 'sports', 'music', 'health', 'social', 'other'],
              description: 'Category of the task'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Priority level of the task'
            },
            assigned_to: { type: 'string', description: 'CRITICAL: Name of family member to assign this task to. Extract from patterns like: "tell [NAME] to..." → NAME, "assign [NAME] to..." → NAME, "create task for [NAME]" → NAME. Examples: "tell Jack to clean his room" → assigned_to: "Jack", "assign Sarah to do homework" → assigned_to: "Sarah", "create task for John to mow lawn" → assigned_to: "John"' },
            due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format or natural language like "today", "tomorrow"' },
            due_time: { type: 'string', description: 'Due time in HH:MM format or natural language like "2pm", "14:30"' },
            points: { type: 'number', description: 'Points awarded for completing this task (for gamification)' },
            notes: { type: 'string', description: 'Additional notes or instructions for the task' }
          },
          required: ['title']
        }
      },
      {
        type: 'function',
        name: 'query_tasks',
        description: 'Query and list tasks, optionally filtered by status, assigned member, or search term',
        parameters: {
          type: 'object',
          properties: {
            query_type: {
              type: 'string',
              enum: ['all', 'pending', 'in_progress', 'completed', 'cancelled', 'search', 'assigned_to'],
              description: 'Type of query: all (all tasks), pending (pending tasks), in_progress (in progress tasks), completed (completed tasks), cancelled (cancelled tasks), search (search by term), assigned_to (filter by assigned member)'
            },
            search_term: { type: 'string', description: 'Search term to find specific tasks (for search queries)' },
            assigned_to: { type: 'string', description: 'Name of family member to filter tasks by (for assigned_to queries)' }
          },
          required: ['query_type']
        }
      },
      {
        type: 'function',
        name: 'update_task',
        description: 'Update an existing task',
        parameters: {
          type: 'object',
          properties: {
            search_term: { type: 'string', description: 'Term to find the task to update (task title or part of it)' },
            updates: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'New title' },
                description: { type: 'string', description: 'New description' },
                category: { type: 'string', enum: ['chores', 'homework', 'sports', 'music', 'health', 'social', 'other'], description: 'New category' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'], description: 'New status' },
                assigned_to: { type: 'string', description: 'Name of family member to reassign to' },
                due_date: { type: 'string', description: 'New due date' },
                due_time: { type: 'string', description: 'New due time' },
                points: { type: 'number', description: 'New points value' },
                notes: { type: 'string', description: 'New notes' }
              }
            }
          },
          required: ['search_term', 'updates']
        }
      },
      {
        type: 'function',
        name: 'complete_task',
        description: 'Mark a task as completed',
        parameters: {
          type: 'object',
          properties: {
            search_term: { type: 'string', description: 'Term to find the task to complete (task title or part of it)' }
          },
          required: ['search_term']
        }
      },
      {
        type: 'function',
        name: 'delete_task',
        description: 'Delete a task',
        parameters: {
          type: 'object',
          properties: {
            search_term: { type: 'string', description: 'Term to find the task to delete (task title or part of it)' }
          },
          required: ['search_term']
        }
      },
      {
        type: 'function',
        name: 'get_weather',
        description: 'CRITICAL: Get current weather conditions and forecast for today and upcoming days. ALWAYS use this when user asks about weather ("what\'s the weather", "how\'s the weather today", "what\'s the weather tomorrow", "will it rain", "do I need an umbrella", "what should I wear"). This provides temperature, conditions, humidity, pressure, wind speed, and multi-day forecast.',
        parameters: {
          type: 'object',
          properties: {
            query_type: {
              type: 'string',
              enum: ['current', 'today', 'tomorrow', 'forecast'],
              description: 'Type of weather query: current (right now), today (today\'s forecast), tomorrow (tomorrow\'s forecast), forecast (7-day forecast). Default: current'
            }
          }
        }
      },
      {
        type: 'function',
        name: 'get_weather_for_event',
        description: 'CRITICAL: Use this when user asks "what\'s the weather on my [EVENT] day?" or requests weather tied to an existing appointment. Provide the event name as search_term and let me find the date + forecast automatically. DO NOT ask the user for the date.',
        parameters: {
          type: 'object',
          properties: {
            search_term: {
              type: 'string',
              description: 'Name of the event to find (e.g., "dentist appointment", "eye checkup", "soccer game"). I will search the calendar and fetch the weather for that date.'
            }
          },
          required: ['search_term']
        }
      }
    ];
  }

  private getLanguageInstruction(): string {
    const languageMap: Record<string, string> = {
      'en': 'Respond in English.',
      'es': 'CRITICAL: Respond ONLY in Spanish (español). Never respond in English.',
      'fr': 'CRITICAL: Respond ONLY in French (français). Never respond in English.',
      'de': 'CRITICAL: Respond ONLY in German (Deutsch). Never respond in English.',
      'it': 'CRITICAL: Respond ONLY in Italian (italiano). Never respond in English.',
      'pt': 'CRITICAL: Respond ONLY in Portuguese (português). Never respond in English.',
      'ja': 'CRITICAL: Respond ONLY in Japanese (日本語). Never respond in English.',
      'ko': 'CRITICAL: Respond ONLY in Korean (한국어). Never respond in English.',
      'zh': 'CRITICAL: Respond ONLY in Chinese (中文). Never respond in English.'
    };

    return languageMap[this.detectedLanguage] || languageMap['en'];
  }

  private configureSession() {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.error('Cannot configure session - data channel not ready');
      return;
    }

    if (this.sessionConfigured) {
      console.error('Session already configured');
      return;
    }

    const tools = this.getFunctionTools();

    const languageInstruction = this.getLanguageInstruction();
    const instructionsWithLanguage = `${languageInstruction}\n\n${this.config.instructions}`;

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: instructionsWithLanguage,
        voice: this.config.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools,
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    try {
      this.dc.send(JSON.stringify(sessionConfig));
      this.sessionConfigured = true;
      console.log(`🌐 Session configured for language: ${this.detectedLanguage}`);
    } catch (error) {
      console.error('Failed to send session configuration:', error);
      this.sessionConfigured = false;
    }
  }

  /** Build a list of candidate URLs for the ephemeral token endpoint. */
  private buildTokenUrlCandidates(): string[] {
    const urls: string[] = [];
    if (EPHEMERAL_URL) urls.push(EPHEMERAL_URL);
    if (FUNCTIONS_BASE) {
      urls.push(
        `${FUNCTIONS_BASE}/openai-token`,
        `${FUNCTIONS_BASE}/webrtc-token`,
        `${FUNCTIONS_BASE}/realtime-token`,
        `${FUNCTIONS_BASE}/functions/v1/openai-token`,
        `${FUNCTIONS_BASE}/functions/v1/webrtc-token`,
        `${FUNCTIONS_BASE}/functions/v1/realtime-token`,
      );
    }
    if (SUPABASE_URL) {
      urls.push(
        `${SUPABASE_URL}/functions/v1/openai-token`,
        `${SUPABASE_URL}/functions/v1/webrtc-token`,
        `${SUPABASE_URL}/functions/v1/realtime-token`,
      );
    }
    // Netlify Functions convention
    urls.push(
      '/.netlify/functions/openai-token',
      '/.netlify/functions/webrtc-token',
      '/.netlify/functions/realtime-token',
    );
    // Local fallbacks (dev proxy, custom API, etc.)
    urls.push(
      '/openai-token',
      '/webrtc-token',
      '/realtime-token',
      '/api/openai-token',
      '/api/webrtc-token',
      '/api/realtime-token'
    );
    return Array.from(new Set(urls));
  }

  /** Attempt JSON POST to each candidate; require JSON content-type; return parsed JSON. */
  private async fetchJsonFirst(body: unknown): Promise<any> {
    const candidates = this.buildTokenUrlCandidates();
    const authHeader: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) authHeader.Authorization = `Bearer ${session.access_token}`;
    } catch { /* optional; ignore */ }

    const tried: string[] = [];
    for (const url of candidates) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader },
          body: JSON.stringify(body ?? {}),
        });
        tried.push(`${url} -> ${resp.status}`);
        const ct = resp.headers.get('content-type') || '';
        if (!resp.ok) continue;
        if (!ct.includes('application/json')) continue;
        return await resp.json();
      } catch (e) {
        tried.push(`${url} -> ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }
    this.lastTokenFetchError = `Tried: ${tried.join(' | ')}`;
    throw new Error(`No valid token endpoint responded with JSON. ${this.lastTokenFetchError}`);
  }

  /** Extract the ephemeral key from commonly used JSON shapes. */
  private extractEphemeralKey(json: any): string {
    return json?.client_secret?.value || json?.value || json?.token || '';
  }

  async startWakeWordDetection() {
    const SpeechRecognitionCtor =
      (window as unknown as WindowSpeech).SpeechRecognition ||
      (window as unknown as WindowSpeech).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    this.wakeWordRecognition = new SpeechRecognitionCtor();
    this.wakeWordRecognition.continuous = true;
    this.wakeWordRecognition.interimResults = false;
    this.wakeWordRecognition.lang = 'en-US';
    const wake = (this.config.wakeWord || 'hey sara').toLowerCase();

    this.wakeWordRecognition.onresult = (event: MinimalSpeechEvent) => {
      const results = (event as unknown as { results?: Array<Array<{ transcript: string }>> }).results || [];
      for (const result of results) {
        const transcript = (result?.[0]?.transcript || '').toLowerCase();
        if (transcript.includes(wake)) {
          this.onWakeWordDetectedCb?.();
          this.startRecording().catch(e => {
            this.emitUI({ type: 'assistant.error', message: e instanceof Error ? e.message : String(e) });
          });
          break;
        }
      }
    };
    this.wakeWordRecognition.onerror = () => { /* ignore */ };
    this.wakeWordRecognition.onend = () => { if (this.isListeningForWakeWordFlag) this.startWakeWordDetection(); };
    this.wakeWordRecognition.start();
    this.isListeningForWakeWordFlag = true;
  }

  stopWakeWordDetection() {
    this.isListeningForWakeWordFlag = false;
    this.wakeWordRecognition?.stop();
    this.wakeWordRecognition = undefined;
  }

  async startRecording() {
    console.log('🎤 Listening...');
    this.emitUI({ type: 'recording.started' });
  }

  stopRecording() {
    console.log('🔇 Stopped listening');
    this.emitUI({ type: 'recording.stopped' });
  }

  async connectRealtime() {
    if (this.pc) return;

    console.log('🔌 Connecting to OpenAI Realtime API...');

    // Reset session state for new connection
    this.sessionConfigured = false;

    // Acquire ephemeral key from your backend (Edge Function/Server), trying multiple candidates.
    const tokenJson = await this.fetchJsonFirst({ userId: this.currentUserId || 'anonymous', roomId: 'default' });
    const EPHEMERAL_KEY = this.extractEphemeralKey(tokenJson);
    if (!EPHEMERAL_KEY) throw new Error('Token endpoint JSON missing client_secret.value/token');

    this.pc = new RTCPeerConnection();
    this.pc.onconnectionstatechange = () => {
      const s = this.pc!.connectionState;
      this.connected = (s === 'connected');
      this.emitConn(s);
    };

    // Mic
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.micStream!));

    // Remote audio
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    this.audioEl = audioEl;
    this.pc.ontrack = (e) => { this.audioEl!.srcObject = e.streams[0]; };

    // Data channel
    this.dc = this.pc.createDataChannel('oai-events');
    this.dc.onopen = () => {
      console.log('✅ Connected to OpenAI');
    };
    this.dc.onmessage = async (ev) => {
      try {
        const event = JSON.parse(ev.data);
        this.emitUI({ type: event.type, ...event });
        await this.handleOpenAIEvent(event);
      } catch (e) {
        console.error('Failed to parse data channel message:', e);
      }
    };

    // SDP exchange
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    if (!offer.sdp) throw new Error('Failed to create SDP offer.');
    const resp = await fetch(`${(RTC_URL || 'https://api.openai.com/v1/realtime')}?model=${this.config.model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });
    if (!resp.ok) throw new Error(`Realtime connect failed: ${resp.status} ${resp.statusText}`);

    await this.pc.setRemoteDescription({ type: 'answer', sdp: await resp.text() });
    this.emitUI({ type: 'realtime.connected' });
  }

  async disconnectRealtime() {
    if (this.pc) {
      this.pc.close();
      this.pc = undefined;
      this.dc = undefined;
      this.emitUI({ type: 'realtime.disconnected' });
      console.log('🔌 Disconnected from OpenAI');
    }
    this.stopRecording();
    this.stopWakeWordDetection();
    this.connected = false;
    this.sessionConfigured = false;
    this.audioEl = undefined;
  }

  async processUserText(message: string) {
    try {
      const result = await aiAssistantService.processUserMessage(message, this.currentUserId!);
      this.emitUI({ type: 'assistant.action', data: result });
    } catch (e: unknown) {
      this.emitUI({ type: 'assistant.error', message: (e instanceof Error ? e.message : String(e)) || 'Action failed' });
    }
  }

  /**
   * Place an Instacart order by sending a natural-language shopping sentence
   * to the backend endpoint `/api/instacart-order`.
   * Emits `instacart.order.result` on success and `instacart.order.error` on failure.
   */
  async placeInstacartOrder(shoppingSentence: string): Promise<any> {
    try {
      const res = await fetch('/api/instacart-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoppingSentence }),
      });

      const data = await res.json();
      this.emitUI({ type: 'instacart.order.result', data });
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.emitUI({ type: 'instacart.order.error', error: msg });
      throw e;
    }
  }

  private async handleOpenAIEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        // Configure the session with our tools
        this.configureSession();
        break;

      case 'session.updated':
        console.log('✅ Sara is ready to help!');
        break;

      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = (event as any).transcript || '';
        this.lastUserTranscript = transcript;

        if (transcript) {
          console.log('💬 You said:', transcript);

          const newLanguage = this.detectLanguage(transcript);
          if (newLanguage !== this.detectedLanguage) {
            console.log(`🌐 Language detected: ${newLanguage}`);
            this.detectedLanguage = newLanguage;
            this.emitUI({ type: 'language.detected', language: newLanguage });

            this.sessionConfigured = false;
            this.configureSession();
          }

          const lower = transcript.toLowerCase();

          // Only trigger Instacart for explicit mentions
          if (lower.includes('instacart') || lower.includes('send to instacart') || lower.includes('order from instacart')) {
            this.emitUI({ type: 'instacart.order.started', text: transcript });

            try {
              const result = await sendToInstacart(transcript);
              this.emitUI({ type: 'instacart.order.result', data: result });
            } catch (e: any) {
              console.error('Instacart error:', e);
              this.emitUI({ type: 'instacart.order.error', error: e?.message ?? String(e) });
            }
          }
        }
        break;
      }

      case 'conversation.item.created': {
        const item = (event as any).item;

        // When user message is created, check if we should intercept for Instacart
        if (item?.role === 'user') {
          // Try to get text from various possible locations
          let transcript = '';

          if (item.content) {
            if (Array.isArray(item.content)) {
              for (const c of item.content) {
                if (c?.type === 'input_audio' && c?.transcript) {
                  transcript = c.transcript;
                }
                if (c?.type === 'input_text' && c?.text) {
                  transcript = c.text;
                }
              }
            } else if (typeof item.content === 'string') {
              transcript = item.content;
            }
          }

          if (transcript) {
            const lower = transcript.toLowerCase();
            // Only trigger Instacart for explicit mentions
            if (lower.includes('instacart') || lower.includes('send to instacart') || lower.includes('order from instacart')) {
              this.emitUI({ type: 'instacart.order.started', text: transcript });

              sendToInstacart(transcript)
                .then(result => {
                  this.emitUI({ type: 'instacart.order.result', data: result });
                })
                .catch(e => {
                  console.error('Instacart failed:', e);
                  this.emitUI({ type: 'instacart.order.error', error: e?.message ?? String(e) });
                });

              // Try to cancel the pending response
              if (this.dc && this.dc.readyState === 'open') {
                this.dc.send(JSON.stringify({ type: 'response.cancel' }));
              }
            }
          }
        }
        break;
      }

      case 'response.function_call_arguments.delta':
        if (event.call_id) {
          const existing = this.pendingFunctionCalls.get(event.call_id) || { name: event.name, arguments: '' };
          existing.arguments += event.delta || '';
          this.pendingFunctionCalls.set(event.call_id, existing);
        }
        break;

      case 'response.function_call_arguments.done':
        if (event.call_id) {
          const call = this.pendingFunctionCalls.get(event.call_id);
          if (call) {
            await this.executeFunctionCall(event.call_id, call.name || event.name, call.arguments || event.arguments);
            this.pendingFunctionCalls.delete(event.call_id);
          }
        }
        break;

      case 'response.created':
        // Response created
        break;

      case 'response.output_item.added':
        // Output item added
        break;

      case 'response.done':
        // Response completed
        break;

      case 'error':
        console.error('❌ OpenAI error:', event.error);
        this.emitUI({ type: 'error', error: event.error });
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🎤 Speech detected...');
        break;

      case 'response.audio_transcript.done':
        const responseTranscript = (event as any).transcript;
        if (responseTranscript) {
          console.log('🤖 Sara:', responseTranscript);
        }
        break;
    }
  }

  private async executeFunctionCall(callId: string, functionName: string, argsJson: string) {

    try {
      const args = JSON.parse(argsJson);
      let result: any;

      switch (functionName) {
        case 'create_calendar_event':
          result = await this.handleCreateCalendarEvent(args);
          break;
        case 'get_schedule':
          result = await this.handleGetSchedule(args);
          break;
        case 'query_calendar':
          result = await this.handleQueryCalendar(args);
          break;
        case 'update_calendar_event':
          result = await this.handleUpdateCalendarEvent(args);
          break;
        case 'delete_calendar_event':
          result = await this.handleDeleteCalendarEvent(args);
          break;
        case 'create_reminder':
          result = await this.handleCreateReminder(args);
          break;
        case 'add_shopping_item':
          result = await this.handleAddShoppingItem(args);
          break;
        case 'create_task':
          result = await this.handleCreateTask(args);
          break;
        case 'query_tasks':
          result = await this.handleQueryTasks(args);
          break;
        case 'update_task':
          result = await this.handleUpdateTask(args);
          break;
        case 'complete_task':
          result = await this.handleCompleteTask(args);
          break;
        case 'delete_task':
          result = await this.handleDeleteTask(args);
          break;
        case 'get_weather':
          result = await this.handleGetWeather(args);
          break;
        case 'get_weather_for_event':
          result = await this.handleGetWeatherForEvent(args);
          break;
        default:
          result = { success: false, message: `Unknown function: ${functionName}` };
      }

      this.sendFunctionResult(callId, result);
    } catch (e) {
      console.error('❌ Function execution error:', e);
      this.sendFunctionResult(callId, {
        success: false,
        message: `Error: ${e instanceof Error ? e.message : String(e)}`
      });
    }
  }

  private sendFunctionResult(callId: string, result: any) {
    if (!this.dc || this.dc.readyState !== 'open') return;


    const outputMessage = result.message || JSON.stringify(result);

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: outputMessage
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  private combineContextText(additionalText?: string): string | null {
    const segments: string[] = [];
    if (additionalText) segments.push(additionalText);
    if (this.lastUserTranscript) segments.push(this.lastUserTranscript);
    const combined = segments.join(' ').trim();
    return combined.length ? combined : null;
  }

  private getContextualDateInfo(additionalText?: string): EventDateInfo | null {
    const context = this.combineContextText(additionalText);
    if (!context) return null;
    return extractEventDateInfo(context);
  }

  private formatDateToISO(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private normalizeDateInput(input?: string): string | null {
    if (!input) return null;
    const detected = detectDate(input);
    if (detected) {
      return this.formatDateToISO(detected.date);
    }
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return this.formatDateToISO(parsed);
    }
    return null;
  }

  private normalizeTimeInput(input?: string): string | null {
    if (!input) return null;
    return normalizeTimeString(input) || null;
  }

  private getRoundedEventDateTime(date?: string, time?: string): { date: string; hour: number; isoHour: string; displayLabel: string } | null {
    if (!date) return null;
    const dateParts = date.split('-').map((part) => parseInt(part, 10));
    if (dateParts.length !== 3 || dateParts.some((n) => Number.isNaN(n))) return null;

    let hour = 12;
    let minutes = 0;

    if (time) {
      const [hStr, mStr] = time.split(':');
      const parsedHour = parseInt(hStr ?? '12', 10);
      const parsedMinutes = parseInt(mStr ?? '0', 10);
      if (!Number.isNaN(parsedHour)) hour = parsedHour;
      if (!Number.isNaN(parsedMinutes)) minutes = parsedMinutes;
    }

    let totalMinutes = hour * 60 + minutes;
    totalMinutes = Math.max(0, Math.round(totalMinutes / 60) * 60);

    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    if (totalMinutes >= 24 * 60) {
      totalMinutes -= 24 * 60;
      dateObj.setDate(dateObj.getDate() + 1);
    }

    const roundedHour = Math.floor(totalMinutes / 60);
    const roundedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const isoHour = `${roundedDate}T${String(roundedHour).padStart(2, '0')}:00`;

    return {
      date: roundedDate,
      hour: roundedHour,
      isoHour,
      displayLabel: this.formatTimeForDisplay(`${String(roundedHour).padStart(2, '0')}:00:00`),
    };
  }

  private parseHourlyTimeToMs(timeStr: string): number {
    const [datePart, timePart] = timeStr.split('T');
    if (!datePart || !timePart) return Number.NaN;
    const [year, month, day] = datePart.split('-').map((part) => parseInt(part, 10));
    const [hour] = timePart.split(':').map((part) => parseInt(part, 10));
    if ([year, month, day, hour].some((n) => Number.isNaN(n))) return Number.NaN;
    return new Date(year, month - 1, day, hour).getTime();
  }

  private findNearestHourlyEntry(
    hourlyEntries: Array<{ time: string }>,
    targetIsoHour: string
  ): { entry: any; isExact: boolean } | null {
    if (!hourlyEntries || hourlyEntries.length === 0) return null;
    const exact = hourlyEntries.find((entry) => entry.time === targetIsoHour);
    if (exact) return { entry: exact, isExact: true };

    const targetMs = this.parseHourlyTimeToMs(targetIsoHour);
    if (Number.isNaN(targetMs)) return null;

    let best = null;
    let minDiff = Number.POSITIVE_INFINITY;

    for (const entry of hourlyEntries) {
      const entryMs = this.parseHourlyTimeToMs(entry.time);
      if (Number.isNaN(entryMs)) continue;
      const diff = Math.abs(entryMs - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        best = entry;
      }
    }

    return best ? { entry: best, isExact: false } : null;
  }

  private async handleCreateCalendarEvent(args: any) {
    const contextualInfo = this.getContextualDateInfo(args.title);

    const resolvedDate = this.normalizeDateInput(args.date) || contextualInfo?.date || args.date;
    const resolvedStartTime = this.normalizeTimeInput(args.start_time || args.time) || contextualInfo?.time || args.start_time || args.time;
    const resolvedEndTime = this.normalizeTimeInput(args.end_time) || args.end_time;

    const details: Record<string, unknown> = {
      title: args.title,
      date: resolvedDate,
      start_time: resolvedStartTime,
      end_time: resolvedEndTime,
      location: args.location,
      participants: args.participants,
      assigned_to: args.assigned_to
    };

    return await aiAssistantService.createCalendarEvent(details, this.currentUserId!);
  }

  private async handleGetSchedule(args: any) {
    return await aiAssistantService.getSchedule({
      date: args.date,
      include_shopping: args.include_shopping || false
    }, this.currentUserId!);
  }

  private async handleQueryCalendar(args: any) {
    if (!this.currentUserId) {
      return { success: false, message: 'User not authenticated' };
    }

    if (args.query_type === 'search') {
      const searchTerm = String(args.search_term || '').trim();
      if (!searchTerm) {
        return {
          type: 'calendar',
          success: false,
          message: 'Please provide an event name so I know what to search for.',
        };
      }

      const events = await calendarContextService.searchEvents(this.currentUserId, searchTerm);
      if (!events.length) {
        return {
          type: 'calendar',
          success: true,
          message: `I couldn't find any events matching "${searchTerm}" on your calendar.`,
          data: { events: [] },
        };
      }

      const formatted = calendarContextService.formatEventsAsNaturalLanguage(events.slice(0, 5));
      return {
        type: 'calendar',
        success: true,
        message: `Here ${events.length === 1 ? 'is' : 'are'} ${events.length === 1 ? 'the event' : 'the events'} I found for "${searchTerm}":\n${formatted}`,
        data: { events },
      };
    }

    let message = '';
    switch (args.query_type) {
      case 'today':
        message = "what's on my calendar today";
        break;
      case 'week':
        message = "what's on my calendar this week";
        break;
      case 'availability':
        message = `am I free on ${args.date}`;
        break;
      case 'search':
        message = `find ${args.search_term} on my calendar`;
        break;
      case 'next':
        message = "what's my next event";
        break;
    }
    return await aiAssistantService.processUserMessage(message, this.currentUserId!);
  }

  private async handleUpdateCalendarEvent(args: any) {

    const details: Record<string, unknown> = {
      search_term: args.search_term,
      updates: args.updates || {}
    };

    return await aiAssistantService.updateCalendarEvent(details, this.currentUserId!);
  }

  private async handleDeleteCalendarEvent(args: any) {

    const details: Record<string, unknown> = {
      search_term: args.search_term,
      date: args.date
    };

    return await aiAssistantService.deleteCalendarEvent(details, this.currentUserId!);
  }

  private async handleCreateReminder(args: any) {
    const contextualInfo = this.getContextualDateInfo(args.title);
    const resolvedDate = this.normalizeDateInput(args.date) || contextualInfo?.date || args.date;
    const resolvedTime = this.normalizeTimeInput(args.time) || contextualInfo?.time || args.time;

    return await aiAssistantService.createReminder({
      title: args.title,
      date: resolvedDate,
      time: resolvedTime,
      assigned_to: args.assigned_to
    }, this.currentUserId!);
  }

  private async handleAddShoppingItem(args: any) {
    if (!this.currentUserId) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      const parsed = IngredientParser.parse(args.title);

      const quantity = args.quantity ?? parsed.quantity ?? 1;
      const unit = args.unit ?? parsed.unit ?? IngredientParser.smartDetectUnit(parsed.ingredient, args.category);
      const itemName = parsed.ingredient;
      const category = args.category ?? 'other';

      let assigned_to: string | null = null;
      let assigned_to_email: string | null = null;
      let assigned_to_name: string | null = null;

      if (args.assigned_to) {
        const memberName = String(args.assigned_to).toLowerCase();
        const { data: members } = await supabase
          .from('family_members')
          .select('id, name, Email')
          .eq('user_id', this.currentUserId)
          .ilike('name', `%${memberName}%`);

        if (members && members.length > 0) {
          assigned_to = members[0].id;
          assigned_to_email = members[0].Email || null;
          assigned_to_name = members[0].name;
        }
      }

      const itemData = {
        item: itemName,
        category,
        quantity,
        unit,
        user_id: this.currentUserId,
        completed: false,
        assigned_to,
        assigned_to_email,
        purchase_status: 'not_sent',
      };

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error('Error adding shopping item:', error);
        return { success: false, message: `Failed to add ${itemName} to shopping list` };
      }

      let message = `Added ${quantity} ${unit} of ${itemName} to your shopping list`;
      if (assigned_to_name) {
        message += ` and assigned it to ${assigned_to_name}`;
      }

      return {
        success: true,
        message,
        data
      };
    } catch (error) {
      console.error('Error in handleAddShoppingItem:', error);
      return { success: false, message: 'Failed to add item to shopping list' };
    }
  }

  private async handleCreateTask(args: any) {
    const contextualInfo = this.getContextualDateInfo(args.title);
    const resolvedDueDate = this.normalizeDateInput(args.due_date) || contextualInfo?.date || args.due_date;
    const resolvedDueTime = this.normalizeTimeInput(args.due_time) || contextualInfo?.time || args.due_time;

    const details: Record<string, unknown> = {
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      assigned_to: args.assigned_to,
      date: resolvedDueDate,
      time: resolvedDueTime,
      points: args.points,
      notes: args.notes
    };

    return await aiAssistantService.createTask(details, this.currentUserId!);
  }

  private async handleQueryTasks(args: any) {

    const details: Record<string, unknown> = {
      query_type: args.query_type,
      search_term: args.search_term,
      assigned_to: args.assigned_to
    };

    return await aiAssistantService.queryTasks(details, this.currentUserId!);
  }

  private async handleUpdateTask(args: any) {

    const details: Record<string, unknown> = {
      search_term: args.search_term,
      updates: args.updates || {}
    };

    return await aiAssistantService.updateTask(details, this.currentUserId!);
  }

  private async handleCompleteTask(args: any) {

    const details: Record<string, unknown> = {
      search_term: args.search_term,
      updates: { status: 'completed' }
    };

    return await aiAssistantService.updateTask(details, this.currentUserId!);
  }

  private async handleDeleteTask(args: any) {

    const details: Record<string, unknown> = {
      search_term: args.search_term
    };

    return await aiAssistantService.deleteTask(details, this.currentUserId!);
  }

  private async handleGetWeather(args: any) {
    try {
      const weatherData = await weatherService.getWeatherForLocation();

      if (!weatherData.current) {
        return {
          success: false,
          message: 'Weather data not available. Please set your location in settings first.'
        };
      }

      const { current, daily, utc_offset_seconds } = weatherData;
      const queryType = args.query_type || 'current';

      // Calculate today's date in the location's timezone
      let locationToday: string;
      if (utc_offset_seconds !== undefined) {
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
        const locationTime = new Date(utcTime + (utc_offset_seconds * 1000));
        locationToday = `${locationTime.getFullYear()}-${String(locationTime.getMonth() + 1).padStart(2, '0')}-${String(locationTime.getDate()).padStart(2, '0')}`;
      } else {
        const now = new Date();
        locationToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }

      // Find today's index in the daily array
      let todayIndex = 0;
      if (daily) {
        for (let i = 0; i < daily.length; i++) {
          if (daily[i].date >= locationToday) {
            todayIndex = i;
            break;
          }
        }
      }

      let message = '';

      switch (queryType) {
        case 'current':
        case 'today':
          message = `Current weather: ${current.condition}, ${Math.round(current.temperature)}°F. `;
          message += `Humidity ${current.humidity}%, wind speed ${Math.round(current.wind_speed)} mph`;

          if (daily && daily.length > todayIndex) {
            const today = daily[todayIndex];
            message += `. Today's high: ${Math.round(today.temperature_max)}°F, low: ${Math.round(today.temperature_min)}°F`;
          }
          break;

        case 'tomorrow':
          if (daily && daily.length > todayIndex + 1) {
            const tomorrow = daily[todayIndex + 1];
            message = `Tomorrow's weather: ${tomorrow.condition}. `;
            message += `High: ${Math.round(tomorrow.temperature_max)}°F, low: ${Math.round(tomorrow.temperature_min)}°F`;
            if (tomorrow.precipitation_probability > 30) {
              message += `. ${tomorrow.precipitation_probability}% chance of precipitation`;
            }
          } else {
            message = 'Tomorrow\'s forecast is not available';
          }
          break;

        case 'forecast':
          if (daily && daily.length > todayIndex) {
            message = '7-day forecast: ';
            const forecasts = daily.slice(todayIndex, todayIndex + 7).map((day, index) => {
              // Parse the date string directly (YYYY-MM-DD format) to avoid timezone issues
              const [year, month, dayNum] = day.date.split('-').map(Number);
              const date = new Date(year, month - 1, dayNum);
              const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
              return `${dayName}: ${day.condition}, high ${Math.round(day.temperature_max)}°, low ${Math.round(day.temperature_min)}°`;
            });
            message += forecasts.join('. ');
          } else {
            message = 'Forecast data is not available';
          }
          break;
      }

      return {
        success: true,
        message,
        data: weatherData
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      return {
        success: false,
        message: 'Unable to fetch weather data. Please make sure your location is set in settings.'
      };
    }
  }

  private async handleGetWeatherForEvent(args: any) {
    if (!this.currentUserId) {
      return { success: false, message: 'User not authenticated' };
    }

    const searchTerm = String(args.search_term || '').trim();
    if (!searchTerm) {
      return {
        success: false,
        message: 'Please tell me which event to check by providing an event name.'
      };
    }

    const events = await calendarContextService.searchEvents(this.currentUserId, searchTerm);
    if (!events || events.length === 0) {
      return {
        success: true,
        message: `I couldn't find any events matching "${searchTerm}" on your calendar.`
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const upcomingEvent = events.find((event) => event.event_date >= today);
    const targetEvent = upcomingEvent || events[0];

    // Check if event has a location
    if (!targetEvent.location || !targetEvent.location.trim()) {
      return {
        success: false,
        message: `I found your ${targetEvent.title} on ${new Date(`${targetEvent.event_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, but it doesn't have a location set. Would you like to add a location to get the weather forecast?`
      };
    }

    // Get event-specific weather using the event's location
    const eventWeather = await weatherService.getEventWeather(
      targetEvent.location,
      targetEvent.event_date,
      targetEvent.start_time
    );

    if (!eventWeather) {
      return {
        success: false,
        message: `I found your ${targetEvent.title} at ${targetEvent.location}, but I couldn't fetch the weather for that location. Please try again shortly.`
      };
    }

    // Convert event weather to the format expected by the rest of the function
    const weatherData = {
      daily: [{
        date: targetEvent.event_date,
        condition: eventWeather.condition,
        temperature_max: eventWeather.temperatureMax || eventWeather.temperature,
        temperature_min: eventWeather.temperatureMin || eventWeather.temperature,
        precipitation_probability: eventWeather.precipitationProbability
      }],
      hourly: null,
      fullHourly: null
    };

    if ((!weatherData.daily || weatherData.daily.length === 0)) {
      return {
        success: false,
        message: 'Weather data is unavailable right now. Please try again shortly.'
      };
    }

    const hourlyEntries = weatherData.fullHourly || weatherData.hourly;
    const roundedEventTime = this.getRoundedEventDateTime(targetEvent.event_date, targetEvent.start_time);
    const hourlyMatch = hourlyEntries && roundedEventTime
      ? this.findNearestHourlyEntry(hourlyEntries, roundedEventTime.isoHour)
      : null;

    const forecast = weatherData.daily?.find((day: any) => day.date === (roundedEventTime?.date || targetEvent.event_date));
    const eventDateObj = new Date(`${targetEvent.event_date}T00:00:00`);
    const eventDateLabel = eventDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const eventTimeLabel = targetEvent.start_time ? ` at ${this.formatTimeForDisplay(targetEvent.start_time)}` : '';

    if (!forecast && !hourlyMatch) {
      const hourlyList = hourlyEntries || [];
      const hourlyCount = hourlyList.length;
      const firstHourlyTime = hourlyCount ? hourlyList[0].time : null;
      const lastHourlyTime = hourlyCount ? hourlyList[hourlyCount - 1].time : null;

      const firstAvailable = weatherData.daily?.[0]?.date || firstHourlyTime?.split('T')[0] || null;
      const lastAvailable = weatherData.daily?.[weatherData.daily.length - 1]?.date
        || lastHourlyTime?.split('T')[0]
        || null;
      const rangeLabel = firstAvailable && lastAvailable
        ? `${new Date(`${firstAvailable}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(`${lastAvailable}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'the upcoming days';

      return {
        success: true,
        message: `I found your ${targetEvent.title} on ${eventDateLabel}${eventTimeLabel}, but I only have forecasts for ${rangeLabel}. Let's check again when we're closer to that date.`,
        data: {
          event: targetEvent,
          forecast_available_range: {
            start: firstAvailable,
            end: lastAvailable
          }
        }
      };
    }

    let message = `I found your ${targetEvent.title} on ${eventDateLabel}${eventTimeLabel}. `;

    if (hourlyMatch) {
      const hourlyForecast = hourlyMatch.entry;
      const roundedLabel = roundedEventTime?.displayLabel || 'that time';
      message += `Around ${roundedLabel}, expect ${hourlyForecast.condition.toLowerCase()} and about ${Math.round(hourlyForecast.temperature)}°F`;

      if (typeof hourlyForecast.precipitation_probability === 'number') {
        message += ` with a ${hourlyForecast.precipitation_probability}% chance of precipitation`;
      }

      if (!hourlyMatch.isExact && roundedEventTime) {
        message += ` (using the closest hourly forecast available to ${roundedLabel}).`;
      } else {
        message += '.';
      }

      return {
        success: true,
        message,
        data: {
          event: targetEvent,
          forecast: hourlyForecast,
          daily_forecast: forecast || null,
          forecast_type: 'hourly'
        }
      };
    }

    if (forecast) {
      message += `Forecast for that day: ${forecast.condition}, high ${Math.round(forecast.temperature_max)}°F and low ${Math.round(forecast.temperature_min)}°F`;

      if (typeof forecast.precipitation_probability === 'number') {
        message += ` with a ${forecast.precipitation_probability}% chance of precipitation`;
      }

      message += '.';

      return {
        success: true,
        message,
        data: {
          event: targetEvent,
          forecast,
          forecast_type: 'daily'
        }
      };
    }

    return {
      success: true,
      message,
      data: {
        event: targetEvent,
        forecast: null,
        forecast_type: 'unknown'
      }
    };
  }

  private formatTimeForDisplay(time: string): string {
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr || '0', 10);
    const minutes = parseInt(minutesStr || '0', 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
  }
}

export const openaiRealtimeService = new OpenAIRealtimeService({
  model: 'gpt-4o-realtime-preview',
  wakeWord: 'hey sara',
  vadThreshold: 0.03,
  voice: 'shimmer',
  instructions: `You are Sara, a helpful AI assistant for busy parents embedded in a family organizer app.

🌐 CRITICAL LANGUAGE RULE:
ALWAYS respond in the SAME LANGUAGE that the user is currently speaking. Do NOT switch languages unless the user switches languages first.
- If the user speaks Spanish, respond ONLY in Spanish
- If the user speaks French, respond ONLY in French
- If the user speaks German, respond ONLY in German
- If the user speaks any other language, respond in that language
- NEVER randomly switch to a different language
- Match the user's language exactly on every response

⚠️ CRITICAL FUNCTION CALLING RULES - READ CAREFULLY:
When a user asks you to DO something (create, add, set, schedule, remind, etc.), you MUST call the appropriate function - DO NOT just respond with text saying you'll do it.

WRONG: User says "remind me to drink water at 4pm" → You respond "I'll set that reminder for you" ❌
RIGHT: User says "remind me to drink water at 4pm" → You CALL create_reminder function ✅

WRONG: User says "add milk to shopping list" → You respond "I'll add that to your list" ❌
RIGHT: User says "add milk to shopping list" → You CALL add_shopping_item function ✅

WRONG: User says "schedule meeting tomorrow at 2pm" → You respond "I'll schedule that" ❌
RIGHT: User says "schedule meeting tomorrow at 2pm" → You CALL create_calendar_event function ✅

ACTION TRIGGERS - When user says these phrases, CALL THE FUNCTION:
- "what's my schedule" / "what do I have today" / "what's on my calendar" / "what do I have tomorrow" / "show me my schedule" → CALL get_schedule (PRIMARY schedule query)
- "when is my [EVENT]" / "when is [NAME]'s appointment" / "find my [EVENT]" / "do I have a [EVENT]" → CALL query_calendar with query_type: "search" and search_term: the event name (e.g., "when is my dentist appointment" → query_type: "search", search_term: "dentist")
- "what's my next event" / "what's coming up" → CALL query_calendar with query_type: "next"
- "remind me" / "remind Jack" / "set a reminder" / "don't let me forget" → CALL create_reminder (with assigned_to if name mentioned)
- "add to shopping list" / "buy" / "get" / "tell Cody to get bread" → CALL add_shopping_item (with assigned_to if name mentioned)
- "schedule" / "add to calendar" / "create event" / "schedule for Sarah" → CALL create_calendar_event (with assigned_to if name mentioned)
- "create a task" / "assign task to John" / "tell Jack to clean" → CALL create_task (with assigned_to if name mentioned)
- "what's the weather" / "how's the weather" / "will it rain" / "do I need an umbrella" / "what should I wear" → CALL get_weather
- "what's the weather on my [EVENT]" / "what will the weather be for [EVENT]" / "weather on [NAME]'s appointment" → CALL get_weather_for_event with search_term set to the event name (no date needed)

⚠️ CRITICAL - FINDING EVENTS vs CREATING EVENTS:
When user asks "when is my [EVENT]?" or "do I have a [EVENT]?", this is a SEARCH query - NOT a creation request!
- "When is my dentist appointment?" → CALL query_calendar(query_type: "search", search_term: "dentist")
- "Do I have a meeting tomorrow?" → CALL query_calendar(query_type: "search", search_term: "meeting")
- "When is Jack's soccer practice?" → CALL query_calendar(query_type: "search", search_term: "soccer")
DO NOT ask for dates when searching - just search for the event name!

ASSIGNMENT PATTERNS - CRITICAL: ALWAYS extract family member names from these patterns:
- "remind [NAME] to..." → assigned_to: NAME (e.g., "remind Rio to do homework" → assigned_to: "Rio")
- "tell [NAME] to..." → assigned_to: NAME (e.g., "tell Cody to get bread" → assigned_to: "Cody")
- "assign [NAME] to..." → assigned_to: NAME
- "[NAME] needs to..." → assigned_to: NAME
- "create task for [NAME]" → assigned_to: NAME
- "schedule for [NAME]" → assigned_to: NAME
- "[NAME]'s [TASK/EVENT]" → assigned_to: NAME (e.g., "Jack's dentist appointment" → assigned_to: "Jack")

EXTRACTION RULES:
- The name always comes IMMEDIATELY AFTER "remind", "tell", or "for"
- Extract the FIRST proper name after these keywords
- Names can be: Jack, Cody, Rio, Sarah, John, or any other family member name
- If user says "remind me", do NOT set assigned_to (it's for the user themselves)

Current date context: Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

When users mention day names (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday), calculate the NEXT occurrence of that day from today. For example:
- If today is Tuesday and user says "Sunday", use the date of the upcoming Sunday (5 days from now)
- If today is Friday and user says "Monday", use the date of the upcoming Monday (3 days from now)
- Never use dates in the past when user mentions day names

You have full access to the user's calendar, tasks, shopping lists, and reminders. You can:

CALENDAR MANAGEMENT:
- Answer questions about their schedule ("What's on my calendar today?") → use get_schedule
- Check availability ("Am I free tomorrow afternoon?") → use query_calendar with availability
- Find events ("When is my dentist appointment?") → use query_calendar with search (NO DATE NEEDED - just search by event name!)
- Create new events ("Schedule a meeting tomorrow at 2pm") → use create_calendar_event
- Update events ("Move my dentist appointment to next week") → use update_calendar_event
- Delete events ("Cancel my meeting tomorrow") → use delete_calendar_event

⚠️ IMPORTANT: When user asks "when is my [EVENT]?", IMMEDIATELY call query_calendar(query_type: "search", search_term: "[EVENT]"). Do NOT ask for a date - you're SEARCHING for an existing event!

⚠️ WEATHER + EVENTS: When user asks "what's the weather on my [EVENT]?" or "how's the weather during Jack's game?", IMMEDIATELY call get_weather_for_event with search_term set to the event name. Let me find the date and forecast automatically — never ask the user for the date.

TASK MANAGEMENT:
- View all tasks or filter by status ("What tasks do I have?", "Show me pending tasks")
- Create new tasks for family members ("Create a task for Sarah to clean her room")
- Assign tasks with priorities and due dates ("Add homework task for tomorrow, high priority")
- Update existing tasks ("Change the clean room task to high priority")
- Mark tasks as complete ("Mark the homework task as done")
- Delete tasks ("Delete the grocery shopping task")
- Check who's assigned what ("What tasks does Sarah have?")

WEATHER INFORMATION:
- Provide current weather conditions including temperature, humidity, wind speed, and pressure
- Give today's weather forecast with high/low temperatures
- Share tomorrow's weather outlook
- Look up the weather for a specific calendar event by name ("weather on my dentist appointment") without asking for the date
- Provide 7-day weather forecasts
- Help plan activities based on weather conditions

OTHER FEATURES:
- Set reminders for important dates and times
- Add items to shopping lists with categories
- Provide parenting advice and support

SPEAKING STYLE: Speak at a brisk, natural conversational pace - not too slow or overly deliberate. Keep responses concise and to the point for voice interaction. Always check for schedule conflicts when creating events and proactively warn users. Use a warm, supportive tone while maintaining an efficient, natural speaking rhythm.`
});

export default openaiRealtimeService;
