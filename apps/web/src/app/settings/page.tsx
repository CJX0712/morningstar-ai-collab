import { KeyRound, Link2, ShieldCheck, Users } from 'lucide-react';

const GROUPS = [
  { title: '成员', icon: Users, items: ['邀请成员', '角色分配', '移除成员'] },
  { title: '权限', icon: ShieldCheck, items: ['工作区可见性', '知识库读写', '审计日志'] },
  { title: '集成', icon: Link2, items: ['GitHub', 'Slack', '飞书'] },
  { title: '单点登录', icon: KeyRound, items: ['OIDC', 'SAML'] },
];

export const metadata = { title: '设置 · 晨星' };

export default function SettingsPage() {
  return (
    <>
      <header>
        <h1 className="page-title">设置</h1>
        <p className="page-desc">分组渐进披露，危险操作会二次确认。</p>
      </header>
      <div className="grid grid-2">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.title} className="card">
              <header className="card-head">
                <h2 className="card-title">
                  <span className="row">
                    <Icon size={16} aria-hidden /> {group.title}
                  </span>
                </h2>
              </header>
              <div>
                {group.items.map((item) => (
                  <div key={item} className="kv"><span>{item}</span><span className="muted">配置</span></div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
