

// src/lib/matchers.ts
import type { FieldKey } from "./types";
import { saladChatGemmaStream } from "./salad";

const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const onlyAlnum = (s: string) => s.replace(/[^a-z0-9]/gi, '');

const toText = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return ''; }
  }
  return '';
};

const isNA = (s: string) => /^(n\/?a|na|n\.a\.|not available)$/i.test(s.trim());

export const norm = (v?: unknown) => {
  const s = toText(v).trim();
  if (!s || isNA(s)) return '';
  return onlyAlnum(stripDiacritics(s.toLowerCase()));
};

const STOP = new Set(['the','of','and','board','education','intermediate','secondary','college','school','govt','government','gov','bd','bangladesh']);
function aliasNormalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/govt\.?/g, 'government')
    .replace(/\bdept\.?\b/g, 'department')
    .replace(/\buni(v|versity)?\.?\b/g, 'university')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(s: string) {
  return aliasNormalize(s)
    .split(' ')
    .filter(t => t && !STOP.has(t));
}
export function jaccard(a: string, b: string) {
  const A = new Set(tokens(a)); const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const t of A) if (B.has(t)) inter++;
  const uni = A.size + B.size - inter;
  return inter / uni;
}
export function similar(a?: string, b?: string, thr = 0.6) {
  if (!a || !b) return false;
  // atajos: igualdad exacta post-normalización o contenido
  const na = aliasNormalize(a), nb = aliasNormalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  return jaccard(a, b) >= thr;
}

function edit1(a:string,b:string){ /* Damerau/Levenshtein <=1 simple */ 
  if (a===b) return true;
  if (Math.abs(a.length-b.length)>1) return false;
  let i=0,j=0,ed=0;
  while(i<a.length && j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    ed++; if(ed>1) return false;
    if(a.length> b.length) i++; else if(b.length>a.length) j++; else {i++;j++;}
  }
  return ed <= 1 && i === a.length && j === b.length;
}
export function similarName(a?:string,b?:string){
  if(!a||!b) return false;
  if (similar(a,b,0.6)) return true;              // tu Jaccard actual
  const A=tokens(a), B=tokens(b);
  if (Math.abs(A.length - B.length) > 1) return false;
  let close=0; A.forEach(ta=>B.forEach(tb=>{ if(edit1(ta,tb)) close++; }));
  return close >= Math.min(A.length,B.length)-1;  // tolera 1 token con typo
}

export const TRANSCRIPT_ONLY_FIELDS: FieldKey[] = [
  'numberOfSubjects',
  'letterGrades',
  'gradePoints',
];

export const DISPLAY_LABEL: Record<FieldKey, string> = {
  degreeTitle: 'Degree Title',
  studentName: 'Student',
  parentsNames: 'Parents',
  institutionName: 'Institution',
  rollNumber: 'Roll Number',
  registrationNumber: 'Registration Number',
  discipline: 'Discipline',
  gpa: 'GPA',
  examYear: 'Exam Year',
  publicationDate: 'Publication Date',
  numberOfSubjects: 'Number of Subjects',
  letterGrades: 'Letter Grades',
  gradePoints: 'Grade Points',
};

export function compareFields(
  diploma: Partial<Record<FieldKey, unknown>>,
  transcript: Partial<Record<FieldKey, unknown>>,
  {
    strict = ['studentName','institutionName','examYear','discipline'] as FieldKey[],
    ignoreEmpty = true,
  } = {}
) {
  type Miss = { field: FieldKey; diploma?: string; transcript?: string; reason: string };
  const mismatches: Miss[] = [];

  const keys = Object.keys(DISPLAY_LABEL) as FieldKey[];
  for (const k of keys) {
    if (TRANSCRIPT_ONLY_FIELDS.includes(k)) continue;

    const aRaw = toText(diploma[k]);
    const bRaw = toText(transcript[k]);

    const na = norm(aRaw);
    const nb = norm(bRaw);

    const aEmpty = !na;
    const bEmpty = !nb;

    // If one is empty and the other is not, and the field is strict -> mismatch
    if (strict.includes(k) && aEmpty !== bEmpty) {
      mismatches.push({
        field: k,
        diploma: aRaw || '—',
        transcript: bRaw || '—',
        reason: aEmpty ? 'Missing from diploma' : 'Missing from transcript',
      });
      continue;
    }

    // If ignoring empty and either is missing -> skip (doesn't count as mismatch)
    if (ignoreEmpty && (aEmpty || bEmpty)) continue;

    // Special rules
    if (k === 'gpa') {
      const fa = parseFloat(aRaw.replace(',', '.'));
      const fb = parseFloat(bRaw.replace(',', '.'));
      if (Number.isFinite(fa) && Number.isFinite(fb) && Math.abs(fa - fb) > 0.15) {
        mismatches.push({ field: k, diploma: aRaw, transcript: bRaw, reason: 'Significant GPA difference' });
      }
      continue;
    }

    if (k === 'publicationDate') {
      if (na && nb && na !== nb) {
        mismatches.push({ field: k, diploma: aRaw, transcript: bRaw, reason: 'Different dates' });
      }
      continue;
    }
    
    if (k === 'studentName') {
        if (!similarName(aRaw, bRaw)) {
             mismatches.push({ field: k, diploma: aRaw, transcript: bRaw, reason: 'Names do not match' });
        }
        continue;
    }
    
    // Default comparison (normalized)
    if (na && nb && !similar(aRaw, bRaw)) {
      mismatches.push({ field: k, diploma: aRaw, transcript: bRaw, reason: 'Different values' });
    }
  }

  return mismatches;
}

const guidedProbePrompt = (fieldName: string, diplomaValue: string, studentName: string) => `
You are an expert OCR assistant. The user wants to find the value for the field "${fieldName}" in a transcript document.
You are given a target value from the diploma: "${diplomaValue}".
The student's name is "${studentName}" which can be used as an anchor point.

Find a value on the transcript that is a plausible match for "${diplomaValue}".
- Return JSON with this EXACT schema:
  {
    "suggested": "string | null", // the value you found on the transcript
    "confidence": "number between 0.0 and 1.0",
    "reason": "string, short explanation of your choice and location"
  }
- If you find a good match, return it with high confidence.
- If you find something that could be a match but is ambiguous, return it with medium confidence.
- If you are certain there is NO plausible match, return null for "suggested" and a confidence of 0.
- Do not invent values. Your suggestion must be visible on the image.
`;


export async function guidedProbeTranscript(
    transcriptImageUri: string,
    fieldName: string,
    diplomaValue: string,
    studentName: string
  ): Promise<{ suggested: string | null; confidence: number; reason: string } | null> {
    const prompt = guidedProbePrompt(fieldName, diplomaValue, studentName);
    const parts = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: transcriptImageUri } },
    ];
  
    try {
      const responseText = await saladChatGemmaStream(parts, {
        temperature: 0.1,
        max_output_tokens: 500,
      });
  
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      const result = JSON.parse(jsonString);
  
      if (
        result &&
        typeof result.suggested !== 'undefined' &&
        typeof result.confidence === 'number' &&
        typeof result.reason === 'string'
      ) {
        return result;
      }
      return null;
    } catch (error) {
      console.error(`Error during guided probe for ${fieldName}:`, error);
      return null;
    }
  }





