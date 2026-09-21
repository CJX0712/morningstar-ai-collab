import type { Metadata } from 'next';
import Link from 'next/link';
import { BookText, Bot, CalendarClock, FolderKanban, KeyRound, LayoutGrid, MessagesSquare, Settings } from 'lucide-react';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '晨星 · AI 原生团队协作平台',
  description: '开源可自托管的 AI 原生团队协作平台：看板协作、知识库问答、会议纪要与代码任务助手。',
};

const NAV = [
  { href: '/', label: '工作区总览', icon: LayoutGrid },
  { href: '/projects/demo-project', label: '项目看板', icon: FolderKanban },
  { href: '/ai', label: 'AI 助手', icon: MessagesSquare },
  { href: '/kb', label: '知识库', icon: BookText },
  { href: '/meetings', label: '会议纪要', icon: CalendarClock },
  { href: '/settings', label: '设置', icon: Settings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="dark">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand">
              <Bot size={20} aria-hidden />
              <span>晨星</span>
            </Link>
            <nav className="nav">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="nav-item">
                    <Icon size={16} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="sidebar-foot">
              <Link href="/login" className="nav-item">
                <KeyRound size={16} aria-hidden />
                <span>账号登录</span>
              </Link>
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
