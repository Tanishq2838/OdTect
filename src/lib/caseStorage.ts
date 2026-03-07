import { CaseRecord } from './types';

const STORAGE_KEY = 'odtect_cases';

export function saveCaseToStorage(caseRecord: CaseRecord): void {
  const existingCases = getCasesFromStorage();
  existingCases.unshift(caseRecord);
  // Keep only the last 50 cases
  const trimmedCases = existingCases.slice(0, 50);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedCases));
}

export function getCasesFromStorage(): CaseRecord[] {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const parsed = JSON.parse(stored);
    return parsed.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      diagnosis: {
        ...c.diagnosis,
        timestamp: new Date(c.diagnosis.timestamp),
      },
    }));
  } catch {
    return [];
  }
}

export function getCaseById(id: string): CaseRecord | null {
  const cases = getCasesFromStorage();
  return cases.find(c => c.id === id) || null;
}

export function deleteCaseFromStorage(id: string): void {
  const cases = getCasesFromStorage();
  const filtered = cases.filter(c => c.id !== id);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
