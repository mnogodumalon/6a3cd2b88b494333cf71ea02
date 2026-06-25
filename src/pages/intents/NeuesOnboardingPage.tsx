import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconX,
  IconUserPlus,
  IconDeviceLaptop,
  IconListCheck,
  IconClipboardList,
  IconCircleCheck,
} from '@tabler/icons-react';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';

// --- Lookup options from schema ---
const ABTEILUNG_OPTIONS = LOOKUP_OPTIONS['mitarbeitende']['abteilung'];
const ARBEITSORT_OPTIONS = LOOKUP_OPTIONS['mitarbeitende']['arbeitsort'];
const VERTRAGSART_OPTIONS = LOOKUP_OPTIONS['mitarbeitende']['vertragsart'];
const BETRIEBSSYSTEM_OPTIONS = LOOKUP_OPTIONS['it_ausstattung_&_zugaenge']['betriebssystem'];
const SOFTWARELIZENZEN_OPTIONS = LOOKUP_OPTIONS['it_ausstattung_&_zugaenge']['softwarelizenzen'];
const MASSNAHME_TYP_OPTIONS = LOOKUP_OPTIONS['onboarding_maßnahmen']['typ'];
const STATUS_MASSNAHME_OPTIONS = LOOKUP_OPTIONS['onboarding_maßnahmen']['status_massnahme'];
const KATEGORIE_OPTIONS = LOOKUP_OPTIONS['onboarding_checkliste']['kategorie'];

const WIZARD_STEPS = [
  { label: 'Mitarbeitende/r' },
  { label: 'IT-Ausstattung' },
  { label: 'Maßnahmen' },
  { label: 'Checkliste' },
  { label: 'Zusammenfassung' },
];

// --- Step 1 State ---
interface Step1Fields {
  vorname: string;
  nachname: string;
  email_geschaeftlich: string;
  telefon: string;
  eintrittsdatum: string;
  abteilung: string;
  position: string;
  vorgesetzte_vorname: string;
  vorgesetzte_nachname: string;
  arbeitsort: string;
  vertragsart: string;
}

// --- Step 2 State ---
interface Step2Fields {
  laptop_modell: string;
  betriebssystem: string;
  zubehoer: string;
  softwarelizenzen: Set<string>;
  email_konto_erstellt: boolean;
  vpn_zugang_eingerichtet: boolean;
  zugangsdaten_uebergeben: boolean;
  notizen_it: string;
}

// --- Step 3 State ---
interface Massnahme {
  bezeichnung: string;
  typ: string;
  datum_uhrzeit: string;
  verantwortliche_vorname: string;
  verantwortliche_nachname: string;
  notizen_massnahme: string;
}

// --- Step 4 State ---
interface ChecklistenAufgabe {
  aufgabe_bezeichnung: string;
  kategorie: string;
  faelligkeitsdatum: string;
  verantwortliche_aufgabe_vorname: string;
  verantwortliche_aufgabe_nachname: string;
  anmerkungen: string;
}

