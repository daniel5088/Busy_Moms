import { ContactCategory, categorizeContact } from './contactCategorizer';

export interface ParsedContactData {
  name: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  confidence: number;
}

export interface ValidatedContactData {
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  notes: string;
  category: ContactCategory;
  isValid: boolean;
  warnings: string[];
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function parseAndValidateContact(data: ParsedContactData): ValidatedContactData {
  const warnings: string[] = [];
  let isValid = true;

  if (!data.name || data.name.trim().length === 0) {
    isValid = false;
    warnings.push('No name detected on business card');
  }

  let validatedEmail: string | null = null;
  if (data.email) {
    if (validateEmail(data.email)) {
      validatedEmail = data.email.trim().toLowerCase();
    } else {
      warnings.push('Email format appears invalid');
    }
  }

  let validatedPhone: string | null = null;
  if (data.phone) {
    if (validatePhoneNumber(data.phone)) {
      validatedPhone = formatPhoneNumber(data.phone);
    } else {
      warnings.push('Phone number format appears invalid');
    }
  }

  if (!validatedEmail && !validatedPhone) {
    isValid = false;
    warnings.push('At least one contact method (phone or email) is required');
  }

  const role = data.jobTitle || 'Contact';

  const noteParts: string[] = [];
  if (data.company) {
    noteParts.push(`Company: ${data.company}`);
  }
  if (data.address) {
    noteParts.push(`Address: ${data.address}`);
  }
  if (data.website) {
    noteParts.push(`Website: ${data.website}`);
  }
  if (data.confidence < 70) {
    noteParts.push(`Note: OCR confidence was ${data.confidence}% - please verify information`);
  }

  const notes = noteParts.join('\n');

  const category = categorizeContact(
    data.name,
    role,
    notes,
    data.company
  );

  return {
    name: data.name?.trim() || 'Unknown',
    role,
    phone: validatedPhone,
    email: validatedEmail,
    notes,
    category,
    isValid,
    warnings,
  };
}

export function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.85
): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL(file.type, quality).split(',')[1];

        resolve({
          base64,
          type: file.type,
        });
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
