import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Mitarbeitende, OnboardingCheckliste, ItAusstattungZugaenge, OnboardingMassnahmen } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  IconUser,
  IconCheck,
  IconMail,
  IconWifi,
  IconKey,
  IconDeviceLaptop,
  IconChartBar,
  IconListCheck,
  IconAlertTriangle,
  IconConfetti,
  IconRefresh,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const WIZARD_STEPS = [
  { label: 'Mitarbeitende/r' },
  { label: 'Checkliste' },
  { label: 'IT-Zugänge' },
  { label: 'Maßnahmen' },
  { label: 'Abschluss' },
];

const STATUS_MASSNAHME_OPTIONS = LOOKUP_OPTIONS['onboarding_maßnahmen']?.status_massnahme ?? [];
const ABGESCHLOSSEN_KEY = 'durchgefuehrt';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '–';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

function formatDatetime(dateStr?: string): string {
  if (!dateStr) return '–';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    return dateStr;
  }
}

// ─── Step 2: Checkliste ──────────────────────────────────────────────────────

interface ChecklisteStepProps {
  checkliste: OnboardingCheckliste[];
  onWeiter: () => void;
  onRefresh: () => void;
}

function ChecklisteStep({ checkliste, onWeiter, onRefresh }: ChecklisteStepProps) {
  const [localErledigt, setLocalErledigt] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    checkliste.forEach(c => { map[c.record_id] = c.fields.erledigt ?? false; });
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);

  // Sync when external data changes
  useEffect(() => {
    setLocalErledigt(prev => {
      const next = { ...prev };
      checkliste.forEach(c => {
        if (!(c.record_id in next)) {
          next[c.record_id] = c.fields.erledigt ?? false;
        }
      });
      return next;
    });
  }, [checkliste]);

  const doneCount = Object.values(localErledigt).filter(Boolean).length;
  const totalCount = checkliste.length;

  const handleToggle = async (recordId: string, current: boolean) => {
    const newVal = !current;
    setLocalErledigt(prev => ({ ...prev, [recordId]: newVal }));
    setSaving(recordId);
    try {
      await LivingAppsService.updateOnboardingChecklisteEntry(recordId, { erledigt: newVal });
      onRefresh();
    } catch {
      setLocalErledigt(prev => ({ ...prev, [recordId]: current }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Checkliste abarbeiten</h2>
        <p className="text-sm text-muted-foreground">
          Hake erledigte Aufgaben ab. Du kannst jederzeit weitergehen — auch wenn noch nicht alles erledigt ist.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-muted-foreground">Fortschritt</span>
          <span>{doneCount} von {totalCount} Aufgaben erledigt</span>
        </div>
        <BudgetTracker
          budget={totalCount}
          booked={doneCount}
          label="Checkliste"
          showRemaining={false}
        />
      </div>

      {checkliste.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <IconListCheck size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Keine Aufgaben für diese/n Mitarbeitende/n gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkliste.map(task => {
            const done = localErledigt[task.record_id] ?? false;
            const isSaving = saving === task.record_id;
            return (
              <button
                key={task.record_id}
                onClick={() => !isSaving && handleToggle(task.record_id, done)}
                className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                  done
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                    : 'bg-card border-border hover:bg-accent'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'bg-green-500 border-green-500' : 'border-muted-foreground'
                }`}>
                  {done && <IconCheck size={12} stroke={3} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.fields.aufgabe_bezeichnung ?? '(Ohne Bezeichnung)'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {task.fields.kategorie && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {task.fields.kategorie.label}
                      </span>
                    )}
                    {task.fields.faelligkeitsdatum && (
                      <span>Fällig: {formatDate(task.fields.faelligkeitsdatum)}</span>
                    )}
                  </div>
                </div>
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onWeiter}>
          Weiter zu IT-Zugängen
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: IT-Zugänge ──────────────────────────────────────────────────────

interface ItStepProps {
  itRecord: ItAusstattungZugaenge | null;
  onWeiter: () => void;
  onRefresh: () => void;
}

function ItStep({ itRecord, onWeiter, onRefresh }: ItStepProps) {
  const [localState, setLocalState] = useState({
    email_konto_erstellt: itRecord?.fields.email_konto_erstellt ?? false,
    vpn_zugang_eingerichtet: itRecord?.fields.vpn_zugang_eingerichtet ?? false,
    zugangsdaten_uebergeben: itRecord?.fields.zugangsdaten_uebergeben ?? false,
  });
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (itRecord) {
      setLocalState({
        email_konto_erstellt: itRecord.fields.email_konto_erstellt ?? false,
        vpn_zugang_eingerichtet: itRecord.fields.vpn_zugang_eingerichtet ?? false,
        zugangsdaten_uebergeben: itRecord.fields.zugangsdaten_uebergeben ?? false,
      });
    }
  }, [itRecord]);

  const confirmedCount = Object.values(localState).filter(Boolean).length;

  const handleToggle = async (field: keyof typeof localState) => {
    if (!itRecord) return;
    const newVal = !localState[field];
    setLocalState(prev => ({ ...prev, [field]: newVal }));
    setSaving(field);
    try {
      await LivingAppsService.updateItAusstattungZugaengeEntry(itRecord.record_id, { [field]: newVal });
      onRefresh();
    } catch {
      setLocalState(prev => ({ ...prev, [field]: !newVal }));
    } finally {
      setSaving(null);
    }
  };

  const toggleItems = [
    {
      key: 'email_konto_erstellt' as const,
      label: 'E-Mail-Konto erstellt',
      icon: <IconMail size={22} />,
    },
    {
      key: 'vpn_zugang_eingerichtet' as const,
      label: 'VPN-Zugang eingerichtet',
      icon: <IconWifi size={22} />,
    },
    {
      key: 'zugangsdaten_uebergeben' as const,
      label: 'Zugangsdaten übergeben',
      icon: <IconKey size={22} />,
    },
  ];

  if (!itRecord) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">IT-Zugänge bestätigen</h2>
          <p className="text-sm text-muted-foreground">Für diese/n Mitarbeitende/n wurde noch kein IT-Datensatz angelegt.</p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <IconDeviceLaptop size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Kein IT-Ausstattungsdatensatz gefunden.</p>
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => onWeiter()}>Überspringen</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">IT-Zugänge bestätigen</h2>
        <p className="text-sm text-muted-foreground">Bestätige, dass alle IT-Zugänge eingerichtet und übergeben wurden.</p>
      </div>

      {/* IT-Details */}
      <Card className="p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <IconDeviceLaptop size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Ausstattung</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {itRecord.fields.laptop_modell && (
            <div>
              <span className="text-muted-foreground text-xs">Laptop-Modell</span>
              <p className="font-medium truncate">{itRecord.fields.laptop_modell}</p>
            </div>
          )}
          {itRecord.fields.betriebssystem && (
            <div>
              <span className="text-muted-foreground text-xs">Betriebssystem</span>
              <p className="font-medium">{itRecord.fields.betriebssystem.label}</p>
            </div>
          )}
          {itRecord.fields.softwarelizenzen && itRecord.fields.softwarelizenzen.length > 0 && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground text-xs">Softwarelizenzen</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {itRecord.fields.softwarelizenzen.map(lic => (
                  <span key={lic.key} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-foreground font-medium">
                    {lic.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Readiness summary */}
      <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-muted text-sm font-medium">
        <span className="text-muted-foreground">IT-Bereitschaft</span>
        <span>{confirmedCount}/3 Zugänge eingerichtet</span>
      </div>

      {/* Toggle cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {toggleItems.map(item => {
          const active = localState[item.key];
          const isSaving = saving === item.key;
          return (
            <button
              key={item.key}
              onClick={() => !isSaving && handleToggle(item.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors w-full ${
                active
                  ? 'bg-green-50 border-green-400 dark:bg-green-950/20 dark:border-green-700'
                  : 'bg-card border-border hover:border-primary/40'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                active ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-muted text-muted-foreground'
              }`}>
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : active ? (
                  <IconCheck size={22} stroke={2.5} />
                ) : item.icon}
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${active ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                {item.label}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-green-600' : 'text-muted-foreground'}`}>
                {active ? 'Erledigt' : 'Ausstehend'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onWeiter}>
          Weiter zu Maßnahmen
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Maßnahmen ───────────────────────────────────────────────────────

interface MassnahmenStepProps {
  massnahmen: OnboardingMassnahmen[];
  onWeiter: () => void;
  onRefresh: () => void;
}

function MassnahmenStep({ massnahmen, onWeiter, onRefresh }: MassnahmenStepProps) {
  const [localStatus, setLocalStatus] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    massnahmen.forEach(m => { map[m.record_id] = m.fields.status_massnahme?.key ?? 'geplant'; });
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setLocalStatus(prev => {
      const next = { ...prev };
      massnahmen.forEach(m => {
        if (!(m.record_id in next)) {
          next[m.record_id] = m.fields.status_massnahme?.key ?? 'geplant';
        }
      });
      return next;
    });
  }, [massnahmen]);

  const doneCount = Object.values(localStatus).filter(s => s === ABGESCHLOSSEN_KEY).length;
  const totalCount = massnahmen.length;

  const handleStatusChange = async (recordId: string, newKey: string) => {
    const oldKey = localStatus[recordId];
    setLocalStatus(prev => ({ ...prev, [recordId]: newKey }));
    setSaving(recordId);
    try {
      await LivingAppsService.updateOnboardingMassnahmenEntry(recordId, { status_massnahme: newKey });
      onRefresh();
    } catch {
      setLocalStatus(prev => ({ ...prev, [recordId]: oldKey }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Maßnahmen abschließen</h2>
        <p className="text-sm text-muted-foreground">Aktualisiere den Status aller Onboarding-Maßnahmen.</p>
      </div>

      <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-muted text-sm font-medium">
        <span className="text-muted-foreground">Fortschritt</span>
        <span>{doneCount} von {totalCount} Maßnahmen abgeschlossen</span>
      </div>

      {massnahmen.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <IconChartBar size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Keine Maßnahmen für diese/n Mitarbeitende/n gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {massnahmen.map(m => {
            const currentKey = localStatus[m.record_id] ?? m.fields.status_massnahme?.key ?? 'geplant';
            const currentLabel = STATUS_MASSNAHME_OPTIONS.find(o => o.key === currentKey)?.label ?? currentKey;
            const isSaving = saving === m.record_id;
            return (
              <Card key={m.record_id} className="p-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{m.fields.bezeichnung ?? '(Ohne Bezeichnung)'}</p>
                      <StatusBadge statusKey={currentKey} label={currentLabel} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {m.fields.typ && <span>{m.fields.typ.label}</span>}
                      {m.fields.datum_uhrzeit && <span>{formatDatetime(m.fields.datum_uhrzeit)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    <select
                      value={currentKey}
                      onChange={e => !isSaving && handleStatusChange(m.record_id, e.target.value)}
                      disabled={isSaving}
                      className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {STATUS_MASSNAHME_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onWeiter}>
          Weiter zum Abschluss
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: Abschluss ───────────────────────────────────────────────────────

interface AbschlussStepProps {
  mitarbeiter: Mitarbeitende;
  checkliste: OnboardingCheckliste[];
  itRecord: ItAusstattungZugaenge | null;
  massnahmen: OnboardingMassnahmen[];
  onReset: () => void;
}

function AbschlussStep({ mitarbeiter, checkliste, itRecord, massnahmen, onReset }: AbschlussStepProps) {
  const checkDone = checkliste.filter(c => c.fields.erledigt).length;
  const checkTotal = checkliste.length;

  const itConfirmed = [
    itRecord?.fields.email_konto_erstellt ?? false,
    itRecord?.fields.vpn_zugang_eingerichtet ?? false,
    itRecord?.fields.zugangsdaten_uebergeben ?? false,
  ].filter(Boolean).length;

  const massDone = massnahmen.filter(m => m.fields.status_massnahme?.key === ABGESCHLOSSEN_KEY).length;
  const massTotal = massnahmen.length;

  const isComplete =
    checkDone === checkTotal &&
    checkTotal > 0 &&
    itConfirmed === 3 &&
    massDone === massTotal &&
    massTotal > 0;

  const openCheckItems = checkliste.filter(c => !c.fields.erledigt);
  const openMassItems = massnahmen.filter(m => m.fields.status_massnahme?.key !== ABGESCHLOSSEN_KEY);
  const openItItems = [
    !itRecord?.fields.email_konto_erstellt && 'E-Mail-Konto',
    !itRecord?.fields.vpn_zugang_eingerichtet && 'VPN-Zugang',
    !itRecord?.fields.zugangsdaten_uebergeben && 'Zugangsdaten übergeben',
  ].filter(Boolean) as string[];

  const { vorname, nachname, position, abteilung, eintrittsdatum } = mitarbeiter.fields;

  return (
    <div className="space-y-6">
      {/* Completion banner */}
      {isComplete ? (
        <div className="flex flex-col items-center gap-3 py-8 px-6 rounded-2xl bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800 text-center overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <IconConfetti size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Onboarding abgeschlossen!</h2>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              Alle Aufgaben, IT-Zugänge und Maßnahmen sind vollständig abgearbeitet.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 px-6 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 text-center overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <IconAlertTriangle size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400">Onboarding noch nicht vollständig</h2>
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              Es gibt noch offene Punkte, die abgeschlossen werden müssen.
            </p>
          </div>
        </div>
      )}

      {/* Employee summary */}
      <Card className="p-5 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconUser size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{vorname} {nachname}</p>
            {position && <p className="text-sm text-muted-foreground truncate">{position}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {abteilung && (
            <div>
              <span className="text-xs text-muted-foreground">Abteilung</span>
              <p className="font-medium">{abteilung.label}</p>
            </div>
          )}
          {eintrittsdatum && (
            <div>
              <span className="text-xs text-muted-foreground">Eintrittsdatum</span>
              <p className="font-medium">{formatDate(eintrittsdatum)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className={`p-4 overflow-hidden ${checkDone === checkTotal && checkTotal > 0 ? 'border-green-300 dark:border-green-700' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <IconListCheck size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Checkliste</span>
          </div>
          <p className="text-2xl font-bold">{checkDone}/{checkTotal}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Aufgaben erledigt</p>
          {checkDone === checkTotal && checkTotal > 0 && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-600">
              <IconCheck size={12} stroke={3} /> Vollständig
            </span>
          )}
        </Card>

        <Card className={`p-4 overflow-hidden ${itConfirmed === 3 ? 'border-green-300 dark:border-green-700' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <IconDeviceLaptop size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IT-Setup</span>
          </div>
          <p className="text-2xl font-bold">{itRecord ? itConfirmed : '–'}/3</p>
          <p className="text-xs text-muted-foreground mt-0.5">Zugänge bestätigt</p>
          {itConfirmed === 3 && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-600">
              <IconCheck size={12} stroke={3} /> Vollständig
            </span>
          )}
        </Card>

        <Card className={`p-4 overflow-hidden ${massDone === massTotal && massTotal > 0 ? 'border-green-300 dark:border-green-700' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <IconChartBar size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maßnahmen</span>
          </div>
          <p className="text-2xl font-bold">{massDone}/{massTotal}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Abgeschlossen</p>
          {massDone === massTotal && massTotal > 0 && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-600">
              <IconCheck size={12} stroke={3} /> Vollständig
            </span>
          )}
        </Card>
      </div>

      {/* Open items */}
      {!isComplete && (openCheckItems.length > 0 || openItItems.length > 0 || openMassItems.length > 0) && (
        <Card className="p-4 overflow-hidden border-amber-200 dark:border-amber-800">
          <p className="text-sm font-semibold mb-3 text-amber-700 dark:text-amber-400">Noch offene Punkte</p>
          <div className="space-y-3">
            {openCheckItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Checkliste</p>
                <ul className="space-y-1">
                  {openCheckItems.slice(0, 5).map(c => (
                    <li key={c.record_id} className="text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{c.fields.aufgabe_bezeichnung ?? '(Ohne Bezeichnung)'}</span>
                    </li>
                  ))}
                  {openCheckItems.length > 5 && (
                    <li className="text-xs text-muted-foreground pl-3.5">… und {openCheckItems.length - 5} weitere</li>
                  )}
                </ul>
              </div>
            )}
            {openItItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">IT-Zugänge</p>
                <ul className="space-y-1">
                  {openItItems.map(item => (
                    <li key={item} className="text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {openMassItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Maßnahmen</p>
                <ul className="space-y-1">
                  {openMassItems.slice(0, 5).map(m => (
                    <li key={m.record_id} className="text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{m.fields.bezeichnung ?? '(Ohne Bezeichnung)'}</span>
                    </li>
                  ))}
                  {openMassItems.length > 5 && (
                    <li className="text-xs text-muted-foreground pl-3.5">… und {openMassItems.length - 5} weitere</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button onClick={onReset} className="flex-1 sm:flex-none gap-2">
          <IconRefresh size={16} />
          Weiteren Mitarbeitenden abschließen
        </Button>
        <a href="#/" className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors flex-1 sm:flex-none text-center">
          Zurück zum Dashboard
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OnboardingAbschliessenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState<number>(() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 5 ? s : 1;
  });

  const [selectedMitarbeitenderId, setSelectedMitarbeitenderId] = useState<string | null>(
    () => searchParams.get('mitarbeitenderId') ?? null
  );

  const { mitarbeitende, itAusstattungZugaenge, onboardingMassnahmen, onboardingCheckliste, loading, error, fetchAll } = useDashboardData();

  // Sync step + mitarbeitenderId to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (step > 1) {
      params.set('step', String(step));
    } else {
      params.delete('step');
    }
    if (selectedMitarbeitenderId) {
      params.set('mitarbeitenderId', selectedMitarbeitenderId);
    } else {
      params.delete('mitarbeitenderId');
    }
    setSearchParams(params, { replace: true });
  }, [step, selectedMitarbeitenderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // If mitarbeitenderId provided in URL on mount, jump to step 2
  useEffect(() => {
    const urlId = searchParams.get('mitarbeitenderId');
    if (urlId && !selectedMitarbeitenderId) {
      setSelectedMitarbeitenderId(urlId);
      const urlStep = parseInt(searchParams.get('step') ?? '', 10);
      if (!(urlStep >= 2 && urlStep <= 5)) {
        setStep(2);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMitarbeiter = useMemo(
    () => mitarbeitende.find(m => m.record_id === selectedMitarbeitenderId) ?? null,
    [mitarbeitende, selectedMitarbeitenderId]
  );

  const filteredCheckliste = useMemo(
    () => onboardingCheckliste.filter(c => extractRecordId(c.fields.mitarbeitender) === selectedMitarbeitenderId),
    [onboardingCheckliste, selectedMitarbeitenderId]
  );

  const filteredItRecord = useMemo(
    () => itAusstattungZugaenge.find(it => extractRecordId(it.fields.mitarbeitender) === selectedMitarbeitenderId) ?? null,
    [itAusstattungZugaenge, selectedMitarbeitenderId]
  );

  const filteredMassnahmen = useMemo(
    () => onboardingMassnahmen.filter(m => extractRecordId(m.fields.mitarbeitender) === selectedMitarbeitenderId),
    [onboardingMassnahmen, selectedMitarbeitenderId]
  );

  const handleSelectMitarbeiter = useCallback((id: string) => {
    setSelectedMitarbeitenderId(id);
    setStep(2);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMitarbeitenderId(null);
    setStep(1);
  }, []);

  return (
    <IntentWizardShell
      title="Onboarding abschließen"
      subtitle="Führe das Onboarding eines neuen Teammitglieds Schritt für Schritt zum Abschluss."
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Mitarbeitende/n auswählen</h2>
            <p className="text-sm text-muted-foreground">
              Wähle die Person aus, deren Onboarding du abschließen möchtest.
            </p>
          </div>
          <EntitySelectStep
            searchPlaceholder="Name oder Position suchen..."
            emptyText="Keine Mitarbeitenden gefunden."
            emptyIcon={<IconUser size={32} />}
            items={mitarbeitende.map(m => ({
              id: m.record_id,
              title: `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || '(Kein Name)',
              subtitle: m.fields.position ?? undefined,
              status: m.fields.vertragsart
                ? { key: m.fields.vertragsart.key, label: m.fields.vertragsart.label }
                : undefined,
              stats: m.fields.abteilung
                ? [{ label: 'Abteilung', value: m.fields.abteilung.label }]
                : [],
              icon: <IconUser size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectMitarbeiter}
          />
        </div>
      )}

      {step === 2 && selectedMitarbeitenderId && (
        <ChecklisteStep
          checkliste={filteredCheckliste}
          onWeiter={() => setStep(3)}
          onRefresh={fetchAll}
        />
      )}

      {step === 3 && selectedMitarbeitenderId && (
        <ItStep
          itRecord={filteredItRecord}
          onWeiter={() => setStep(4)}
          onRefresh={fetchAll}
        />
      )}

      {step === 4 && selectedMitarbeitenderId && (
        <MassnahmenStep
          massnahmen={filteredMassnahmen}
          onWeiter={() => setStep(5)}
          onRefresh={fetchAll}
        />
      )}

      {step === 5 && selectedMitarbeitenderId && selectedMitarbeiter && (
        <AbschlussStep
          mitarbeiter={selectedMitarbeiter}
          checkliste={filteredCheckliste}
          itRecord={filteredItRecord}
          massnahmen={filteredMassnahmen}
          onReset={handleReset}
        />
      )}

      {/* Fallback if employee was deselected somehow */}
      {step > 1 && !selectedMitarbeitenderId && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm mb-4">Kein/e Mitarbeitende/r ausgewählt.</p>
          <Button onClick={() => setStep(1)}>Zurück zu Schritt 1</Button>
        </div>
      )}
    </IntentWizardShell>
  );
}
