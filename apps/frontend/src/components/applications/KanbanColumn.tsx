'use client';

import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ApplicationCard } from './ApplicationCard';
import type { Application, ApplicationStatus } from '@/lib/types';

const TOP_COLOR: Record<string, string> = {
  APPLIED: 'bg-blue-500',
  SCREENING: 'bg-amber-400',
  INTERVIEW: 'bg-violet-500',
  OFFER: 'bg-emerald-500',
  REJECTED: 'bg-red-400',
  WITHDRAWN: 'bg-gray-300',
};

const BADGE_COLOR: Record<string, string> = {
  APPLIED: 'bg-blue-100/80 text-blue-600',
  SCREENING: 'bg-amber-100/80 text-amber-600',
  INTERVIEW: 'bg-violet-100/80 text-violet-600',
  OFFER: 'bg-emerald-100/80 text-emerald-600',
  REJECTED: 'bg-red-100/80 text-red-500',
  WITHDRAWN: 'bg-gray-100/80 text-gray-400',
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
    <div className="flex flex-col w-60 flex-shrink-0">
      {/* Column header */}
      <div className="glass-light rounded-t-xl overflow-hidden border-b-0">
        <div className={`h-0.5 ${TOP_COLOR[status]}`} />
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${BADGE_COLOR[status]}`}>
            {applications.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 min-h-48 rounded-b-xl glass-light p-2 space-y-2 transition-colors',
          isOver && 'bg-blue-50/80',
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
