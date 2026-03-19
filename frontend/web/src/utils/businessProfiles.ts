import type { BusinessProfile } from '../store/businessStore';

type MaybePaginatedProfiles =
  | BusinessProfile[]
  | {
      count?: number;
      next?: string | null;
      previous?: string | null;
      results?: BusinessProfile[];
    }
  | null
  | undefined;

export function extractBusinessProfiles(payload: MaybePaginatedProfiles): BusinessProfile[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
}
