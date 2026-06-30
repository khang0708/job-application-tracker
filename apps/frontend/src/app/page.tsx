import Link from 'next/link';
import { Zap, Kanban, FileText, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: Kanban,    title: 'Kanban Pipeline',       desc: 'Drag-and-drop board theo dõi từng bước ứng tuyển — Applied, Screening, Interview, Offer.' },
  { icon: FileText,  title: 'JD Parsing tự động',    desc: 'Dán JD vào, AI trích xuất kỹ năng, seniority, key requirements trong vài giây.' },
  { icon: Sparkles,  title: 'Cover letter AI',        desc: 'Tạo cover letter cá nhân hóa từ CV — hỗ trợ tiếng Anh và tiếng Việt.' },
];

export default function Home() {
  return (
    <div className="relative min-h-screen mesh-dark text-white overflow-hidden">
      {/* Glow orbs */}
      <div className="glow-blue w-96 h-96 -top-20 -left-20 opacity-60" />
      <div className="glow-purple w-80 h-80 top-40 right-10 opacity-50" />
      <div className="glow-blue w-64 h-64 bottom-20 left-1/3 opacity-40" />

      {/* Nav */}
      <nav className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl glass glass-shine flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-300" />
          </div>
          <span className="font-semibold text-sm tracking-tight">JobTracker</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login"
            className="text-sm px-4 py-2 rounded-xl glass glass-shine text-white/80 hover:text-white transition"
          >
            Đăng nhập
          </Link>
          <Link href="/register"
            className="text-sm px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-medium transition shadow-lg shadow-blue-500/30"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass glass-shine text-blue-300 text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Gemini · OpenAI · Ollama
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Quản lý hành trình
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-blue-300">
            tìm việc thông minh hơn
          </span>
        </h1>

        <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Theo dõi toàn bộ ứng tuyển trên một Kanban board. AI tự động phân tích JD
          và viết cover letter cá nhân hóa từ CV của bạn.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/register"
            className="px-7 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition shadow-xl shadow-blue-500/25"
          >
            Tạo tài khoản miễn phí
          </Link>
          <Link href="/login"
            className="px-7 py-3 rounded-2xl glass glass-shine text-white/80 hover:text-white font-medium transition"
          >
            Đăng nhập
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass glass-shine rounded-2xl p-6 hover:bg-white/10 transition-colors group">
              <div className="w-10 h-10 rounded-xl glass glass-shine flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5 text-blue-300" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 text-center">
        <p className="text-xs text-white/20">NestJS · Next.js · PostgreSQL · AI</p>
      </footer>
    </div>
  );
}
