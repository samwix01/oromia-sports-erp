'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/i18n/routing';
import { api, ApiError, type Me } from '@/lib/api';

const Ctx = createContext<{ me: Me | null; can: (p: string) => boolean; reload: () => Promise<void> }>({
  me: null,
  can: () => false,
  reload: async () => undefined,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  const reload = useCallback(async () => {
    try {
      setMe(await api<Me>('/auth/me'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace('/login');
    } finally {
      setLoaded(true);
    }
  }, [router]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!loaded || !me) return <div className="p-8 text-sm text-muted-foreground">…</div>;
  return <Ctx.Provider value={{ me, can: (p) => me.permissions.includes(p), reload }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
