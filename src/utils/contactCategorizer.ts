export type ContactCategory = 'babysitter' | 'coach' | 'doctor' | 'tutor' | 'teacher' | 'other';

const CATEGORY_KEYWORDS: Record<ContactCategory, (string | RegExp)[]> = {
  babysitter: [
    'babysitter',
    'babysitting',
    'nanny',
    'childcare',
    'child care',
    'daycare',
    'day care',
    'au pair',
    'caregiver',
    'care giver',
  ],
  coach: [
    'coach',
    'coaching',
    'trainer',
    'training',
    'sports',
    'athletic',
    'fitness',
    'gym',
    'soccer',
    'basketball',
    'baseball',
    'football',
    'tennis',
    'swim',
    'dance',
    'martial arts',
    'karate',
    'yoga',
  ],
  doctor: [
    'doctor',
    /\bdr\.?\b/i,
    'physician',
    'pediatrician',
    'dentist',
    'dental',
    'orthodontist',
    'optometrist',
    'ophthalmologist',
    'dermatologist',
    'cardiologist',
    'neurologist',
    'psychiatrist',
    'psychologist',
    'therapist',
    'counselor',
    'hospital',
    'clinic',
    'medical',
    'medicine',
    'health',
    'healthcare',
    'nurse',
    'nursing',
    'pharmacy',
    'pharmacist',
  ],

  tutor: [
    'tutor',
    'tutoring',
    'academic',
    'homework',
    'study',
    'learning',
    'math tutor',
    'reading tutor',
    'science tutor',
    'english tutor',
    'language tutor',
    'music teacher',
    'piano teacher',
    'guitar teacher',
    'art teacher',
  ],
  teacher: [
    'teacher',
    'teaching',
    'educator',
    'education',
    'school',
    'principal',
    'professor',
    'instructor',
  ],
  other: [],
};

export function categorizeContact(
  name: string,
  role?: string,
  notes?: string,
  organizationName?: string
): ContactCategory {
  const textToAnalyze = [
    name.toLowerCase(),
    role?.toLowerCase() || '',
    notes?.toLowerCase() || '',
    organizationName?.toLowerCase() || '',
  ].join(' ');

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;

    for (const keyword of keywords) {
      if (keyword instanceof RegExp) {
        if (keyword.test(textToAnalyze)) {
          return category as ContactCategory;
        }
      } else {
        if (textToAnalyze.includes(keyword.toLowerCase())) {
          return category as ContactCategory;
        }
      }
    }
  }

  return 'other';
}

export function getCategoryFromGoogleContact(googleContact: any): ContactCategory {
  const name = googleContact.names?.[0]?.displayName || '';
  const organizations = googleContact.organizations || [];
  const organizationName = organizations[0]?.name || '';
  const organizationTitle = organizations[0]?.title || '';
  const biographies = googleContact.biographies || [];
  const biography = biographies[0]?.value || '';

  return categorizeContact(name, organizationTitle, biography, organizationName);
}
