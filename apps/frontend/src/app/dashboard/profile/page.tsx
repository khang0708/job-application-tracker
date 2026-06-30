'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { updateProfile, changePassword } from '@/lib/api/profile';
import { DashboardShell } from '@/components/layout/DashboardShell';

const profileSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, token, setUser, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSaveProfile(data: ProfileForm) {
    try {
      const updated = await updateProfile(data);
      setUser(updated);
      toast.success('Đã cập nhật thông tin');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể cập nhật');
    }
  }

  async function onChangePassword(data: PasswordForm) {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Đã đổi mật khẩu');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể đổi mật khẩu');
    }
  }

  if (!user) return null;

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/60';

  return (
    <DashboardShell>
      <div className="p-8 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/25">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Edit profile form */}
        <div className="glass-light rounded-2xl p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Thông tin cá nhân</h2>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
              <input {...profileForm.register('name')} className={inputCls} />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input {...profileForm.register('email')} type="email" className={inputCls} />
              {profileForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.email.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {profileForm.formState.isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Change password form */}
        <div className="glass-light rounded-2xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Đổi mật khẩu</h2>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
              const labels = { currentPassword: 'Mật khẩu hiện tại', newPassword: 'Mật khẩu mới', confirmPassword: 'Xác nhận mật khẩu mới' };
              return (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels[field]}</label>
                  <input {...passwordForm.register(field)} type="password" className={inputCls} />
                  {passwordForm.formState.errors[field] && (
                    <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors[field]?.message}</p>
                  )}
                </div>
              );
            })}
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {passwordForm.formState.isSubmitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
