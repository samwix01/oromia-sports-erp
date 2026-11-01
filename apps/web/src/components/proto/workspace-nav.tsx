'use client';
import type { Workspace } from '@oromia/contracts';
import { cn } from '@oromia/ui';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

export function WorkspaceNav({ workspace }: { workspace: Workspace }) {
  const t = useTranslations('proto.nav');
  const pathname = usePathname();
  const items =
    workspace === 'bureau'
      ? [
          { href: '/bureau', label: t('commandCentre') },
          { href: '/bureau/plans', label: t('plans') },
        ]
      : [
          { href: `/${workspace}`, label: t('home') },
          { href: `/${workspace}/entries`, label: t('entries') },
        ];
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2 text-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn('rounded-lg px-3 py-1.5 hover:bg-muted', pathname === i.href && 'bg-muted font-semibold')}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
