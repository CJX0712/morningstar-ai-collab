# 晨星（Morning Star）设计规范 DESIGN.md

> 设计契约源文件（单一事实来源）。本文件服务 `apps/web`（Next.js 15 / React 19），与 `packages/contracts`（API/TS 类型契约）**职责分离**：前者管视觉语义，后者管接口类型，二者不重叠。后续接入 Storybook 亦以本文件为准。
> 设计寄存器：Product（应用本体，设计服务产品，赢得"熟悉感"）。若有营销落地页，单独按 Brand 寄存器处理。
> 三维刻度：`DESIGN_VARIANCE=5`（偏移克制，不居中 Hero）· `MOTION_INTENSITY=5`（150–300ms 功能性动效 + 少量 AI 脉冲）· `VISUAL_DENSITY=6`（半密集，类 Height）。
> 更新须保持本文件与同目录 `design-tokens.json` 一致。

---

## 1. Visual Theme & Atmosphere（视觉主题与氛围）

- **一句话方向**：克制的精密感 + 原生的 AI 在场感。
- **关键词**：精密（precise）、克制（restrained）、可信（trustworthy）、AI 原生（AI-native）、自托管（self-hosted）。
- **对标取舍**：骨架取自 Linear（近黑画布 + 1px 发丝边框）与 Height（高信息密度 + 键盘优先）；质量标尺取自 Stripe（战略极简 + 主动错误预防）；AI 助手范式取自 Claude Artifacts（对话/产物分屏）。**刻意避开竞品的靛蓝紫/红/blurple 强调色**，改用单一 Teal 青蓝，从视觉上与"AI 模板紫"划清界限。
- **明暗策略**：默认深色（开发者/AI 工具语境），同时提供完整实现、非事后补丁的浅色主题。主题切换仅重映射同名 Token，组件零改动。

---

## 2. Color Palette & Roles（配色与角色）

### 2.1 四层 Token 分类（与 design-tokens.json 对应）
- **A1-identity（品牌核心，不可省略）**：`--bg` `--surface` `--fg` `--muted` `--accent` `--border` `--font-display` `--font-body`。
- **A1-structure（结构，不可省略）**：字号比例、`--container-max`、节区节奏。
- **A2（有默认值）**：`--accent-hover` `--accent-active` `--accent-on` `--success` `--warn` `--danger` `--info` `--font-mono` `--focus-ring` `--motion-fast` 等。
- **B-slot（品牌声明别名）**：`--fg-2` `--surface-raised` `--meta` `--border-soft`。
- **C-extension（品牌专属，自由使用）**：`--accent-soft`（强调色低透叠加，用于 AI 思考脉冲/选中态底色）。

### 2.2 深色主题（默认）
| Token | 值 | 角色 |
|-------|-----|------|
| `--bg` | `#0A0B0D` | 页面画布（近黑带冷蓝底，非纯黑） |
| `--surface` | `#121417` | 卡片/容器 |
| `--surface-raised` | `#1A1D21` | 弹出/下拉/模态 |
| `--fg` | `#EAECF0` | 主文本 |
| `--fg-2` | `#B4B9C2` | 次级文本 |
| `--muted` | `#8A909B` | 副文本 |
| `--meta` | `#5C626D` | 三级/元数据 |
| `--border` | `rgba(255,255,255,0.08)` | 发丝边框 |
| `--border-soft` | `rgba(255,255,255,0.05)` | 内部行分隔 |
| `--accent` | `#14B8A6` | **品牌强调（Teal）** |
| `--accent-hover` | `#2DD4BF` | 悬停 |
| `--accent-active` | `#0D9488` | 激活 |
| `--accent-on` | `#04110F` | accent 背景上的前景（深字保对比） |
| `--accent-soft` | `rgba(20,184,166,0.12)` | AI 思考脉冲/选中底色 |
| `--success` | `#22C55E` | 语义：成功 |
| `--warn` | `#F59E0B` | 语义：警告 |
| `--danger` | `#EF4444` | 语义：危险 |
| `--info` | `#38BDF8` | 语义：信息 |
| `--focus-ring` | `0 0 0 2px rgba(20,184,166,0.45)` | 键盘焦点环 |

