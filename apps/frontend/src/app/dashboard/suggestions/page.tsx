'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getPendingSuggestions, acceptSuggestion, dismissSuggestion } from '@/lib/api/n8n';
import type { EmailSuggestion } from '@/lib/types';

export default function SuggestionsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getPendingSuggestions().then(setSuggestions).finally(() => setIsLoading(false));
  }, [token, router]);

  async function handleAccept(id: string) {
    setBusyId(id);
    try {
      await acceptSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Đã cập nhật trạng thái application');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể áp dụng đề xuất');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      await dismissSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể bỏ qua đề xuất');
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <DashboardShell><div className="p-8 text-gray-400 text-sm">Đang tải…</div></DashboardShell>;

  return (
    <DashboardShell>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Đề xuất từ Email</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI phát hiện các email liên quan đến application của bạn — xác nhận trước khi áp dụng.
          </p>
        </div>

        {suggestions.length === 0 && (
          <div className="glass-light rounded-2xl p-6 text-sm text-gray-500">
            Không có đề xuất nào đang chờ xử lý.
          </div>
        )}

        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="glass-light rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.companyName} — {s.jobTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Từ: {s.emailFrom} · &quot;{s.emailSubject}&quot;</p>
                  <p className="text-sm text-gray-700 mt-2">
                    Đề xuất chuyển: <span className="font-medium">{s.currentStatusSnapshot}</span> → <span className="font-medium text-blue-600">{s.suggestedStatus}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{s.reasoning} (độ tin cậy: {s.confidence}%)</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAccept(s.id)}
                  disabled={busyId === s.id}
                  className="px-3.5 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => handleDismiss(s.id)}
                  disabled={busyId === s.id}
                  className="px-3.5 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-white/60 disabled:opacity-50 transition"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
