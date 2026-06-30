'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, TrendingUp, MessageSquare, Trophy, Plus, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getKanbanGroups } from '@/lib/api/applications';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { KanbanGroups } from '@/lib/types';

interface Stats {
  total: number;
  active: number;
  interviews: number;
  offers: number;
}

function computeStats(groups: KanbanGroups): Stats {
  return {
    total: Object.values(groups).flat().length,
    active: [...groups.APPLIED, ...groups.SCREENING, ...groups.INTERVIEW].length,
    interviews: groups.INTERVIEW.length,
    offers: groups.OFFER.length,
  };
}

export default function DashboardPage() {
  const { user, token, fetchMe } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    if (!user) fetchMe().catch(() => router.push('/login'));
    getKanbanGroups().then((g) => setStats(computeStats(g))).catch(() => {});
  }, [token, user, router, fetchMe]);

  if (!user) return null;

  const STAT_CARDS = [
    { label: 'Tổng ứng tuyển', value: stats?.total ?? '—', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Đang hoạt động', value: stats?.active ?? '—', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Phỏng vấn', value: stats?.interviews ?? '—', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Offer nhận được', value: stats?.offers ?? '—', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Chào, {user.name.split(' ').pop()} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Đây là tổng quan hành trình tìm việc của bạn.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-light rounded-2xl p-5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                <Icon className={`w-[18px] h-[18px] ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/applications"
            className="group glass-light rounded-2xl p-5 hover:bg-white/80 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Briefcase className="w-[18px] h-[18px] text-blue-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Applications</h2>
            <p className="text-xs text-gray-500">Kanban board + Table view</p>
          </Link>

          <div className="bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center mb-3">
              <Plus className="w-[18px] h-[18px] text-white" />
            </div>
            <h2 className="font-semibold mb-1">Thêm application mới</h2>
            <p className="text-xs text-blue-100 mb-3">Dán JD và để AI phân tích</p>
            <Link
              href="/dashboard/applications"
              className="inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
            >
              Mở board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
