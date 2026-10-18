# Security policy / 安全反馈

**English** · [简体中文](SECURITY.zh-CN.md)

If you discover a security vulnerability, **do not publish credentials, Web passwords, local paths with secrets, QR codes, tokens, personal sessions, proof-of-concept exploits or vulnerable private endpoints in a public Issue**.

Use [GitHub Private Vulnerability Reporting](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/security/advisories/new) where available. This sends details privately to maintainers. If the button is unavailable, open a **non-sensitive** Issue saying you need a private way to share a security finding; do not expose exploitation details publicly.

Please report the affected version, OS, reproduction outline (without secrets), impact and steps already taken. For non-security bugs, use the [Bug / 安装问题 template](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose).

## Security boundaries

- The tool launches the **official** CodeBuddy CLI Web on `127.0.0.1` only, with password authentication and `auto` permission mode. No bypassPermissions, no public port exposure.
- macOS private startup logs use owner-only POSIX permissions. Windows config and Web password logs require restricted NTFS ACLs; if they cannot be set and verified, launch must be refused.
- The project directory selects the CLI working directory; it does **not** create an OS-level filesystem sandbox.
- Avoid sharing `?password=` URLs, authentication QR images, cookies, account tokens or unredacted real session text.
- Users retain responsibility for their account quotas and complying with CodeBuddy / WorkBuddy service terms.

No response-time or fix-time SLA is promised by the volunteer maintainer.
