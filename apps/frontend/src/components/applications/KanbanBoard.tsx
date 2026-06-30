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
import { AddApplicationDialog } from './AddApplicationDialog';
import { ApplicationDetailModal } from './ApplicationDetailModal';
import { updateApplicationStatus } from '@/lib/api/applications';
import type { Application, ApplicationStatus, KanbanGroups } from '@/lib/types';

const COLUMNS: { status: ApplicationStatus; label: string }[] = [
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
      if (a.id === appId) {
        moved = a;
        return false;
      }
      return true;
    });
  }

  if (moved) {
    next[newStatus] = [{ ...moved, status: newStatus }, ...next[newStatus]];
  }
  return next;
}

interface Props {
  initialGroups: KanbanGroups;
}

export function KanbanBoard({ initialGroups }: Props) {
  const [groups, setGroups] = useState<KanbanGroups>(initialGroups);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Require 5px movement before drag starts — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const appId = event.active.id as string;
    for (const apps of Object.values(groups)) {
      const found = apps.find((a) => a.id === appId);
      if (found) {
        setActiveApp(found);
        return;
      }
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
    setGroups((g) => moveCard(g, appId, newStatus));

    try {
      await updateApplicationStatus(appId, newStatus);
    } catch {
      setGroups(snapshot);
      toast.error('Could not update status — please try again');
    }
  }

  function handleApplicationAdded(app: Application) {
    setGroups((g) => ({
      ...g,
      APPLIED: [app, ...(g.APPLIED ?? [])],
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <AddApplicationDialog onAdded={handleApplicationAdded} />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(({ status, label }) => (
            <KanbanColumn
              key={status}
              status={status}
              label={label}
              applications={groups[status] ?? []}
              draggingId={activeApp?.id}
              onCardClick={(id) => setSelectedAppId(id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApp ? <ApplicationCard application={activeApp} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      )}
    </div>
  );
}
