# Open Stock Board

基于 React + TypeScript + Vite 的股票看板项目。

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 打包构建

```bash
npm run build
```

4. 本地预览构建产物

```bash
npm run preview
```

## A股数据层配置

本项目已改为真实数据层，不再使用前端 mock 数据。

1. 新建环境变量文件

```bash
cp .env.example .env
```

2. 配置 A 股数据服务入口

- `VITE_A_SHARE_API_BASE_URL`: A 股数据服务基础地址（建议使用你自己的后端/BFF）
- `VITE_A_SHARE_API_TOKEN`: 可选鉴权令牌

3. 数据服务需提供以下接口

- `GET {BASE_URL}/quotes?symbols=600519,000858`
- `GET {BASE_URL}/chart?range=1d|1w|1m|3m|1y|ytd&symbol=600519`（symbol 为空时返回组合视角）
- `GET {BASE_URL}/news`
- `GET {BASE_URL}/industries`

4. 持仓基础数据来源

- 前端从 `public/data/trades.json` 读取交易记录并聚合为持仓
- 实时价格与涨跌由 `quotes` 接口覆盖更新

## 可用脚本

- npm run dev: 启动 Vite 开发服务器
- npm run build: 生产构建
- npm run build:ts: 先执行 TypeScript 构建检查，再进行生产构建
- npm run build:prod: 使用 prod 模式构建
- npm run lint: 执行 ESLint 检查
- npm run preview: 预览构建结果
- npm run install-deps: 安装依赖
- npm run clean: 清理 node_modules 和 package-lock.json

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Recharts

## 目录说明

- src/components: 页面组件与仪表盘模块
- src/store: 状态管理
- src/lib: 工具函数与 A 股数据服务
- src/types: 类型定义
- public/data: 静态示例数据
