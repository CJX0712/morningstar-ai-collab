import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { DEMO_TASKS } from '@/lib/api';

export default function LoginPage() {
  return (
    <div className="auth-layout">
      <section className="auth-preview">
        <h1 className="page-title">晨星</h1>
        <p className="page-desc">开源可自托管的 AI 原生团队协作平台。所有 AI 能力运行在你自己的环境里。</p>
        <div className="grid">
          {DEMO_TASKS.map((task) => (
            <article key={task.id} className="task-card">
              <h3 className="task-title">{task.title}</h3>
              <p className="task-desc">{task.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="auth-panel">
        <h2 className="page-title" style={{ fontSize: '20px' }}>登录到你的工作区</h2>
        <form>
          <div className="field">
            <label htmlFor="email">工作邮箱</label>
            <input id="email" name="email" type="email" placeholder="you@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input id="password" name="password" type="password" placeholder="请输入密码" required />
          </div>
          <button type="submit" className="btn btn-primary">登录</button>
        </form>

        <div className="row">
          <span className="muted">或使用单点登录</span>
          <button type="button" className="btn">
            <KeyRound size={16} aria-hidden /> GitHub SSO
          </button>
          <button type="button" className="btn">
            <KeyRound size={16} aria-hidden /> Google SSO
          </button>
        </div>

        <Link href="/" className="row">
          <ArrowLeft size={16} aria-hidden /> 返回工作区总览
        </Link>
      </section>
    </div>
  );
}
