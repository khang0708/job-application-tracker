'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Trash2, Star, Upload, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { updateProfile, changePassword } from '@/lib/api/profile';
import { getResumes, uploadResume, setDefaultResume, deleteResume } from '@/lib/api/resumes';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Resume } from '@/lib/types';

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

function daysSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 30) return `${days} ngày trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

export default function ProfilePage() {
  const { user, token, setUser } = useAuthStore();
  const router = useRouter();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getResumes().then(setResumes).catch(() => {});
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

  async function handleUpload() {
    if (!uploadFile || !uploadLabel.trim()) return;
    setIsUploading(true);
    try {
      const resume = await uploadResume(uploadLabel.trim(), uploadFile);
      setResumes((prev) => [resume, ...prev]);
      setUploadLabel('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Đã tải lên CV');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể tải lên CV');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    try {
      await setDefaultResume(id);
      setResumes((prev) => prev.map((r) => ({ ...r, isDefault: r.id === id })));
      toast.success('Đã đặt làm CV mặc định');
    } catch {
      toast.error('Không thể cập nhật');
    } finally {
      setSettingDefaultId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteResume(id);
      setResumes((prev) => {
        const remaining = prev.filter((r) => r.id !== id);
        const deleted = prev.find((r) => r.id === id);
        // promote newest remaining to default if deleted one was default
        if (deleted?.isDefault && remaining.length > 0) {
          remaining[0] = { ...remaining[0], isDefault: true };
        }
        return remaining;
      });
      toast.success('Đã xóa CV');
    } catch {
      toast.error('Không thể xóa CV');
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full text-sm text-gray-400">
          Đang tải…
        </div>
      </DashboardShell>
    );
  }

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

        {/* Profile form */}
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

        {/* Password form */}
        <div className="glass-light rounded-2xl p-6 mb-4">
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

        {/* CV / Resume section */}
        <div className="glass-light rounded-2xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">CV / Resume</h2>

          {/* Upload form */}
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên CV</label>
              <input
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="VD: CV Senior Fullstack - Tiếng Anh"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                File <span className="text-gray-400 font-normal">(PDF hoặc DOCX, tối đa 5 MB)</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition bg-white/40 text-sm">
                  <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 truncate">
                    {uploadFile ? uploadFile.name : 'Chọn file PDF hoặc DOCX…'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    className="sr-only"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {uploadFile && (
                  <button
                    type="button"
                    onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !uploadFile || !uploadLabel.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {isUploading ? 'Đang tải lên…' : 'Tải lên CV'}
            </button>
          </div>

          {/* Resume list */}
          {resumes.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Chưa có CV nào. Tải lên CV đầu tiên của bạn.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white/50 rounded-xl border border-white/80"
                >
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{resume.label}</p>
                      {resume.isDefault && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-md">
                          <Star className="w-2.5 h-2.5" />
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{daysSince(resume.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!resume.isDefault && (
                      <button
                        onClick={() => handleSetDefault(resume.id)}
                        disabled={settingDefaultId === resume.id}
                        title="Đặt làm mặc định"
                        className="p-1.5 text-gray-400 hover:text-amber-500 disabled:opacity-40 transition rounded-lg hover:bg-amber-50"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(resume.id)}
                      disabled={deletingId === resume.id}
                      title="Xóa CV"
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