### 2.3 浅色主题（完整实现）
| Token | 值 | 角色 |
|-------|-----|------|
| `--bg` | `#F7F8FA` | 冷调灰白画布 |
| `--surface` | `#FFFFFF` | 卡片 |
| `--surface-raised` | `#FFFFFF` | 弹出（靠边框+阴影区分） |
| `--fg` | `#0F1115` | 主文本 |
| `--fg-2` | `#3A3F47` | 次级文本 |
| `--muted` | `#5B626D` | 副文本 |
| `--meta` | `#8A8F98` | 三级/元数据 |
| `--border` | `rgba(0,0,0,0.08)` | 发丝边框 |
| `--border-soft` | `rgba(0,0,0,0.05)` | 内部行分隔 |
| `--accent` | `#0F766E` | 浅底强调文字/链接（保 4.5:1） |
| `--accent-fill` | `#14B8A6` | 按钮填充（白字） |
| `--accent-hover` | `#0D9488` | 悬停 |
| `--accent-active` | `#115E59` | 激活 |
| `--accent-on` | `#FFFFFF` | accent 背景上的前景 |
| `--accent-soft` | `rgba(15,118,110,0.10)` | 选中底色 |
| `--success` | `#16A34A` | 语义：成功 |
| `--warn` | `#B45309` | 语义：警告 |
| `--danger` | `#DC2626` | 语义：危险 |
| `--info` | `#0284C7` | 语义：信息 |
| `--focus-ring` | `0 0 0 2px rgba(15,118,110,0.40)` | 键盘焦点环 |

### 2.4 使用纪律
- **每屏可见的 `--accent` 使用 ≤2 处**（主按钮 + 一个关键状态/链接），其余一律灰阶。多 = 视觉噪音。
- 语义色（success/warn/danger/info）仅作小面积标点（状态点、提示条），不铺大面。
- **禁止硬编码颜色**：组件不得出现裸 hex（唯一例外 `#fff` / `#000`）；一律 `var(--token)`。
- **禁止紫→粉渐变及任何 Indigo→Pink 组合**（P0）。渐变仅允许同色系深浅（如 `--accent` → `--accent-active`），且限于焦点/AI 脉冲等小面积。

---

## 3. Typography Rules（字体规则）

- **字体栈**：`--font-display` / `--font-body` = `"Inter", "Noto Sans SC", system-ui, -apple-system, sans-serif`；`--font-mono` = `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace`。
- **中文兜底**：Noto Sans SC 覆盖 CJK，避免系统回退字体破坏一致性。
- **字号层级（8 级）**：12 / 13 / 14 / 16 / 18 / 20 / 24 / 32 / 40（展示 56）。正文默认 14，密集列表 13，标题 40–56。
- **字重三级**：Read 400（正文）· Emphasize 510（小标题）· Announce 600（大标题/CTA）。**层级靠字号与字重对比，不靠粗黑边框**。
- **字距**：正文 `0`；ALL CAPS `≥0.06em`；标题 `≥32px` 用 `-0.01~0.02em`；展示字 `≥48px` 用 `-0.02~0.03em`。
- **行高**：正文 1.5–1.7，标题 1.1–1.3。正文每行 50–75 字符（中文约 25–37 字）。
- **等宽字体**仅用于：机器 ID、代码片段、时间戳、技术引用——不用于正文。

---

## 4. Component Stylings（组件样式）

> 组件库路线（Ant Design / shadcn）由架构师最终定；以下为 Token 级规范，框架中立，通过 CSS 变量消费。所有组件须覆盖 9 态：Default / Hover / Focus / Active / Disabled / Loading / Error / Empty / Success。

### 4.1 按钮
- **Primary**：背景 `var(--accent-fill)`（浅色）或 `var(--accent)`（深色），前景 `var(--accent-on)`（深色主题深字 / 浅色主题白字），圆角 `--radius-sm`(6)，padding 10×16；Hover→`--accent-hover`，Active→`--accent-active`。
- **Secondary**：透明底 + 1px `var(--border)`，前景 `var(--fg)`，Hover 底色 `var(--accent-soft)`。
- **Ghost**：无边框，前景 `var(--muted)`，Hover 前景 `var(--fg)` + 底色 `var(--accent-soft)`。
- **图标按钮**：24px 点击区，内嵌 20px lucide 图标，`aria-label` 必填。
- 禁用：`opacity 0.5` + `cursor: not-allowed`；加载：内嵌 `LoaderCircle` 旋转，禁用原文本点击。

### 4.2 卡片
- 背景 `var(--surface)`，1px `var(--border)`，**圆角 `--radius-md`(12)**，padding 20（space-5）；默认无投影（仅 `--elev-flat` 或 `--elev-ring`）。
- Hover：边框提亮至 `var(--accent-soft)` 描边，**不**加模糊大阴影（禁止幽灵卡：1px 边框 + blur≥16px 阴影同元素）。
- 弹出/模态用 `var(--surface-raised)` + `--elev-raised`（短阴影）+ 遮罩 `rgba(0,0,0,0.6)`。

