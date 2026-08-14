const STORAGE_KEY = "clipai_draft";

export interface DraftData {
  projectId: string;
  videoPath: string;
  filename: string;
  clips: unknown[];
  drafts: unknown[];
  selectedTone: string;
  selectedVoice: string;
  outputMode: string;
  bgmMood: string;
  renderQuality: string;
  includeStt: boolean;
  sttResults: Record<string, unknown[]>;
  savedAt: number;
}

export function saveDraft(data: DraftData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or unavailable
  }
}

export function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftData;
    const age = Date.now() - data.savedAt;
    if (age > 24 * 60 * 60 * 1000) {
      clearDraft();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // unavailable
  }
}