// --- Shared UI helpers ---
function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="">{placeholder ?? 'Bitte wählen …'}</option>
      {options.map(o => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-colors ${
        checked
          ? 'bg-primary/10 border-primary/30 text-foreground'
          : 'bg-background border-input text-muted-foreground'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'bg-primary border-primary' : 'border-muted-foreground'
      }`}>
        {checked && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function NeuesOnboardingPage() {
  const [searchParams] = useSearchParams();

  // --- Wizard state ---
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Completed data
  const [newMitarbeitenderId, setNewMitarbeitenderId] = useState<string | null>(null);
  const [savedStep1, setSavedStep1] = useState<Step1Fields | null>(null);
  const [massnahmen, setMassnahmen] = useState<Massnahme[]>([]);
  const [aufgaben, setAufgaben] = useState<ChecklistenAufgabe[]>([]);

  // --- Step 1 form state ---
  const [s1, setS1] = useState<Step1Fields>({
    vorname: '',
    nachname: '',
    email_geschaeftlich: '',
    telefon: '',
    eintrittsdatum: '',
    abteilung: ABTEILUNG_OPTIONS[0]?.key ?? '',
    position: '',
    vorgesetzte_vorname: '',
    vorgesetzte_nachname: '',
    arbeitsort: ARBEITSORT_OPTIONS[0]?.key ?? '',
    vertragsart: VERTRAGSART_OPTIONS[0]?.key ?? '',
  });

  // --- Step 2 form state ---
  const [s2, setS2] = useState<Step2Fields>({
    laptop_modell: '',
    betriebssystem: BETRIEBSSYSTEM_OPTIONS[0]?.key ?? '',
    zubehoer: '',
    softwarelizenzen: new Set<string>(),
    email_konto_erstellt: false,
    vpn_zugang_eingerichtet: false,
    zugangsdaten_uebergeben: false,
    notizen_it: '',
  });

  // --- Step 3 form state (current measure being edited) ---
  const [currentMassnahme, setCurrentMassnahme] = useState<Massnahme>({
    bezeichnung: '',
    typ: MASSNAHME_TYP_OPTIONS[0]?.key ?? '',
    datum_uhrzeit: '',
    verantwortliche_vorname: '',
    verantwortliche_nachname: '',
    notizen_massnahme: '',
  });

  // --- Step 4 form state (current task being edited) ---
  const [currentAufgabe, setCurrentAufgabe] = useState<ChecklistenAufgabe>({
    aufgabe_bezeichnung: '',
    kategorie: KATEGORIE_OPTIONS[0]?.key ?? '',
    faelligkeitsdatum: '',
    verantwortliche_aufgabe_vorname: '',
    verantwortliche_aufgabe_nachname: '',
    anmerkungen: '',
  });

  // --- Deep-linking: read URL params on mount ---
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    const urlMitarbeitenderId = searchParams.get('mitarbeitenderId');

    if (urlMitarbeitenderId) {
      setNewMitarbeitenderId(urlMitarbeitenderId);
      if (urlStep >= 2 && urlStep <= 5) {
        setCurrentStep(urlStep);
      } else {
        setCurrentStep(2);
      }
    } else if (urlStep >= 1 && urlStep <= 5) {
      setCurrentStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers ---

  // Step 1: Create Mitarbeitende
  const handleStep1Submit = async () => {
    if (!s1.vorname.trim() || !s1.nachname.trim()) {
      setSubmitError('Vorname und Nachname sind Pflichtfelder.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fields: Record<string, unknown> = {
        vorname: s1.vorname,
        nachname: s1.nachname,
      };
      if (s1.email_geschaeftlich) fields.email_geschaeftlich = s1.email_geschaeftlich;
      if (s1.telefon) fields.telefon = s1.telefon;
      if (s1.eintrittsdatum) fields.eintrittsdatum = s1.eintrittsdatum;
      if (s1.abteilung) fields.abteilung = s1.abteilung;
      if (s1.position) fields.position = s1.position;
      if (s1.vorgesetzte_vorname) fields.vorgesetzte_vorname = s1.vorgesetzte_vorname;
      if (s1.vorgesetzte_nachname) fields.vorgesetzte_nachname = s1.vorgesetzte_nachname;
      if (s1.arbeitsort) fields.arbeitsort = s1.arbeitsort;
      if (s1.vertragsart) fields.vertragsart = s1.vertragsart;

      const response = await LivingAppsService.createMitarbeitendeEntry(fields as Parameters<typeof LivingAppsService.createMitarbeitendeEntry>[0]);

      // Extract record_id — API returns object keyed by record_id (24-char hex)
      let id: string | null = null;
      const responseObj = response as Record<string, unknown>;
      for (const key of Object.keys(responseObj)) {
        if (/^[a-f0-9]{24}$/i.test(key)) {
          id = key;
          break;
        }
      }
      if (!id) {
        // Fallback: check for record_id field in response
        const responseStr = JSON.stringify(response);
        const match = responseStr.match(/"([a-f0-9]{24})"/i);
        id = match ? match[1] : null;
      }
      if (!id) throw new Error('Kein Record-ID in der Antwort gefunden.');

      setNewMitarbeitenderId(id);
      setSavedStep1({ ...s1 });
      setCurrentStep(2);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Create IT-Ausstattung
  const handleStep2Submit = async () => {
    if (!newMitarbeitenderId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const softwareLizenzKeys = Array.from(s2.softwarelizenzen);
      const fields: Record<string, unknown> = {
        mitarbeitender: createRecordUrl(APP_IDS.MITARBEITENDE, newMitarbeitenderId),
        email_konto_erstellt: s2.email_konto_erstellt,
        vpn_zugang_eingerichtet: s2.vpn_zugang_eingerichtet,
        zugangsdaten_uebergeben: s2.zugangsdaten_uebergeben,
      };
      if (s2.laptop_modell) fields.laptop_modell = s2.laptop_modell;
      if (s2.betriebssystem) fields.betriebssystem = s2.betriebssystem;
      if (s2.zubehoer) fields.zubehoer = s2.zubehoer;
      if (softwareLizenzKeys.length > 0) fields.softwarelizenzen = softwareLizenzKeys;
      if (s2.notizen_it) fields.notizen_it = s2.notizen_it;

      await LivingAppsService.createItAusstattungZugaengeEntry(fields as Parameters<typeof LivingAppsService.createItAusstattungZugaengeEntry>[0]);
      setCurrentStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Add a measure to the list
  const handleAddMassnahme = () => {
    if (!currentMassnahme.bezeichnung.trim()) return;
    setMassnahmen(prev => [...prev, { ...currentMassnahme }]);
    setCurrentMassnahme({
      bezeichnung: '',
      typ: MASSNAHME_TYP_OPTIONS[0]?.key ?? '',
      datum_uhrzeit: '',
      verantwortliche_vorname: '',
      verantwortliche_nachname: '',
      notizen_massnahme: '',
    });
  };

  const handleRemoveMassnahme = (idx: number) => {
    setMassnahmen(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 3: Save all measures
  const handleStep3Submit = async () => {
    if (!newMitarbeitenderId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const defaultStatus = STATUS_MASSNAHME_OPTIONS[0]?.key ?? 'geplant';
      for (const m of massnahmen) {
        const fields: Record<string, unknown> = {
          mitarbeitender: createRecordUrl(APP_IDS.MITARBEITENDE, newMitarbeitenderId),
          bezeichnung: m.bezeichnung,
          status_massnahme: defaultStatus,
        };
        if (m.typ) fields.typ = m.typ;
        if (m.datum_uhrzeit) fields.datum_uhrzeit = m.datum_uhrzeit;
        if (m.verantwortliche_vorname) fields.verantwortliche_vorname = m.verantwortliche_vorname;
        if (m.verantwortliche_nachname) fields.verantwortliche_nachname = m.verantwortliche_nachname;
        if (m.notizen_massnahme) fields.notizen_massnahme = m.notizen_massnahme;
        await LivingAppsService.createOnboardingMassnahmenEntry(fields as Parameters<typeof LivingAppsService.createOnboardingMassnahmenEntry>[0]);
      }
      setCurrentStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4: Add a task to the list
  const handleAddAufgabe = () => {
    if (!currentAufgabe.aufgabe_bezeichnung.trim()) return;
    setAufgaben(prev => [...prev, { ...currentAufgabe }]);
    setCurrentAufgabe({
      aufgabe_bezeichnung: '',
      kategorie: KATEGORIE_OPTIONS[0]?.key ?? '',
      faelligkeitsdatum: '',
      verantwortliche_aufgabe_vorname: '',
      verantwortliche_aufgabe_nachname: '',
      anmerkungen: '',
    });
  };

  const handleRemoveAufgabe = (idx: number) => {
    setAufgaben(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 4: Save all tasks
  const handleStep4Submit = async () => {
    if (!newMitarbeitenderId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      for (const a of aufgaben) {
        const fields: Record<string, unknown> = {
          mitarbeitender: createRecordUrl(APP_IDS.MITARBEITENDE, newMitarbeitenderId),
          aufgabe_bezeichnung: a.aufgabe_bezeichnung,
          erledigt: false,
        };
        if (a.kategorie) fields.kategorie = a.kategorie;
        if (a.faelligkeitsdatum) fields.faelligkeitsdatum = a.faelligkeitsdatum;
        if (a.verantwortliche_aufgabe_vorname) fields.verantwortliche_aufgabe_vorname = a.verantwortliche_aufgabe_vorname;
        if (a.verantwortliche_aufgabe_nachname) fields.verantwortliche_aufgabe_nachname = a.verantwortliche_aufgabe_nachname;
        if (a.anmerkungen) fields.anmerkungen = a.anmerkungen;
        await LivingAppsService.createOnboardingChecklisteEntry(fields as Parameters<typeof LivingAppsService.createOnboardingChecklisteEntry>[0]);
      }
      setCurrentStep(5);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setCurrentStep(1);
    setNewMitarbeitenderId(null);
    setSavedStep1(null);
    setMassnahmen([]);
    setAufgaben([]);
    setS1({
      vorname: '',
      nachname: '',
      email_geschaeftlich: '',
      telefon: '',
      eintrittsdatum: '',
      abteilung: ABTEILUNG_OPTIONS[0]?.key ?? '',
      position: '',
      vorgesetzte_vorname: '',
      vorgesetzte_nachname: '',
      arbeitsort: ARBEITSORT_OPTIONS[0]?.key ?? '',
      vertragsart: VERTRAGSART_OPTIONS[0]?.key ?? '',
    });
    setS2({
      laptop_modell: '',
      betriebssystem: BETRIEBSSYSTEM_OPTIONS[0]?.key ?? '',
      zubehoer: '',
      softwarelizenzen: new Set<string>(),
      email_konto_erstellt: false,
      vpn_zugang_eingerichtet: false,
      zugangsdaten_uebergeben: false,
      notizen_it: '',
    });
    setCurrentMassnahme({
      bezeichnung: '',
      typ: MASSNAHME_TYP_OPTIONS[0]?.key ?? '',
      datum_uhrzeit: '',
      verantwortliche_vorname: '',
      verantwortliche_nachname: '',
      notizen_massnahme: '',
    });
    setCurrentAufgabe({
      aufgabe_bezeichnung: '',
      kategorie: KATEGORIE_OPTIONS[0]?.key ?? '',
      faelligkeitsdatum: '',
      verantwortliche_aufgabe_vorname: '',
      verantwortliche_aufgabe_nachname: '',
      anmerkungen: '',
    });
    setSubmitError(null);
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <IntentWizardShell
      title="Neues Onboarding starten"
      subtitle="Lege einen neuen Mitarbeitenden an und richte alles Schritt für Schritt ein."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      {/* ====================================================
          STEP 1 — Mitarbeitenden anlegen
      ==================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Live preview card */}
          {(s1.vorname || s1.nachname) && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <IconUserPlus size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Neuer Mitarbeitender</p>
                <p className="font-semibold text-foreground truncate">
                  {[s1.vorname, s1.nachname].filter(Boolean).join(' ') || '—'}
                </p>
                {s1.position && <p className="text-xs text-muted-foreground truncate">{s1.position}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Vorname" required>
              <Input value={s1.vorname} onChange={e => setS1(p => ({ ...p, vorname: e.target.value }))} placeholder="z.B. Maria" />
            </FormField>
            <FormField label="Nachname" required>
              <Input value={s1.nachname} onChange={e => setS1(p => ({ ...p, nachname: e.target.value }))} placeholder="z.B. Mustermann" />
            </FormField>
            <FormField label="Geschäftliche E-Mail">
              <Input type="email" value={s1.email_geschaeftlich} onChange={e => setS1(p => ({ ...p, email_geschaeftlich: e.target.value }))} placeholder="maria@firma.de" />
            </FormField>
            <FormField label="Telefon">
              <Input type="tel" value={s1.telefon} onChange={e => setS1(p => ({ ...p, telefon: e.target.value }))} placeholder="+49 ..." />
            </FormField>
            <FormField label="Eintrittsdatum">
              <Input type="date" value={s1.eintrittsdatum} onChange={e => setS1(p => ({ ...p, eintrittsdatum: e.target.value }))} />
            </FormField>
            <FormField label="Position">
              <Input value={s1.position} onChange={e => setS1(p => ({ ...p, position: e.target.value }))} placeholder="z.B. Senior Developer" />
            </FormField>
            <FormField label="Abteilung">
              <SelectField value={s1.abteilung} onChange={v => setS1(p => ({ ...p, abteilung: v }))} options={ABTEILUNG_OPTIONS} />
            </FormField>
            <FormField label="Vertragsart">
              <SelectField value={s1.vertragsart} onChange={v => setS1(p => ({ ...p, vertragsart: v }))} options={VERTRAGSART_OPTIONS} />
            </FormField>
            <FormField label="Vorname Vorgesetzte/r">
              <Input value={s1.vorgesetzte_vorname} onChange={e => setS1(p => ({ ...p, vorgesetzte_vorname: e.target.value }))} placeholder="z.B. Thomas" />
            </FormField>
            <FormField label="Nachname Vorgesetzte/r">
              <Input value={s1.vorgesetzte_nachname} onChange={e => setS1(p => ({ ...p, vorgesetzte_nachname: e.target.value }))} placeholder="z.B. Meier" />
            </FormField>
          </div>

          {/* Arbeitsort — radio style */}
          <FormField label="Arbeitsort">
            <div className="flex flex-wrap gap-2">
              {ARBEITSORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setS1(p => ({ ...p, arbeitsort: opt.key }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    s1.arbeitsort === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input text-foreground hover:bg-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <IconX size={16} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleStep1Submit} disabled={submitting} className="min-w-32">
              {submitting ? 'Wird gespeichert …' : 'Weiter: IT-Ausstattung'}
            </Button>
          </div>
        </div>
      )}

      {/* ====================================================
          STEP 2 — IT-Ausstattung einrichten
      ==================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Live IT-Checkliste */}
          <div className="p-4 rounded-xl bg-card border overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <IconDeviceLaptop size={18} className="text-primary" />
              <h3 className="font-semibold text-sm text-foreground">IT-Checkliste</h3>
            </div>
            <div className="space-y-2">
              {[
                { key: 'email_konto_erstellt', label: 'E-Mail-Konto erstellt', value: s2.email_konto_erstellt },
                { key: 'vpn_zugang_eingerichtet', label: 'VPN-Zugang eingerichtet', value: s2.vpn_zugang_eingerichtet },
                { key: 'zugangsdaten_uebergeben', label: 'Zugangsdaten übergeben', value: s2.zugangsdaten_uebergeben },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.value ? 'bg-primary' : 'bg-muted'}`}>
                    {item.value && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
                  </div>
                  <span className={`text-sm ${item.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                {[s2.email_konto_erstellt, s2.vpn_zugang_eingerichtet, s2.zugangsdaten_uebergeben].filter(Boolean).length} von 3 Punkten erledigt
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Laptop-Modell">
              <Input value={s2.laptop_modell} onChange={e => setS2(p => ({ ...p, laptop_modell: e.target.value }))} placeholder="z.B. MacBook Pro 14" />
            </FormField>
            <FormField label="Betriebssystem">
              <SelectField value={s2.betriebssystem} onChange={v => setS2(p => ({ ...p, betriebssystem: v }))} options={BETRIEBSSYSTEM_OPTIONS} />
            </FormField>
          </div>

          <FormField label="Zubehör">
            <textarea
              value={s2.zubehoer}
              onChange={e => setS2(p => ({ ...p, zubehoer: e.target.value }))}
              placeholder="z.B. Maus, Tastatur, Monitor, Headset …"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </FormField>

          <FormField label="Software-Lizenzen">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOFTWARELIZENZEN_OPTIONS.map(opt => {
                const checked = s2.softwarelizenzen.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setS2(p => {
                        const next = new Set(p.softwarelizenzen);
                        if (next.has(opt.key)) next.delete(opt.key);
                        else next.add(opt.key);
                        return { ...p, softwarelizenzen: next };
                      });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      checked
                        ? 'bg-primary/10 border-primary/30 text-foreground'
                        : 'bg-background border-input text-muted-foreground'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {checked && <IconCheck size={10} stroke={3} className="text-primary-foreground" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FormField>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Zugänge & Konten</Label>
            <ToggleSwitch
              checked={s2.email_konto_erstellt}
              onChange={v => setS2(p => ({ ...p, email_konto_erstellt: v }))}
              label="E-Mail-Konto erstellt"
            />
            <ToggleSwitch
              checked={s2.vpn_zugang_eingerichtet}
              onChange={v => setS2(p => ({ ...p, vpn_zugang_eingerichtet: v }))}
              label="VPN-Zugang eingerichtet"
            />
            <ToggleSwitch
              checked={s2.zugangsdaten_uebergeben}
              onChange={v => setS2(p => ({ ...p, zugangsdaten_uebergeben: v }))}
              label="Zugangsdaten übergeben"
            />
          </div>

          <FormField label="Notizen IT">
            <textarea
              value={s2.notizen_it}
              onChange={e => setS2(p => ({ ...p, notizen_it: e.target.value }))}
              placeholder="Weitere Hinweise zur IT-Einrichtung …"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </FormField>

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <IconX size={16} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={submitting}>
              Zurück
            </Button>
            <Button onClick={handleStep2Submit} disabled={submitting} className="min-w-40">
              {submitting ? 'Wird gespeichert …' : 'Weiter: Maßnahmen planen'}
            </Button>
          </div>
        </div>
      )}

      {/* ====================================================
          STEP 3 — Onboarding-Maßnahmen planen
      ==================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Running counter */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card border overflow-hidden">
            <IconListCheck size={20} className="text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{massnahmen.length} Maßnahmen geplant</p>
              <p className="text-xs text-muted-foreground">Füge alle relevanten Onboarding-Maßnahmen hinzu.</p>
            </div>
          </div>

          {/* Add new measure form */}
          <div className="p-4 rounded-xl border bg-secondary/30 space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Neue Maßnahme hinzufügen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FormField label="Bezeichnung" required>
                  <Input
                    value={currentMassnahme.bezeichnung}
                    onChange={e => setCurrentMassnahme(p => ({ ...p, bezeichnung: e.target.value }))}
                    placeholder="z.B. Vorstellung beim Team"
                  />
                </FormField>
              </div>
              <FormField label="Typ">
                <SelectField
                  value={currentMassnahme.typ}
                  onChange={v => setCurrentMassnahme(p => ({ ...p, typ: v }))}
                  options={MASSNAHME_TYP_OPTIONS}
                />
              </FormField>
              <FormField label="Datum & Uhrzeit">
                <Input
                  type="datetime-local"
                  value={currentMassnahme.datum_uhrzeit}
                  onChange={e => setCurrentMassnahme(p => ({ ...p, datum_uhrzeit: e.target.value }))}
                />
              </FormField>
              <FormField label="Vorname Verantwortliche/r">
                <Input
                  value={currentMassnahme.verantwortliche_vorname}
                  onChange={e => setCurrentMassnahme(p => ({ ...p, verantwortliche_vorname: e.target.value }))}
                  placeholder="z.B. Anna"
                />
              </FormField>
              <FormField label="Nachname Verantwortliche/r">
                <Input
                  value={currentMassnahme.verantwortliche_nachname}
                  onChange={e => setCurrentMassnahme(p => ({ ...p, verantwortliche_nachname: e.target.value }))}
                  placeholder="z.B. Schmidt"
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Notizen">
                  <textarea
                    value={currentMassnahme.notizen_massnahme}
                    onChange={e => setCurrentMassnahme(p => ({ ...p, notizen_massnahme: e.target.value }))}
                    placeholder="Optionale Hinweise zur Maßnahme …"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </FormField>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleAddMassnahme}
              disabled={!currentMassnahme.bezeichnung.trim()}
              className="w-full"
            >
              <IconPlus size={16} className="mr-2" />
              Maßnahme hinzufügen
            </Button>
          </div>

          {/* List of added measures */}
          {massnahmen.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Geplante Maßnahmen</h4>
              {massnahmen.map((m, idx) => {
                const typLabel = MASSNAHME_TYP_OPTIONS.find(o => o.key === m.typ)?.label ?? m.typ;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{m.bezeichnung}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typLabel}
                        {m.datum_uhrzeit && ` · ${m.datum_uhrzeit.replace('T', ' ')}`}
                        {(m.verantwortliche_vorname || m.verantwortliche_nachname) && ` · ${[m.verantwortliche_vorname, m.verantwortliche_nachname].filter(Boolean).join(' ')}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMassnahme(idx)}
                      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <IconX size={16} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={submitting}>
              Zurück
            </Button>
            <Button onClick={handleStep3Submit} disabled={submitting} className="min-w-40">
              {submitting
                ? 'Wird gespeichert …'
                : massnahmen.length === 0
                ? 'Ohne Maßnahmen weiter'
                : `${massnahmen.length} Maßnahmen speichern`}
            </Button>
          </div>
        </div>
      )}

      {/* ====================================================
          STEP 4 — Checkliste erstellen
      ==================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Running counter */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card border overflow-hidden">
            <IconClipboardList size={20} className="text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{aufgaben.length} Aufgaben hinzugefügt</p>
              <p className="text-xs text-muted-foreground">Lege alle Onboarding-Aufgaben für die Checkliste an.</p>
            </div>
          </div>

          {/* Add new task form */}
          <div className="p-4 rounded-xl border bg-secondary/30 space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Neue Aufgabe hinzufügen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FormField label="Aufgabe" required>
                  <Input
                    value={currentAufgabe.aufgabe_bezeichnung}
                    onChange={e => setCurrentAufgabe(p => ({ ...p, aufgabe_bezeichnung: e.target.value }))}
                    placeholder="z.B. Arbeitsvertrag unterzeichnen"
                  />
                </FormField>
              </div>
              <FormField label="Kategorie">
                <SelectField
                  value={currentAufgabe.kategorie}
                  onChange={v => setCurrentAufgabe(p => ({ ...p, kategorie: v }))}
                  options={KATEGORIE_OPTIONS}
                />
              </FormField>
              <FormField label="Fälligkeitsdatum">
                <Input
                  type="date"
                  value={currentAufgabe.faelligkeitsdatum}
                  onChange={e => setCurrentAufgabe(p => ({ ...p, faelligkeitsdatum: e.target.value }))}
                />
              </FormField>
              <FormField label="Vorname Verantwortliche/r">
                <Input
                  value={currentAufgabe.verantwortliche_aufgabe_vorname}
                  onChange={e => setCurrentAufgabe(p => ({ ...p, verantwortliche_aufgabe_vorname: e.target.value }))}
                  placeholder="z.B. Lena"
                />
              </FormField>
              <FormField label="Nachname Verantwortliche/r">
                <Input
                  value={currentAufgabe.verantwortliche_aufgabe_nachname}
                  onChange={e => setCurrentAufgabe(p => ({ ...p, verantwortliche_aufgabe_nachname: e.target.value }))}
                  placeholder="z.B. Braun"
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Anmerkungen">
                  <textarea
                    value={currentAufgabe.anmerkungen}
                    onChange={e => setCurrentAufgabe(p => ({ ...p, anmerkungen: e.target.value }))}
                    placeholder="Optionale Hinweise zur Aufgabe …"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </FormField>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleAddAufgabe}
              disabled={!currentAufgabe.aufgabe_bezeichnung.trim()}
              className="w-full"
            >
              <IconPlus size={16} className="mr-2" />
              Aufgabe hinzufügen
            </Button>
          </div>

          {/* List of added tasks */}
          {aufgaben.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Hinzugefügte Aufgaben</h4>
              {aufgaben.map((a, idx) => {
                const katLabel = KATEGORIE_OPTIONS.find(o => o.key === a.kategorie)?.label ?? a.kategorie;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{a.aufgabe_bezeichnung}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {katLabel}
                        {a.faelligkeitsdatum && ` · Fällig: ${a.faelligkeitsdatum}`}
                        {(a.verantwortliche_aufgabe_vorname || a.verantwortliche_aufgabe_nachname) && ` · ${[a.verantwortliche_aufgabe_vorname, a.verantwortliche_aufgabe_nachname].filter(Boolean).join(' ')}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAufgabe(idx)}
                      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <IconX size={16} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={submitting}>
              Zurück
            </Button>
            <Button onClick={handleStep4Submit} disabled={submitting} className="min-w-40">
              {submitting
                ? 'Wird gespeichert …'
                : aufgaben.length === 0
                ? 'Ohne Aufgaben abschließen'
                : `${aufgaben.length} Aufgaben speichern`}
            </Button>
          </div>
        </div>
      )}

      {/* ====================================================
          STEP 5 — Zusammenfassung
      ==================================================== */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <IconCircleCheck size={36} className="text-primary" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Onboarding erfolgreich abgeschlossen!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {savedStep1
                  ? `${savedStep1.vorname} ${savedStep1.nachname} wurde vollständig eingerichtet.`
                  : 'Der Mitarbeitende wurde vollständig eingerichtet.'}
              </p>
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-secondary/30">
              <h3 className="font-semibold text-foreground">Zusammenfassung</h3>
            </div>

            {/* Employee info */}
            {savedStep1 && (
              <div className="p-4 border-b">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Mitarbeitende/r</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span className="font-medium">{savedStep1.vorname} {savedStep1.nachname}</span>
                  </div>
                  {savedStep1.position && (
                    <div>
                      <span className="text-muted-foreground">Position: </span>
                      <span className="font-medium">{savedStep1.position}</span>
                    </div>
                  )}
                  {savedStep1.abteilung && (
                    <div>
                      <span className="text-muted-foreground">Abteilung: </span>
                      <span className="font-medium">{ABTEILUNG_OPTIONS.find(o => o.key === savedStep1.abteilung)?.label ?? savedStep1.abteilung}</span>
                    </div>
                  )}
                  {savedStep1.eintrittsdatum && (
                    <div>
                      <span className="text-muted-foreground">Eintritt: </span>
                      <span className="font-medium">{savedStep1.eintrittsdatum}</span>
                    </div>
                  )}
                  {savedStep1.arbeitsort && (
                    <div>
                      <span className="text-muted-foreground">Arbeitsort: </span>
                      <span className="font-medium">{ARBEITSORT_OPTIONS.find(o => o.key === savedStep1.arbeitsort)?.label ?? savedStep1.arbeitsort}</span>
                    </div>
                  )}
                  {savedStep1.vertragsart && (
                    <div>
                      <span className="text-muted-foreground">Vertragsart: </span>
                      <span className="font-medium">{VERTRAGSART_OPTIONS.find(o => o.key === savedStep1.vertragsart)?.label ?? savedStep1.vertragsart}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IT setup */}
            <div className="p-4 border-b">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">IT-Ausstattung</h4>
              <div className="space-y-1.5">
                {[
                  { label: 'E-Mail-Konto erstellt', value: s2.email_konto_erstellt },
                  { label: 'VPN-Zugang eingerichtet', value: s2.vpn_zugang_eingerichtet },
                  { label: 'Zugangsdaten übergeben', value: s2.zugangsdaten_uebergeben },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.value ? 'bg-primary' : 'bg-muted'}`}>
                      {item.value
                        ? <IconCheck size={11} stroke={3} className="text-primary-foreground" />
                        : <IconX size={11} stroke={2.5} className="text-muted-foreground" />}
                    </div>
                    <span className={item.value ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                  </div>
                ))}
                {s2.laptop_modell && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Laptop: <span className="text-foreground font-medium">{s2.laptop_modell}</span>
                    {s2.betriebssystem && ` (${BETRIEBSSYSTEM_OPTIONS.find(o => o.key === s2.betriebssystem)?.label ?? s2.betriebssystem})`}
                  </p>
                )}
                {s2.softwarelizenzen.size > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Software: <span className="text-foreground font-medium">
                      {Array.from(s2.softwarelizenzen).map(k => SOFTWARELIZENZEN_OPTIONS.find(o => o.key === k)?.label ?? k).join(', ')}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Measures count */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onboarding-Maßnahmen</h4>
                <span className="text-sm font-semibold text-foreground">{massnahmen.length} geplant</span>
              </div>
            </div>

            {/* Checklist count */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklisten-Aufgaben</h4>
                <span className="text-sm font-semibold text-foreground">{aufgaben.length} erstellt</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <IconUserPlus size={16} className="mr-2" />
              Weiteren Mitarbeitenden onboarden
            </Button>
            <a href="#/" className="flex-1">
              <Button variant="default" className="w-full">
                Zurück zum Dashboard
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
