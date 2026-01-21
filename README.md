# Tampermonkey Scripts Collection

这是一个 Tampermonkey 用户脚本集合,支持通过 URL 订阅自动更新。

## 📦 脚本列表

### 1. Gemini Prompt Injector
- **功能**: 从 URL 参数注入提示词到 Gemini 输入框
- **安装**: [点击安装](https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/gemini/prompt_injector.user.js)
- **适用网站**: https://gemini.google.com/*

### 2. JSON Online Editor - Safe JSON Paste
- **功能**: 安全处理包含大数字的 JSON 粘贴
- **安装**: [点击安装](https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/jsont/load-json-safely.user.js)
- **适用网站**: https://www.jsont.run

### 3. 夸克视频工具栏透明度调整
- **功能**: 调整夸克视频工具栏的背景透明度
- **安装**: [点击安装](https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/quark/change-video-panel-opacity.js)
- **适用网站**: https://pan.quark.cn/*

## 🚀 安装方法

### 方法一: 直接安装 (推荐)
1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击上方脚本列表中的"点击安装"链接
3. 在弹出的 Tampermonkey 安装页面点击"安装"按钮

### 方法二: 手动安装
1. 打开 Tampermonkey 管理面板
2. 点击"添加新脚本"
3. 复制对应脚本的完整代码
4. 粘贴到编辑器并保存

## 🔄 自动更新

所有脚本都配置了自动更新功能:

- **自动检查**: Tampermonkey 默认每天自动检查更新
- **手动检查**: 在 Tampermonkey 管理面板中点击"检查更新"
- **更新机制**: 当 GitHub 仓库中的脚本版本号更新时,客户端会自动下载并安装新版本

### 更新流程说明
1. 开发者推送新版本到 GitHub (需递增 `@version` 版本号)
2. Tampermonkey 定期访问 `@updateURL` 检查版本
3. 发现新版本后自动从 `@downloadURL` 下载
4. 用户无需手动操作,脚本自动更新

## 📝 开发者说明

### 版本号规范
- 使用语义化版本号: `主版本.次版本.修订号`
- 每次更新必须递增版本号,否则不会触发更新

### 元数据配置
每个脚本都包含以下关键元数据:
```javascript
// @version      1.0  // 版本号
// @updateURL    https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/路径/脚本名.user.js
// @downloadURL  https://raw.githubusercontent.com/Mopip77/tampermonkey-scripts/main/路径/脚本名.user.js
```

### 发布新版本
1. 修改脚本代码
2. 递增 `@version` 版本号
3. 提交并推送到 GitHub
4. 用户端将在下次检查时自动更新

## 📄 许可证

MIT License

## 👤 作者

mopip77
