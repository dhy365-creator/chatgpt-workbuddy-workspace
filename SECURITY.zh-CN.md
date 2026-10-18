# 安全政策 / 私密反馈

[**English**](SECURITY.md) · **简体中文**

发现安全问题时，请**不要**在公开 Issue、PR 或 AI 对话里提供密码、Token、Cookie、带密码的网页 URL、临时扫码二维码、真实私人会话、客户资料或可直接利用的攻击细节。

请优先使用 GitHub **[Private Vulnerability Reporting（私密漏洞报告）](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/security/advisories/new)**，由仓库维护者私密接收。若入口不可用，请先创建**不含敏感信息**的 Issue 寻求私密联系方式。

报告建议包含受影响版本、系统、简要复现步骤（去掉敏感字段）、实际影响和你已经采取的缓解措施。一般安装问题使用 [Bug 模板](https://github.com/dhy365-creator/chatgpt-workbuddy-workspace/issues/new/choose)。

## 安全边界

- 官方 CodeBuddy Web 默认只监听 `127.0.0.1`，启用本机密码及 `auto` 权限。禁止 `bypassPermissions`、`--auth none` 或开放公网。
- macOS 的本地配置与密码日志使用所有者权限，Windows 使用显式私有 NTFS ACL；设置/核验失败应拒绝启动。
- 工作目录不是操作系统级的完整文件沙箱。
- 切勿在 ChatGPT、Codex 或 GitHub 上传真实密码、账号数据或客户工作文件。
- 官方 CodeBuddy 的模型额度和免费政策归官方管理，本项目不能转移或绕过。

本项目为个人维护的开源项目，不承诺漏洞修复 SLA。
