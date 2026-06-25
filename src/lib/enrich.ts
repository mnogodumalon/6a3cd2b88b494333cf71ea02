import type { EnrichedItAusstattungZugaenge, EnrichedOnboardingCheckliste, EnrichedOnboardingMassnahmen } from '@/types/enriched';
import type { ItAusstattungZugaenge, Mitarbeitende, OnboardingCheckliste, OnboardingMassnahmen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface ItAusstattungZugaengeMaps {
  mitarbeitendeMap: Map<string, Mitarbeitende>;
}

export function enrichItAusstattungZugaenge(
  itAusstattungZugaenge: ItAusstattungZugaenge[],
  maps: ItAusstattungZugaengeMaps
): EnrichedItAusstattungZugaenge[] {
  return itAusstattungZugaenge.map(r => ({
    ...r,
    mitarbeitenderName: resolveDisplay(r.fields.mitarbeitender, maps.mitarbeitendeMap, 'vorname', 'nachname'),
  }));
}

interface OnboardingMassnahmenMaps {
  mitarbeitendeMap: Map<string, Mitarbeitende>;
}

export function enrichOnboardingMassnahmen(
  onboardingMassnahmen: OnboardingMassnahmen[],
  maps: OnboardingMassnahmenMaps
): EnrichedOnboardingMassnahmen[] {
  return onboardingMassnahmen.map(r => ({
    ...r,
    mitarbeitenderName: resolveDisplay(r.fields.mitarbeitender, maps.mitarbeitendeMap, 'vorname', 'nachname'),
  }));
}

interface OnboardingChecklisteMaps {
  mitarbeitendeMap: Map<string, Mitarbeitende>;
}

export function enrichOnboardingCheckliste(
  onboardingCheckliste: OnboardingCheckliste[],
  maps: OnboardingChecklisteMaps
): EnrichedOnboardingCheckliste[] {
  return onboardingCheckliste.map(r => ({
    ...r,
    mitarbeitenderName: resolveDisplay(r.fields.mitarbeitender, maps.mitarbeitendeMap, 'vorname', 'nachname'),
  }));
}
