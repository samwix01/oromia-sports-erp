'use client';
import { cn } from '@oromia/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SessionProvider, useSession } from '@/components/erp/session';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';

const NAV: { href: string; key: string; perm?: string }[] = [
  { href: '/erp', key: 'dashboard' },
  { href: '/erp/inbox', key: 'inbox', perm: 'workflow.inbox' },
  { href: '/erp/people', key: 'people', perm: 'people.read' },
  { href: '/erp/people/new', key: 'registerPerson', perm: 'people.register' },
  { href: '/erp/organisations', key: 'organisations', perm: 'institutions.read' },
  { href: '/erp/organisations/new', key: 'registerOrganisation', perm: 'institutions.organisation.submit' },
  { href: '/erp/duplicates', key: 'duplicates', perm: 'people.duplicate.decide' },
  { href: '/erp/users', key: 'users', perm: 'iam.user.read' },
  { href: '/erp/account', key: 'account' },
];

function Shell({ children }: { children: ReactNode }) {
  const t = useTranslations('erp');
  const { me, can } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="font-semibold">{me?.fullName}</div>
          <div className="text-xs text-muted-foreground">{me?.assignments.map((a) => t(`roles.${a.roleKey}` as never)).join(' · ')}</div>
        </div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <Link key={n.href} href={n.href} className={cn('rounded-lg px-3 py-2 text-sm hover:bg-muted', pathname === n.href && 'bg-muted font-semibold')}>
              {t(`nav.${n.key}` as never)}
            </Link>
          ))}
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={async () => {
              await api('/auth/logout', { body: {} }).catch(() => undefined);
              router.replace('/login');
            }}
          >
            {t('nav.signOut')}
          </button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function ErpLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
