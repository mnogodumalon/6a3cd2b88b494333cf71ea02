import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichItAusstattungZugaenge, enrichOnboardingMassnahmen, enrichOnboardingCheckliste } from '@/lib/enrich';
import type { EnrichedItAusstattungZugaenge, EnrichedOnboardingMassnahmen, EnrichedOnboardingCheckliste } from '@/types/enriched';
import type { Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MitarbeitendeDialog } from '@/components/dialogs/MitarbeitendeDialog';
import { ItAusstattungZugaengeDialog } from '@/components/dialogs/ItAusstattungZugaengeDialog';
import { OnboardingMassnahmenDialog } from '@/components/dialogs/OnboardingMassnahmenDialog';
import { OnboardingChecklisteDialog } from '@/components/dialogs/OnboardingChecklisteDialog';
import {
  RecordOverlay,
  RecordHeader,
  RecordKeyFacts,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconUsers,
  IconDeviceDesktop,
  IconListCheck,
  IconCalendarEvent,
  IconPlus,
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconTool,
  IconRefresh,
  IconCheck,
  IconX,
  IconChevronRight,
  IconSearch,
  IconUserPlus,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a3cd2b88b494333cf71ea02';
const REPAIR_ENDPOINT = '/claude/build/repair';

// ── Status helpers ──────────────────────────────────────────────────────────

function statusColor(key: string | undefined) {
  switch (key) {
    case 'durchgefuehrt': return 'bg-green-500/10 text-green-700 border-green-200';
    case 'geplant': return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'abgesagt': return 'bg-red-500/10 text-red-700 border-red-200';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getOnboardingProgress(
  mitId: string,
  checkliste: EnrichedOnboardingCheckliste[]
): { done: number; total: number } {
  const items = checkliste.filter(c => {
    const id = extractRecordId(c.fields.mitarbeitender);
    return id === mitId;
  });
  const done = items.filter(c => c.fields.erledigt).length;
  return { done, total: items.length };
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    mitarbeitende, itAusstattungZugaenge, onboardingMassnahmen, onboardingCheckliste,
    mitarbeitendeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedIt = enrichItAusstattungZugaenge(itAusstattungZugaenge, { mitarbeitendeMap });
  const enrichedMassnahmen = enrichOnboardingMassnahmen(onboardingMassnahmen, { mitarbeitendeMap });
  const enrichedCheckliste = enrichOnboardingCheckliste(onboardingCheckliste, { mitarbeitendeMap });

  // State — all hooks BEFORE early returns
  const [selectedMitId, setSelectedMitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [mitDialog, setMitDialog] = useState(false);
  const [editMit, setEditMit] = useState<Mitarbeitende | null>(null);
  const [deleteMit, setDeleteMit] = useState<Mitarbeitende | null>(null);

  const [itDialog, setItDialog] = useState(false);
  const [editIt, setEditIt] = useState<EnrichedItAusstattungZugaenge | null>(null);
  const [deleteIt, setDeleteIt] = useState<EnrichedItAusstattungZugaenge | null>(null);

  const [massnahmeDialog, setMassnahmeDialog] = useState(false);
  const [editMassnahme, setEditMassnahme] = useState<EnrichedOnboardingMassnahmen | null>(null);
  const [deleteMassnahme, setDeleteMassnahme] = useState<EnrichedOnboardingMassnahmen | null>(null);

  const [checkDialog, setCheckDialog] = useState(false);
  const [editCheck, setEditCheck] = useState<EnrichedOnboardingCheckliste | null>(null);
  const [deleteCheck, setDeleteCheck] = useState<EnrichedOnboardingCheckliste | null>(null);

  // RecordOverlay for Mitarbeitende detail
  const mitOverlay = useRecordOverlayStack<Mitarbeitende>();

  // Derived data
  const filteredMit = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return mitarbeitende.filter(m => {
      const name = `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.toLowerCase();
      const dept = (m.fields.abteilung?.label ?? '').toLowerCase();
      return !q || name.includes(q) || dept.includes(q);
    });
  }, [mitarbeitende, searchQuery]);

  const selectedMit = selectedMitId ? mitarbeitendeMap.get(selectedMitId) ?? null : null;

  const mitIt = useMemo(
    () => enrichedIt.filter(r => extractRecordId(r.fields.mitarbeitender) === selectedMitId),
    [enrichedIt, selectedMitId]
  );

  const mitMassnahmen = useMemo(
    () => enrichedMassnahmen.filter(r => extractRecordId(r.fields.mitarbeitender) === selectedMitId),
    [enrichedMassnahmen, selectedMitId]
  );

  const mitCheckliste = useMemo(
    () => enrichedCheckliste.filter(r => extractRecordId(r.fields.mitarbeitender) === selectedMitId),
    [enrichedCheckliste, selectedMitId]
  );

  // KPIs
  const totalDone = onboardingCheckliste.filter(c => c.fields.erledigt).length;
  const totalCheck = onboardingCheckliste.length;
  const totalMassnahmenDone = onboardingMassnahmen.filter(m => m.fields.status_massnahme?.key === 'durchgefuehrt').length;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleSelectMit = (id: string) => {
    setSelectedMitId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Intent Workflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/neues-onboarding"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconUserPlus size={20} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">Neues Onboarding starten</p>
            <p className="text-sm text-muted-foreground truncate">Mitarbeitenden anlegen, IT einrichten, Maßnahmen & Checkliste planen</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
        <a
          href="#/intents/onboarding-abschliessen"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconListCheck size={20} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">Onboarding abschließen</p>
            <p className="text-sm text-muted-foreground truncate">Checkliste, IT-Zugänge & Maßnahmen für einen Mitarbeitenden finalisieren</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Mitarbeitende"
          value={String(mitarbeitende.length)}
          description="Insgesamt"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="IT-Setups"
          value={String(itAusstattungZugaenge.length)}
          description="Eingerichtet"
          icon={<IconDeviceDesktop size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Checkliste"
          value={`${totalDone}/${totalCheck}`}
          description="Aufgaben erledigt"
          icon={<IconListCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Maßnahmen"
          value={String(totalMassnahmenDone)}
          description="Durchgeführt"
          icon={<IconCalendarEvent size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 min-h-[600px]">
        {/* LEFT: Mitarbeitende List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Mitarbeitende</h2>
            <Button size="sm" onClick={() => { setEditMit(null); setMitDialog(true); }}>
              <IconUserPlus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neu</span>
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Mitarbeitende cards */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[560px] pr-1">
            {filteredMit.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <IconUsers size={32} className="text-muted-foreground/50" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Keine Einträge gefunden</p>
                <Button variant="outline" size="sm" onClick={() => { setEditMit(null); setMitDialog(true); }}>
                  <IconPlus size={14} className="mr-1" />Hinzufügen
                </Button>
              </div>
            )}
            {filteredMit.map(m => {
              const { done, total } = getOnboardingProgress(m.record_id, enrichedCheckliste);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isSelected = selectedMitId === m.record_id;
              return (
                <div
                  key={m.record_id}
                  onClick={() => handleSelectMit(m.record_id)}
                  className={`group flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-semibold text-sm ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {(m.fields.vorname?.[0] ?? '?')}{(m.fields.nachname?.[0] ?? '')}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate text-foreground">
                      {m.fields.vorname} {m.fields.nachname}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.fields.position ?? m.fields.abteilung?.label ?? '—'}
                    </p>
                    {total > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{done}/{total}</span>
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setEditMit(m); setMitDialog(true); }}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <IconPencil size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteMit(m); }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <IconTrash size={13} />
                    </button>
                    <IconChevronRight size={14} className={`text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Detail Panel */}
        <div className="min-w-0">
          {!selectedMit ? (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-3 rounded-2xl border border-dashed border-border bg-muted/20">
              <IconUsers size={48} className="text-muted-foreground/30" stroke={1.5} />
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Wähle eine Person aus der Liste, um das Onboarding-Profil zu sehen.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {selectedMit.fields.vorname} {selectedMit.fields.nachname}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {selectedMit.fields.abteilung && (
                      <Badge variant="secondary">{selectedMit.fields.abteilung.label}</Badge>
                    )}
                    {selectedMit.fields.arbeitsort && (
                      <Badge variant="outline">{selectedMit.fields.arbeitsort.label}</Badge>
                    )}
                    {selectedMit.fields.vertragsart && (
                      <Badge variant="outline">{selectedMit.fields.vertragsart.label}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { mitOverlay.replace(selectedMit); }}>
                    Details
                  </Button>
                  <Button size="sm" onClick={() => { setEditMit(selectedMit); setMitDialog(true); }}>
                    <IconPencil size={14} className="mr-1" />Bearbeiten
                  </Button>
                </div>
              </div>

              {/* Info row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Position</p>
                  <p className="text-sm font-medium truncate">{selectedMit.fields.position ?? '—'}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Eintritt</p>
                  <p className="text-sm font-medium">{formatDate(selectedMit.fields.eintrittsdatum)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">E-Mail</p>
                  <p className="text-sm font-medium truncate">{selectedMit.fields.email_geschaeftlich ?? '—'}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Vorgesetzte/r</p>
                  <p className="text-sm font-medium truncate">
                    {selectedMit.fields.vorgesetzte_vorname
                      ? `${selectedMit.fields.vorgesetzte_vorname} ${selectedMit.fields.vorgesetzte_nachname ?? ''}`.trim()
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Tabs: Checkliste / Maßnahmen / IT */}
              <OnboardingTabs
                checkliste={mitCheckliste}
                massnahmen={mitMassnahmen}
                itList={mitIt}
                onNewCheck={() => { setEditCheck(null); setCheckDialog(true); }}
                onEditCheck={(c) => { setEditCheck(c); setCheckDialog(true); }}
                onDeleteCheck={(c) => setDeleteCheck(c)}
                onToggleCheck={async (c) => {
                  await LivingAppsService.updateOnboardingChecklisteEntry(c.record_id, {
                    erledigt: !c.fields.erledigt,
                  });
                  fetchAll();
                }}
                onNewMassnahme={() => { setEditMassnahme(null); setMassnahmeDialog(true); }}
                onEditMassnahme={(m) => { setEditMassnahme(m); setMassnahmeDialog(true); }}
                onDeleteMassnahme={(m) => setDeleteMassnahme(m)}
                onNewIt={() => { setEditIt(null); setItDialog(true); }}
                onEditIt={(it) => { setEditIt(it); setItDialog(true); }}
                onDeleteIt={(it) => setDeleteIt(it)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* Mitarbeitende Dialog */}
      <MitarbeitendeDialog
        open={mitDialog}
        onClose={() => { setMitDialog(false); setEditMit(null); }}
        onSubmit={async (fields) => {
          if (editMit) {
            await LivingAppsService.updateMitarbeitendeEntry(editMit.record_id, fields);
          } else {
            await LivingAppsService.createMitarbeitendeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editMit?.fields}
        recordId={editMit?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeitende']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeitende']}
      />

      {/* IT Dialog */}
      <ItAusstattungZugaengeDialog
        open={itDialog}
        onClose={() => { setItDialog(false); setEditIt(null); }}
        onSubmit={async (fields) => {
          if (editIt) {
            await LivingAppsService.updateItAusstattungZugaengeEntry(editIt.record_id, fields);
          } else {
            const f = { ...fields };
            if (selectedMitId) {
              f.mitarbeitender = createRecordUrl(APP_IDS.MITARBEITENDE, selectedMitId);
            }
            await LivingAppsService.createItAusstattungZugaengeEntry(f);
          }
          fetchAll();
        }}
        defaultValues={editIt
          ? editIt.fields
          : selectedMitId
            ? { mitarbeitender: createRecordUrl(APP_IDS.MITARBEITENDE, selectedMitId) }
            : undefined}
        recordId={editIt?.record_id}
        mitarbeitendeList={mitarbeitende}
        enablePhotoScan={AI_PHOTO_SCAN['ItAusstattungZugaenge']}
        enablePhotoLocation={AI_PHOTO_LOCATION['ItAusstattungZugaenge']}
      />

      {/* Maßnahmen Dialog */}
      <OnboardingMassnahmenDialog
        open={massnahmeDialog}
        onClose={() => { setMassnahmeDialog(false); setEditMassnahme(null); }}
        onSubmit={async (fields) => {
          if (editMassnahme) {
            await LivingAppsService.updateOnboardingMassnahmenEntry(editMassnahme.record_id, fields);
          } else {
            const f = { ...fields };
            if (selectedMitId) {
              f.mitarbeitender = createRecordUrl(APP_IDS.MITARBEITENDE, selectedMitId);
            }
            await LivingAppsService.createOnboardingMassnahmenEntry(f);
          }
          fetchAll();
        }}
        defaultValues={editMassnahme
          ? editMassnahme.fields
          : selectedMitId
            ? { mitarbeitender: createRecordUrl(APP_IDS.MITARBEITENDE, selectedMitId) }
            : undefined}
        recordId={editMassnahme?.record_id}
        mitarbeitendeList={mitarbeitende}
        enablePhotoScan={AI_PHOTO_SCAN['OnboardingMassnahmen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['OnboardingMassnahmen']}
      />

      {/* Checkliste Dialog */}
      <OnboardingChecklisteDialog
        open={checkDialog}
        onClose={() => { setCheckDialog(false); setEditCheck(null); }}
        onSubmit={async (fields) => {
          if (editCheck) {
            await LivingAppsService.updateOnboardingChecklisteEntry(editCheck.record_id, fields);
          } else {
            const f = { ...fields };
            if (selectedMitId) {
              f.mitarbeitender = createRecordUrl(APP_IDS.MITARBEITENDE, selectedMitId);
            }
            await LivingAppsService.createOnboardingChecklisteEntry(f);
          }
          fetchAll();
        }}
        defaultValues={editCheck
          ? editCheck.fields
          : selectedMitId
            ? { mitarbeitender: createRecordUrl(APP_IDS.MITARBEITENDE, selectedMitId) }
            : undefined}
        recordId={editCheck?.record_id}
        mitarbeitendeList={mitarbeitende}
        enablePhotoScan={AI_PHOTO_SCAN['OnboardingCheckliste']}
        enablePhotoLocation={AI_PHOTO_LOCATION['OnboardingCheckliste']}
      />

      {/* Confirm Deletes */}
      <ConfirmDialog
        open={!!deleteMit}
        title="Mitarbeitende/n löschen"
        description={`${deleteMit?.fields.vorname} ${deleteMit?.fields.nachname} wirklich löschen?`}
        onConfirm={async () => {
          if (deleteMit) {
            await LivingAppsService.deleteMitarbeitendeEntry(deleteMit.record_id);
            if (selectedMitId === deleteMit.record_id) setSelectedMitId(null);
            setDeleteMit(null);
            fetchAll();
          }
        }}
        onClose={() => setDeleteMit(null)}
      />
      <ConfirmDialog
        open={!!deleteIt}
        title="IT-Ausstattung löschen"
        description="Diesen Eintrag wirklich löschen?"
        onConfirm={async () => {
          if (deleteIt) {
            await LivingAppsService.deleteItAusstattungZugaengeEntry(deleteIt.record_id);
            setDeleteIt(null);
            fetchAll();
          }
        }}
        onClose={() => setDeleteIt(null)}
      />
      <ConfirmDialog
        open={!!deleteMassnahme}
        title="Maßnahme löschen"
        description="Diese Maßnahme wirklich löschen?"
        onConfirm={async () => {
          if (deleteMassnahme) {
            await LivingAppsService.deleteOnboardingMassnahmenEntry(deleteMassnahme.record_id);
            setDeleteMassnahme(null);
            fetchAll();
          }
        }}
        onClose={() => setDeleteMassnahme(null)}
      />
      <ConfirmDialog
        open={!!deleteCheck}
        title="Aufgabe löschen"
        description="Diese Aufgabe wirklich löschen?"
        onConfirm={async () => {
          if (deleteCheck) {
            await LivingAppsService.deleteOnboardingChecklisteEntry(deleteCheck.record_id);
            setDeleteCheck(null);
            fetchAll();
          }
        }}
        onClose={() => setDeleteCheck(null)}
      />

      {/* Mitarbeitende Record Overlay */}
      {mitOverlay.top && (
        <RecordOverlay
          open={!!mitOverlay.top}
          onClose={mitOverlay.close}
          onEdit={() => { setEditMit(mitOverlay.top!); setMitDialog(true); mitOverlay.close(); }}
          placement="side"
          size="md"
        >
          <RecordHeader
            title={`${mitOverlay.top.fields.vorname ?? ''} ${mitOverlay.top.fields.nachname ?? ''}`.trim()}
            subtitle={mitOverlay.top.fields.position}
            badges={[
              mitOverlay.top.fields.abteilung?.label,
              mitOverlay.top.fields.vertragsart?.label,
            ].filter(Boolean) as string[]}
          />
          <RecordKeyFacts items={[
            { label: 'Eintrittsdatum', value: formatDate(mitOverlay.top.fields.eintrittsdatum) },
            { label: 'Arbeitsort', value: mitOverlay.top.fields.arbeitsort?.label ?? '—' },
          ]} />
          <RecordSection title="Kontakt" cols={2}>
            <RecordField label="E-Mail" value={mitOverlay.top.fields.email_geschaeftlich} format="email" hideEmpty />
            <RecordField label="Telefon" value={mitOverlay.top.fields.telefon} format="text" hideEmpty />
          </RecordSection>
          <RecordSection title="Organisation" cols={2}>
            <RecordField label="Abteilung" value={mitOverlay.top.fields.abteilung?.label} format="text" hideEmpty />
            <RecordField label="Vertragsart" value={mitOverlay.top.fields.vertragsart?.label} format="text" hideEmpty />
            <RecordField
              label="Vorgesetzte/r"
              value={mitOverlay.top.fields.vorgesetzte_vorname
                ? `${mitOverlay.top.fields.vorgesetzte_vorname} ${mitOverlay.top.fields.vorgesetzte_nachname ?? ''}`.trim()
                : undefined}
              format="text"
              hideEmpty
            />
          </RecordSection>
          <RecordAttachments appId={APP_IDS.MITARBEITENDE} recordId={mitOverlay.top.record_id} />
        </RecordOverlay>
      )}
    </div>
  );
}

// ── Onboarding Tabs ──────────────────────────────────────────────────────────

type TabId = 'checkliste' | 'massnahmen' | 'it';

interface OnboardingTabsProps {
  checkliste: EnrichedOnboardingCheckliste[];
  massnahmen: EnrichedOnboardingMassnahmen[];
  itList: EnrichedItAusstattungZugaenge[];
  onNewCheck: () => void;
  onEditCheck: (c: EnrichedOnboardingCheckliste) => void;
  onDeleteCheck: (c: EnrichedOnboardingCheckliste) => void;
  onToggleCheck: (c: EnrichedOnboardingCheckliste) => void;
  onNewMassnahme: () => void;
  onEditMassnahme: (m: EnrichedOnboardingMassnahmen) => void;
  onDeleteMassnahme: (m: EnrichedOnboardingMassnahmen) => void;
  onNewIt: () => void;
  onEditIt: (it: EnrichedItAusstattungZugaenge) => void;
  onDeleteIt: (it: EnrichedItAusstattungZugaenge) => void;
}

function OnboardingTabs({
  checkliste, massnahmen, itList,
  onNewCheck, onEditCheck, onDeleteCheck, onToggleCheck,
  onNewMassnahme, onEditMassnahme, onDeleteMassnahme,
  onNewIt, onEditIt, onDeleteIt,
}: OnboardingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('checkliste');

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'checkliste', label: 'Checkliste', count: checkliste.length },
    { id: 'massnahmen', label: 'Maßnahmen', count: massnahmen.length },
    { id: 'it', label: 'IT & Zugänge', count: itList.length },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-background border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'checkliste' && (
          <ChecklisteTab
            items={checkliste}
            onNew={onNewCheck}
            onEdit={onEditCheck}
            onDelete={onDeleteCheck}
            onToggle={onToggleCheck}
          />
        )}
        {activeTab === 'massnahmen' && (
          <MassnahmenTab
            items={massnahmen}
            onNew={onNewMassnahme}
            onEdit={onEditMassnahme}
            onDelete={onDeleteMassnahme}
          />
        )}
        {activeTab === 'it' && (
          <ItTab
            items={itList}
            onNew={onNewIt}
            onEdit={onEditIt}
            onDelete={onDeleteIt}
          />
        )}
      </div>
    </div>
  );
}

// ── Checkliste Tab ───────────────────────────────────────────────────────────

function ChecklisteTab({
  items, onNew, onEdit, onDelete, onToggle,
}: {
  items: EnrichedOnboardingCheckliste[];
  onNew: () => void;
  onEdit: (c: EnrichedOnboardingCheckliste) => void;
  onDelete: (c: EnrichedOnboardingCheckliste) => void;
  onToggle: (c: EnrichedOnboardingCheckliste) => void;
}) {
  const done = items.filter(i => i.fields.erledigt).length;

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, EnrichedOnboardingCheckliste[]>();
    items.forEach(item => {
      const key = item.fields.kategorie?.label ?? 'Sonstiges';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">{done} / {items.length} erledigt</span>
          )}
          {done === items.length && items.length > 0 && (
            <span className="text-xs bg-green-500/10 text-green-700 px-2 py-0.5 rounded-full">Vollständig</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onNew}>
          <IconPlus size={13} className="mr-1" />Aufgabe
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-center">
          <IconListCheck size={32} className="text-muted-foreground/40" stroke={1.5} />
          <p className="text-sm text-muted-foreground">Noch keine Aufgaben</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <div
                    key={item.record_id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                      item.fields.erledigt
                        ? 'bg-green-500/5 border-green-200'
                        : 'bg-background border-border hover:border-primary/20'
                    }`}
                  >
                    <button
                      onClick={() => onToggle(item)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        item.fields.erledigt
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-muted-foreground/40 hover:border-primary'
                      }`}
                    >
                      {item.fields.erledigt && <IconCheck size={11} stroke={2.5} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${item.fields.erledigt ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.fields.aufgabe_bezeichnung ?? '—'}
                      </p>
                      <div className="flex gap-3 mt-0.5">
                        {item.fields.faelligkeitsdatum && (
                          <span className="text-xs text-muted-foreground">{formatDate(item.fields.faelligkeitsdatum)}</span>
                        )}
                        {(item.fields.verantwortliche_aufgabe_vorname || item.fields.verantwortliche_aufgabe_nachname) && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.fields.verantwortliche_aufgabe_vorname} {item.fields.verantwortliche_aufgabe_nachname}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <IconPencil size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Maßnahmen Tab ────────────────────────────────────────────────────────────

function MassnahmenTab({
  items, onNew, onEdit, onDelete,
}: {
  items: EnrichedOnboardingMassnahmen[];
  onNew: () => void;
  onEdit: (m: EnrichedOnboardingMassnahmen) => void;
  onDelete: (m: EnrichedOnboardingMassnahmen) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onNew}>
          <IconPlus size={13} className="mr-1" />Maßnahme
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-center">
          <IconCalendarEvent size={32} className="text-muted-foreground/40" stroke={1.5} />
          <p className="text-sm text-muted-foreground">Noch keine Maßnahmen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m.record_id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:border-primary/20 transition-colors">
              {/* Status dot */}
              <div className="mt-1 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusColor(m.fields.status_massnahme?.key)}`}>
                  {m.fields.status_massnahme?.label ?? 'Offen'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{m.fields.bezeichnung ?? '—'}</p>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {m.fields.typ && (
                    <span className="text-xs text-muted-foreground">{m.fields.typ.label}</span>
                  )}
                  {m.fields.datum_uhrzeit && (
                    <span className="text-xs text-muted-foreground">{formatDate(m.fields.datum_uhrzeit)}</span>
                  )}
                  {(m.fields.verantwortliche_vorname || m.fields.verantwortliche_nachname) && (
                    <span className="text-xs text-muted-foreground">
                      {m.fields.verantwortliche_vorname} {m.fields.verantwortliche_nachname}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onEdit(m)}
                  className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IconPencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(m)}
                  className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── IT Tab ───────────────────────────────────────────────────────────────────

function ItTab({
  items, onNew, onEdit, onDelete,
}: {
  items: EnrichedItAusstattungZugaenge[];
  onNew: () => void;
  onEdit: (it: EnrichedItAusstattungZugaenge) => void;
  onDelete: (it: EnrichedItAusstattungZugaenge) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onNew}>
          <IconPlus size={13} className="mr-1" />IT-Eintrag
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-center">
          <IconDeviceDesktop size={32} className="text-muted-foreground/40" stroke={1.5} />
          <p className="text-sm text-muted-foreground">Noch keine IT-Ausstattung</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(it => (
            <div key={it.record_id} className="p-3 rounded-xl border border-border bg-background hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{it.fields.laptop_modell ?? 'Gerät'}</p>
                    {it.fields.betriebssystem && (
                      <Badge variant="outline" className="text-xs">{it.fields.betriebssystem.label}</Badge>
                    )}
                  </div>
                  {/* Checkboxes */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <CheckItem label="E-Mail" done={it.fields.email_konto_erstellt} />
                    <CheckItem label="VPN" done={it.fields.vpn_zugang_eingerichtet} />
                    <CheckItem label="Zugangsdaten" done={it.fields.zugangsdaten_uebergeben} />
                  </div>
                  {/* Software */}
                  {it.fields.softwarelizenzen && it.fields.softwarelizenzen.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {it.fields.softwarelizenzen.map(sw => (
                        <span key={sw.key} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {sw.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(it)}
                    className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconPencil size={13} />
                  </button>
                  <button
                    onClick={() => onDelete(it)}
                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, done }: { label: string; done?: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-xs ${done ? 'text-green-600' : 'text-muted-foreground'}`}>
      {done ? <IconCheck size={12} stroke={2.5} /> : <IconX size={12} />}
      {label}
    </span>
  );
}

// ── Skeleton & Error ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-full" />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) { setRepairing(false); setRepairFailed(true); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen.</p>}
    </div>
  );
}
