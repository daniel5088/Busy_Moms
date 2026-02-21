import { supabase } from '../lib/supabase';
import { compressImage, ParsedContactData } from '../utils/contactDataParser';

interface OCRResponse {
  contact: ParsedContactData | null;
  rawText?: string;
}

export async function processBusinessCard(
  imageFile: File
): Promise<{ contact: ParsedContactData | null; rawText?: string; error?: string }> {
  try {
    const { base64, type } = await compressImage(imageFile);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/business-card-ocr`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          action: 'process_image',
          image_data: base64,
          image_type: type,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process business card');
    }

    const result: OCRResponse = await response.json();

    return {
      contact: result.contact,
      rawText: result.rawText,
    };
  } catch (error) {
    console.error('Error processing business card:', error);
    return {
      contact: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function isImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
  return validTypes.includes(file.type.toLowerCase());
}

export function validateImageSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
