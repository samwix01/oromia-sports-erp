'use client';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button, ErrorText, Field, Input, Panel } from '@/components/erp/ui';
import { useRouter } from '@/i18n/routing';
import { api, ApiError } from '@/lib/api';

export default function LoginPage() {
  const t = useTranslations('erp.login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/login', { body: { email, password, ...(needTotp ? { totp } : {}) } });
      router.replace('/erp');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'totp_required') setNeedTotp(true);
      else setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Panel title={t('title')}>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('email')}>
            <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('password')}>
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {needTotp ? (
            <Field label={t('totp')} hint={t('totpHint')}>
              <Input inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required value={totp} onChange={(e) => setTotp(e.target.value)} />
            </Field>
          ) : null}
          <ErrorText error={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {t('submit')}
          </Button>
        </form>
      </Panel>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t('testDataNote')}</p>
    </div>
  );
}
