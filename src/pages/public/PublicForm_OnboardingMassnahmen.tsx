import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a3cd29d345bd8a6cb09280e';
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

export default function PublicFormOnboardingMassnahmen() {
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
          <h1 className="text-2xl font-bold text-foreground">Onboarding-Maßnahmen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="bezeichnung">Bezeichnung der Maßnahme</Label>
            <Input
              id="bezeichnung"
              placeholder=""
              value={fields.bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typ">Typ der Maßnahme</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.typ) === 'schulung'}
                onClick={() => setFields(f => ({ ...f, typ: (lookupKey(f.typ) === 'schulung' ? undefined : 'schulung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.typ) === 'schulung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Schulung
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.typ) === 'meeting'}
                onClick={() => setFields(f => ({ ...f, typ: (lookupKey(f.typ) === 'meeting' ? undefined : 'meeting') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.typ) === 'meeting'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Meeting
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.typ) === 'einfuehrungsgespraech'}
                onClick={() => setFields(f => ({ ...f, typ: (lookupKey(f.typ) === 'einfuehrungsgespraech' ? undefined : 'einfuehrungsgespraech') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.typ) === 'einfuehrungsgespraech'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Einführungsgespräch
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.typ) === 'teamvorstellung'}
                onClick={() => setFields(f => ({ ...f, typ: (lookupKey(f.typ) === 'teamvorstellung' ? undefined : 'teamvorstellung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.typ) === 'teamvorstellung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Teamvorstellung
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.typ) === 'sonstiges_massnahme'}
                onClick={() => setFields(f => ({ ...f, typ: (lookupKey(f.typ) === 'sonstiges_massnahme' ? undefined : 'sonstiges_massnahme') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.typ) === 'sonstiges_massnahme'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="datum_uhrzeit">Datum und Uhrzeit</Label>
            <DatePicker
              id="datum_uhrzeit"
              placeholder=""
              mode="datetime"
              value={fields.datum_uhrzeit ?? null}
              onChange={v => setFields(f => ({ ...f, datum_uhrzeit: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortliche_vorname">Vorname der verantwortlichen Person</Label>
            <Input
              id="verantwortliche_vorname"
              placeholder=""
              value={fields.verantwortliche_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortliche_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortliche_nachname">Nachname der verantwortlichen Person</Label>
            <Input
              id="verantwortliche_nachname"
              placeholder=""
              value={fields.verantwortliche_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortliche_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status_massnahme">Status</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status_massnahme) === 'geplant'}
                onClick={() => setFields(f => ({ ...f, status_massnahme: (lookupKey(f.status_massnahme) === 'geplant' ? undefined : 'geplant') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status_massnahme) === 'geplant'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Geplant
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status_massnahme) === 'durchgefuehrt'}
                onClick={() => setFields(f => ({ ...f, status_massnahme: (lookupKey(f.status_massnahme) === 'durchgefuehrt' ? undefined : 'durchgefuehrt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status_massnahme) === 'durchgefuehrt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Durchgeführt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status_massnahme) === 'abgesagt'}
                onClick={() => setFields(f => ({ ...f, status_massnahme: (lookupKey(f.status_massnahme) === 'abgesagt' ? undefined : 'abgesagt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status_massnahme) === 'abgesagt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Abgesagt
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_massnahme">Notizen</Label>
            <Textarea
              id="notizen_massnahme"
              placeholder=""
              value={fields.notizen_massnahme ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_massnahme: e.target.value }))}
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
