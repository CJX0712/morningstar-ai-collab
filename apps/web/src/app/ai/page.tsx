import { AiWorkspace } from '@/components/AiWorkspace';

export const metadata = { title: 'AI 助手 · 晨星' };

export default function AiPage() {
  return (
    <>
      <header>
        <h1 className="page-title">AI 助手</h1>
        <p className="page-desc">
          对话线程在左，产物面板在右。未配置模型网关时走确定性兜底，链路依然可验证。
        </p>
      </header>
      <AiWorkspace />
    </>
  );
}
