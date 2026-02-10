import { supabase } from '../lib/supabase';

export interface ExtractedReceiptInfo {
  content: string;
  where?: string;
  who?: string;
  when?: string;
  obligation?: string;
  ai_confidence?: number;
}

/**
 * Process receipt text via AI agent to extract structured information
 */
export async function extractReceiptFromText(
  text: string
): Promise<ExtractedReceiptInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('life-receipts-text-agent', {
      body: {
        action: 'process_text',
        text: text,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (data?.receipt) {
      return data.receipt;
    }

    return null;
  } catch (error) {
    console.error('Error processing receipt text:', error);
    throw error;
  }
}

/**
 * Process receipt image (base64) via AI agent to extract text and structured information
 * @param imageBase64 - Base64 encoded image data (without data URI prefix)
 * @param mimeType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
 */
export async function processReceiptImage(
  imageBase64: string,
  mimeType: string
): Promise<ExtractedReceiptInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('life-receipts-image-agent', {
      body: {
        action: 'process_image',
        image_data: imageBase64,
        image_type: mimeType,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (data?.receipt) {
      return data.receipt;
    }

    return null;
  } catch (error) {
    console.error('Error processing receipt image:', error);
    throw error;
  }
}

/**
 * Process receipt audio (base64) via AI agent to transcribe and extract structured information
 * @param audioBase64 - Base64 encoded audio data (without data URI prefix)
 * @param mimeType - MIME type of the audio (e.g., 'audio/m4a', 'audio/wav')
 */
export async function processReceiptAudio(
  audioBase64: string,
  mimeType: string
): Promise<ExtractedReceiptInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('life-receipts-audio-agent', {
      body: {
        action: 'process_audio',
        audio_data: audioBase64,
        audio_type: mimeType,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (data?.receipt) {
      return data.receipt;
    }

    return null;
  } catch (error) {
    console.error('Error processing receipt audio:', error);
    throw error;
  }
}
