import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Mitarbeitende, ItAusstattungZugaenge, OnboardingMassnahmen, OnboardingCheckliste } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [mitarbeitende, setMitarbeitende] = useState<Mitarbeitende[]>([]);
  const [itAusstattungZugaenge, setItAusstattungZugaenge] = useState<ItAusstattungZugaenge[]>([]);
  const [onboardingMassnahmen, setOnboardingMassnahmen] = useState<OnboardingMassnahmen[]>([]);
  const [onboardingCheckliste, setOnboardingCheckliste] = useState<OnboardingCheckliste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [mitarbeitendeData, itAusstattungZugaengeData, onboardingMassnahmenData, onboardingChecklisteData] = await Promise.all([
        LivingAppsService.getMitarbeitende(),
        LivingAppsService.getItAusstattungZugaenge(),
        LivingAppsService.getOnboardingMassnahmen(),
        LivingAppsService.getOnboardingCheckliste(),
      ]);
      setMitarbeitende(mitarbeitendeData);
      setItAusstattungZugaenge(itAusstattungZugaengeData);
      setOnboardingMassnahmen(onboardingMassnahmenData);
      setOnboardingCheckliste(onboardingChecklisteData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [mitarbeitendeData, itAusstattungZugaengeData, onboardingMassnahmenData, onboardingChecklisteData] = await Promise.all([
          LivingAppsService.getMitarbeitende(),
          LivingAppsService.getItAusstattungZugaenge(),
          LivingAppsService.getOnboardingMassnahmen(),
          LivingAppsService.getOnboardingCheckliste(),
        ]);
        setMitarbeitende(mitarbeitendeData);
        setItAusstattungZugaenge(itAusstattungZugaengeData);
        setOnboardingMassnahmen(onboardingMassnahmenData);
        setOnboardingCheckliste(onboardingChecklisteData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const mitarbeitendeMap = useMemo(() => {
    const m = new Map<string, Mitarbeitende>();
    mitarbeitende.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeitende]);

  return { mitarbeitende, setMitarbeitende, itAusstattungZugaenge, setItAusstattungZugaenge, onboardingMassnahmen, setOnboardingMassnahmen, onboardingCheckliste, setOnboardingCheckliste, loading, error, fetchAll, mitarbeitendeMap };
}