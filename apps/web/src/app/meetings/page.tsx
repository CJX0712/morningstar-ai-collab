import { MeetingPanel } from '@/components/MeetingPanel';

export const metadata = { title: '会议纪要 · 晨星' };

export default function MeetingsPage() {
  return (
    <>
      <header>
        <h1 className="page-title">会议纪要</h1>
        <p className="page-desc">提交转写文本即可生成摘要、决策与行动项，行动项可直接转成看板任务卡。</p>
      </header>
      <MeetingPanel />
    </>
  );
}
