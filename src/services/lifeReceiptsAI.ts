import { supabase } from '../lib/supabase';

export interface ExtractedReceiptInfo {
  content: string;
  where?: string;
  who?: string;
  when?: string;
  obligation?: string;
}

export async function processReceiptImage(file: File): Promise<ExtractedReceiptInfo | null> {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const { data, error } = await supabase.functions.invoke('life-receipts-image-agent', {
      body: {
        action: 'process_image',
        image_data: base64Data,
        image_type: file.type,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (data.receipt) {
      return data.receipt;
    }

    return null;
  } catch (error) {
    console.error('Error processing receipt image:', error);
    throw error;
  }
}
