# 悬而未决登记册（OPEN-DECISIONS）

> 只追加 + 就地关闭（OPEN -> RESOLVED 并补 Resolution）。作者：晨星

| Date | Source | Open Item | Related Constraints | Current Leaning | Blocked By | Resolves When | Status |
|------|--------|-----------|---------------------|-----------------|------------|---------------|--------|
| 2026-09-21 | Phase 3 | Postgres 仓储实现（当前仅内存） | MVP 要求离线可验证；数据模型已在 Spec 第 6 节锁定 | 提供 Prisma/pg 实现并通过 COLLAB_CORE_URL 复用 | 需要真实 PG 环境做迁移验证 | 有部署需求时 | OPEN |
| 2026-09-21 | Phase 3 | 是否引入 LangChain.js 做多步 Agent 编排 | 当前为极薄 OpenAI 兼容客户端，依赖树最小 | MVP 阶段不引入；工具注册表留待 P1 | 依赖体积与版本对齐风险 | 需要复杂 Agent 流程时 | OPEN |
| 2026-09-21 | Phase 1 | MinIO 对象存储是否引入 | 当前未使用对象存储，音频走 transcript 文本 | 会议音频上传需求出现时再评估 | 需求未定 | 有音频上传场景时 | OPEN |
| 2026-09-21 | Phase 1 | 认证方案（JWT / SSO） | 接口位已预留，MVP 未启用 | JWT 15min access + 7d refresh | MVP 范围外 | v1.1 | OPEN |
