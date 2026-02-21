import { supabase } from '../lib/supabase';

interface ContactData {
  name: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  confidence: number;
}

interface ProcessImageResponse {
  contact: ContactData | null;
  rawText?: string;
  error?: string;
}

export function isImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
  return validTypes.includes(file.type.toLowerCase());
}

export function validateImageSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function invokeEdgeFunction(body: object): Promise<Response> {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return fetch('/functions/v1/business-card-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    });
  }

  // In production, use the Supabase SDK normally
  const { data, error } = await supabase.functions.invoke('business-card-ocr', { body });
  if (error) throw error;
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function processBusinessCard(file: File): Promise<ProcessImageResponse> {
  try {
    const base64Data = await fileToBase64(file);
    const imageType = file.type || 'image/jpeg';

    const response = await invokeEdgeFunction({
      action: 'process_image',
      image_data: base64Data,
      image_type: imageType,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { contact: null, error: errData?.error || `Server error: ${response.status}` };
    }

    const result: ProcessImageResponse = await response.json();
    return result;
  } catch (err) {
    console.error('Error processing business card:', err);
    return {
      contact: null,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

export async function pingBusinessCardService(): Promise<boolean> {
  try {
    const response = await invokeEdgeFunction({ action: 'ping' });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}