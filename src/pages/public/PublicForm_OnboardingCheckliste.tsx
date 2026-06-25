import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a3cd29d933c8e906414188a';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormOnboardingCheckliste() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Onboarding-Checkliste — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="aufgabe_bezeichnung">Aufgabenbezeichnung</Label>
            <Input
              id="aufgabe_bezeichnung"
              placeholder=""
              value={fields.aufgabe_bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, aufgabe_bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'hr'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'hr' ? undefined : 'hr') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'hr'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                HR & Personal
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'it'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'it' ? undefined : 'it') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'it'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                IT & Infrastruktur
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'fuehrungskraft'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'fuehrungskraft' ? undefined : 'fuehrungskraft') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'fuehrungskraft'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Führungskraft
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'team'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'team' ? undefined : 'team') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'team'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Team
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'sonstiges_kategorie'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'sonstiges_kategorie' ? undefined : 'sonstiges_kategorie') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'sonstiges_kategorie'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum</Label>
            <DatePicker
              id="faelligkeitsdatum"
              placeholder=""
              mode="date"
              value={fields.faelligkeitsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, faelligkeitsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortliche_aufgabe_vorname">Vorname der verantwortlichen Person</Label>
            <Input
              id="verantwortliche_aufgabe_vorname"
              placeholder=""
              value={fields.verantwortliche_aufgabe_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortliche_aufgabe_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortliche_aufgabe_nachname">Nachname der verantwortlichen Person</Label>
            <Input
              id="verantwortliche_aufgabe_nachname"
              placeholder=""
              value={fields.verantwortliche_aufgabe_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortliche_aufgabe_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="erledigt">Erledigt</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="erledigt"
                checked={!!fields.erledigt}
                onCheckedChange={(v) => setFields(f => ({ ...f, erledigt: !!v }))}
              />
              <Label htmlFor="erledigt" className="font-normal">Erledigt</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anmerkungen">Anmerkungen</Label>
            <Textarea
              id="anmerkungen"
              placeholder=""
              value={fields.anmerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, anmerkungen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
