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
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function processBusinessCard(file: File): Promise<ProcessImageResponse> {
  try {
    const base64Data = await fileToBase64(file);
    const imageType = file.type || 'image/jpeg';

    const { data, error } = await supabase.functions.invoke('business-card-ocr', {
      body: {
        action: 'process_image',
        image_data: base64Data,
        image_type: imageType,
      },
    });

    if (error) {
      console.error('Supabase function error:', error);
      return { contact: null, error: error.message || 'Failed to process image' };
    }

    return data as ProcessImageResponse;
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
    const { data, error } = await supabase.functions.invoke('business-card-ocr', {
      body: { action: 'ping' },
    });
    if (error) return false;
    return data?.ok === true;
  } catch {
    return false;
  }
}