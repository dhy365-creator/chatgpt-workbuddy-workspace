[**English**](CONTRIBUTING.md) · **简体中文**

# Contributing / 参与贡献

感谢你帮助改进 **ChatGPT + WorkBuddy 同屏工作台**。欢迎报告问题、建议功能、贡献文档或代码。**不需要等作者自己发现问题！**

## 🐛 遇到 Bug 或安装问题

请打开 [GitHub Issues](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose)，选 **Bug / 安装问题**。建议填写：

1. 系统：macOS / Windows 版本、CPU 架构。
2. Node.js / npm / 官方 CodeBuddy CLI 的实际版本。
3. 安装方式：Codex 读取仓库，还是手动 npm。
4. 期望结果、实际结果、最小复现步骤及已经尝试过的解决方法。
5. 仅附**脱敏**错误消息或截图。**不要附 Web 登录密码、带密码的完整 URL、Token、Cookie、二维码、客户数据或聊天内容。**

GitHub 会让作者在 Issues 中追踪、回复和标记问题；同类问题请尽量继续同一条 Issue。

## 💡 想法与功能建议

同样使用 Issues，选择 **功能建议**，说明你的使用场景、已有变通方法、预期体验。我们目前重点支持**同屏协作与人工交接**；OpenCode 等其他 CLI 的独立集成不是当前发布的完成能力，请不要把想法误当成已实现产品。

## 🔧 想贡献代码

1. 先搜索 Issues 是否已有相同问题；对大功能先在 Issue 讨论。
2. Fork 本仓库并创建独立分支。
3. 使用 Node.js ≥18.20，运行 `npm test`、`node --check bin/workbuddy-web.js`、`npm pack --dry-run`。
4. 用最小改动解决问题，保留 Windows/macOS 兼容与本地密码安全策略。
5. 提交 Pull Request，填写变更摘要、测试结果和风险。维护者决定是否合并。
6. 请不要加入真实凭证、历史会话、客户工程文件、私有 Local MCP、产品二进制或未授权第三方素材。

你提交的原创修改将按本仓库的 MIT 许可用于该项目。提交第三方代码请提供其来源及兼容许可。

## 💬 沟通边界

这个项目目前是**ChatGPT 沟通/验收 + CodeBuddy 执行 + 人工反馈**的工作流。作者另有自研 Local MCP，**不在本仓库提供或维护**。请区分本仓库真实启动功能与其他产品的独立能力。

遇到敏感安全问题，使用 [SECURITY.md](SECURITY.md) 中的私密渠道，不在公开 Issue 披露可利用细节。
