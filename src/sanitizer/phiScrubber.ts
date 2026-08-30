export interface ScrubResult {
  rawText: string;
  cleanText: string;
  detectedPhiCount: number;
  residualPhiCount: number;
  rawHash: string;
  cleanHash: string;
}

const PHI_PATTERNS = [
  // Names prefixed by titles or labels
  { 
    name: 'NAME_LABEL', 
    regex: /\b(?:Patient|Name|Pt\.?|Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, 
    replacement: 'Patient [REDACTED_NAME]' 
  },
  // Social Security Numbers
  { 
    name: 'SSN', 
    regex: /\b\d{3}-\d{2}-\d{4}\b/g, 
    replacement: '[REDACTED_SSN]' 
  },
  // Phone numbers (7-digit local, 10-digit, labeled 'Phone: ...', standard US/Intl)
  { 
    name: 'PHONE_LABELED',
    regex: /\b(?:Phone|Tel|Cell|Mobile|Fax)[:#]?\s*(\+?\d[\d\s().-]{6,14}\d)\b/gi,
    replacement: 'Phone: [REDACTED_PHONE]'
  },
  { 
    name: 'PHONE_STANDALONE', 
    regex: /\b(?:\+?1[-. ]?)?(?:\(?\d{3}\)?[-. ]?)?\d{3}[-. ]\d{4}\b/g, 
    replacement: '[REDACTED_PHONE]' 
  },
  // Email Addresses
  { 
    name: 'EMAIL', 
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, 
    replacement: '[REDACTED_EMAIL]' 
  },
  // Dates of Birth & Calendar Dates
  { 
    name: 'DATE_LABELED',
    regex: /\b(?:DOB|Date of Birth|Birthdate)[:#]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi,
    replacement: 'DOB: [REDACTED_DATE]'
  },
  { 
    name: 'DATE', 
    regex: /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi, 
    replacement: '[REDACTED_DATE]' 
  },
  // Medical Record Numbers & IDs
  { 
    name: 'MRN', 
    regex: /\b(?:MRN|ID|Patient ID)[:#]?\s*\d{6,10}\b/gi, 
    replacement: '[REDACTED_ID]' 
  }
];

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function scrubMedicalPrompt(rawText: string): Promise<ScrubResult> {
  let cleanText = rawText;
  let detectedPhiCount = 0;

  for (const pattern of PHI_PATTERNS) {
    const matches = cleanText.match(pattern.regex);
    if (matches) {
      detectedPhiCount += matches.length;
      cleanText = cleanText.replace(pattern.regex, pattern.replacement);
    }
  }

  // Verification pass: check for lingering un-redacted patterns
  let residualPhiCount = 0;
  const residualCheckList = [
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b(?:\+?1[-. ]?)?(?:\(?\d{3}\)?[-. ]?)?\d{3}[-. ]\d{4}\b/g,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g
  ];

  for (const regex of residualCheckList) {
    const remaining = cleanText.match(regex);
    if (remaining) {
      residualPhiCount += remaining.length;
    }
  }

  const rawHash = await sha256(rawText);
  const cleanHash = await sha256(cleanText);

  return {
    rawText,
    cleanText,
    detectedPhiCount,
    residualPhiCount,
    rawHash,
    cleanHash
  };
}