### 4.3 输入框
- 背景 `var(--surface)`，1px `var(--border)`，圆角 `--radius-sm`(6)，高度 40（默认）/32（紧凑）；placeholder 用 `var(--muted)`。
- Focus：`--focus-ring`（2px accent 环），**不**变色边框为 accent 以外色。
- **主动校验（Stripe 式）**：输入即时校验、就地给引导文案（如"邮箱格式有误"），而非提交后才报错；错误态边框 `var(--danger)` + 错误文案贴字段下方。

### 4.4 图标规范（P0 锁定 lucide-react）
- **唯一图标源 = lucide-react@1.46.0**（ISC，1600+ SVG，零运行时依赖，React 19 兼容，tree-shakeable）。禁止混用 heroicons / tabler / @radix-icons / Unicode emoji。
- **尺寸**：行内 16 / 按钮内 20 / 独立 24px；`strokeWidth` 全局 1.75；`stroke="currentColor"`（跟随 `--fg` / `--accent`，不写死色）。
- **合法 SVG 图标 ≠ emoji**：`Sparkles` `Bot` `MessageSquare` 等均为 SVG，允许使用；仅禁用 Unicode emoji 字符（(火箭图标)(火焰图标)(灯泡图标) 等）。
- **超出 lucide 范围的品牌图标**：走一次性 SVG 资产入库（如产品主 Logo、OAuth 例外，见 4.5），在本文档标注"品牌资产、非图标库、不计入图标源约束"——默认不引新图标库。
- **lucide 1.x 重命名**：以 lockfile 1.46.0 实际导出名为准；旧名映射——`AlertTriangle`→`TriangleAlert`、`XCircle`→`CircleX`、`CheckCircle`→`CircleCheck`、`Loader2`→`LoaderCircle`、`KanbanSquare`→`SquareKanban`、`RefreshCw`→`RotateCw`。

### 4.5 OAuth 品牌按钮（方案 a，P0 合规）
- 采用**文字商标 + 中性图标 `KeyRound`**：如「使用 GitHub 登录」按钮内放 `KeyRound`，不使用 GitHub/Google/Slack 官方 logo（lucide 无品牌 logo，引入即违反单一图标源）。
- 例外仅在品牌方强制要求官方 logo 时：走一次性 SVG 资产入库，并在本文件标注"品牌资产例外"。默认走 (a)。

### 4.6 语义状态图标（全局统一）
- 成功 `CircleCheck`｜警告 `TriangleAlert`｜危险 `CircleX`｜信息 `Info`｜加载 `LoaderCircle`（旋转）｜AI 能力 `Sparkles`｜助手 `Bot`。

---

## 5. Layout Principles（布局原则）

- **栅格**：桌面 12 列 / 平板 8 列 / 手机 4 列；沟槽桌面 24 / 平板 16 / 手机 12px；容器最大宽 `--container-max` = 1280px。
- **节区节奏**：桌面 80 / 平板 48 / 手机 32px（对应 space-7 / space-6 / space-5）。
- **间距系统（严格 4px 栅格）**：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96；禁止任意值。
- **导航**：桌面左侧 Sidebar（半透明 liquid-glass，仅功能目的）；移动端底部 TabBar。Cmd-K 命令面板全局常驻（Raycast 式居中半透明）。
- **工作区总览**：顶部用真实数据卡（非 Hero 大数字模板）；近期任务 / AI 摘要流。

---

## 6. Depth & Elevation（层级与阴影）

