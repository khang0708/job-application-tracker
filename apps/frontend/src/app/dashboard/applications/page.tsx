'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { getKanbanGroups } from '@/lib/api/applications';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { TableView } from '@/components/applications/TableView';
import { AddApplicationDialog } from '@/components/applications/AddApplicationDialog';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import type { Application, KanbanGroups } from '@/lib/types';

const EMPTY_GROUPS: KanbanGroups = {
  APPLIED: [],
  SCREENING: [],
  INTERVIEW: [],
  OFFER: [],
  REJECTED: [],
  WITHDRAWN: [],
};

type ViewMode = 'kanban' | 'table';

export default function ApplicationsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [groups, setGroups] = useState<KanbanGroups | null>(null);
  const [view, setView] = useState<ViewMode>('kanban');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getKanbanGroups().then(setGroups).catch(() => setError(true));
  }, [token, router]);

  function handleApplicationAdded(app: Application) {
    setGroups((g) => g ? { ...g, APPLIED: [app, ...g.APPLIED] } : g);
  }

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
    <main className="min-h-screen p-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Applications</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 transition ${
                view === 'kanban'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 transition border-l border-gray-200 ${
                view === 'table'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Table
            </button>
          </div>

          <AddApplicationDialog onAdded={handleApplicationAdded} />
        </div>
      </div>

      {/* View */}
      {view === 'kanban' ? (
        <KanbanBoard
          groups={groups}
          onGroupsChange={setGroups}
          onCardClick={setSelectedAppId}
        />
      ) : (
        <TableView
          groups={groups}
          onGroupsChange={setGroups}
          onCardClick={setSelectedAppId}
        />
      )}

      {/* Detail modal (shared between views) */}
      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      )}
    </main>
  );
}
