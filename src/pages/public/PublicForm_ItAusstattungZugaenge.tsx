import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a3cd29b3c9b632af0e46c2b';
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

export default function PublicFormItAusstattungZugaenge() {
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
          <h1 className="text-2xl font-bold text-foreground">IT-Ausstattung & Zugänge — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="laptop_modell">Laptop-Modell</Label>
            <Input
              id="laptop_modell"
              placeholder=""
              value={fields.laptop_modell ?? ''}
              onChange={e => setFields(f => ({ ...f, laptop_modell: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="betriebssystem">Betriebssystem</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.betriebssystem) === 'macos'}
                onClick={() => setFields(f => ({ ...f, betriebssystem: (lookupKey(f.betriebssystem) === 'macos' ? undefined : 'macos') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.betriebssystem) === 'macos'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                macOS
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.betriebssystem) === 'windows'}
                onClick={() => setFields(f => ({ ...f, betriebssystem: (lookupKey(f.betriebssystem) === 'windows' ? undefined : 'windows') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.betriebssystem) === 'windows'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Windows
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.betriebssystem) === 'linux'}
                onClick={() => setFields(f => ({ ...f, betriebssystem: (lookupKey(f.betriebssystem) === 'linux' ? undefined : 'linux') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.betriebssystem) === 'linux'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Linux
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zubehoer">Zubehör</Label>
            <Textarea
              id="zubehoer"
              placeholder=""
              value={fields.zubehoer ?? ''}
              onChange={e => setFields(f => ({ ...f, zubehoer: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="softwarelizenzen">Benötigte Softwarelizenzen</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_microsoft_365"
                  checked={lookupKeys(fields.softwarelizenzen).includes('microsoft_365')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'microsoft_365'] : current.filter(k => k !== 'microsoft_365');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_microsoft_365" className="font-normal">Microsoft 365</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_slack"
                  checked={lookupKeys(fields.softwarelizenzen).includes('slack')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'slack'] : current.filter(k => k !== 'slack');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_slack" className="font-normal">Slack</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_jira"
                  checked={lookupKeys(fields.softwarelizenzen).includes('jira')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'jira'] : current.filter(k => k !== 'jira');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_jira" className="font-normal">Jira</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_confluence"
                  checked={lookupKeys(fields.softwarelizenzen).includes('confluence')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'confluence'] : current.filter(k => k !== 'confluence');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_confluence" className="font-normal">Confluence</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_github"
                  checked={lookupKeys(fields.softwarelizenzen).includes('github')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'github'] : current.filter(k => k !== 'github');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_github" className="font-normal">GitHub</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_gitlab"
                  checked={lookupKeys(fields.softwarelizenzen).includes('gitlab')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'gitlab'] : current.filter(k => k !== 'gitlab');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_gitlab" className="font-normal">GitLab</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_figma"
                  checked={lookupKeys(fields.softwarelizenzen).includes('figma')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'figma'] : current.filter(k => k !== 'figma');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_figma" className="font-normal">Figma</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_adobe_cc"
                  checked={lookupKeys(fields.softwarelizenzen).includes('adobe_cc')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'adobe_cc'] : current.filter(k => k !== 'adobe_cc');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_adobe_cc" className="font-normal">Adobe Creative Cloud</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_zoom"
                  checked={lookupKeys(fields.softwarelizenzen).includes('zoom')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'zoom'] : current.filter(k => k !== 'zoom');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_zoom" className="font-normal">Zoom</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_onepassword"
                  checked={lookupKeys(fields.softwarelizenzen).includes('onepassword')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'onepassword'] : current.filter(k => k !== 'onepassword');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_onepassword" className="font-normal">1Password</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="softwarelizenzen_sonstiges_software"
                  checked={lookupKeys(fields.softwarelizenzen).includes('sonstiges_software')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.softwarelizenzen);
                      const next = checked ? [...current, 'sonstiges_software'] : current.filter(k => k !== 'sonstiges_software');
                      return { ...f, softwarelizenzen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="softwarelizenzen_sonstiges_software" className="font-normal">Sonstiges</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_konto_erstellt">E-Mail-Konto erstellt</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="email_konto_erstellt"
                checked={!!fields.email_konto_erstellt}
                onCheckedChange={(v) => setFields(f => ({ ...f, email_konto_erstellt: !!v }))}
              />
              <Label htmlFor="email_konto_erstellt" className="font-normal">E-Mail-Konto erstellt</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vpn_zugang_eingerichtet">VPN-Zugang eingerichtet</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="vpn_zugang_eingerichtet"
                checked={!!fields.vpn_zugang_eingerichtet}
                onCheckedChange={(v) => setFields(f => ({ ...f, vpn_zugang_eingerichtet: !!v }))}
              />
              <Label htmlFor="vpn_zugang_eingerichtet" className="font-normal">VPN-Zugang eingerichtet</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zugangsdaten_uebergeben">Zugangsdaten übergeben</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="zugangsdaten_uebergeben"
                checked={!!fields.zugangsdaten_uebergeben}
                onCheckedChange={(v) => setFields(f => ({ ...f, zugangsdaten_uebergeben: !!v }))}
              />
              <Label htmlFor="zugangsdaten_uebergeben" className="font-normal">Zugangsdaten übergeben</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_it">Notizen</Label>
            <Textarea
              id="notizen_it"
              placeholder=""
              value={fields.notizen_it ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_it: e.target.value }))}
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
