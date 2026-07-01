'use client';

import { toast } from 'sonner';
import { deleteApplication } from '@/lib/api/applications';
import type { Application, ApplicationStatus, KanbanGroups } from '@/lib/types';

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: 'bg-blue-50 text-blue-700',
  SCREENING: 'bg-yellow-50 text-yellow-700',
  INTERVIEW: 'bg-purple-50 text-purple-700',
  OFFER: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

interface Props {
  groups: KanbanGroups;
  onGroupsChange: (g: KanbanGroups) => void;
  onCardClick: (id: string) => void;
  sortByMatch?: boolean;
}

export function TableView({ groups, onGroupsChange, onCardClick, sortByMatch }: Props) {
  const apps: Application[] = Object.values(groups)
    .flat()
    .sort((a, b) => {
      if (sortByMatch) {
        const sa = a.jobMatch?.score ?? -1;
        const sb = b.jobMatch?.score ?? -1;
        if (sa !== sb) return sb - sa;
      }
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });

  async function handleDelete(app: Application) {
    if (!confirm(`Xóa "${app.jobTitle}" tại ${app.company.name}?`)) return;
    try {
      await deleteApplication(app.id);
      const next = { ...groups } as KanbanGroups;
      next[app.status] = next[app.status].filter((a) => a.id !== app.id);
      onGroupsChange(next);
      toast.success('Đã xóa application');
    } catch {
      toast.error('Không thể xóa');
    }
  }

  if (apps.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        Chưa có application nào. Nhấn &quot;+ New&quot; để thêm.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3">Công ty</th>
            <th className="px-4 py-3">Vị trí</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Ngày ứng tuyển</th>
            <th className="px-4 py-3 w-20">Phù hợp</th>
            <th className="px-4 py-3 w-24">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {apps.map((app) => (
            <tr
              key={app.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onCardClick(app.id)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{app.company.name}</td>
              <td className="px-4 py-3 text-gray-700">{app.jobTitle}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[app.status]}`}
                >
                  {STATUS_LABEL[app.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-4 py-3">
                {app.jobMatch?.score != null && (() => {
                  const s = app.jobMatch!.score;
                  const cls = s >= 70 ? 'bg-green-100 text-green-700' : s >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-500';
                  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{s}%</span>;
                })()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(app); }}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
