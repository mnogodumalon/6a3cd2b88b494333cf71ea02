import type { ItAusstattungZugaenge, OnboardingCheckliste, OnboardingMassnahmen } from './app';

export type EnrichedItAusstattungZugaenge = ItAusstattungZugaenge & {
  mitarbeitenderName: string;
};

export type EnrichedOnboardingMassnahmen = OnboardingMassnahmen & {
  mitarbeitenderName: string;
};

export type EnrichedOnboardingCheckliste = OnboardingCheckliste & {
  mitarbeitenderName: string;
};