- **阴影短梯 4 级**：`--elev-flat`(none) / `--elev-ring`(1px 边框环) / `--elev-raised`(模糊 8–16px 低透) / `--elev-modal`(弹出模糊 24px)。深色模式主要靠**亮度递进**表达层级，不靠堆叠投影。
- **深色层级递进**：`--bg`(#0A0B0D) → `--surface`(#121417) → `--surface-raised`(#1A1D21) → `--surface-overlay`(#22262B)。
- **浅色**：1px hairline + 短阴影区分抬起面。
- **禁止**：卡片默认大阴影、1px 边框 + blur≥16px 同元素（幽灵卡）、圆角 ≥24px。

---

## 7. Do's and Don'ts（允许与禁止）

(OK) **允许**
- 单强调色（Teal）+ 中性基底；发丝边框；真实产品 UI 进 Hero（登录页左看板预览、总览真实数据卡）。
- 4px 栅格；键盘优先（Cmd-K）；乐观 UI + 骨架屏；字号/色调造层次。
- 半透明仅用于命令栏 / 侧栏（功能目的）；深 + 浅双主题；a11y 达标（4.5:1、focus-visible、44px 触摸、reduced-motion）。
- AI 在场感：AI 思考时强调区轻微脉冲（`--accent-soft` opacity 0.5→0.8，≤400ms）、骨架屏微光、流式输出渐进揭示。

(X) **禁止（逐条，含 P0）**
1. 紫→粉渐变及任何 Indigo→Pink 组合（P0 致命）。
2. Unicode emoji 作功能图标（P0 致命）；混用非 lucide 图标库（P0）。
3. "Welcome to / Get started / Lorem ipsum / Seamless / Unleash" 等空洞占位（P0）。
4. 千篇一律 Hero（大标题+副标题+居中 CTA+抽象 3D）——改真实产品截图 / 可交互 Demo。
5. 硬编码颜色（一律走 Token；仅 `#fff/#000` 例外）。
6. 卡片左侧彩色竖条边框、渐变文字、`border-radius≥24px`、幽灵卡（1px 边框 + blur≥16px 阴影同元素）。
7. 默认 Tailwind 靛蓝 `#6366F1` 作强调（一眼 AI）；默认系统字体直出。
8. 每节都放小型大写追踪标签 / 编号 section 标记（AI 语法脚手架）。
9. 虚构指标（"10,000+ 用户"无来源）——用真实数据或根本不放。
10. 纯装饰动效、无 `prefers-reduced-motion`、无键盘可达。

---

## 8. Responsive Behavior（响应式）

- **断点**：xs <640 / sm ≥640 / md ≥768 / lg ≥1024 / xl ≥1280px。
- **导航**：移动端底部 TabBar（2–5 项，图标 24 + 文字 10px）；桌面左侧 Sidebar（折叠 `PanelLeft`）。
- **触摸目标**：最小 44×44px（WCAG 2.5.5）；按钮间距 ≥8px。
- **表单**：分步 / 行内校验；输入框触发对应键盘（email/number/tel）。
- **弹窗**：移动端底部 ActionSheet，桌面居中 Modal。
- **安全区**：移动端底部 `env(safe-area-inset-bottom)`。
- **非对称布局**：`DESIGN_VARIANCE>3` 时，<768px 必须回退为单列。

---

## 9. Agent Prompt Guide（前端 Agent 实现提示）

- **Token 消费**：所有颜色 / 间距 / 圆角 / 阴影经 `var(--token)`；本目录 `design-tokens.json` 为机器可读源，构建期注入 CSS 变量（深色 `:root[data-theme="dark"]`，浅色 `:root[data-theme="light"]`）。**禁止在组件内写死色值**。
- **图标**：`import { Xxx } from 'lucide-react'`，尺寸 16/20/24、`strokeWidth={1.75}`、`stroke="currentColor"`；以 1.46.0 导出名为准（见 §4.4 重命名映射）。
- **字体加载**：自托管 Inter（variable 400–600）+ Noto Sans SC；`font-feature-settings` 按需开启。
- **a11y 必做**：所有交互元素 `:focus-visible` 显式焦点环；图标按钮 `aria-label`；色彩不单独传达状态（配图标/文字）；`prefers-reduced-motion` 下关闭装饰动效。
- **动效**：150ms 微交互 / 200–300ms 进入；缓动 `cubic-bezier(0.2,0,0,1)`；仅动画 `transform` / `opacity`，不动画 `width/height/top/left`。
- **核心页面路由**（与 `packages/contracts` 不冲突，后者仅 `/api/v1/` 接口）：
  - `/login` `/signup` 登录注册（左真实看板预览 + 右表单，OAuth 用 `KeyRound`）
  - `/` 工作区总览（真实数据卡 + AI 摘要流 + Cmd-K）
  - `/projects/:id` 项目看板（List/Kanban/Calendar 多视图同数据集，行内编辑，AI 一键拆解）
  - `/tasks/:id` 任务详情（chat-native 线程 + 属性栏，AI 总结 / 起草发布说明）
  - `/ai` AI 助手（Claude Artifacts 式分屏：左对话线程 / 右产物面板，Publish 与 Copy 分离）
  - `/kb` RAG 知识库（block 文档 + 语义检索，问答带来源引用 `Quote`/`Link`）
  - `/meetings` 会议纪要（AI 转写→纪要+行动项，时间轴，待办一键转任务）
  - `/settings` 设置/团队（成员/权限/集成/计费，分组渐进披露，危险操作走确认）
- **与契约边界**：本文件只定义视觉语义；API 路径、TS 类型、错误码分段归属 `packages/contracts`，前端 Agent 实现时二者并行引用，不互相覆盖。
