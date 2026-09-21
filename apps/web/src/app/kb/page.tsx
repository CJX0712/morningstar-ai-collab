import { KbPanel } from '@/components/KbPanel';

export const metadata = { title: '知识库 · 晨星' };

export default function KbPage() {
  return (
    <>
      <header>
        <h1 className="page-title">企业知识库</h1>
        <p className="page-desc">文档分块后写入向量库，问答结果必须能追溯到原文片段。</p>
      </header>
      <KbPanel />
    </>
  );
}
