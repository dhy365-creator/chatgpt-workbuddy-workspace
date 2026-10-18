# ChatGPT + WorkBuddy Side-by-Side Workspace — Installation Guide

**English** · [简体中文](INSTALL_WITH_CODEX.zh-CN.md) · [Back to README](../README.md)

This project launches the **official Tencent CodeBuddy CLI native Web UI**, so you can place it alongside ChatGPT in a compatible desktop client, or use tiled windows. **ChatGPT Chat plans and reviews. CodeBuddy executes. You manually hand tasks and results between them.** No proprietary model, browser extension, private MCP, or automatic agent-to-agent messaging is required.

## Choose one installation method

### A. Ask Codex to install the GitHub repository

Open a Codex session **authorized to execute local commands on your computer** and send:

> Install this project for me: https://github.com/dhy365-creator/chatgpt-workbuddy-workspace

Codex reads this repo's [AGENTS.md](../AGENTS.md) and the instructions below, then checks Node, npm, Git and the official CodeBuddy CLI; requests your **existing, approved project directory**; installs the published helper; and starts the local Web UI. You don't need to copy a long installation prompt.

**This is not automatic access granted by ChatGPT Chat.** Normal host/OS approvals still apply. Merely viewing the repository does not authorize installation.

### B. Install with npm yourself (no Codex needed)

