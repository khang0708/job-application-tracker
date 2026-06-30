'use client';

import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ExternalLink } from 'lucide-react';
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
        'p-3 glass-light rounded-xl select-none group',
        !overlay && 'cursor-grab active:cursor-grabbing hover:bg-white/90 transition-all',
        isGhost && 'opacity-30',
        overlay && 'shadow-2xl rotate-1 scale-105',
      )}
    >
      <p className="font-medium text-sm text-gray-900 truncate leading-snug">{application.jobTitle}</p>
      <p className="text-xs text-gray-500 mt-0.5 truncate">{application.company.name}</p>

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-xs text-gray-400">
          {days === 0 ? 'Hôm nay' : `${days}d trước`}
        </span>
        {application.sourceUrl && (
          <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-400 transition-colors" />
        )}
      </div>
    </div>
  );
}
