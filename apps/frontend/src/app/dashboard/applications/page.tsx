'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { getKanbanGroups } from '@/lib/api/applications';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import type { KanbanGroups } from '@/lib/types';

const EMPTY_GROUPS: KanbanGroups = {
  APPLIED: [],
  SCREENING: [],
  INTERVIEW: [],
  OFFER: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export default function ApplicationsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [groups, setGroups] = useState<KanbanGroups | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    getKanbanGroups()
      .then(setGroups)
      .catch(() => setError(true));
  }, [token, router]);

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-500">Failed to load applications. Please refresh.</p>
      </main>
    );
  }

  if (!groups) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <KanbanBoard initialGroups={groups ?? EMPTY_GROUPS} />
    </main>
  );
}
