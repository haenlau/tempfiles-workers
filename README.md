Cloudflare 临时文件存储服务

基于 Cloudflare Workers + KV 的轻量级临时文件上传与分享工具。
所有文件 12 小时后自动过期删除，单文件大小限制为 25MB。

完全免费、无需服务器、开箱即用，适合快速分享截图、日志、文档等临时内容。
 本项目仅依赖 Cloudflare 免费套餐功能，无需信用卡或高级订阅。

 功能特性
Web 界面上传任意类型文件（≤25MB）
自动生成短链接用于分享
文件自动设置 12 小时 TTL（过期即删）
下载时保留原始文件名并强制附件下载
支持 CORS，可被前端直接调用
路径白名单保护，避免与未来 API 冲突
无用户系统、无数据库、无外部依赖

部署指南
第一步：创建 Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单点击 Workers 和 Pages
3. 点击右上角 + 添加 → 选择 Worker
4. 输入服务名称（如 temp-file-store）
5. 选择 从 Hello World 开始，点击 部署
记下分配的默认地址：https://temp-file-store.workers.dev

第二步：创建 KV 命名空间

1. 在左侧菜单中，展开 存储和数据库
2. 点击 Workers KV
3. 点击 创建命名空间
4. 输入名称：TEMP_STORE
5. 点击 创建

第三步：绑定 KV 到 Worker

1. 返回您的 Worker 详情页
2. 在 绑定 区域点击 + 绑定
3. 类型选择 KV 命名空间
4. 选择刚创建的 TEMP_STORE
5. 设置变量名为 TEMP_STORE
6. 点击 添加绑定

第四步：部署代码

1. 在 Worker 页面点击 编辑代码
2. 清空默认内容，粘贴本仓库中的 [index.js](./index.js)
3. 关键修改：找到以下代码行：

```js
const downloadUrl = https://<your-domain>/${fileId};

将 <your-domain> 替换为您的实际访问域名：
默认域名示例：temp-file-store.workers.dev
自定义域名示例：tmp.example.com
4. 点击右上角 部署

第五步：测试服务
访问上传页面

https://temp-file-store.workers.dev
上传文件
1. 选择一个 ≤25MB 的文件
2. 点击 上传
3. 复制生成的分享链接
下载文件
访问生成的链接，浏览器将自动下载原始文件。

 自定义域名（可选）

1. 在 DNS 中添加 CNAME 记录：
名称：tmp（或其他子域）
目标：temp-file-store.workers.dev
2. 确保该记录由 Cloudflare 代理（橙色云图标）
3. 在 Worker 的 绑定 页面，点击 + 绑定 → 自定义域名
4. 输入 tmp.yourdomain.com 并完成验证
5. 更新 index.js 中的 <your-domain> 为 tmp.yourdomain.com

 安全与限制

项目 说明
------ ------
最大文件大小 25 MB（硬编码限制）
存储有效期 12 小时（通过 expirationTtl: 43200 实现）
文件 ID 6 位随机字符串（基于 Math.random().toString(36)）
路径保护 预留 /api、/upload 等路径防止冲突
身份验证 无 — 所有上传均为公开，请勿用于敏感数据
 此服务设计为临时、公开、无认证场景使用。如需权限控制，请自行扩展 Token 鉴权逻辑。

 开源许可

本项目采用 MIT 许可证

MIT License

 项目地址：[https://github.com/your-username/cloudflare-temp-file](https://github.com/your-username/cloudflare-temp-file)
