import { callEdgeFunction } from '../lib/supabase';
import { aiVoicePreferencesService, AIPersonality } from './aiVoicePreferences';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const BASE_SYSTEM_PROMPT =
  'You are a helpful family assistant for the Busy Moms app. ' +
  'You help busy parents manage their schedules, tasks, shopping lists, ' +
  'family activities, and daily responsibilities. ' +
  'Keep responses concise and actionable. Be supportive and encouraging.';

class AIChatService {
  private conversationHistory: ChatMessage[] = [];

  /**
   * Build the system prompt based on personality and optional family context
   */
  private buildSystemPrompt(
    personalityInstructions: string,
    familyContext?: string
  ): string {
    let prompt = BASE_SYSTEM_PROMPT;

    if (personalityInstructions) {
      prompt += '\n\n' + personalityInstructions;
    }

    if (familyContext) {
      prompt += '\n\nHere is context about the user\'s family and schedule:\n' + familyContext;
    }

    return prompt;
  }

  /**
   * Send a message to the AI and get a response
   */
  async sendMessage(
    userId: string,
    userMessage: string,
    familyContext?: string
  ): Promise<ChatMessage> {
    try {
      // Get personality preferences
      let personalityInstructions = '';
      try {
        const prefs = await aiVoicePreferencesService.getUserPreferences(userId);
        if (prefs?.personality) {
          personalityInstructions =
            aiVoicePreferencesService.getPersonalityInstructions(prefs.personality);
        }
      } catch {
        logger.debug('[AIChatService] Could not load personality preferences, using default');
      }

      const systemPrompt = this.buildSystemPrompt(personalityInstructions, familyContext);

      // Add user message to history
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      this.conversationHistory.push(userMsg);

      // Build messages array for API
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...this.conversationHistory.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ];

      // Call the edge function
      const response = await callEdgeFunction<ChatResponse>('openai-chat', {
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const assistantMessage = response.message || 'I apologize, but I could not generate a response.';

      // Add assistant response to history
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      };
      this.conversationHistory.push(assistantMsg);

      // Keep conversation history manageable (last 20 messages)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return assistantMsg;
    } catch (error: unknown) {
      logger.error('[AIChatService] Error sending message:', error);

      // Return a fallback response
      const fallbackMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: this.getFallbackResponse(userMessage),
        timestamp: new Date().toISOString(),
      };
      this.conversationHistory.push(fallbackMsg);
      return fallbackMsg;
    }
  }

  /**
   * Get fallback response when API is unavailable
   */
  private getFallbackResponse(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi')) {
      return "Hello! I'm your family assistant. I can help you manage events, tasks, shopping lists, and more. How can I assist you today?";
    }

    if (lower.includes('event') || lower.includes('calendar')) {
      return 'I can help you manage your family events and calendar. You can add events, set reminders, and keep track of important dates.';
    }

    if (lower.includes('task') || lower.includes('chore')) {
      return 'I can help you organize family tasks and chores. You can assign tasks to family members and track their completion.';
    }

    if (lower.includes('shopping') || lower.includes('grocery')) {
      return 'I can help you manage your shopping lists. Add items, organize by category, and keep track of what you need to buy.';
    }

    return "I'm here to help you manage your family's schedule, tasks, and daily activities. What would you like assistance with?";
  }

  /**
   * Clear the conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }
}

export const aiChatService = new AIChatService();
