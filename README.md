# Monthley (月理)

一个基于时间线的个人活动追踪应用，帮助你记录和管理学习、游戏、影视和阅读等活动。

## 功能特性

- 📅 **时间线视图** - 按月份展示你的活动记录
- 🎯 **四种活动类型** - 学（知识/技能）、玩（游戏）、看（影视）、读（书本）
- 🔄 **进度追踪** - 未开始、进行中、已完成
- 🎨 **深色模式** - 支持浅色/深色主题切换
- 🌐 **多语言支持** - 中文/英文
- 📤 **数据导出** - 将时间线导出为 JSON 文件备份
- 📥 **数据导入** - 从 JSON 文件导入时间线数据
- 🗑️ **数据管理** - 可清除整个时间线
- 📱 **PWA 支持** - 可作为渐进式 Web 应用安装

## 技术栈

- **框架**: Vue 3.5.17 (Composition API)
- **构建工具**: Vite 7.0.0
- **语言**: TypeScript
- **状态管理**: Pinia 3.0.3
- **路由**: Vue Router 4.5.1
- **UI 组件**: Element Plus 2.11.8
- **国际化**: Vue I18n 11.2.8
- **日期处理**: date-fns 4.1.0
- **拖拽**: vuedraggable 4.1.0
- **动画**: @formkit/auto-animate 0.8.2

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn

### 安装依赖

```sh
npm install
```

### 开发模式

```sh
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 生产构建

```sh
npm run build
```

### 类型检查

```sh
npm run type-check
```

### 预览构建

```sh
npm run preview
```

## 使用说明

### 添加计划

1. 点击时间线上的 "+" 按钮
2. 选择活动类型（学/玩/看/读）
3. 输入计划名称
4. 选择日期
5. 点击保存

### 管理计划

- **编辑**: 右键点击计划 → 编辑
- **删除**: 右键点击计划 → 删除
- **更改进度**: 右键点击计划 → 开始/完成
- **拖拽**: 可在月份间拖拽计划

### 数据备份与恢复

#### 导出数据

1. 进入「设置」页面
2. 点击「导出时间线」按钮
3. JSON 文件将自动下载

#### 导入数据

1. 进入「设置」页面
2. 点击「导入时间线」按钮
3. 选择之前导出的 JSON 文件
4. 确认导入（数据会合并，不会覆盖现有数据）

#### 清除数据

1. 进入「设置」页面
2. 点击「清除整个时间线」按钮
3. 确认操作（此操作不可恢复）

### 筛选功能

- 点击时间线页面的筛选按钮
- 可按活动类型和进度筛选
- 筛选状态下月份会自动展开

### 设置

- **语言**: 切换中文/英文
- **外观**: 切换浅色/深色主题
- **默认展开**: 是否默认展开所有月份
- **折叠显示**: 控制月份折叠时的显示内容

## 项目结构

```
src/
├── assets/          # 静态资源
├── components/      # Vue 组件
│   ├── EntryDialog.vue    # 计划编辑对话框
│   ├── EntryItem.vue      # 计划项组件
│   └── MonthCard.vue      # 月份卡片组件
├── i18n/            # 国际化配置
│   ├── index.ts
│   └── locales/     # 语言包
├── router/          # 路由配置
├── services/        # 服务层
│   └── dataService.ts   # 数据导入导出服务
├── stores/          # Pinia 状态管理
│   ├── dialog.ts      # 对话框状态
│   ├── filters.ts     # 筛选状态
│   ├── settings.ts    # 设置状态
│   └── timeline.ts    # 时间线状态
├── types/           # TypeScript 类型定义
│   └── models.ts
├── utils/           # 工具函数
│   └── dateFormatter.ts
├── views/           # 页面组件
│   ├── SettingsView.vue
│   └── TimelineView.vue
├── App.vue          # 根组件
└── main.ts          # 入口文件
```

## 数据格式

时间线数据存储在浏览器的 localStorage 中，导出格式如下：

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
          "status": "completed"
        }
      ]
    }
  ],
  "lastUpdated": "2026-04-16T10:30:00.000Z"
}
```

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
