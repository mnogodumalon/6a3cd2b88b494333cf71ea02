// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Mitarbeitende {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email_geschaeftlich?: string;
    telefon?: string;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    abteilung?: LookupValue;
    position?: string;
    vorgesetzte_vorname?: string;
    vorgesetzte_nachname?: string;
    arbeitsort?: LookupValue;
    vertragsart?: LookupValue;
  };
}

export interface ItAusstattungZugaenge {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeitender?: string; // applookup -> URL zu 'Mitarbeitende' Record
    laptop_modell?: string;
    betriebssystem?: LookupValue;
    zubehoer?: string;
    softwarelizenzen?: LookupValue[];
    email_konto_erstellt?: boolean;
    vpn_zugang_eingerichtet?: boolean;
    zugangsdaten_uebergeben?: boolean;
    notizen_it?: string;
  };
}

export interface OnboardingMassnahmen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeitender?: string; // applookup -> URL zu 'Mitarbeitende' Record
    bezeichnung?: string;
    typ?: LookupValue;
    datum_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    verantwortliche_vorname?: string;
    verantwortliche_nachname?: string;
    status_massnahme?: LookupValue;
    notizen_massnahme?: string;
  };
}

export interface OnboardingCheckliste {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitarbeitender?: string; // applookup -> URL zu 'Mitarbeitende' Record
    aufgabe_bezeichnung?: string;
    kategorie?: LookupValue;
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    verantwortliche_aufgabe_vorname?: string;
    verantwortliche_aufgabe_nachname?: string;
    erledigt?: boolean;
    anmerkungen?: string;
  };
}

export const APP_IDS = {
  MITARBEITENDE: '6a3cd29410af51d80bb8780e',
  IT_AUSSTATTUNG_ZUGAENGE: '6a3cd29b3c9b632af0e46c2b',
  ONBOARDING_MASSNAHMEN: '6a3cd29d345bd8a6cb09280e',
  ONBOARDING_CHECKLISTE: '6a3cd29d933c8e906414188a',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitarbeitende': {
    abteilung: [{ key: "entwicklung", label: "Entwicklung" }, { key: "design", label: "Design" }, { key: "projektmanagement", label: "Projektmanagement" }, { key: "vertrieb", label: "Vertrieb" }, { key: "marketing", label: "Marketing" }, { key: "hr_personal", label: "HR & Personal" }, { key: "finanzen_controlling", label: "Finanzen & Controlling" }, { key: "it_infrastruktur", label: "IT & Infrastruktur" }, { key: "geschaeftsfuehrung", label: "Geschäftsführung" }, { key: "sonstiges", label: "Sonstiges" }],
    arbeitsort: [{ key: "buero", label: "Büro" }, { key: "remote", label: "Remote" }, { key: "hybrid", label: "Hybrid" }],
    vertragsart: [{ key: "vollzeit", label: "Vollzeit" }, { key: "teilzeit", label: "Teilzeit" }, { key: "werkstudent", label: "Werkstudent/in" }, { key: "praktikum", label: "Praktikum" }, { key: "ausbildung", label: "Ausbildung" }, { key: "freiberuflich", label: "Freiberuflich" }],
  },
  'it_ausstattung_&_zugaenge': {
    betriebssystem: [{ key: "macos", label: "macOS" }, { key: "windows", label: "Windows" }, { key: "linux", label: "Linux" }],
    softwarelizenzen: [{ key: "microsoft_365", label: "Microsoft 365" }, { key: "slack", label: "Slack" }, { key: "jira", label: "Jira" }, { key: "confluence", label: "Confluence" }, { key: "github", label: "GitHub" }, { key: "gitlab", label: "GitLab" }, { key: "figma", label: "Figma" }, { key: "adobe_cc", label: "Adobe Creative Cloud" }, { key: "zoom", label: "Zoom" }, { key: "onepassword", label: "1Password" }, { key: "sonstiges_software", label: "Sonstiges" }],
  },
  'onboarding_maßnahmen': {
    typ: [{ key: "schulung", label: "Schulung" }, { key: "meeting", label: "Meeting" }, { key: "einfuehrungsgespraech", label: "Einführungsgespräch" }, { key: "teamvorstellung", label: "Teamvorstellung" }, { key: "sonstiges_massnahme", label: "Sonstiges" }],
    status_massnahme: [{ key: "geplant", label: "Geplant" }, { key: "durchgefuehrt", label: "Durchgeführt" }, { key: "abgesagt", label: "Abgesagt" }],
  },
  'onboarding_checkliste': {
    kategorie: [{ key: "hr", label: "HR & Personal" }, { key: "it", label: "IT & Infrastruktur" }, { key: "fuehrungskraft", label: "Führungskraft" }, { key: "team", label: "Team" }, { key: "sonstiges_kategorie", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitarbeitende': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email_geschaeftlich': 'string/email',
    'telefon': 'string/tel',
    'eintrittsdatum': 'date/date',
    'abteilung': 'lookup/select',
    'position': 'string/text',
    'vorgesetzte_vorname': 'string/text',
    'vorgesetzte_nachname': 'string/text',
    'arbeitsort': 'lookup/radio',
    'vertragsart': 'lookup/select',
  },
  'it_ausstattung_&_zugaenge': {
    'mitarbeitender': 'applookup/select',
    'laptop_modell': 'string/text',
    'betriebssystem': 'lookup/select',
    'zubehoer': 'string/textarea',
    'softwarelizenzen': 'multiplelookup/checkbox',
    'email_konto_erstellt': 'bool',
    'vpn_zugang_eingerichtet': 'bool',
    'zugangsdaten_uebergeben': 'bool',
    'notizen_it': 'string/textarea',
  },
  'onboarding_maßnahmen': {
    'mitarbeitender': 'applookup/select',
    'bezeichnung': 'string/text',
    'typ': 'lookup/select',
    'datum_uhrzeit': 'date/datetimeminute',
    'verantwortliche_vorname': 'string/text',
    'verantwortliche_nachname': 'string/text',
    'status_massnahme': 'lookup/radio',
    'notizen_massnahme': 'string/textarea',
  },
  'onboarding_checkliste': {
    'mitarbeitender': 'applookup/select',
    'aufgabe_bezeichnung': 'string/text',
    'kategorie': 'lookup/select',
    'faelligkeitsdatum': 'date/date',
    'verantwortliche_aufgabe_vorname': 'string/text',
    'verantwortliche_aufgabe_nachname': 'string/text',
    'erledigt': 'bool',
    'anmerkungen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitarbeitende = StripLookup<Mitarbeitende['fields']>;
export type CreateItAusstattungZugaenge = StripLookup<ItAusstattungZugaenge['fields']>;
export type CreateOnboardingMassnahmen = StripLookup<OnboardingMassnahmen['fields']>;
export type CreateOnboardingCheckliste = StripLookup<OnboardingCheckliste['fields']>;