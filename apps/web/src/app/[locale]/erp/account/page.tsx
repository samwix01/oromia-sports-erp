'use client';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useSession } from '@/components/erp/session';
import { Button, ErrorText, Field, Input, PageTitle, Panel, Pill } from '@/components/erp/ui';
import { api } from '@/lib/api';

export default function Account() {
  const t = useTranslations('erp.account');
  const { me, reload } = useSession();
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<unknown>(null);
  const [pwOk, setPwOk] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [mfaErr, setMfaErr] = useState<unknown>(null);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwOk(false);
    try {
      await api('/auth/password', { body: pw });
      setPwOk(true);
      setPw({ current: '', next: '' });
    } catch (err) {
      setPwMsg(err);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setMfaErr(null);
    try {
      await api('/auth/totp/confirm', { body: { code } });
      setSetup(null);
      await reload();
    } catch (err) {
      setMfaErr(err);
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle>{t('title')}</PageTitle>
      <Panel title={t('password')}>
        <form onSubmit={changePassword} className="grid max-w-md gap-3">
          <Field label={t('current')}><Input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label={t('new')} hint={t('rule')}><Input type="password" autoComplete="new-password" required minLength={12} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          <ErrorText error={pwMsg} />
          {pwOk ? <p className="text-sm text-primary">{t('changed')}</p> : null}
          <Button type="submit">{t('change')}</Button>
        </form>
      </Panel>
      <Panel title={t('mfa')}>
        {me?.mfaEnabled ? (
          <Pill tone="good">{t('mfaOn')}</Pill>
        ) : setup ? (
          <form onSubmit={confirm} className="grid max-w-md gap-3 text-sm">
            <p>{t('mfaStep1')}</p>
            <code className="break-all rounded bg-muted p-2">{setup.secret}</code>
            <a className="underline" href={setup.otpauthUrl}>{t('mfaOpenApp')}</a>
            <Field label={t('mfaCode')}><Input inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <ErrorText error={mfaErr} />
            <Button type="submit">{t('mfaConfirm')}</Button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('mfaIntro')}</p>
            <Button onClick={async () => setSetup(await api('/auth/totp/setup', { body: {} }))}>{t('mfaEnable')}</Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
