'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { getKanbanGroups } from '@/lib/api/applications';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { TableView } from '@/components/applications/TableView';
import { AddApplicationDialog } from '@/components/applications/AddApplicationDialog';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import type { Application, ApplicationStatus, KanbanGroups } from '@/lib/types';

const EMPTY: KanbanGroups = {
  APPLIED: [], SCREENING: [], INTERVIEW: [], OFFER: [], REJECTED: [], WITHDRAWN: [],
};

type ViewMode = 'kanban' | 'table';

export default function ApplicationsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [groups, setGroups] = useState<KanbanGroups | null>(null);
  const [view, setView] = useState<ViewMode>('kanban');
  const [sortByMatch, setSortByMatch] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const sortedGroups = useMemo<KanbanGroups | null>(() => {
    if (!groups || !sortByMatch) return groups;
    const sorted = {} as KanbanGroups;
    for (const status of Object.keys(groups) as ApplicationStatus[]) {
      sorted[status] = [...groups[status]].sort((a, b) => {
        const sa = a.jobMatch?.score ?? -1;
        const sb = b.jobMatch?.score ?? -1;
        return sb - sa;
      });
    }
    return sorted;
  }, [groups, sortByMatch]);

  function loadGroups() {
    getKanbanGroups().then(setGroups).catch(() => setError(true));
  }

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadGroups();
  }, [token, router]);

  function handleApplicationAdded(app: Application) {
    setGroups((g) => g ? { ...g, APPLIED: [app, ...g.APPLIED] } : g);
  }

  return (
    <DashboardShell>
      <div className="flex flex-col h-full">
        {/* Page header — no backdrop-filter here: fixed-position children (AddApplicationDialog) must not have a backdrop-filter ancestor */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white/80">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Applications</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {groups ? Object.values(groups).flat().length : '—'} application
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort by match */}
            <button
              onClick={() => setSortByMatch((v) => !v)}
              title="Sắp xếp theo độ phù hợp"
              className={clsx(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition',
                sortByMatch
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white/50 text-gray-500 hover:text-gray-700',
              )}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Phù hợp nhất
            </button>

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

          {sortedGroups && view === 'kanban' && (
            <KanbanBoard groups={sortedGroups} onGroupsChange={setGroups} onCardClick={setSelectedAppId} />
          )}

          {sortedGroups && view === 'table' && (
            <TableView groups={sortedGroups} onGroupsChange={setGroups} onCardClick={setSelectedAppId} sortByMatch={sortByMatch} />
          )}
        </div>
      </div>

      {selectedAppId && (
        <ApplicationDetailModal applicationId={selectedAppId} onClose={() => setSelectedAppId(null)} onUpdate={loadGroups} />
      )}
    </DashboardShell>
  );
}
