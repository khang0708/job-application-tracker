'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
import { ApplicationCard } from './ApplicationCard';
import { updateApplicationStatus } from '@/lib/api/applications';
import type { Application, ApplicationStatus, KanbanGroups } from '@/lib/types';

export const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: 'APPLIED', label: 'Applied' },
  { status: 'SCREENING', label: 'Screening' },
  { status: 'INTERVIEW', label: 'Interview' },
  { status: 'OFFER', label: 'Offer' },
  { status: 'REJECTED', label: 'Rejected' },
];

const ALL_STATUSES = new Set<string>(COLUMNS.map((c) => c.status));

function moveCard(
  groups: KanbanGroups,
  appId: string,
  newStatus: ApplicationStatus,
): KanbanGroups {
  let moved: Application | undefined;
  const next = { ...groups } as KanbanGroups;
  for (const status of Object.keys(next) as ApplicationStatus[]) {
    next[status] = next[status].filter((a) => {
      if (a.id === appId) { moved = a; return false; }
      return true;
    });
  }
  if (moved) next[newStatus] = [{ ...moved, status: newStatus }, ...next[newStatus]];
  return next;
}

interface Props {
  groups: KanbanGroups;
  onGroupsChange: (g: KanbanGroups) => void;
  onCardClick: (id: string) => void;
}

export function KanbanBoard({ groups, onGroupsChange, onCardClick }: Props) {
  const [activeApp, setActiveApp] = useState<Application | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const appId = event.active.id as string;
    for (const apps of Object.values(groups)) {
      const found = apps.find((a) => a.id === appId);
      if (found) { setActiveApp(found); return; }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null);
    const { active, over } = event;
    if (!over || !ALL_STATUSES.has(over.id as string)) return;

    const appId = active.id as string;
    const newStatus = over.id as ApplicationStatus;

    let currentStatus: ApplicationStatus | undefined;
    for (const [status, apps] of Object.entries(groups)) {
      if (apps.find((a) => a.id === appId)) {
        currentStatus = status as ApplicationStatus;
        break;
      }
    }
    if (currentStatus === newStatus) return;

    const snapshot = groups;
    onGroupsChange(moveCard(groups, appId, newStatus));

    try {
      await updateApplicationStatus(appId, newStatus);
    } catch {
      onGroupsChange(snapshot);
      toast.error('Could not update status — please try again');
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => (
          <KanbanColumn
            key={status}
            status={status}
            label={label}
            applications={groups[status] ?? []}
            draggingId={activeApp?.id}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? <ApplicationCard application={activeApp} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
