'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user, token, logout, fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!user) {
      fetchMe().catch(() => router.push('/login'));
    }
  }, [token, user, router, fetchMe]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition"
          >
            Đăng xuất
          </button>
        </div>
        <div className="p-6 border rounded-xl bg-gray-50 mb-6">
          <h2 className="font-semibold mb-2">Thông tin tài khoản</h2>
          <p className="text-gray-700">Tên: {user.name}</p>
          <p className="text-gray-700">Email: {user.email}</p>
          <p className="text-gray-700">Role: {user.role}</p>
        </div>
        <Link
          href="/dashboard/applications"
          className="block p-5 border rounded-xl hover:bg-blue-50 hover:border-blue-300 transition group"
        >
          <h2 className="font-semibold text-gray-900 group-hover:text-blue-700">
            Job Applications →
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage your Kanban pipeline</p>
        </Link>
      </div>
    </main>
  );
}
