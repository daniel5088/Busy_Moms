import { aiAssistantService } from './aiAssistantService';
import { sendToInstacart } from './instacartAgentService';
import { supabase } from "../lib/supabase";
import { IngredientParser } from '../utils/ingredientParser';

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
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'verse' | 'sage' | 'coral' | 'cove' | 'cedar';
  instructions?: string;
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

  // Callbacks required by UI
  private onEventCb?: (event: RealtimeEvent) => void;
  private onConnStateCb?: (state: RTCPeerConnectionState) => void;
  private onWakeWordDetectedCb?: () => void;
  private isListeningForWakeWordFlag = false;

  constructor(private config: OpenAIRealtimeConfig) {
    super();
    this.vadThreshold = config.vadThreshold ?? 0.03;
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
        description: 'Create a new calendar event/meeting/appointment',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title/name of the event' },
            date: { type: 'string', description: 'The date in YYYY-MM-DD format or natural language like "today", "tomorrow"' },
            start_time: { type: 'string', description: 'The start time in HH:MM format or natural language like "2pm", "14:30"' },
            end_time: { type: 'string', description: 'The end time in HH:MM format or natural language like "3pm", "15:30"' },
            location: { type: 'string', description: 'The location of the event' },
            participants: { type: 'array', items: { type: 'string' }, description: 'List of participants' }
          },
          required: ['title', 'date']
        }
      },
      {
        type: 'function',
        name: 'query_calendar',
        description: 'Query the calendar for events or check availability',
        parameters: {
          type: 'object',
          properties: {
            query_type: {
              type: 'string',
              enum: ['today', 'week', 'availability', 'search', 'next'],
              description: 'Type of query: today (today\'s events), week (upcoming events), availability (check if free), search (find specific events), next (next upcoming event)'
            },
            date: { type: 'string', description: 'Date to check (for availability queries)' },
            search_term: { type: 'string', description: 'Search term to find events (for search queries)' }
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
        description: 'CRITICAL: ALWAYS call this function when user asks to be reminded of something. DO NOT just respond with text - ACTUALLY CREATE the reminder by calling this function. Examples: "remind me to drink water", "set a reminder to call mom", "don\'t let me forget to take medicine"',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'What to be reminded about (extract from user\'s request, e.g., "drink water", "call mom", "take out trash")'
            },
            date: {
              type: 'string',
              description: 'Date for the reminder in YYYY-MM-DD format or natural language like "today", "tomorrow", "Sunday". REQUIRED - always extract date from user\'s request.'
            },
            time: {
              type: 'string',
              description: 'Time for the reminder in formats like "4pm", "16:00", "2:30pm". Extract from user\'s request if specified.'
            }
          },
          required: ['title', 'date']
        }
      },
      {
        type: 'function',
        name: 'add_shopping_item',
        description: 'Add an item to the shopping list. Parse the full item description to extract quantity, unit, and item name.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The complete item description including quantity and unit (e.g., "5 gallons of water", "2 pounds chicken")' },
            category: {
              type: 'string',
              enum: ['dairy', 'produce', 'meat', 'bakery', 'baby', 'household', 'other'],
              description: 'Category of the item'
            },
            quantity: { type: 'number', description: 'Quantity number (extracted from title if needed)' },
            unit: { type: 'string', description: 'Unit of measurement (e.g., gallons, pounds, cups, each)' }
          },
          required: ['title']
        }
      },
      {
        type: 'function',
        name: 'create_task',
        description: 'Create a new task or todo item for family members',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title/name of the task' },
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
            assigned_to: { type: 'string', description: 'Name of family member to assign this task to' },
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
      }
    ];
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

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.config.instructions,
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

  private async handleCreateCalendarEvent(args: any) {

    const details: Record<string, unknown> = {
      title: args.title,
      date: args.date,
      start_time: args.start_time || args.time,
      end_time: args.end_time,
      location: args.location,
      participants: args.participants
    };

    return await aiAssistantService.createCalendarEvent(details, this.currentUserId!);
  }

  private async handleQueryCalendar(args: any) {
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
    return await aiAssistantService.createReminder({
      title: args.title,
      date: args.date,
      time: args.time
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

      const itemData = {
        item: itemName,
        category,
        quantity,
        unit,
        user_id: this.currentUserId,
        completed: false,
        assigned_to: null,
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

      return {
        success: true,
        message: `Added ${quantity} ${unit} of ${itemName} to your shopping list`,
        data
      };
    } catch (error) {
      console.error('Error in handleAddShoppingItem:', error);
      return { success: false, message: 'Failed to add item to shopping list' };
    }
  }

  private async handleCreateTask(args: any) {

    const details: Record<string, unknown> = {
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      assigned_to: args.assigned_to,
      date: args.due_date,
      time: args.due_time,
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
}

export const openaiRealtimeService = new OpenAIRealtimeService({
  model: 'gpt-4o-realtime-preview',
  wakeWord: 'hey sara',
  vadThreshold: 0.03,
  voice: 'shimmer',
  instructions: `You are Sara, a helpful AI assistant for busy parents embedded in a family organizer app.

⚠️ CRITICAL FUNCTION CALLING RULES - READ CAREFULLY:
When a user asks you to DO something (create, add, set, schedule, remind, etc.), you MUST call the appropriate function - DO NOT just respond with text saying you'll do it.

WRONG: User says "remind me to drink water at 4pm" → You respond "I'll set that reminder for you" ❌
RIGHT: User says "remind me to drink water at 4pm" → You CALL create_reminder function ✅

WRONG: User says "add milk to shopping list" → You respond "I'll add that to your list" ❌
RIGHT: User says "add milk to shopping list" → You CALL add_shopping_item function ✅

WRONG: User says "schedule meeting tomorrow at 2pm" → You respond "I'll schedule that" ❌
RIGHT: User says "schedule meeting tomorrow at 2pm" → You CALL create_calendar_event function ✅

ACTION TRIGGERS - When user says these phrases, CALL THE FUNCTION:
- "remind me" / "set a reminder" / "don't let me forget" → CALL create_reminder
- "add to shopping list" / "buy" / "get" → CALL add_shopping_item
- "schedule" / "add to calendar" / "create event" → CALL create_calendar_event
- "create a task" / "add task" → CALL create_task

Current date context: Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

When users mention day names (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday), calculate the NEXT occurrence of that day from today. For example:
- If today is Tuesday and user says "Sunday", use the date of the upcoming Sunday (5 days from now)
- If today is Friday and user says "Monday", use the date of the upcoming Monday (3 days from now)
- Never use dates in the past when user mentions day names

You have full access to the user's calendar, tasks, shopping lists, and reminders. You can:

CALENDAR MANAGEMENT:
- Answer questions about their schedule ("What's on my calendar today?")
- Check availability ("Am I free tomorrow afternoon?")
- Find events ("When is my dentist appointment?")
- Create new events ("Schedule a meeting tomorrow at 2pm")
- Update events ("Move my dentist appointment to next week")
- Delete events ("Cancel my meeting tomorrow")

TASK MANAGEMENT:
- View all tasks or filter by status ("What tasks do I have?", "Show me pending tasks")
- Create new tasks for family members ("Create a task for Sarah to clean her room")
- Assign tasks with priorities and due dates ("Add homework task for tomorrow, high priority")
- Update existing tasks ("Change the clean room task to high priority")
- Mark tasks as complete ("Mark the homework task as done")
- Delete tasks ("Delete the grocery shopping task")
- Check who's assigned what ("What tasks does Sarah have?")

OTHER FEATURES:
- Set reminders for important dates and times
- Add items to shopping lists with categories
- Provide parenting advice and support

SPEAKING STYLE: Speak at a brisk, natural conversational pace - not too slow or overly deliberate. Keep responses concise and to the point for voice interaction. Always check for schedule conflicts when creating events and proactively warn users. Use a warm, supportive tone while maintaining an efficient, natural speaking rhythm.`
});

export default openaiRealtimeService;
