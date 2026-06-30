'use client';

import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ApplicationCard } from './ApplicationCard';
import type { Application, ApplicationStatus } from '@/lib/types';

const COLUMN_STYLE: Record<string, string> = {
  APPLIED: 'border-blue-200 bg-blue-50',
  SCREENING: 'border-yellow-200 bg-yellow-50',
  INTERVIEW: 'border-purple-200 bg-purple-50',
  OFFER: 'border-green-200 bg-green-50',
  REJECTED: 'border-red-200 bg-red-50',
};

interface Props {
  status: ApplicationStatus;
  label: string;
  applications: Application[];
  draggingId?: string;
  onCardClick: (id: string) => void;
}

export function KanbanColumn({ status, label, applications, draggingId, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      <div
        className={clsx(
          'rounded-t-lg px-3 py-2 border border-b-0',
          COLUMN_STYLE[status],
        )}
      >
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="ml-2 text-xs text-gray-400">{applications.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 min-h-44 rounded-b-lg border p-2 space-y-2 transition-colors',
          COLUMN_STYLE[status],
          isOver && 'ring-2 ring-blue-400 ring-inset',
        )}
      >
        {applications.map((app) => (
          <ApplicationCard
            key={app.id}
            application={app}
            isGhost={app.id === draggingId}
            onClick={() => onCardClick(app.id)}
          />
        ))}
      </div>
    </div>
  );
}
