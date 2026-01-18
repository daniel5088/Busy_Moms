import {
  supabase,
  Reminder,
  ShoppingItem,
  UUID,
  Task,
  Event as DbEvent,
  FamilyMember,
} from '../lib/supabase';
import { openaiService } from './openai';

import { instacartShoppingService } from './instacartShoppingService';
import {
  ICalendarProvider,
  LocalCalendarProvider,
  CalendarEventInput,
} from './calendarProvider';
import { calendarContextService } from './calendarContext';
import { formatTimeForDisplay, formatDateForDisplay, parseTimeToMinutes } from '../utils/timeFormatters';

/** Central brain for "Sara" — routes natural language to concrete app actions. */
export interface AIAction {
  type:
    | 'calendar'
    | 'calendar_share'
    | 'reminder'
    | 'reminder_share'
    | 'shopping'
    | 'shopping_query'
    | 'shopping_update'
    | 'shopping_delete'
    | 'task'
    | 'schedule'
    | 'family'
    | 'family_query'
    | 'family_update'
    | 'family_delete'
    | 'chat';
  success: boolean;
  message: string;
  data?: unknown;
}

type IntentType =
  | 'calendar'
  | 'calendar_query'
  | 'calendar_update'
  | 'calendar_delete'
  | 'calendar_share'
  | 'reminder'
  | 'reminder_share'
  | 'shopping'
  | 'shopping_query'
  | 'shopping_update'
  | 'shopping_delete'
  | 'task'
  | 'task_query'
  | 'task_update'
  | 'task_delete'
  | 'schedule'
  | 'family'
  | 'family_query'
  | 'family_update'
  | 'family_delete'
  | 'chat';

interface IntentResult {
  type: IntentType;
  details?: Record<string, unknown>;
}

/** ---- Shared helpers ---------------------------------------------------- */
function getLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toISODate(input?: string | number | Date | unknown): string | null {
  if (!input) return null;
  const s = String(input).trim();

  // Already ISO-like YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return m[0];

  // Basic MM/DD or M/D this year
  const m2 = s.match(/^(\d{1,2})[\/-](\d{1,2})$/);
  if (m2) {
    const year = new Date().getFullYear();
    const mm = String(
      Math.max(1, Math.min(12, parseInt(m2[1], 10))),
    ).padStart(2, '0');
    const dd = String(
      Math.max(1, Math.min(31, parseInt(m2[2], 10))),
    ).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  // Natural words "today" / "tomorrow"
  const lower = s.toLowerCase();
  if (lower === 'today') {
    return getLocalISODate(new Date());
  }
  if (lower === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalISODate(d);
  }

  // Day names: monday, tuesday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(lower);
  if (dayIndex !== -1) {
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = dayIndex - currentDay;

    // If the day has already passed this week, get next week's occurrence
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return getLocalISODate(targetDate);
  }

  // Try parsing Date(...) and format to YYYY-MM-DD using local time
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return getLocalISODate(d);
  }

  return null;
}

function toISOTime(input?: string | number | Date | unknown): string | null {
  if (!input) return null;
  const s = String(input).trim();

  // "14:30:00" - already in ISO format
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s;
  }

  // "14:30"
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (m) {
    const hh = String(
      Math.max(0, Math.min(23, parseInt(m[1], 10))),
    ).padStart(2, '0');
    const mm = String(
      Math.max(0, Math.min(59, parseInt(m[2], 10))),
    ).padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  // "2pm", "2 pm", "2:30pm"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = Math.max(1, Math.min(12, parseInt(ampm[1], 10)));
    const m2 = Math.max(
      0,
      Math.min(59, ampm[2] ? parseInt(ampm[2], 10) : 0),
    );
    const suffix = ampm[3].toLowerCase();
    if (suffix === 'pm' && h !== 12) h += 12;
    if (suffix === 'am' && h === 12) h = 0;
    const hh = String(h).padStart(2, '0');
    const mm = String(m2).padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  // "14" or "14:30"
  const m2 = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m2) {
    const h = Math.max(0, Math.min(23, parseInt(m2[1], 10)));
    const mm2 = Math.max(
      0,
      Math.min(59, m2[2] ? parseInt(m2[2], 10) : 0),
    );
    return `${String(h).padStart(2, '0')}:${String(mm2).padStart(
      2,
      '0',
    )}:00`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split('T')[1]?.slice(0, 8) || null;
  }

  return null;
}

function coerceInt(n: unknown, fallback: number | null = null): number | null {
  const v = Number.parseInt(String(n ?? ''), 10);
  return Number.isFinite(v) ? v : fallback;
}

function formatTimeForDisplay(time: string): string {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  } catch {
    return time;
  }
}

/**
 * Very simple parser for sentences like:
 * "add chicken in my instacart"
 * "add bread and milk to my instacart"
 * "put apples, bananas, and milk in my cart"
 */
function extractItemsFromInstacartSentence(message: string): string[] {
  const text = String(message || '').toLowerCase().trim();

  // Look for verbs + items + "to/in my instacart/cart/shopping list"
  const match = text.match(
    /(?:add|put|send|buy|get|need|order|shop)\s+(.+?)(?:\s+(?:to|in|into)\s+(?:my\s+)?(instacart|cart|shopping\s+list)|[.!?]|$)/,
  );

  let raw = match?.[1] || '';

  if (!raw) {
    // Fallback: if they at least said "instacart", guess "everything after add/put/buy"
    const simple = text.match(
      /(?:add|put|send|buy|get|need|order|shop)\s+(.+)/,
    );
    raw = simple?.[1] || '';
  }

  if (!raw) return [];

  // Split on commas and "and"
  const pieces = raw
    .split(/,| and /i)
    .map((p) => p.trim())
    .filter(Boolean);

  // Clean up tiny filler words
  const cleaned = pieces.map((p) =>
    p
      .replace(/\b(some|a|an|the|my)\b/gi, '')
      .trim(),
  );

  // Dedup, remove empties
  return Array.from(new Set(cleaned.filter(Boolean)));
}

function getInstacartItemNames(result: any): string[] {
  console.log('🔍 Processing Instacart result:', JSON.stringify(result, null, 2));

  if (!result) {
    console.log('❌ No result provided');
    return [];
  }

  // Handle different possible response structures
  let itemsArray: any[] = [];

  if (Array.isArray(result.items)) {
    itemsArray = result.items;
  } else if (Array.isArray(result.data?.items)) {
    itemsArray = result.data.items;
  } else if (Array.isArray(result)) {
    itemsArray = result;
  } else {
    console.log('❌ Could not find items array in result');
    return [];
  }
  console.log('📦 Items array:', itemsArray);

  const names = itemsArray
    .map((it: any, index: number) => {
      // If it's already a string, use it
      if (typeof it === 'string') {
        console.log(`✅ Item ${index}: direct string "${it}"`);
        return it.trim();
      }

      // If it's null or undefined, skip it
      if (!it || typeof it !== 'object') {
        console.log(`⚠️ Item ${index}: invalid type`, typeof it);
        return '';
      }

      // Try multiple possible field names for the item name
      // Prioritize 'name' first since that's what Instacart uses
      const possibleNames = [
        it.name,
        it.displayText,
        it.display_text,
        it.item,
        it.label,
        it.title,
        it.product_name,
        it.productName,
        it.description,
        it.text,
        it.item_name,
        it.itemName,
      ];

      // Find the first valid name
      for (const name of possibleNames) {
        if (typeof name === 'string' && name.trim()) {
          console.log(`✅ Item ${index}: found name "${name}" in field`);
          return name.trim();
        }
      }

      // If we still don't have a name, log the entire object
      console.warn(
        `⚠️ Item ${index}: Could not extract name from:`,
        JSON.stringify(it),
      );
      return '';
    })
    .filter((s: string) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      // Filter out [object Object] and similar issues
      return (
        lower !== '[object object]' &&
        lower !== 'object object' &&
        lower !== 'undefined' &&
        lower !== 'null'
      );
    });

  // Remove duplicates
  const uniqueNames = Array.from(new Set(names));

  console.log('✅ Final extracted item names:', uniqueNames);

  return uniqueNames;
}

