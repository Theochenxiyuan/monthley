# Monthley (月理)

一个基于月份时间线的个人计划与活动追踪应用，帮助你记录和管理学习、游戏、影视、阅读等活动，并在每个月回顾自己的完成情况。

## 功能特性

- **时间线视图** - 按月份展示计划，支持向上/向下加载更多月份
- **四种活动类型** - 学、玩、看、读
- **进度追踪** - 未开始、进行中、已完成
- **月份折叠** - 已完成的过去月份、未开始的未来月份可自动折叠；当前月和空月份保持展开
- **未完成提醒** - 过去月份存在未完成计划时，月份卡片显示提醒，具体条目带 warning 标记
- **拖拽整理** - 支持在同月或跨月份拖拽计划
- **待安排区** - 支持先记录暂不确定月份的计划，之后拖拽或菜单移动到具体月份；桌面端提供可拖拽/缩放浮窗，移动端提供独立弹窗
- **AI 一键安排** - 基于当前与未来月份负载、计划内容语义和用户自定义偏好，生成待安排计划的月份建议；确认后批量移动
- **搜索与筛选** - 支持按计划名称搜索，按类型和进度筛选
- **统计** - 总计划、完成率、活跃月份、类型分布、状态分布、年度热力图
- **年度回顾** - 生成年度回顾卡片，支持年份切换、移动端原生分享或下载图片；可通过 AI 生成年度总结
- **云端同步** - 使用同步密钥在设备之间同步/恢复时间线数据
- **同步状态** - 顶栏展示同步状态，支持查看本地/云端更新时间并手动同步
- **首次同步引导** - 首次使用时可创建新密钥、输入已有密钥或仅使用本地存储
- **数据导入导出** - 支持 JSON 备份与恢复
- **深色模式** - 支持浅色/深色主题切换
- **多语言支持** - 中文/英文
- **PWA 支持** - 可安装为渐进式 Web 应用，移动端支持模拟下拉刷新
- **桌面增强布局** - 桌面端以居中应用容器展示，并提供右上角快捷设置、同步状态和布局重置按钮；移动端保持全屏体验

## 技术栈

- **框架**: Vue 3.5.17 (Composition API + `<script setup>`)
- **构建工具**: Vite 8.0.10
- **语言**: TypeScript
- **状态管理**: Pinia 3.0.3
- **路由**: Vue Router 4.5.1
- **UI 组件**: Element Plus 2.11.8
- **国际化**: Vue I18n 11.2.8 (Composition API mode)
- **云同步**: Supabase Storage + Web Crypto AES-GCM
- **日期处理**: date-fns 4.1.0
- **拖拽**: vuedraggable 4.1.0
- **动画**: @formkit/auto-animate 0.8.2
- **图片生成**: html2canvas 1.4.1
- **PWA**: vite-plugin-pwa 1.3.0

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装依赖

```sh
npm install
```

### 环境变量

云端同步与 AI 功能依赖 Supabase。创建 `.env` 文件并配置：

```sh
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

同步服务默认使用名为 `monthley-sync` 的 Supabase Storage bucket。

AI 功能通过 Supabase Edge Functions 调用 DeepSeek，不会在前端直接暴露模型 API Key。项目使用的 Edge Functions：

- `sync-storage` - 加密时间线同步
- `generate-year-summary` - 年度 AI 总结
- `auto-schedule` - 待安排计划 AI 自动安排

Edge Function 运行环境需要配置 `DEEPSEEK_API_KEY`。

### 开发模式

```sh
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 类型检查

```sh
npm run type-check
```

### 生产构建

```sh
npm run build
```

### 预览构建

```sh
npm run preview
```

## 使用说明

### 添加计划

1. 点击时间线页面右上角的「添加」按钮
2. 选择活动类型（学/玩/看/读）
3. 输入计划名称
4. 选择月份，或选择「暂不安排月份」先放入待安排区
5. 点击保存

### 管理计划

- **编辑**: 点击计划条目，在菜单中选择编辑
- **删除**: 点击计划条目，在菜单中选择删除
- **更改进度**: 点击计划条目，在菜单中选择开始/完成
- **拖拽**: 长按并拖拽计划，可移动到其他月份
- **移入待安排区**: 编辑计划并选择「暂不安排月份」

### 待安排区与 AI 自动安排

- 待安排区用于暂存还没有明确完成月份的计划
- 桌面端会在时间线右侧显示可拖拽、可缩放的待安排浮窗；移动端可从时间线顶栏打开待安排弹窗
- 待安排条目可通过菜单「移到当前月」快速放入当前月，也可以拖拽到具体月份
- 点击「AI 一键安排」会先展示隐私说明和额外偏好输入框
- 额外偏好会保存在本机，例如「每个月只玩一款游戏」或「学习类尽量排在前几个月」
- AI 会读取待安排计划和当前/未来月份负载，生成完整安排方案；用户确认后才会批量移动
- AI 自动安排通过 Supabase Edge Function 执行，DeepSeek API Key 不会暴露在前端

### 搜索与筛选

- 点击时间线页面的搜索按钮，可按计划名称搜索并跳转到对应月份
- 搜索跳转会临时展开目标月份并高亮对应条目
- 点击筛选按钮，可按计划类型和进度筛选
- 移动端筛选面板从顶部下拉，桌面端保持侧拉面板
- 筛选状态下月份会自动展开，方便查看匹配结果

### 月份折叠与提醒

- 当前月份和完全空的月份不可收起
- 过去月份如果所有计划已完成，会倾向于自动折叠
- 未来月份如果所有计划未开始，会倾向于自动折叠
- 过去月份中存在未开始或进行中的计划时，会显示「未完成计划」提醒