**Requirements:** macOS or Windows, Node.js **18.20+**, npm, Git, and an eligible CodeBuddy account. [Tencent's official English CodeBuddy CLI guide](https://www.codebuddy.ai/docs/cli/installation) uses the same npm package on both account regions.

```bash
npm install -g github:dhy365-creator/chatgpt-workbuddy-workspace#v0.2.2
```

The first command **only installs the helper**; it does not automatically start services, change OS permissions or authenticate for you.

**macOS:**
```bash
workbuddy-web install --project "/Users/you/Projects/demo"
```

**Windows (Command Prompt / Windows Terminal):**
```bat
workbuddy-web.cmd install --project "C:\Users\you\Documents\demo"
```

The specified directory must already exist and be yours to work in. The helper checks for `codebuddy --version` and may install the official `@tencent-ai/codebuddy-code` CLI **when missing**. It then starts the vendor's native Web UI locally, with password authentication.

**Windows PowerShell note:** If your execution policy blocks a `.ps1` command shim, execute `workbuddy-web.cmd` instead; you do **not** need to weaken system-wide PowerShell security policies.

## 🌍 Domestic vs. international login and credits

The official CodeBuddy CLI supports sign-in choices such as:

- **Chinese Site** — regional Tencent Cloud sign-in for China.
- **International Site** — international Tencent Cloud / [codebuddy.ai](https://www.codebuddy.ai/) account sign-in.
- Other organization-specific methods may also be listed.

Select the site that is actually appropriate for **your account and location**. You must log in using the **official CodeBuddy flow**; this open-source tool cannot change account regions, bypass restrictions or award credits.

| Account region | Free plan noted by the official provider | Important details |
| --- | --- | --- |
| **International** | **100 base credits/month** | Limited-time **30/day bonus** has separate conditions: **Web-based conversations/tasks do not qualify**; only qualifying activity in an official WorkBuddy/CodeBuddy client may count. |
| **China** | **500 base credits/month** | A different domestic plan, **not** the international Free tier. |

Read [WorkBuddy international pricing](https://www.workbuddy.ai/docs/workbuddy/pricing), [CodeBuddy international login](https://www.codebuddy.ai/docs/cli/quickstart), and [China domestic plans](https://www.workbuddy.cn/docs/workbuddy/Pricing) for current information. Checked October 18, 2026. Promotions, login availability, eligibility and model access can change. **Opening CodeBuddy Web using this project does not itself make you eligible for the 30/day activity reward.** Official [activity terms](https://www.codebuddy.ai/docs/workbuddy/Subscription). **No unlimited free tokens or worldwide equivalence is promised.**

> **What about OpenCode?** You can manually apply the ChatGPT-plan/another-agent-executes workflow to any terminal or Web-enabled agent. This repository currently **only** automates CodeBuddy's native Web startup; it does **not** install OpenCode.

## Nine real Windows installation screenshots

These examples were captured on a **Chinese-language Windows deployment**. They show the **real CodeBuddy UI**, so some labels differ in the international edition. Screenshots are cropped to the relevant vendor window; sensitive Web passwords, secret-bearing URLs, private config paths and temporary authentication QR codes are redacted. **Follow the prompts shown on your own computer.**

### 01 — Open the local CodeBuddy Web password page

After startup, Codex or your terminal should display the local URL:

```text
http://127.0.0.1:18862/
```

Open it in a browser. This is the **local CodeBuddy Web password page**, not the personal model-account login.

![01 — Official CodeBuddy Web local password screen](images/01-sanitized.webp)

### 02 — Find your local Web password

Startup diagnostics may include the Web endpoint, the Web password or password-bearing local URL, the config location, Agent and permission mode. **Read the password only on your own computer** — do not paste it into ChatGPT, Codex or a public GitHub Issue.

The example below hides the actual password and its query string.

![02 — Local CLI startup output with private fields redacted](images/02-sanitized.webp)

### 03 — Sign in to your official CodeBuddy account

Passing the **local Web password** opens the official account-login flow. You may need to choose **International Site** if you use a valid international account. A successful HTTP 200 or local password check does **not** prove that the account can use a specific model.

![03 — Official CodeBuddy account sign-in](images/03-sanitized.webp)

### 04 — Complete the supported account verification

Depending on site and account region, the official product may offer QR sign-in, email, phone or SSO. The screenshot shows the Chinese site's QR option; **the temporary login QR is intentionally removed**. Use only the live QR or login link generated on your own computer.

![04 — Example QR sign-in page with temporary authentication QR removed](images/04-sanitized.webp)

### 05 — Return after successful sign-in

Once the official product confirms sign-in, return to the local Web UI.

![05 — Official account login success screen](images/05-sanitized.webp)

### 06 — Check the native Web workspace

The main Web UI provides the vendor's native chat interface and a selected project directory. Confirm the directory matches your intended work — **a working directory is not an OS-level sandbox**.

![06 — Official native CodeBuddy Web chat](images/06-sanitized.webp)

### 07 — Select a model (subject to account entitlements)

Use the vendor's native model selector. Models, availability, free offers, and routing policies can differ across domestic/international accounts. `--permission-mode auto` does **not** mean unlimited tool permissions.

![07 — Native model selector](images/07-sanitized.webp)

### 08 — Optionally try a small Agent or `/goal` task

The screenshot shows a real Windows agent acceptance task. `/goal` may invoke models repeatedly and **use account credits**, so it is **not** run automatically by the installer. Test only in a directory you have authorized.

![08 — Native agent goal execution in the original Chinese-language test](images/08-sanitized.webp)

### 09 — Review the actual execution evidence

Successful installation, successful official account login, and successful **model/task execution** are separate milestones. Ask Codex to report exactly what was tested; **do not mark a model test PASS if it was not run**.

![09 — Real task acceptance results](images/09-sanitized.webp)

## Useful commands and troubleshooting

```bash
workbuddy-web --version
workbuddy-web doctor
workbuddy-web status
workbuddy-web start
workbuddy-web stop
```

If `127.0.0.1:18862` is already in use, inspect which process owns it before changing ports. **Never kill unknown CodeBuddy or Node processes by name.** Only stop a process verified as created by this tool.

If a local Web page works but models are unavailable, confirm your **official account site**, your account's free/paid entitlements, vendor service availability and the CodeBuddy CLI version. International-site login and current credits are governed by the provider; this repo does not route models or transfer credits.

If the Codex execution window is closed, run `workbuddy-web status` to check whether the native Web service is still alive. **Automatic restart after a computer reboot is not promised.**

## Language settings for the launcher prompt

The optional installation-success/Star text follows your terminal locale by default. To force English when you run the helper, set environment variable `WORKBUDDY_WEB_LANG=en`. For Simplified Chinese, choose `WORKBUDDY_WEB_LANG=zh-CN`.

This affects only the helper's own prompt, **not the vendor CodeBuddy Web language, model settings, or account region**.

## ⭐ Optional GitHub Star

After `workbuddy-web install` successfully starts the official Web service, an **optional** prompt asks whether to open the project on GitHub. Press **y** to open its page and click Star yourself. The prompt times out after 15 seconds, and non-interactive Codex sessions show a link without waiting. You can always skip it; no automatic starring or GitHub credential collection occurs.

## 🐛 Feedback from anywhere

Use [GitHub Issues](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose) for **bugs or feature suggestions**. You can attach **redacted** screenshots or log summaries, but never include passwords, cookies, token-bearing URLs, temporary login QR codes, private client files or actual chat transcripts.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for pull requests, or report security vulnerabilities through the repository's **private** [security advisories](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/security/advisories/new).

**Disclaimer:** An unofficial independent open-source launcher; not affiliated with OpenAI, Tencent or OpenCode. No vendor CLI binaries are included. [CodeBuddy installation docs](https://www.codebuddy.ai/docs/cli/installation) · [CodeBuddy CLI quickstart](https://www.codebuddy.ai/docs/cli/quickstart).
