import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { OnboardingCheckliste, Mitarbeitende } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { OnboardingChecklisteDialog } from '@/components/dialogs/OnboardingChecklisteDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/OnboardingCheckliste';
import { evalComputed } from '@/config/form-enhancements/types';

export default function OnboardingChecklisteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<OnboardingCheckliste | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mitarbeitendeList, setMitarbeitendeList] = useState<Mitarbeitende[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, mitarbeitendeData] = await Promise.all([
        LivingAppsService.getOnboardingCheckliste(),
        LivingAppsService.getMitarbeitende(),
      ]);
      setMitarbeitendeList(mitarbeitendeData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: OnboardingCheckliste['fields']) {
    if (!record) return;
    await LivingAppsService.updateOnboardingChecklisteEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteOnboardingChecklisteEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/onboarding-checkliste');
  }

  function getMitarbeitendeDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return mitarbeitendeList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/onboarding-checkliste')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/onboarding-checkliste')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.aufgabe_bezeichnung ?? 'Onboarding-Checkliste'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          mitarbeitender: mitarbeitendeList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Mitarbeitende/r" value={getMitarbeitendeDisplayName(record.fields.mitarbeitender)} format="text" />
        <RecordField label="Aufgabenbezeichnung" value={record.fields.aufgabe_bezeichnung} format="text" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Fälligkeitsdatum" value={record.fields.faelligkeitsdatum} format="date" />
        <RecordField label="Vorname der verantwortlichen Person" value={record.fields.verantwortliche_aufgabe_vorname} format="text" />
        <RecordField label="Nachname der verantwortlichen Person" value={record.fields.verantwortliche_aufgabe_nachname} format="text" />
        <RecordField label="Erledigt" value={record.fields.erledigt} format="bool" />
        <RecordField label="Anmerkungen" value={record.fields.anmerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ONBOARDING_CHECKLISTE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <OnboardingChecklisteDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        mitarbeitendeList={mitarbeitendeList}
        enablePhotoScan={AI_PHOTO_SCAN['OnboardingCheckliste']}
        enablePhotoLocation={AI_PHOTO_LOCATION['OnboardingCheckliste']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Onboarding-Checkliste löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