/** ---- AI parsing -------------------------------------------------------- */
async function classifyMessage(
  message: string,
  calendarSummary: string,
): Promise<IntentResult> {
  const nowLocal = new Date();
  const today = getLocalISODate(nowLocal);
  const tomorrowDate = new Date(nowLocal);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalISODate(tomorrowDate);
  const currentYear = nowLocal.getFullYear();
  const todayFormatted = nowLocal.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const next7Days: Array<{ dayName: string; date: string }> = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(nowLocal);
    date.setDate(date.getDate() + i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = getLocalISODate(date);
    next7Days.push({ dayName, date: dateStr });
  }

  const dayNameMapping = next7Days
    .map(d => `- "${d.dayName.toLowerCase()}" → "${d.date}"`)
    .join('\n');

  console.log('🤖 Classifying message:', message);
  console.log('📅 Next 7 days mapping:', next7Days);

  const systemPrompt = `You are a smart assistant that classifies user messages into actions.
Return ONLY valid JSON with this exact format: {"type": "calendar|calendar_query|calendar_update|calendar_delete|calendar_share|reminder|reminder_share|shopping|shopping_query|shopping_update|shopping_delete|task|task_query|task_update|task_delete|schedule_query|family|family_query|family_update|family_delete|chat", "details": {...}}

IMPORTANT DATE CONTEXT:
- Today is ${today} (${todayFormatted})
- Tomorrow is ${tomorrow}
- Current year is ${currentYear}

DAY NAME TO DATE MAPPING (next 14 days):
${dayNameMapping}

IMPORTANT: When user says "for [name] to [action]":
- "for rio to clean his room" → title: "for rio to clean his room" (NOT assigned_to: "rio")
- "for emma to do homework" → title: "for emma to do homework" (NOT assigned_to: "emma")
- ONLY use assigned_to when user explicitly says "remind [name]", "tell [name]", "assign [name]", "[name] needs to"
- Examples of assignment: "remind Jack to clean" → assigned_to: "Jack", title: "clean"
- Examples of NOT assignment: "task for Jack to clean" → title: "for Jack to clean"

When parsing dates:
- "jan 17", "january 17", "1/17" → "${currentYear}-01-17" (use the ACTUAL date, NOT relative terms)
- "tomorrow" → "${tomorrow}"
- "today" → "${today}"
- CRITICAL: When user says a day name like "Friday", "Saturday", "Monday", etc:
  1. Look it up in the mapping above
  2. Find the FIRST occurrence of that day name in the next 14 days
  3. Use that exact YYYY-MM-DD date from the mapping
- ALWAYS use the day name mapping above for day names like "Monday", "Tuesday", "Sunday", "Friday", "Saturday" etc.
- If user says a day name (like "Sunday" or "Monday" or "Friday"), find it in the mapping above and use that exact date
- Always return exact YYYY-MM-DD format in the current year (${currentYear})
- Never interpret specific calendar dates (like "jan 17") as relative terms (like "tomorrow")
- If user says a specific month and day, use that exact date in ${currentYear} in YYYY-MM-DD format

When parsing times:
- User says "6pm" or "6 pm" → return "6pm" (keep natural format)
- User says "6:30pm" or "6:30 pm" → return "6:30pm" (keep natural format)
- User says "18:00" → return "18:00" (keep 24-hour format)
- ALWAYS extract and include time when user specifies it
- If no time specified, omit the time field entirely

Current Calendar Context:
${calendarSummary}

For shopping creation: {"type": "shopping", "details": {"title": "item name", "category": "dairy|produce|meat|bakery|baby|household|other", "quantity": 1, "urgent": false}}
For shopping queries: {"type": "shopping_query", "details": {"query_type": "all|pending|completed|search", "search_term": "keyword"}}
For shopping updates: {"type": "shopping_update", "details": {"search_term": "item to find", "updates": {"completed": true|false, "quantity": number, "urgent": true|false}}}
For shopping deletion: {"type": "shopping_delete", "details": {"search_term": "item to delete"}}

For family member creation: {"type": "family", "details": {"name": "person name", "age": number, "gender": "Boy|Girl|Other", "relationship": "description"}}
For family queries: {"type": "family_query", "details": {"query_type": "all|search", "search_term": "name"}}
For family updates: {"type": "family_update", "details": {"search_term": "name to find", "updates": {"age": number, "school": "school name", "grade": "grade level"}}}
For family deletion: {"type": "family_delete", "details": {"search_term": "name to delete"}}

For reminders: {"type": "reminder", "details": {"title": "reminder text", "date": "YYYY-MM-DD", "time": "HH:MM:SS or 6pm or 6:00pm", "assigned_to": "person name"}}
For reminder sharing: {"type": "reminder_share", "details": {"search_term": "reminder to find", "recipient_name": "person name"}}
For calendar creation: {"type": "calendar", "details": {"title": "event name", "date": "YYYY-MM-DD", "time": "HH:MM:SS or 6pm or 6:00pm", "location": "place", "participants": "person name or list of names"}}
For calendar sharing: {"type": "calendar_share", "details": {"search_term": "event to find", "recipient_name": "person name"}}
For calendar queries: {"type": "calendar_query", "details": {"query_type": "today|week|availability|search|next", "date": "YYYY-MM-DD", "search_term": "keyword"}}
For calendar updates: {"type": "calendar_update", "details": {"search_term": "event to find", "updates": {"date": "new date", "time": "new time", "location": "new location"}}}
For calendar deletion: {"type": "calendar_delete", "details": {"search_term": "event to delete", "date": "YYYY-MM-DD"}}
For task creation: {"type": "task", "details": {"title": "task name", "category": "chores|homework|sports|music|health|social|other", "priority": "low|medium|high", "assigned_to": "person name", "date": "YYYY-MM-DD", "time": "HH:MM:SS or 6pm or 6:00pm"}}
For task queries: {"type": "task_query", "details": {"query_type": "all|pending|in_progress|completed|search|assigned_to", "search_term": "keyword", "assigned_to": "person name"}}
For task updates: {"type": "task_update", "details": {"search_term": "task to find", "updates": {"status": "pending|in_progress|completed|cancelled", "priority": "low|medium|high", "date": "new date"}}}
For task deletion: {"type": "task_delete", "details": {"search_term": "task to delete"}}
For schedule queries (combines events, tasks, reminders, shopping): {"type": "schedule_query", "details": {"query_type": "today|tomorrow|date", "date": "YYYY-MM-DD"}}
For chat: {"type": "chat", "details": {"query": "user question"}}

EXAMPLES:
"remind me to refill the ice tomorrow at 6pm" → {"type": "reminder", "details": {"title": "refill the ice", "date": "${tomorrow}", "time": "6pm"}}
"add dentist appointment on jan 20 at 2:30pm" → {"type": "calendar", "details": {"title": "dentist appointment", "date": "${currentYear}-01-20", "time": "2:30pm"}}
"remind me to call mom tomorrow" → {"type": "reminder", "details": {"title": "call mom", "date": "${tomorrow}"}}
"remind me on Sunday to take out the dog at 5pm" → {"type": "reminder", "details": {"title": "take out the dog", "date": "[USE DATE FROM MAPPING]", "time": "5pm"}}
"remind Jack to do his homework" → {"type": "reminder", "details": {"title": "do his homework", "date": "${today}", "assigned_to": "Jack"}}
"schedule piano lesson with Emma on Saturday at 4pm" → {"type": "calendar", "details": {"title": "piano lesson", "date": "[USE DATE FROM MAPPING]", "time": "4pm", "participants": "Emma"}}
"add task for rio to clean his room" → {"type": "task", "details": {"title": "for rio to clean his room", "category": "chores"}}
"task for Jack to clean his room" → {"type": "task", "details": {"title": "for Jack to clean his room", "category": "chores"}}
"remind Jack to clean" → {"type": "reminder", "details": {"title": "clean", "assigned_to": "Jack", "date": "${today}"}}
"share the dentist appointment with Emma" → {"type": "calendar_share", "details": {"search_term": "dentist appointment", "recipient_name": "Emma"}}
"share the homework reminder with Jack" → {"type": "reminder_share", "details": {"search_term": "homework", "recipient_name": "Jack"}}
"What's my schedule today?" → {"type": "schedule_query", "details": {"query_type": "today"}}
"Show me my schedule for tomorrow" → {"type": "schedule_query", "details": {"query_type": "tomorrow"}}
"What do I have on Friday?" → {"type": "schedule_query", "details": {"query_type": "date", "date": "[USE DATE FROM MAPPING]"}}
"What do I have today?" → {"type": "schedule_query", "details": {"query_type": "today"}}
"What's on my shopping list?" → {"type": "shopping_query", "details": {"query_type": "pending"}}`;

  try {
    const response = await openaiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Today is ${today}. Classify: "${message}"` },
    ]);

    console.log('🤖 AI classification response:', response);

    const payload = JSON.parse(response) as IntentResult;
    console.log('🎯 Parsed intent:', payload);
    return payload;
  } catch (e: unknown) {
    console.error(
      '❌ LLM classify failed, using fallback:',
      e instanceof Error ? e.message : String(e),
    );
    return fallbackClassify(message);
  }
}

/** Simpler fallback classifier so app still works without LLM. */
function fallbackClassify(message: string): IntentResult {
  const lower = message.toLowerCase();

  console.log('🔄 Using fallback classification for:', lower);

  // Shopping patterns
  if (
    /\b(add|put)\b.*\b(shopping|list)\b/.test(lower) ||
    /\b(buy|get|need)\b.*\b(milk|bread|eggs|groceries)\b/.test(lower)
  ) {
    const itemMatch = lower.match(
      /(?:add|put|buy|get|need)\s+([^.!?]+?)(?:\s+(?:to|on|in)\s+(?:the\s+)?(?:shopping\s+)?list)?$/,
    );
    const title = itemMatch?.[1]?.trim() || message;

    let category = 'other';
    if (/\b(milk|cheese|yogurt|butter)\b/.test(lower)) category = 'dairy';
    else if (/\b(apple|banana|carrot|lettuce|fruit|vegetable)\b/.test(lower))
      category = 'produce';
    else if (/\b(chicken|beef|fish|meat)\b/.test(lower)) category = 'meat';
    else if (/\b(bread|cake|muffin|bakery)\b/.test(lower)) category = 'bakery';
    else if (/\b(diaper|formula|baby|wipes)\b/.test(lower)) category = 'baby';
    else if (/\b(soap|detergent|cleaner|household)\b/.test(lower))
      category = 'household';

    return { type: 'shopping', details: { title, category } };
  }

  // Reminder patterns
  if (/\bremind\s+me\b/.test(lower) || /\bset\s+(?:a\s+)?reminder\b/.test(lower)) {
    // Extract date first
    const dateMatch = lower.match(
      /\b(today|tomorrow|\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/,
    );
    console.log('📅 Fallback date match:', dateMatch?.[0]);
    const date = toISODate(dateMatch?.[0]);
    console.log('📅 Fallback parsed date:', date);

    // Extract time
    const timeMatch = lower.match(
      /(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})/i,
    );
    const time = toISOTime(timeMatch?.[1]);

    // Extract title by removing date and time phrases
    let titleText = lower;
    titleText = titleText.replace(/^remind\s+me\s+to\s+/, '');
    titleText = titleText.replace(/^set\s+(?:a\s+)?reminder\s+(?:to\s+)?/, '');
    titleText = titleText.replace(/\s+(today|tomorrow|on|at|by|for|in)\s+.*$/, '');
    const title = titleText.trim() || message;

    return { type: 'reminder', details: { title, date, time } };
  }

  // Schedule query patterns (must come before calendar creation)
  if (
    /\bwhat('?s|\s+is)?\s+(my|the)?\s*schedule\b/.test(lower) ||
    /\bshow\s+(me\s+)?(my\s+)?schedule\b/.test(lower) ||
    /\bwhat\s+do\s+i\s+have\s+(today|tomorrow|on)\b/.test(lower)
  ) {
    let queryType = 'today';
    let date = null;

    if (lower.includes('tomorrow')) {
      queryType = 'tomorrow';
    } else if (lower.includes('today')) {
      queryType = 'today';
    } else {
      const dateMatch = lower.match(
        /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}|\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?)\b/i,
      );
      if (dateMatch) {
        queryType = 'date';
        date = toISODate(dateMatch[0]);
      }
    }

    return { type: 'schedule_query', details: { query_type: queryType, date } };
  }

  // Task patterns
  if (
    /\b(task|todo|to\s+do|assign)\b/.test(lower) ||
    /\bcreate\s+(?:a\s+)?task\b/.test(lower)
  ) {
    const titleMatch = lower.match(
      /(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called|named)?\s*([^.!?]+)|^(.+)$/,
    );
    const title =
      titleMatch?.[1]?.trim() || titleMatch?.[2]?.trim() || message;

    const date = toISODate(
      lower.match(
        /\b(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?)\b/,
      )?.[0],
    );
    const time = toISOTime(
      lower.match(
        /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}(?::\d{2})?)\b/,
      )?.[0],
    );

    return { type: 'task', details: { title, date, time } };
  }

  // Calendar patterns
  if (/\b(event|meeting|appointment|schedule)\b/.test(lower) || /\bon\s+\d/.test(lower)) {
    const date = toISODate(
      lower.match(
        /\b(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?)\b/,
      )?.[0],
    );
    const time = toISOTime(
      lower.match(
        /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}(?::\d{2})?)\b/,
      )?.[0],
    );

    return { type: 'calendar', details: { title: message, date, time } };
  }

  console.log('🗣️ No specific pattern matched, treating as chat');
  return { type: 'chat', details: { query: message } };
}

/** ---- Main service ------------------------------------------------------ */
class AIAssistantService {
  private calendarProvider: ICalendarProvider;

  constructor(provider?: ICalendarProvider) {
    this.calendarProvider = provider ?? new LocalCalendarProvider();
  }

  setCalendarProvider(provider: ICalendarProvider) {
    this.calendarProvider = provider;
  }

  /**
   * Entry point for BOTH text and voice (voice just passes the transcript here).
   */
  async processUserMessage(
    message: string,
    userId: UUID,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<AIAction> {
    console.log('🎯 Processing user message:', message, 'for user:', userId);

    // 🔹 Instacart Intercept (text + voice)
    try {
      const lowerText = String(message || '').toLowerCase();

      // Only intercept if they clearly want Instacart + an "add/shop" verb
      const mentionsInstacart =
        lowerText.includes('instacart') || lowerText.includes('my cart');
      const hasActionVerb = /(add|put|send|buy|order|shop|get|need)\b/.test(
        lowerText,
      );

      if (mentionsInstacart && hasActionVerb) {
        console.log('🛒 Detected Instacart add-to-cart request:', message);

        if (!userId) {
          return {
            type: 'shopping',
            success: false,
            message:
              'Please sign in to connect your Instacart cart, then try again.',
          };
        }

        // 1) Parse items from sentence
        const extractedItems = extractItemsFromInstacartSentence(message);
        console.log('🛒 Extracted Instacart items:', extractedItems);

        if (extractedItems.length === 0) {
          // Let the standard AI pipeline try to make sense of it
          console.log(
            '🛒 Instacart phrase detected but no items found – falling back to normal flow.',
          );
        } else {
          try {
            // 2) Insert into Busy Moms shopping_lists + create Instacart link
            const result =
              await instacartShoppingService.addItemsAndSendToInstacart(
                userId,
                extractedItems,
              );

            const url =
              result.instacart_list_url || result.products_link_url || '';

            // 3) Nice human-readable list of items
            const labels = extractedItems;
            let prettyItems = '';
            if (labels.length === 1) {
              prettyItems = labels[0];
            } else if (labels.length === 2) {
              prettyItems = `${labels[0]} and ${labels[1]}`;
            } else {
              const last = labels[labels.length - 1];
              prettyItems = `${labels.slice(0, -1).join(', ')}, and ${last}`;
            }

            const replyLines: string[] = [];

            if (url) {
              replyLines.push(
                `I added ${prettyItems} to your shopping list and created an Instacart list for you.`,
              );
              replyLines.push(`You can view and edit it here: ${url}`);
            } else {
              replyLines.push(
                `I added ${prettyItems} to your shopping list. I couldn't get an Instacart link back, but your items are saved.`,
              );
            }

            return {
              type: 'shopping',
              success: true,
              message: replyLines.join('\n\n'),
              data: {
                ...result,
                items: labels,
              },
            };
          } catch (icError: any) {
            console.error(
              '❌ Instacart flow failed inside AI assistant:',
              icError,
            );
            return {
              type: 'shopping',
              success: false,
              message:
                'I tried to add those items to your Instacart cart, but something went wrong. Please try again from the Shopping tab.',
              data: {
                error: icError?.message ?? String(icError),
              },
            };
          }
        }
      }
      // If it wasn't an Instacart add-to-cart request, fall through to normal AI pipeline
    } catch (e) {
      console.warn(
        '⚠️ Instacart short-circuit check threw – falling back to normal flow:',
        e,
      );
      // continue into the normal flow below
    }

    try {

      // ---------------------------------------------------------
      // Calendar context for smarter classification & answers
      // (we support a few possible helper names to stay compatible
      //  with your existing calendarContextService implementation).
      // ---------------------------------------------------------
      let calendarContext: any = {
        summary: '',
        todayEvents: [],
        upcomingEvents: [],
      };

      try {
        const svc: any = calendarContextService as any;
        if (typeof svc.getContextForUser === 'function') {
          calendarContext = await svc.getContextForUser(userId);
        } else if (typeof svc.buildContext === 'function') {
          calendarContext = await svc.buildContext(userId);
        } else if (typeof svc.getContext === 'function') {
          calendarContext = await svc.getContext(userId);
        }
      } catch (ctxErr) {
        console.warn('⚠️ Failed to build calendar context, continuing:', ctxErr);
      }

      const calendarSummary = calendarContext?.summary ?? '';
      const intent = await classifyMessage(message, calendarSummary);

      console.log('🎯 Final parsed intent:', intent);

      switch (intent.type) {
        case 'calendar':
          return this.handleCalendarAction(intent.details || {}, userId);
        case 'calendar_query':
          return this.handleCalendarQuery(
            intent.details || {},
            userId,
            calendarContext,
          );
        case 'calendar_update':
          return this.handleCalendarUpdate(intent.details || {}, userId);
        case 'calendar_delete':
          return this.handleCalendarDelete(intent.details || {}, userId);
        case 'calendar_share':
          return this.handleCalendarShare(intent.details || {}, userId);
        case 'reminder':
          return this.handleReminderAction(intent.details || {}, userId);
        case 'reminder_share':
          return this.handleReminderShare(intent.details || {}, userId);
        case 'shopping':
          return this.handleShoppingAction(intent.details || {}, userId);
        case 'shopping_query':
          return this.handleShoppingQuery(intent.details || {}, userId);
        case 'shopping_update':
          return this.handleShoppingUpdate(intent.details || {}, userId);
        case 'shopping_delete':
          return this.handleShoppingDelete(intent.details || {}, userId);
        case 'task':
          return this.handleTaskAction(intent.details || {}, userId);
        case 'task_query':
          return this.handleTaskQuery(intent.details || {}, userId);
        case 'task_update':
          return this.handleTaskUpdate(intent.details || {}, userId);
        case 'task_delete':
          return this.handleTaskDelete(intent.details || {}, userId);
        case 'schedule':
          return this.handleScheduleQuery(intent.details || {}, userId);
        case 'family':
          return this.handleFamilyAction(intent.details || {}, userId);
        case 'family_query':
          return this.handleFamilyQuery(intent.details || {}, userId);
        case 'family_update':
          return this.handleFamilyUpdate(intent.details || {}, userId);
        case 'family_delete':
          return this.handleFamilyDelete(intent.details || {}, userId);
        default:
          return this.handleChatAction(
            intent.details || {},
            message,
            userId,
            calendarContext,
            conversationHistory,
          );
      }
    } catch (err: unknown) {
      console.error(
        '❌ processUserMessage error:',
        err instanceof Error ? err.message : err,
      );
      return {
        type: 'chat',
        success: false,
        message:
          'I encountered an error processing your request. Please try again.',
      };
    }
  }

  /**
   * Voice mode helper – just call this from your voice pipeline
   * with the recognized transcript and it will behave exactly
   * like text (including Instacart + shopping list insertion).
   */
  async processVoiceMessage(
    transcript: string,
    userId: UUID,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<AIAction> {
    return this.processUserMessage(transcript, userId, conversationHistory);
  }

  /** Direct calendar event creation with structured data (for voice AI, etc.) */
  async createCalendarEvent(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleCalendarAction(details, userId);
  }

  /** Direct calendar event update with structured data (for voice AI, etc.) */
  async updateCalendarEvent(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleCalendarUpdate(details, userId);
  }

  /** Direct calendar event deletion with structured data (for voice AI, etc.) */
  async deleteCalendarEvent(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleCalendarDelete(details, userId);
  }

  /** Get comprehensive schedule for a date including events, tasks, and reminders */
  async getSchedule(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleScheduleQuery(details, userId);
  }

  /** Direct task creation with structured data (for voice AI, etc.) */
  async createTask(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleTaskAction(details, userId);
  }

  /** Direct task query with structured data (for voice AI, etc.) */
  async queryTasks(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleTaskQuery(details, userId);
  }

  /** Direct task update with structured data (for voice AI, etc.) */
  async updateTask(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleTaskUpdate(details, userId);
  }

  /** Direct task deletion with structured data (for voice AI, etc.) */
  async deleteTask(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleTaskDelete(details, userId);
  }

  /** Direct reminder creation with structured data (for voice AI, etc.) */
  async createReminder(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleReminderAction(details, userId);
  }

  /** Share calendar event with family member */
  async shareCalendarEvent(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleCalendarShare(details, userId);
  }

  /** Share reminder with family member */
  async shareReminder(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    return this.handleReminderShare(details, userId);
  }

  /** Calendar Creation */
  private async handleCalendarAction(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('📅 Creating calendar event with details:', details);

    const title = String(details.title ?? 'New event');
    const date = toISODate(details.date);
    const start_time = toISOTime(details.time || details.start_time);
    const end_time = toISOTime(details.end_time);

    // Handle participants - can be a single name or array of names
    let participants: string[] | null = null;
    if (details.participants) {
      if (Array.isArray(details.participants)) {
        participants = details.participants.map((p: unknown) => String(p));
      } else {
        participants = [String(details.participants)];
      }
    }
    const location = details.location ? String(details.location) : null;

    // Handle assignment to family member
    let assigned_to: string | null = null;
    let assigned_to_name: string | null = null;
    if (details.assigned_to) {
      const memberName = String(details.assigned_to).toLowerCase();
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', `%${memberName}%`);

      if (members && members.length > 0) {
        assigned_to = members[0].id;
        assigned_to_name = members[0].name;
      }
    }

    if (!date) {
      return {
        type: 'calendar',
        success: false,
        message:
          'Please provide a date for the event (e.g., "today", "tomorrow", "2024-03-15")',
      };
    }

    const conflictCheck = await calendarContextService.checkConflicts(
      userId,
      date,
      start_time,
      end_time,
    );
    if (conflictCheck.hasConflict) {
      const conflictNames = conflictCheck.conflictingEvents
        .map((e: any) => e.title)
        .join(', ');
      let message = `⚠️ Schedule conflict detected! You already have: ${conflictNames} at that time.`;
      if (conflictCheck.suggestions.length > 0) {
        message += `\n\nSuggested alternative times: ${conflictCheck.suggestions.join(
          ', ',
        )}`;
      }
      return {
        type: 'calendar',
        success: false,
        message,
        data: {
          conflicts: conflictCheck.conflictingEvents,
          suggestions: conflictCheck.suggestions,
        },
      };
    }

    const input: CalendarEventInput = {
      title,
      date,
      start_time: start_time ?? undefined,
      end_time: end_time ?? undefined,
      participants: participants ?? undefined,
      location: location ?? undefined,
      source: 'ai',
      assigned_to: assigned_to ?? undefined,
    };

    try {
      const result = await this.calendarProvider.createEvent(userId, input);
      console.log('📅 Calendar event created successfully:', result);

      if (!result?.id && !result?.externalId) {
        return {
          type: 'calendar',
          success: false,
          message: 'Failed to create calendar event.',
        };
      }

      window.dispatchEvent(new CustomEvent('dashboard-data-updated', {
        detail: { type: 'calendar', action: 'created' }
      }));

      let timeMsg = '';
      if (start_time && end_time) {
        timeMsg = ` from ${start_time.slice(0, 5)} to ${end_time.slice(0, 5)}`;
      } else if (start_time) {
        timeMsg = ` at ${start_time.slice(0, 5)}`;
      }

      let participantsMsg = '';
      if (participants && participants.length > 0) {
        participantsMsg = ` with ${participants.join(', ')}`;
      }

      let assignmentMsg = '';
      if (assigned_to_name) {
        assignmentMsg = ` and assigned it to ${assigned_to_name}`;
      }

      return {
        type: 'calendar',
        success: true,
        message: `✅ Scheduled: ${title} on ${date}${timeMsg}${participantsMsg}${assignmentMsg}`,
        data: result,
      };
    } catch (error) {
      console.error('❌ Calendar creation error:', error);
      return {
        type: 'calendar',
        success: false,
        message: `Failed to create event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Calendar Queries */
  private async handleCalendarQuery(
    details: Record<string, unknown>,
    userId: UUID,
    context: any,
  ): Promise<AIAction> {
    console.log('🔍 Querying calendar with details:', details);

    const queryType = String(details.query_type || 'today');

    try {
      switch (queryType) {
        case 'today': {
          if (context.todayEvents.length === 0) {
            return {
              type: 'calendar',
              success: true,
              message:
                'You have no events scheduled for today. Your day is clear!',
              data: { events: [] },
            };
          }
          const formatted =
            calendarContextService.formatEventsAsNaturalLanguage(
              context.todayEvents,
            );
          return {
            type: 'calendar',
            success: true,
            message: `Here's your schedule for today:\n${formatted}`,
            data: { events: context.todayEvents },
          };
        }

        case 'week': {
          if (context.upcomingEvents.length === 0) {
            return {
              type: 'calendar',
              success: true,
              message:
                'You have no upcoming events this week. Enjoy your free time!',
              data: { events: [] },
            };
          }
          const formatted =
            calendarContextService.formatEventsAsNaturalLanguage(
              context.upcomingEvents,
            );
          return {
            type: 'calendar',
            success: true,
            message: `Here are your upcoming events:\n${formatted}`,
            data: { events: context.upcomingEvents },
          };
        }

        case 'availability': {
          const date =
            toISODate(details.date) ||
            new Date().toISOString().split('T')[0];
          const availability = await calendarContextService.checkAvailability(
            userId,
            { date },
          );

          if (availability.available) {
            let message = `You are available on ${date}.`;
            if (availability.freeSlots.length > 0) {
              const slots = availability.freeSlots
                .map(
                  (slot: any) =>
                    `${slot.start.slice(0, 5)} - ${slot.end.slice(0, 5)}`,
                )
                .join(', ');
              message += ` Free time slots: ${slots}`;
            }
            return {
              type: 'calendar',
              success: true,
              message,
              data: availability,
            };
          } else {
            const formatted =
              calendarContextService.formatEventsAsNaturalLanguage(
                availability.events,
              );
            return {
              type: 'calendar',
              success: true,
              message: `You have events on ${date}:\n${formatted}`,
              data: availability,
            };
          }
        }

        case 'next': {
          const nextEvent = await calendarContextService.findNextEvent(userId);
          if (!nextEvent) {
            return {
              type: 'calendar',
              success: true,
              message: 'You have no upcoming events scheduled.',
              data: { event: null },
            };
          }
          const formatted =
            calendarContextService.formatEventsAsNaturalLanguage([
              nextEvent,
            ]);
          return {
            type: 'calendar',
            success: true,
            message: `Your next event is:\n${formatted}`,
            data: { event: nextEvent },
          };
        }

        case 'search': {
          const searchTerm = String(details.search_term || '');
          if (!searchTerm) {
            return {
              type: 'calendar',
              success: false,
              message: 'Please provide a search term to find events.',
            };
          }
          const events = await calendarContextService.searchEvents(
            userId,
            searchTerm,
          );
          if (events.length === 0) {
            return {
              type: 'calendar',
              success: true,
              message: `No events found matching "${searchTerm}".`,
              data: { events: [] },
            };
          }
          const formatted =
            calendarContextService.formatEventsAsNaturalLanguage(events);
          return {
            type: 'calendar',
            success: true,
            message: `Found ${events.length} event${
              events.length > 1 ? 's' : ''
            } matching "${searchTerm}":\n${formatted}`,
            data: { events },
          };
        }

        default:
          return {
            type: 'calendar',
            success: false,
            message:
              'I don\'t understand that calendar query. Try asking "What\'s on my calendar today?" or "Am I free tomorrow?"',
          };
      }
    } catch (error) {
      console.error('❌ Calendar query error:', error);
      return {
        type: 'calendar',
        success: false,
        message: `Failed to query calendar: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Calendar Updates */
  private async handleCalendarUpdate(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('✏️ Updating calendar event with details:', details);

    const searchTerm = String(details.search_term || '');
    const updates = (details.updates as Record<string, unknown>) || {};

    if (!searchTerm) {
      return {
        type: 'calendar',
        success: false,
        message: 'Please specify which event you want to update.',
      };
    }

    try {
      const events = await calendarContextService.searchEvents(
        userId,
        searchTerm,
      );
      if (events.length === 0) {
        return {
          type: 'calendar',
          success: false,
          message: `No events found matching "${searchTerm}". Please be more specific.`,
        };
      }

      if (events.length > 1) {
        const formatted =
          calendarContextService.formatEventsAsNaturalLanguage(events);
        return {
          type: 'calendar',
          success: false,
          message: `Multiple events found matching "${searchTerm}". Please be more specific:\n${formatted}`,
          data: { events },
        };
      }

      const event = events[0];
      const updatePayload: any = {};

      if (updates.date) {
        const newDate = toISODate(updates.date);
        if (newDate) updatePayload.event_date = newDate;
      }

      if (updates.time || updates.start_time) {
        const newTime = toISOTime(updates.time || updates.start_time);
        if (newTime) updatePayload.start_time = newTime;
      }

      if (updates.end_time) {
        const newEndTime = toISOTime(updates.end_time);
        if (newEndTime) updatePayload.end_time = newEndTime;
      }

      if (updates.location) {
        updatePayload.location = String(updates.location);
      }

      if (updates.title) {
        updatePayload.title = String(updates.title);
      }

      if (Object.keys(updatePayload).length === 0) {
        return {
          type: 'calendar',
          success: false,
          message: 'No valid updates provided. What would you like to change?',
        };
      }

      if (updatePayload.event_date || updatePayload.start_time || updatePayload.end_time) {
        const checkDate = updatePayload.event_date || (event as any).event_date;
        const checkTime =
          updatePayload.start_time || (event as any).start_time;
        const checkEndTime =
          updatePayload.end_time || (event as any).end_time;
        const conflictCheck = await calendarContextService.checkConflicts(
          userId,
          checkDate,
          checkTime,
          checkEndTime,
          (event as any).id,
        );

        if (conflictCheck.hasConflict) {
          const conflictNames = conflictCheck.conflictingEvents
            .map((e: any) => e.title)
            .join(', ');
          return {
            type: 'calendar',
            success: false,
            message: `⚠️ Cannot update: Schedule conflict with ${conflictNames}. Try a different time.`,
            data: { conflicts: conflictCheck.conflictingEvents },
          };
        }
      }

      const { data, error } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', (event as any).id)
        .select()
        .single();

      if (error) throw error;

      return {
        type: 'calendar',
        success: true,
        message: `✅ Updated "${(event as any).title}" successfully!`,
        data: { event: data },
      };
    } catch (error) {
      console.error('❌ Calendar update error:', error);
      return {
        type: 'calendar',
        success: false,
        message: `Failed to update event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Calendar Deletion */
  private async handleCalendarDelete(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('🗑️ Deleting calendar event with details:', details);

    const searchTerm = String(details.search_term || '');
    const date = details.date ? toISODate(details.date) : null;

    if (!searchTerm) {
      return {
        type: 'calendar',
        success: false,
        message: 'Please specify which event you want to delete.',
      };
    }

    try {
      let events: DbEvent[];

      if (date) {
        const allEvents = await calendarContextService.searchEvents(
          userId,
          searchTerm,
        );
        events = allEvents.filter((e: any) => e.event_date === date);
      } else {
        events = await calendarContextService.searchEvents(userId, searchTerm);
      }

      if (events.length === 0) {
        return {
          type: 'calendar',
          success: false,
          message: `No events found matching "${searchTerm}".`,
        };
      }

      if (events.length > 1) {
        const formatted =
          calendarContextService.formatEventsAsNaturalLanguage(events);
        return {
          type: 'calendar',
          success: false,
          message: `Multiple events found. Please be more specific about which event to delete:\n${formatted}`,
          data: { events },
        };
      }

      const event = events[0];
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', (event as any).id);

      if (error) throw error;

      return {
        type: 'calendar',
        success: true,
        message: `✅ Deleted "${(event as any).title}" from your calendar.`,
        data: { event },
      };
    } catch (error) {
      console.error('❌ Calendar delete error:', error);
      return {
        type: 'calendar',
        success: false,
        message: `Failed to delete event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Schedule Query - Get all events, tasks, and reminders for a date */
  private async handleScheduleQuery(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('📅 Querying schedule with details:', details);

    const dateInput = String(details.date || 'today');
    const includeShopping = Boolean(details.include_shopping);
    const targetDate = toISODate(dateInput);

    if (!targetDate) {
      return {
        type: 'schedule',
        success: false,
        message: 'Please provide a valid date (e.g., "today", "tomorrow", "2026-01-20")',
      };
    }

    try {
      // Query all three types of items for the date
      const [eventsResult, tasksResult, remindersResult, shoppingResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .eq('event_date', targetDate)
          .order('start_time', { ascending: true, nullsFirst: false }),

        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('due_date', targetDate)
          .order('due_time', { ascending: true, nullsFirst: false }),

        supabase
          .from('reminders')
          .select('*')
          .eq('user_id', userId)
          .eq('reminder_date', targetDate)
          .eq('completed', false)
          .order('reminder_time', { ascending: true, nullsFirst: false }),

        includeShopping ? supabase
          .from('shopping_lists')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', false)
          .order('created_at', { ascending: false }) : null
      ]);

      const events = eventsResult.data || [];
      const tasks = tasksResult.data || [];
      const reminders = remindersResult.data || [];
      const shopping = shoppingResult?.data || [];

      // Combine and sort all items by time
      interface ScheduleItem {
        type: 'event' | 'task' | 'reminder';
        time: string | null;
        title: string;
        details: string;
        assigned?: string;
        rawTime: number; // for sorting
      }

      const scheduleItems: ScheduleItem[] = [];

      // Add events
      events.forEach((event: any) => {
        const time = event.start_time || null;
        const timeStr = time ? formatTimeForDisplay(time) : 'All day';
        scheduleItems.push({
          type: 'event',
          time: timeStr,
          title: event.title,
          details: event.location ? `at ${event.location}` : '',
          assigned: event.assigned_to_name || (event.participants?.length > 0 ? `with ${event.participants.join(', ')}` : ''),
          rawTime: time ? parseTimeToMinutes(time) : 0
        });
      });

      // Add tasks
      tasks.forEach((task: any) => {
        const time = task.due_time || null;
        const timeStr = time ? formatTimeForDisplay(time) : 'No time set';
        scheduleItems.push({
          type: 'task',
          time: timeStr,
          title: task.title,
          details: task.priority ? `${task.priority} priority` : '',
          assigned: task.assigned_to_name || '',
          rawTime: time ? parseTimeToMinutes(time) : 1440 // Put tasks without time at end of day
        });
      });

      // Add reminders
      reminders.forEach((reminder: any) => {
        const time = reminder.reminder_time || null;
        const timeStr = time ? formatTimeForDisplay(time) : 'No time set';
        scheduleItems.push({
          type: 'reminder',
          time: timeStr,
          title: reminder.title,
          details: '',
          assigned: reminder.assigned_to_name || '',
          rawTime: time ? parseTimeToMinutes(time) : 1440
        });
      });

      // Sort by time
      scheduleItems.sort((a, b) => a.rawTime - b.rawTime);

      // Format the response
      const dateDisplay = formatDateForDisplay(targetDate);
      let message = `📅 Your schedule for ${dateDisplay}:\n\n`;

      if (scheduleItems.length === 0) {
        message += '🎉 You have nothing scheduled! Enjoy your free time.';
      } else {
        scheduleItems.forEach((item) => {
          const icon = item.type === 'event' ? '📅' : item.type === 'task' ? '✅' : '🔔';
          const assignedText = item.assigned ? ` (${item.assigned})` : '';
          const detailsText = item.details ? ` - ${item.details}` : '';
          message += `${icon} ${item.time} - ${item.title}${assignedText}${detailsText}\n`;
        });
      }

      // Add shopping list if requested
      if (includeShopping && shopping.length > 0) {
        message += `\n\n🛒 Shopping List (${shopping.length} items):\n`;
        shopping.slice(0, 5).forEach((item: any) => {
          const assignedText = item.assigned_to_name ? ` - ${item.assigned_to_name}` : '';
          message += `  • ${item.item}${assignedText}\n`;
        });
        if (shopping.length > 5) {
          message += `  ...and ${shopping.length - 5} more items\n`;
        }
      }

      return {
        type: 'schedule',
        success: true,
        message,
        data: {
          date: targetDate,
          events,
          tasks,
          reminders,
          shopping: includeShopping ? shopping : []
        }
      };
    } catch (error) {
      console.error('❌ Schedule query error:', error);
      return {
        type: 'schedule',
        success: false,
        message: `Failed to get schedule: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Calendar Share - Share event with family member */
  private async handleCalendarShare(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('📤 Sharing calendar event with details:', details);

    const searchTerm = String(details.search_term || '');
    const recipientName = String(details.recipient_name || '');
    const date = details.date ? toISODate(details.date) : null;

    if (!searchTerm) {
      return {
        type: 'calendar',
        success: false,
        message: 'Please specify which event you want to share.',
      };
    }

    if (!recipientName) {
      return {
        type: 'calendar',
        success: false,
        message: 'Please specify which family member to share with.',
      };
    }

    try {
      // Find the family member
      const { data: members, error: memberError } = await supabase
        .from('family_members')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', `%${recipientName}%`);

      if (memberError) throw memberError;

      if (!members || members.length === 0) {
        return {
          type: 'calendar',
          success: false,
          message: `No family member found with name "${recipientName}". Please add them first.`,
        };
      }

      if (members.length > 1) {
        const memberList = members.map((m: any) => m.name).join(', ');
        return {
          type: 'calendar',
          success: false,
          message: `Multiple family members found: ${memberList}. Please be more specific.`,
          data: { members },
        };
      }

      const recipient = members[0];

      // Find the event
      let events: DbEvent[];
      if (date) {
        const allEvents = await calendarContextService.searchEvents(
          userId,
          searchTerm,
        );
        events = allEvents.filter((e: any) => e.event_date === date);
      } else {
        events = await calendarContextService.searchEvents(userId, searchTerm);
      }

      if (events.length === 0) {
        return {
          type: 'calendar',
          success: false,
          message: `No events found matching "${searchTerm}".`,
        };
      }

      if (events.length > 1) {
        const formatted =
          calendarContextService.formatEventsAsNaturalLanguage(events);
        return {
          type: 'calendar',
          success: false,
          message: `Multiple events found. Please be more specific:\n${formatted}`,
          data: { events },
        };
      }

      const event = events[0];

      // Update event to add participant
      const currentParticipants = (event as any).participants || [];
      const updatedParticipants = [...currentParticipants];
      
      if (!updatedParticipants.includes(recipient.name)) {
        updatedParticipants.push(recipient.name);
      }

      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update({ 
          participants: updatedParticipants,
          updated_at: new Date().toISOString()
        })
        .eq('id', (event as any).id)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        type: 'calendar',
        success: true,
        message: `✅ Shared "${(event as any).title}" with ${recipient.name}!`,
        data: { event: updatedEvent, recipient },
      };
    } catch (error) {
      console.error('❌ Calendar share error:', error);
      return {
        type: 'calendar',
        success: false,
        message: `Failed to share event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Reminders */
  private async handleReminderAction(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    const title = String(details.title ?? 'Reminder');
    const date = toISODate(details.date);
    const time = toISOTime(details.time);
    const familyMemberName = (details.assigned_to || details.family_member)
      ? String(details.assigned_to || details.family_member)
      : null;

    if (!date) {
      return {
        type: 'reminder',
        success: false,
        message:
          'Please include a date for the reminder (e.g., "today", "tomorrow", "2024-03-15")',
      };
    }

    try {
      let family_member_id: string | null = null;
      let family_member_email: string | null = null;
      let recipientName: string | null = null;

      // Find family member if specified
      if (familyMemberName) {
        const { data: members, error: memberError } = await supabase
          .from('family_members')
          .select('id, name, Email')
          .eq('user_id', userId)
          .ilike('name', `%${familyMemberName}%`);

        if (memberError) throw memberError;

        if (members && members.length > 0) {
          const member = members[0];
          family_member_id = member.id;
          family_member_email = member.Email;
          recipientName = member.name;
        }
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert([
          {
            user_id: userId,
            title,
            description: String(details.description || ''),
            reminder_date: date,
            reminder_time: time,
            priority: 'medium',
            completed: false,
            recurring: false,
            recurring_pattern: null,
            family_member_id,
            family_member_email,
            assigned_to_name: recipientName,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Reminder creation error:', error);
        return {
          type: 'reminder',
          success: false,
          message: error.message || 'Failed to create reminder.',
        };
      }

      window.dispatchEvent(new CustomEvent('dashboard-data-updated', {
        detail: { type: 'reminder', action: 'created' }
      }));

      const timeDisplay = time ? ` at ${formatTimeForDisplay(time)}` : '';
      const forWhom = recipientName ? ` for ${recipientName}` : '';
      return {
        type: 'reminder',
        success: true,
        message: `✅ Reminder set${forWhom} for ${date}${timeDisplay}: ${title}`,
        data,
      };
    } catch (error) {
      console.error('❌ Reminder creation error:', error);
      return {
        type: 'reminder',
        success: false,
        message: `Failed to create reminder: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Reminder Share - Share reminder with family member */
  private async handleReminderShare(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('📤 Sharing reminder with details:', details);

    const searchTerm = String(details.search_term || '');
    const recipientName = String(details.recipient_name || '');

    if (!searchTerm) {
      return {
        type: 'reminder',
        success: false,
        message: 'Please specify which reminder you want to share.',
      };
    }

    if (!recipientName) {
      return {
        type: 'reminder',
        success: false,
        message: 'Please specify which family member to share with.',
      };
    }

    try {
      // Find the family member
      const { data: members, error: memberError } = await supabase
        .from('family_members')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', `%${recipientName}%`);

      if (memberError) throw memberError;

      if (!members || members.length === 0) {
        return {
          type: 'reminder',
          success: false,
          message: `No family member found with name "${recipientName}". Please add them first.`,
        };
      }

      if (members.length > 1) {
        const memberList = members.map((m: any) => m.name).join(', ');
        return {
          type: 'reminder',
          success: false,
          message: `Multiple family members found: ${memberList}. Please be more specific.`,
          data: { members },
        };
      }

      const recipient = members[0];

      // Find the reminder
      const { data: reminders, error: searchError } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${searchTerm}%`)
        .eq('completed', false)
        .order('reminder_date', { ascending: true });

      if (searchError) throw searchError;

      if (!reminders || reminders.length === 0) {
        return {
          type: 'reminder',
          success: false,
          message: `No reminders found matching "${searchTerm}".`,
        };
      }

      if (reminders.length > 1) {
        const reminderList = reminders
          .map((r: any) => `${r.title} (${r.reminder_date})`)
          .join(', ');
        return {
          type: 'reminder',
          success: false,
          message: `Multiple reminders found: ${reminderList}. Please be more specific.`,
          data: { reminders },
        };
      }

      const reminder = reminders[0];

      // Update reminder to assign to family member
      const { data: updatedReminder, error: updateError } = await supabase
        .from('reminders')
        .update({
          family_member_id: recipient.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (reminder as any).id)
        .select(
          `
        *,
        family_member:family_members(id, name, age)
      `,
        )
        .single();

      if (updateError) throw updateError;

      return {
        type: 'reminder',
        success: true,
        message: `✅ Shared reminder "${(reminder as any).title}" with ${recipient.name}!`,
        data: { reminder: updatedReminder, recipient },
      };
    } catch (error) {
      console.error('❌ Reminder share error:', error);
      return {
        type: 'reminder',
        success: false,
        message: `Failed to share reminder: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Shopping */
  private async handleShoppingAction(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('🛒 Adding shopping item with details:', details);

    const title = String(details.title ?? 'item');
    const category = String(details.category ?? details.list ?? 'other');
    const quantity = coerceInt(details.quantity ?? 1, 1) ?? 1;

    let assigned_to: string | null = null;
    let assigned_to_email: string | null = null;
    let assigned_to_name: string | null = null;
    if (details.assigned_to) {
      const memberName = String(details.assigned_to).toLowerCase();
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, Email')
        .eq('user_id', userId)
        .ilike('name', `%${memberName}%`);

      if (members && members.length > 0) {
        assigned_to = members[0].id;
        assigned_to_email = members[0].Email || null;
        assigned_to_name = members[0].name;
      }
    }

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([
          {
            user_id: userId,
            item: title,
            category,
            quantity,
            completed: false,
            urgent: false,
            assigned_to,
            assigned_to_email,
            assigned_to_name,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Shopping item creation error:', error);
        return {
          type: 'shopping',
          success: false,
          message: error.message || 'Failed to add to shopping list.',
        };
      }

      console.log('🛒 Shopping item created successfully:', data);

      window.dispatchEvent(new CustomEvent('dashboard-data-updated', {
        detail: { type: 'shopping', action: 'created' }
      }));

      let message = `✅ Added to shopping list: ${title}${
        quantity > 1 ? ` x${quantity}` : ''
      }`;
      if (assigned_to_name) {
        message += ` assigned to ${assigned_to_name}`;
      }

      return {
        type: 'shopping',
        success: true,
        message,
        data,
      };
    } catch (error) {
      console.error('❌ Shopping item creation error:', error);
      return {
        type: 'shopping',
        success: false,
        message: `Failed to add to shopping list: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Tasks */
  private async handleTaskAction(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('✅ Creating task with details:', details);

    const title = String(details.title ?? 'New task');
    const description = details.description
      ? String(details.description)
      : null;
    const due_date = toISODate(details.date);
    const due_time = toISOTime(details.time);
    const p = details.priority
      ? details.priority.toString().toLowerCase()
      : undefined;
    const priority =
      p === 'low' || p === 'medium' || p === 'high' ? p : 'medium';
    const category = String(details.category ?? 'other');
    const points = coerceInt(details.points, 0) ?? 0;
    const notes = details.notes ? String(details.notes) : null;

    let assigned_to: string | null = null;
    let assigned_to_email: string | null = null;
    let assigned_to_name: string | null = null;
    if (details.assigned_to) {
      const memberName = String(details.assigned_to).toLowerCase();
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, Email')
        .eq('user_id', userId)
        .ilike('name', `%${memberName}%`);

      if (members && members.length > 0) {
        assigned_to = members[0].id;
        assigned_to_email = members[0].Email || null;
        assigned_to_name = members[0].name;
      }
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: userId,
            title,
            description,
            due_date,
            due_time,
            priority,
            status: 'pending',
            category,
            points,
            notes,
            assigned_to,
            assigned_to_email,
            assigned_to_name,
          },
        ])
        .select(
          `
          *,
          assigned_family_member:family_members(id, name, age)
        `,
        )
        .single();

      if (error) {
        console.error('❌ Task creation error:', error);
        return {
          type: 'task',
          success: false,
          message: error.message || 'Failed to create task.',
        };
      }

      console.log('✅ Task created successfully:', data);

      window.dispatchEvent(new CustomEvent('dashboard-data-updated', {
        detail: { type: 'task', action: 'created' }
      }));

      let message = `✅ Task created: ${title}`;
      if (due_date) message += ` due ${due_date}`;
      if ((data as any).assigned_family_member) {
        message += ` assigned to ${(data as any).assigned_family_member.name}`;
      }

      return {
        type: 'task',
        success: true,
        message,
        data,
      };
    } catch (error) {
      console.error('❌ Task creation error:', error);
      return {
        type: 'task',
        success: false,
        message: `Failed to create task: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Task Query */
  private async handleTaskQuery(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('📋 Querying tasks with details:', details);

    const queryType = String(details.query_type || 'all');
    const searchTerm = details.search_term ? String(details.search_term) : null;
    const assignedTo = details.assigned_to
      ? String(details.assigned_to)
      : null;

    try {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          assigned_family_member:family_members(id, name, age)
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (
        queryType !== 'all' &&
        queryType !== 'search' &&
        queryType !== 'assigned_to'
      ) {
        query = query.eq('status', queryType);
      }

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      if (assignedTo) {
        const { data: members } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${assignedTo}%`);

        if (members && members.length > 0) {
          query = query.eq('assigned_to', members[0].id);
        }
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      if (!tasks || tasks.length === 0) {
        return {
          type: 'task',
          success: true,
          message: 'You have no tasks matching your criteria.',
          data: { tasks: [] },
        };
      }

      let message = `You have ${tasks.length} task${
        tasks.length > 1 ? 's' : ''
      }:\n`;
      tasks.forEach((task: any, i: number) => {
        message += `${i + 1}. ${task.title}`;
        if (task.status) message += ` (${task.status})`;
        if (task.assigned_family_member)
          message += ` - assigned to ${task.assigned_family_member.name}`;
        if (task.due_date) message += ` - due ${task.due_date}`;
        message += '\n';
      });

      return {
        type: 'task',
        success: true,
        message,
        data: { tasks },
      };
    } catch (error) {
      console.error('❌ Task query error:', error);
      return {
        type: 'task',
        success: false,
        message: `Failed to query tasks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Task Update */
  private async handleTaskUpdate(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('✏️ Updating task with details:', details);

    const searchTerm = String(details.search_term || '');
    const updates = (details.updates as Record<string, unknown>) || {};

    if (!searchTerm) {
      return {
        type: 'task',
        success: false,
        message: 'Please specify which task you want to update.',
      };
    }

    try {
      const { data: tasks, error: searchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!tasks || tasks.length === 0) {
        return {
          type: 'task',
          success: false,
          message: `No tasks found matching "${searchTerm}".`,
        };
      }

      if (tasks.length > 1) {
        const taskList = tasks.map((t: any) => t.title).join(', ');
        return {
          type: 'task',
          success: false,
          message: `Multiple tasks found matching "${searchTerm}": ${taskList}. Please be more specific.`,
          data: { tasks },
        };
      }

      const task = tasks[0];
      const updatePayload: any = { updated_at: new Date().toISOString() };

      if (updates.title) updatePayload.title = String(updates.title);
      if (updates.description)
        updatePayload.description = String(updates.description);
      if (updates.category)
        updatePayload.category = String(updates.category);
      if (updates.priority)
        updatePayload.priority = String(updates.priority);
      if (updates.status) {
        updatePayload.status = String(updates.status);
        if (updatePayload.status === 'completed') {
          updatePayload.completed_at = new Date().toISOString();
        }
      }
      if (updates.notes) updatePayload.notes = String(updates.notes);
      if (updates.points !== undefined)
        updatePayload.points = coerceInt(updates.points, 0);

      if (updates.date || updates.due_date) {
        const newDate = toISODate(updates.date || updates.due_date);
        if (newDate) updatePayload.due_date = newDate;
      }

      if (updates.time || updates.due_time) {
        const newTime = toISOTime(updates.time || updates.due_time);
        if (newTime) updatePayload.due_time = newTime;
      }

      if (updates.assigned_to) {
        const memberName = String(updates.assigned_to).toLowerCase();
        const { data: members } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${memberName}%`);

        if (members && members.length > 0) {
          updatePayload.assigned_to = members[0].id;
        }
      }

      if (Object.keys(updatePayload).length === 1) {
        return {
          type: 'task',
          success: false,
          message: 'No valid updates provided.',
        };
      }

      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', (task as any).id)
        .select(
          `
          *,
          assigned_family_member:family_members(id, name, age)
        `,
        )
        .single();

      if (updateError) throw updateError;

      return {
        type: 'task',
        success: true,
        message: `✅ Updated task "${(task as any).title}" successfully!`,
        data: { task: updatedTask },
      };
    } catch (error) {
      console.error('❌ Task update error:', error);
      return {
        type: 'task',
        success: false,
        message: `Failed to update task: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Task Delete */
  private async handleTaskDelete(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('🗑️ Deleting task with details:', details);

    const searchTerm = String(details.search_term || '');

    if (!searchTerm) {
      return {
        type: 'task',
        success: false,
        message: 'Please specify which task you want to delete.',
      };
    }

    try {
      const { data: tasks, error: searchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!tasks || tasks.length === 0) {
        return {
          type: 'task',
          success: false,
          message: `No tasks found matching "${searchTerm}".`,
        };
      }

      if (tasks.length > 1) {
        const taskList = tasks.map((t: any) => t.title).join(', ');
        return {
          type: 'task',
          success: false,
          message: `Multiple tasks found matching "${searchTerm}": ${taskList}. Please be more specific.`,
          data: { tasks },
        };
      }

      const task = tasks[0];
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', (task as any).id);

      if (deleteError) throw deleteError;

      return {
        type: 'task',
        success: true,
        message: `✅ Deleted task "${(task as any).title}" from your list.`,
        data: { task },
      };
    } catch (error) {
      console.error('❌ Task delete error:', error);
      return {
        type: 'task',
        success: false,
        message: `Failed to delete task: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Shopping Query */
  private async handleShoppingQuery(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('🛒 Querying shopping list with details:', details);

    const queryType = String(details.query_type || 'all');
    const searchTerm = details.search_term ? String(details.search_term) : null;

    try {
      let query = supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (queryType === 'pending') {
        query = query.eq('completed', false);
      } else if (queryType === 'completed') {
        query = query.eq('completed', true);
      }

      if (searchTerm) {
        query = query.ilike('item', `%${searchTerm}%`);
      }

      const { data: items, error } = await query;

      if (error) throw error;

      if (!items || items.length === 0) {
        return {
          type: 'shopping_query',
          success: true,
          message:
            queryType === 'pending'
              ? 'Your shopping list is empty!'
              : 'No shopping items found.',
          data: { items: [] },
        };
      }

      let message = `You have ${items.length} item${
        items.length > 1 ? 's' : ''
      } on your shopping list:\n`;
      items.forEach((item: any, i: number) => {
        message += `${i + 1}. ${item.item}`;
        if (item.quantity > 1) message += ` (x${item.quantity})`;
        if (item.completed) message += ` ✓`;
        if (item.urgent) message += ` 🔥`;
        message += '\n';
      });

      return {
        type: 'shopping_query',
        success: true,
        message,
        data: { items },
      };
    } catch (error) {
      console.error('❌ Shopping query error:', error);
      return {
        type: 'shopping_query',
        success: false,
        message: `Failed to query shopping list: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Shopping Update */
  private async handleShoppingUpdate(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('✏️ Updating shopping item with details:', details);

    const searchTerm = String(details.search_term || '');
    const updates = (details.updates as Record<string, unknown>) || {};

    if (!searchTerm) {
      return {
        type: 'shopping_update',
        success: false,
        message: 'Please specify which item you want to update.',
      };
    }

    try {
      const { data: items, error: searchError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .ilike('item', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!items || items.length === 0) {
        return {
          type: 'shopping_update',
          success: false,
          message: `No shopping items found matching "${searchTerm}".`,
        };
      }

      if (items.length > 1) {
        const itemList = items.map((item: any) => item.item).join(', ');
        return {
          type: 'shopping_update',
          success: false,
          message: `Multiple items found matching "${searchTerm}": ${itemList}. Please be more specific.`,
          data: { items },
        };
      }

      const item = items[0];
      const updatePayload: any = {};

      if (updates.completed !== undefined)
        updatePayload.completed = Boolean(updates.completed);
      if (updates.quantity !== undefined)
        updatePayload.quantity = coerceInt(updates.quantity, 1);
      if (updates.urgent !== undefined)
        updatePayload.urgent = Boolean(updates.urgent);
      if (updates.category) updatePayload.category = String(updates.category);
      if (updates.notes) updatePayload.notes = String(updates.notes);

      if (Object.keys(updatePayload).length === 0) {
        return {
          type: 'shopping_update',
          success: false,
          message: 'No valid updates provided.',
        };
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from('shopping_lists')
        .update(updatePayload)
        .eq('id', (item as any).id)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        type: 'shopping_update',
        success: true,
        message: `✅ Updated "${(item as any).item}" successfully!`,
        data: { item: updatedItem },
      };
    } catch (error) {
      console.error('❌ Shopping update error:', error);
      return {
        type: 'shopping_update',
        success: false,
        message: `Failed to update item: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Shopping Delete */
  private async handleShoppingDelete(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('🗑️ Deleting shopping item with details:', details);

    const searchTerm = String(details.search_term || '');

    if (!searchTerm) {
      return {
        type: 'shopping_delete',
        success: false,
        message: 'Please specify which item you want to delete.',
      };
    }

    try {
      const { data: items, error: searchError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .ilike('item', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!items || items.length === 0) {
        return {
          type: 'shopping_delete',
          success: false,
          message: `No shopping items found matching "${searchTerm}".`,
        };
      }

      if (items.length > 1) {
        const itemList = items.map((item: any) => item.item).join(', ');
        return {
          type: 'shopping_delete',
          success: false,
          message: `Multiple items found matching "${searchTerm}": ${itemList}. Please be more specific.`,
          data: { items },
        };
      }

      const item = items[0];
      const { error: deleteError } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', (item as any).id);

      if (deleteError) throw deleteError;

      return {
        type: 'shopping_delete',
        success: true,
        message: `✅ Removed "${(item as any).item}" from your shopping list.`,
        data: { item },
      };
    } catch (error) {
      console.error('❌ Shopping delete error:', error);
      return {
        type: 'shopping_delete',
        success: false,
        message: `Failed to delete item: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Family Member Creation */
  private async handleFamilyAction(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('👨‍👩‍👧‍👦 Creating family member with details:', details);

    const name = String(details.name ?? 'Family Member');
    const age = coerceInt(details.age, null);
    const gender = details.gender ? String(details.gender) : 'Other';
    const relationship = details.relationship
      ? String(details.relationship)
      : null;

    if (!name || name === 'Family Member') {
      return {
        type: 'family',
        success: false,
        message: 'Please provide a name for the family member.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert([
          {
            user_id: userId,
            name,
            age,
            gender,
            ...(relationship && {
              medical_notes: `Relationship: ${relationship}`,
            }),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Family member creation error:', error);
        return {
          type: 'family',
          success: false,
          message: error.message || 'Failed to add family member.',
        };
      }

      console.log('👨‍👩‍👧‍👦 Family member created successfully:', data);
      return {
        type: 'family',
        success: true,
        message: `✅ Added ${name}${age ? ` (age ${age})` : ''} to your family!`,
        data,
      };
    } catch (error) {
      console.error('❌ Family member creation error:', error);
      return {
        type: 'family',
        success: false,
        message: `Failed to add family member: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Family Query */
  private async handleFamilyQuery(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('👨‍👩‍👧‍👦 Querying family members with details:', details);

    const queryType = String(details.query_type || 'all');
    const searchTerm = details.search_term ? String(details.search_term) : null;

    try {
      let query = supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data: members, error } = await query;

      if (error) throw error;

      if (!members || members.length === 0) {
        return {
          type: 'family_query',
          success: true,
          message:
            'No family members found. You can add family members by saying "Add my daughter Emma age 8".',
          data: { members: [] },
        };
      }

      let message = `You have ${members.length} family member${
        members.length > 1 ? 's' : ''
      }:\n`;
      members.forEach((member: any, i: number) => {
        message += `${i + 1}. ${member.name}`;
        if (member.age) message += ` (age ${member.age})`;
        if (member.gender && member.gender !== 'Other')
          message += ` - ${member.gender}`;
        if (member.school) message += ` - ${member.school}`;
        if (member.grade) message += ` (${member.grade})`;
        message += '\n';
      });

      return {
        type: 'family_query',
        success: true,
        message,
        data: { members },
      };
    } catch (error) {
      console.error('❌ Family query error:', error);
      return {
        type: 'family_query',
        success: false,
        message: `Failed to query family members: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Family Update */
  private async handleFamilyUpdate(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('✏️ Updating family member with details:', details);

    const searchTerm = String(details.search_term || '');
    const updates = (details.updates as Record<string, unknown>) || {};

    if (!searchTerm) {
      return {
        type: 'family_update',
        success: false,
        message: 'Please specify which family member you want to update.',
      };
    }

    try {
      const { data: members, error: searchError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!members || members.length === 0) {
        return {
          type: 'family_update',
          success: false,
          message: `No family members found matching "${searchTerm}".`,
        };
      }

      if (members.length > 1) {
        const memberList = members.map((m: any) => m.name).join(', ');
        return {
          type: 'family_update',
          success: false,
          message: `Multiple family members found matching "${searchTerm}": ${memberList}. Please be more specific.`,
          data: { members },
        };
      }

      const member = members[0];
      const updatePayload: any = { updated_at: new Date().toISOString() };

      if (updates.name) updatePayload.name = String(updates.name);
      if (updates.age !== undefined)
        updatePayload.age = coerceInt(updates.age, null);
      if (updates.gender) updatePayload.gender = String(updates.gender);
      if (updates.school) updatePayload.school = String(updates.school);
      if (updates.grade) updatePayload.grade = String(updates.grade);
      if (updates.allergies) {
        const allergiesList = Array.isArray(updates.allergies)
          ? updates.allergies.map((a) => String(a))
          : String(updates.allergies)
              .split(',')
              .map((a) => a.trim());
        updatePayload.allergies = allergiesList;
      }
      if (updates.medical_notes)
        updatePayload.medical_notes = String(updates.medical_notes);

      if (Object.keys(updatePayload).length === 1) {
        return {
          type: 'family_update',
          success: false,
          message: 'No valid updates provided.',
        };
      }

      const { data: updatedMember, error: updateError } = await supabase
        .from('family_members')
        .update(updatePayload)
        .eq('id', (member as any).id)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        type: 'family_update',
        success: true,
        message: `✅ Updated ${(member as any).name}'s information successfully!`,
        data: { member: updatedMember },
      };
    } catch (error) {
      console.error('❌ Family update error:', error);
      return {
        type: 'family_update',
        success: false,
        message: `Failed to update family member: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Family Delete */
  private async handleFamilyDelete(
    details: Record<string, unknown>,
    userId: UUID,
  ): Promise<AIAction> {
    console.log('🗑️ Deleting family member with details:', details);

    const searchTerm = String(details.search_term || '');

    if (!searchTerm) {
      return {
        type: 'family_delete',
        success: false,
        message: 'Please specify which family member you want to remove.',
      };
    }

    try {
      const { data: members, error: searchError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!members || members.length === 0) {
        return {
          type: 'family_delete',
          success: false,
          message: `No family members found matching "${searchTerm}".`,
        };
      }

      if (members.length > 1) {
        const memberList = members.map((m: any) => m.name).join(', ');
        return {
          type: 'family_delete',
          success: false,
          message: `Multiple family members found matching "${searchTerm}": ${memberList}. Please be more specific.`,
          data: { members },
        };
      }

      const member = members[0];
      const { error: deleteError } = await supabase
        .from('family_members')
        .delete()
        .eq('id', (member as any).id);

      if (deleteError) throw deleteError;

      return {
        type: 'family_delete',
        success: true,
        message: `✅ Removed ${(member as any).name} from your family list.`,
        data: { member },
      };
    } catch (error) {
      console.error('❌ Family delete error:', error);
      return {
        type: 'family_delete',
        success: false,
        message: `Failed to remove family member: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /** Chat - Handle general conversation */
  /** Get comprehensive schedule for a specific date */
  private async getScheduleOverview(
    userId: UUID,
    date: string,
  ): Promise<{
    date: string;
    items: Array<{
      time: string;
      type: 'event' | 'task' | 'reminder';
      title: string;
      details: string;
      priority?: string;
      location?: string;
      assignedTo?: string;
    }>;
  }> {
    console.log('📅 Getting schedule overview for:', date);

    try {
      // Fetch all data for the specified date in parallel
      const [eventsResult, tasksResult, remindersResult] = await Promise.all([
        // Events for this date
        supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .eq('event_date', date)
          .order('start_time', { ascending: true }),

        // Tasks due on this date
        supabase
          .from('tasks')
          .select(`
            *,
            assigned_family_member:family_members(name)
          `)
          .eq('user_id', userId)
          .eq('due_date', date)
          .neq('status', 'completed')
          .order('due_time', { ascending: true }),

        // Reminders for this date
        supabase
          .from('reminders')
          .select(`
            *,
            family_member:family_members(name)
          `)
          .eq('user_id', userId)
          .eq('reminder_date', date)
          .eq('completed', false)
          .order('reminder_time', { ascending: true }),
      ]);

      const events = eventsResult.data || [];
      const tasks = tasksResult.data || [];
      const reminders = remindersResult.data || [];

      // Combine all items with their times
      const allItems: Array<{
        time: string;
        sortTime: string;
        type: 'event' | 'task' | 'reminder';
        title: string;
        details: string;
        priority?: string;
        location?: string;
        assignedTo?: string;
      }> = [];

      // Add events
      events.forEach((event: any) => {
        const time = event.start_time || '00:00:00';
        const timeDisplay = formatTimeForDisplay(time);
        let details = '';
        if (event.location) details += `📍 ${event.location}`;
        if (event.participants && event.participants.length > 0) {
          if (details) details += ' • ';
          details += `👥 ${event.participants.join(', ')}`;
        }

        allItems.push({
          time: timeDisplay,
          sortTime: time,
          type: 'event',
          title: event.title,
          details,
          location: event.location,
        });
      });

      // Add tasks
      tasks.forEach((task: any) => {
        const time = task.due_time || '23:59:00';
        const timeDisplay = task.due_time ? formatTimeForDisplay(task.due_time) : 'All day';
        let details = task.category ? `📁 ${task.category}` : '';
        if (task.assigned_family_member?.name) {
          if (details) details += ' • ';
          details += `👤 ${task.assigned_family_member.name}`;
        }

        allItems.push({
          time: timeDisplay,
          sortTime: time,
          type: 'task',
          title: task.title,
          details,
          priority: task.priority,
          assignedTo: task.assigned_family_member?.name,
        });
      });

      // Add reminders
      reminders.forEach((reminder: any) => {
        const time = reminder.reminder_time || '23:59:00';
        const timeDisplay = reminder.reminder_time ? formatTimeForDisplay(reminder.reminder_time) : 'All day';
        let details = '';
        if (reminder.family_member?.name) {
          details = `👤 ${reminder.family_member.name}`;
        }

        allItems.push({
          time: timeDisplay,
          sortTime: time,
          type: 'reminder',
          title: reminder.title,
          details,
          priority: reminder.priority,
          assignedTo: reminder.family_member?.name,
        });
      });

      // Sort by time
      allItems.sort((a, b) => a.sortTime.localeCompare(b.sortTime));

      return {
        date,
        items: allItems,
      };
    } catch (error) {
      console.error('❌ Error getting schedule overview:', error);
      return {
        date,
        items: [],
      };
    }
  }

  /** Format schedule overview as natural language */
  private formatScheduleOverview(schedule: {
    date: string;
    items: Array<{
      time: string;
      type: 'event' | 'task' | 'reminder';
      title: string;
      details: string;
      priority?: string;
      assignedTo?: string;
    }>;
  }): string {
    if (schedule.items.length === 0) {
      return `You have nothing scheduled for ${schedule.date}. Your day is clear! 🎉`;
    }

    const dateObj = new Date(schedule.date + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    let message = `📅 Here's your schedule for ${dateFormatted}:\n\n`;

    schedule.items.forEach((item, index) => {
      const icon = item.type === 'event' ? '📅' : item.type === 'task' ? '✓' : '🔔';
      const priorityTag = item.priority === 'high' ? ' 🔥' : item.priority === 'medium' ? ' ⚠️' : '';
      
      message += `${icon} ${item.time} - ${item.title}${priorityTag}\n`;
      if (item.details) {
        message += `   ${item.details}\n`;
      }
      
      // Add spacing between items except the last one
      if (index < schedule.items.length - 1) {
        message += '\n';
      }
    });

    // Add summary
    const eventCount = schedule.items.filter(i => i.type === 'event').length;
    const taskCount = schedule.items.filter(i => i.type === 'task').length;
    const reminderCount = schedule.items.filter(i => i.type === 'reminder').length;

    message += `\n\n📊 Total: ${eventCount} event${eventCount !== 1 ? 's' : ''}, ${taskCount} task${taskCount !== 1 ? 's' : ''}, ${reminderCount} reminder${reminderCount !== 1 ? 's' : ''}`;

    return message;
  }

  /** Get shopping list summary */
  private async getShoppingListSummary(userId: UUID, filterCompleted: boolean = false): Promise<string> {
    try {
      let query = supabase
        .from('shopping_lists')
        .select(`
          *,
          assigned_family_member:family_members(name)
        `)
        .eq('user_id', userId)
        .order('urgent', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterCompleted) {
        query = query.eq('completed', false);
      }

      const { data: items, error } = await query;

      if (error) throw error;

      if (!items || items.length === 0) {
        return '🛒 Your shopping list is empty!';
      }

      const pendingItems = items.filter((item: any) => !item.completed);
      const completedItems = items.filter((item: any) => item.completed);

      let message = `🛒 Shopping List (${pendingItems.length} pending):\n\n`;

      // Group by category
      const categories: Record<string, any[]> = {};
      pendingItems.forEach((item: any) => {
        const category = item.category || 'other';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(item);
      });

      // Display by category
      Object.keys(categories).forEach((category) => {
        message += `📁 ${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
        categories[category].forEach((item: any) => {
          const urgentTag = item.urgent ? ' 🔥' : '';
          const assignedTag = item.assigned_family_member?.name ? ` (${item.assigned_family_member.name})` : '';
          const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
          message += `  • ${item.item}${qty}${urgentTag}${assignedTag}\n`;
        });
        message += '\n';
      });

      if (completedItems.length > 0) {
        message += `✅ ${completedItems.length} item${completedItems.length !== 1 ? 's' : ''} completed`;
      }

      return message;
    } catch (error) {
      console.error('❌ Error getting shopping list:', error);
      return '❌ Failed to load shopping list.';
    }
  }

  /** Get reminders summary for today */
  private async getRemindersSummary(userId: UUID, date: string): Promise<string> {
    try {
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select(`
          *,
          family_member:family_members(name)
        `)
        .eq('user_id', userId)
        .eq('reminder_date', date)
        .eq('completed', false)
        .order('reminder_time', { ascending: true });

      if (error) throw error;

      if (!reminders || reminders.length === 0) {
        return `🔔 No reminders for ${date}`;
      }

      let message = `🔔 Reminders for ${date}:\n\n`;

      reminders.forEach((reminder: any) => {
        const time = reminder.reminder_time ? formatTimeForDisplay(reminder.reminder_time) : 'All day';
        const forWhom = reminder.family_member?.name ? ` for ${reminder.family_member.name}` : '';
        const priorityTag = reminder.priority === 'high' ? ' 🔥' : '';
        
        message += `  ${time} - ${reminder.title}${forWhom}${priorityTag}\n`;
      });

      return message;
    } catch (error) {
      console.error('❌ Error getting reminders:', error);
      return '❌ Failed to load reminders.';
    }
  }

  private async handleChatAction(
    details: Record<string, unknown>,
    originalMessage: string,
    userId: UUID,
    calendarContext?: any,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<AIAction> {
    console.log('💬 Handling chat message:', originalMessage);
    console.log(
      '💬 Conversation history length:',
      conversationHistory?.length || 0,
    );

    try {
      const contextInfo = calendarContext
        ? `\n\nCurrent Calendar Context:\n${calendarContext.summary}`
        : '';

      // Check if this is a schedule overview request
      const lowerQuery = originalMessage.toLowerCase();
      const isScheduleQuery = 
        /what('s| is) (on )?my schedule/i.test(lowerQuery) ||
        /show (me )?my schedule/i.test(lowerQuery) ||
        /what do i have/i.test(lowerQuery) ||
        /what('s| is) coming up/i.test(lowerQuery);

      if (isScheduleQuery) {
        // Determine which date to show
        let targetDate: string | null = null;
        const today = getLocalISODate(new Date());
        const tomorrow = getLocalISODate((() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return d;
        })());

        if (/today/i.test(lowerQuery)) {
          targetDate = today;
        } else if (/tomorrow/i.test(lowerQuery)) {
          targetDate = tomorrow;
        } else if (/this week/i.test(lowerQuery)) {
          // Show today's schedule for "this week" queries
          targetDate = today;
        } else {
          // Try to extract a date from the query
          const dateMatch = lowerQuery.match(
            /(?:on |for )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2})/i
          );
          if (dateMatch) {
            targetDate = toISODate(dateMatch[1]);
          } else {
            // Default to today
            targetDate = today;
          }
        }

        if (targetDate) {
          const schedule = await this.getScheduleOverview(userId, targetDate);
          const formattedSchedule = this.formatScheduleOverview(schedule);

          return {
            type: 'chat',
            success: true,
            message: formattedSchedule,
            data: { schedule, query: originalMessage },
          };
        }
      }

      // Check if this is a shopping list query
      if (/show (me )?(my )?shopping( list)?/i.test(lowerQuery) || 
          /what('s| is) on (my )?shopping( list)?/i.test(lowerQuery)) {
        const summary = await this.getShoppingListSummary(userId, true);
        return {
          type: 'chat',
          success: true,
          message: summary,
          data: { query: originalMessage },
        };
      }

      // Check if this is a reminders query
      if (/show (me )?(my )?reminders( for)? today/i.test(lowerQuery) ||
          /what reminders (do i have )?today/i.test(lowerQuery)) {
        const today = getLocalISODate(new Date());
        const summary = await this.getRemindersSummary(userId, today);
        return {
          type: 'chat',
          success: true,
          message: summary,
          data: { query: originalMessage },
        };
      }

      const messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }> = [
        {
          role: 'system',
          content: `You are Sara, a helpful AI assistant for busy parents. You help with family scheduling, task management, shopping lists, family member management, reminders, and general parenting advice.${contextInfo}

Keep responses concise, practical, and empathetic. Always consider the busy lifestyle of parents and provide actionable suggestions. Use a warm, supportive tone.

You have full access to the user's calendar, tasks, shopping list, and family members. You can:

CALENDAR:
- Answer questions about their schedule ("What's on my calendar today?", "What's my schedule?", "What do I have coming up?")
- Check availability ("Am I free tomorrow afternoon?")
- Find specific events ("When is my dentist appointment?")
- Create new events ("Schedule a meeting tomorrow at 2pm")
- Update existing events ("Move my dentist appointment to next week")
- Delete events ("Cancel my meeting tomorrow")
- Share events with family members ("Share the dentist appointment with Emma")

TASKS:
- View all tasks or filter by status ("What tasks do I have?", "Show pending tasks")
- Create new tasks for family members ("Create a task for Sarah to clean her room", "Assign John to do his homework")
- Update task details ("Change homework task priority to high")
- Mark tasks as complete ("Mark the homework task as done")
- Delete tasks ("Delete the grocery shopping task")

SHOPPING LIST:
- View shopping list ("What's on my shopping list?", "Show me pending items")
- Add items to shopping list ("Add milk to the shopping list", "Add 2 loaves of bread")
- Assign items to family members ("Remind Cody to get bread", "Tell Emma to pick up milk")
- Mark items as purchased ("Mark milk as bought")
- Update item quantities ("Change milk quantity to 2")
- Remove items ("Remove bread from shopping list", "Delete milk from list")

FAMILY MEMBERS:
- View family members ("Who's in my family?", "List all family members")
- Add family members ("Add my daughter Emma age 8", "Add my son Jack")
- Update family info ("Update Emma's age to 9", "Set Emma's school to Lincoln Elementary")
- Remove family members ("Remove Jack from family list")

OTHER:
- Set reminders for yourself or family members ("remind me to call mom tomorrow at 3pm", "Remind Jack to do his homework tonight at 5pm", "Tell Emma to practice piano tomorrow")
- Share reminders with family members ("Share the dentist reminder with Emma", "Send the homework reminder to Jack")

When answering questions, reference the calendar, task, shopping, and family context when relevant. If the user mentions planning something, check for conflicts proactively.

IMPORTANT: Maintain conversation context. If the user refers to previous topics, tasks, people, or items mentioned earlier in the conversation, remember and reference them appropriately.`,
        },
      ];

      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        messages.push(...recentHistory);
      }

      messages.push({
        role: 'user',
        content: originalMessage,
      });

      const response = await openaiService.chat(messages);

      return {
        type: 'chat',
        success: true,
        message: response,
        data: { query: originalMessage },
      };
    } catch (error) {
      console.error('❌ Chat response error:', error);
      return {
        type: 'chat',
        success: true,
        message:
          "I'm here to help! You can ask me about your schedule, add items to your shopping list, set reminders, schedule events, or create tasks. What would you like to do?",
        data: { query: originalMessage },
      };
    }
  }
}

export const aiAssistantService = new AIAssistantService();
