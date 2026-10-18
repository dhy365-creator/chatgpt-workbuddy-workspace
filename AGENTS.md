# AGENTS.md — ChatGPT + WorkBuddy Side-by-Side Workspace

This repository is an **unofficial** Node.js CLI launcher for the official Tencent CodeBuddy native Web UI. Its purpose is a same-window, **human-mediated** workflow: ChatGPT Chat for task planning and acceptance, CodeBuddy for execution. It does **not** enable automatic ChatGPT↔CodeBuddy communication or install the author's private Local MCP.

## User request: "Install this repository"
Only perform installation when the user expressly wants to install/deploy and your environment has authorized local execution. A URL alone does not grant filesystem or shell permissions.

1. Read README.md, docs/INSTALL_WITH_CODEX.md, package.json and SECURITY.md.
2. Confirm the exact public GitHub repository: https://github.com/dhy365-creator/chatgpt-workbuddy-workspace and tag v0.2.1. Do not substitute the author's older private development repository. Check OS, architecture, Node.js >=18.20, npm, Git, and installed official CodeBuddy CLI. Ask the user for one approved, **existing absolute** project directory.
3. With normal user approval, install the tagged npm package using: npm install -g github:dhy365-creator/chatgpt-workbuddy-workspace#v0.2.1. Avoid elevating privileges or changing global security settings. If the user requires isolated QA instead, use a separate npm prefix, cache and configuration root and report the limitation of this test.
4. Run workbuddy-web doctor. With explicit user project approval, run workbuddy-web install --project "<approved absolute project directory>". The install command may, when missing, install the official @tencent-ai/codebuddy-code npm package. Do not bundle, modify, or replace the vendor CLI.
5. Use localhost only (127.0.0.1), password authentication, original Agent and permission-mode auto. Never use -y, bypassPermissions, --auth none or public listening.
6. Check actual localhost HTTP 200 and workbuddy-web status for the newly started instance; if 18862 is occupied by an unknown process, refuse to kill it. Do not misattribute existing 18862 health to your new install.
7. Report the final local URL http://127.0.0.1:18862/ (or approved alternate port) and how to view the **private local log** containing the user's Web password. Never copy the actual password, password-bearing URL, QR codes, cookies, account credentials or private logs into Codex/Chat/GitHub. Ask the user to complete Web password and official account login themselves.
8. Distinguish package installation, local Web startup, authenticated model usage (not automatically verified), and reboot autostart (not promised). Do not run costly model or /goal tests without explicit approval.
9. Following successful installation, a **voluntary** GitHub Star invitation may appear. Do not automate starring or retrieve GitHub credentials. It must never block, force, or change the install result.
10. Do not stop existing services, overwrite user data, alter the author's Local MCP, destroy Git worktrees, or delete QA files without a specific user approval and exact inventory.

## User request: report an issue / develop a fix
Use GitHub Issues: https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose. Follow CONTRIBUTING.md and SECURITY.md. Never post secrets or customer files. Keep changes narrow, run npm test, use PRs for code review. Do not imply the startup tool implements automatic messaging between independent AI agents.