### 统计与年度回顾

- 进入「统计」页面查看总体计划数、完成率、活跃月份、类型分布和状态分布
- 年度热力图展示每年每月的计划数量
- 点击统计页顶栏的「年度回顾」按钮，可生成年度回顾卡片
- 年度回顾支持切换年份，并可分享或下载为图片
- 年度回顾支持通过 AI 生成年度总结，结果会按年份和语言缓存到本地
- 年度回顾当前选择的年份会作为全局状态保留，切换页面后不会丢失

### 云端同步

- 首次使用且本地无数据时，会询问是否启用云端同步
- 可以创建新同步密钥，也可以输入已有密钥恢复云端时间线
- 同步密钥需要自行保存，后续在其他设备上使用同一密钥即可恢复数据
- 如果暂时跳过同步，仍可在「设置」页面稍后开启
- 生成新密钥前会要求确认，避免误替换已有密钥
- 时间线顶栏可查看同步状态；桌面端右上角同步按钮可显示本地更新时间、上次同步时间和云端更新时间

### 数据备份与恢复

#### 导出数据

1. 进入「设置」页面
2. 点击「导出时间线」按钮
3. JSON 文件将自动下载

#### 导入数据

1. 进入「设置」页面
2. 点击「导入时间线」按钮
3. 选择之前导出的 JSON 文件
4. 确认导入，数据会合并，不会覆盖现有数据

#### 清除数据

1. 进入「设置」页面
2. 点击「清除整个时间线」按钮
3. 确认操作，此操作不可恢复

### 设置

- **语言**: 切换中文/英文
- **外观**: 切换浅色/深色主题
- **默认展开**: 控制月份默认展开策略
- **快捷设置**: 桌面端右上角可快速切换语言、深色模式和默认展开
- **AI 安排偏好**: AI 一键安排弹窗中的额外偏好会保存在本机设置中
- **云端同步**: 生成密钥、输入已有密钥、手动同步、清除密钥
- **备份与恢复**: 导出/导入 JSON 时间线数据
- **危险操作**: 清除整个时间线

## 项目结构

```text
src/
├── assets/                  # 全局样式与静态资源
├── components/              # Vue 组件
│   ├── stats/               # 统计与年度回顾组件
│   │   ├── StatCard.vue
│   │   ├── StatusRing.vue
│   │   ├── TypeDistribution.vue
│   │   ├── YearHeatmap.vue
│   │   ├── YearSummaryDialog.vue
│   │   └── YearSummaryPanel.vue
│   ├── AIScheduleConfirmDialog.vue # AI 自动安排结果确认弹窗
│   ├── AutoSchedulePromptDialog.vue # AI 自动安排隐私说明与偏好输入
│   ├── EntryDialog.vue      # 计划编辑对话框
│   ├── EntryItem.vue        # 计划条目组件
│   ├── MonthCard.vue        # 月份卡片组件
│   ├── SearchPanel.vue      # 搜索面板
│   ├── UnscheduledPanel.vue # 桌面端待安排浮窗
│   └── SyncOnboardingDialog.vue # 首次同步引导
├── composables/             # 组合式逻辑
│   ├── useAutoSchedule.ts   # AI 自动安排调用逻辑
│   ├── useStats.ts          # 统计数据计算
│   ├── useSync.ts           # 同步逻辑
│   └── useYearSummary.ts    # 年度回顾数据计算
├── i18n/                    # 国际化配置
│   ├── index.ts
│   └── locales/             # 中文/英文语言包
├── lib/                     # 第三方服务客户端
│   └── supabase.ts
├── router/                  # 路由配置
├── services/                # 服务层
│   ├── dataService.ts       # 数据导入导出服务
│   └── syncService.ts       # 加密云同步服务
├── stores/                  # Pinia 状态管理
│   ├── dialog.ts
│   ├── filters.ts
│   ├── settings.ts
│   ├── stats.ts
│   └── timeline.ts
├── types/                   # TypeScript 类型定义
│   └── models.ts
├── utils/                   # 工具函数
│   └── dateFormatter.ts
├── views/                   # 页面组件
│   ├── SettingsView.vue
│   ├── StatsView.vue
│   └── TimelineView.vue
├── App.vue                  # 应用外壳
└── main.ts                  # 入口文件

supabase/
└── functions/
    ├── auto-schedule/       # AI 自动安排 Edge Function
    ├── generate-year-summary/ # 年度 AI 总结 Edge Function
    └── sync-storage/        # 加密同步 Edge Function
```

## 数据格式

时间线数据存储在浏览器的 `localStorage` 中。导出格式如下：

```json
{
  "months": [
    {
      "year": 2026,
      "month": 3,
      "entries": [
        {
          "id": "uuid-string",
          "name": "计划名称",
          "type": "learn",
          "status": "completed",
          "notes": "可选备注"
        }
      ]
    }
  ],
  "unscheduledEntries": [
    {
      "id": "uuid-string",
      "name": "暂不确定月份的计划",
      "type": "play",
      "status": "not_started",
      "notes": "可选备注"
    }
  ],
  "lastUpdated": "2026-04-16T10:30:00.000Z"
}
```

同步数据会在上传前使用同步密钥派生出的 AES-GCM 密钥加密，云端只保存加密后的 payload。

应用设置存储在浏览器 `localStorage` 的 `settings` 键下，包括语言、深色模式、同步密钥、默认展开状态和 AI 安排偏好。当前设置不会随时间线同步到云端。

## 浏览器支持

建议使用现代浏览器：

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证

MIT License

---

**月理 - 掌握生活的旋律**
