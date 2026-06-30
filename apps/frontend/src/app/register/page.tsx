'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Zap, Kanban, FileText, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  name: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser, isLoading } = useAuthStore();
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data.email, data.name, data.password);
      router.push('/dashboard');
    } catch {
      setError('root', { message: 'Email đã được sử dụng' });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — dark mesh */}
      <div className="hidden lg:flex lg:w-2/5 mesh-dark relative flex-col justify-between p-10 overflow-hidden">
        <div className="glow-blue w-72 h-72 -top-16 -left-16 opacity-50" />
        <div className="glow-purple w-56 h-56 bottom-20 right-0 opacity-40" />

        <Link href="/" className="relative z-10 flex items-center gap-2">
          <div className="w-7 h-7 glass glass-shine rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-300" />
          </div>
          <span className="text-white font-semibold text-sm">JobTracker</span>
        </Link>

        <div className="relative z-10">
          <p className="text-2xl font-bold text-white leading-snug mb-8">
            Bắt đầu track hành trình tìm việc ngay hôm nay.
          </p>
          <ul className="space-y-3">
            {[
              { icon: Kanban,   text: 'Kanban board trực quan, drag-and-drop' },
              { icon: FileText, text: 'Phân tích JD tự động với AI' },
              { icon: Sparkles, text: 'Cover letter cá nhân hóa từ CV của bạn' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/60">
                <div className="w-7 h-7 glass glass-shine rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-300" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/20">© 2026 JobTracker</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-900">JobTracker</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Tạo tài khoản</h1>
          <p className="text-sm text-gray-500 mb-7">Miễn phí, không cần thẻ tín dụng</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
              <input
                {...register('name')}
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                placeholder="Ít nhất 6 ký tự"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-300"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-red-600 text-sm">{errors.root.message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Đang xử lý…' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="text-center text-sm mt-6 text-gray-500">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
