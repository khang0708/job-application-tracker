'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getKanbanGroups } from '@/lib/api/applications';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { TableView } from '@/components/applications/TableView';
import { AddApplicationDialog } from '@/components/applications/AddApplicationDialog';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import type { Application, KanbanGroups } from '@/lib/types';

const EMPTY: KanbanGroups = {
  APPLIED: [], SCREENING: [], INTERVIEW: [], OFFER: [], REJECTED: [], WITHDRAWN: [],
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

  return (
    <DashboardShell>
      <div className="flex flex-col h-full">
        {/* Page header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/60 glass-light">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Applications</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {groups ? Object.values(groups).flat().length : '—'} application
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200/80 overflow-hidden p-0.5 bg-white/50">
              <button
                onClick={() => setView('kanban')}
                title="Kanban"
                className={`p-1.5 rounded-md transition ${view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('table')}
                title="Table"
                className={`p-1.5 rounded-md transition ${view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <AddApplicationDialog onAdded={handleApplicationAdded} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && <p className="text-red-500 text-sm">Không thể tải dữ liệu. Vui lòng làm mới trang.</p>}

          {!groups && !error && (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Đang tải…
            </div>
          )}

          {groups && view === 'kanban' && (
            <KanbanBoard groups={groups} onGroupsChange={setGroups} onCardClick={setSelectedAppId} />
          )}

          {groups && view === 'table' && (
            <TableView groups={groups} onGroupsChange={setGroups} onCardClick={setSelectedAppId} />
          )}
        </div>
      </div>

      {selectedAppId && (
        <ApplicationDetailModal applicationId={selectedAppId} onClose={() => setSelectedAppId(null)} />
      )}
    </DashboardShell>
  );
}
