# Contributing to ChatGPT + WorkBuddy Side-by-Side Workspace

**English** · [简体中文](CONTRIBUTING.zh-CN.md)

Thanks for helping improve this independent open-source project! **You can report an issue even if you don't write code.** You can also suggest improvements, help translate docs, or submit pull requests.

## 🐛 Bugs and installation problems

Open a [GitHub Issue](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose) and choose **Bug / 安装问题**.

Please provide:
1. OS version / architecture (Windows or macOS).
2. Your Node.js, npm, official CodeBuddy CLI and `workbuddy-web` versions.
3. Whether you installed via Codex or npm, and your **redacted** reproduction steps.
4. Expected and actual behavior, errors, and what you already tried.
5. Screenshots only after removing credentials and sensitive data.

**Never post Web passwords, tokens, cookies, authentication QR codes, password-bearing URLs, client projects or personal chats.** For security vulnerabilities use [SECURITY.md](SECURITY.md).

## 💡 Feature ideas and other AI agents

Use [Feature request / 功能建议](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose). Explain **which real workflow problem** you want to solve and what manual workaround currently helps.

The current product is a **CodeBuddy Web launcher**. ChatGPT planning/review + CodeBuddy execution uses a **human handoff**, not automatic AI-to-AI messaging. OpenCode and other agents are only suggested as workflows you can explore separately; they are **not** installed by this package.

## 🔧 Contribute code or translation

1. Search existing Issues first; discuss large proposals before implementing.
2. Fork the repository and create a focused branch.
3. Use Node.js ≥18.20 and run `npm test`, `node --check bin/workbuddy-web.js`, `git diff --check` and `npm pack --dry-run`.
4. Keep Windows/macOS and private-log ACL security behavior intact.
5. Open a PR with summary, tests, risks and the linked Issue.
6. Include only rights-cleared original content, and never include local MCP code, vendor binaries, live QR images, private credentials or private histories.

Changes to English and Simplified Chinese docs are welcome. **If you change product usage or region-specific entitlements, update both languages and link the official provider policy.**

By contributing, you agree that your original contributions to this repository are available under its [MIT license](LICENSE); third-party content retains its own rights.

## Maintainer review

PRs are reviewed for scope, security, compatibility and evidence. A maintainer may request changes and decides when to merge or release. No specific response/fix SLA is promised.

This project is independent; it is not an official product from OpenAI, Tencent or the developers of OpenCode.
