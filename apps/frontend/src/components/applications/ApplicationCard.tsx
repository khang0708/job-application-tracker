'use client';

import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import type { Application } from '@/lib/types';

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

interface Props {
  application: Application;
  isGhost?: boolean;
  overlay?: boolean;
  onClick?: () => void;
}

export function ApplicationCard({ application, isGhost, overlay, onClick }: Props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: application.id,
    disabled: !!overlay,
  });

  const days = daysSince(application.appliedAt);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      onClick={overlay ? undefined : onClick}
      className={clsx(
        'p-3 bg-white rounded-lg border border-gray-200 shadow-sm select-none',
        !overlay && 'cursor-grab active:cursor-grabbing',
        isGhost && 'opacity-30',
        overlay && 'shadow-xl rotate-1',
      )}
    >
      <p className="font-medium text-sm text-gray-900 truncate">{application.jobTitle}</p>
      <p className="text-xs text-gray-500 mt-0.5 truncate">{application.company.name}</p>
      <p className="text-xs text-gray-400 mt-2">
        {days === 0 ? 'Applied today' : `Applied ${days}d ago`}
      </p>
    </div>
  );
}
