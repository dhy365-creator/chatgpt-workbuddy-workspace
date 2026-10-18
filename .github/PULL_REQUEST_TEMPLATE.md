## Purpose / 修改目的

Link the related Issue and explain the benefit to users. / 请关联 Issue，说明改善了什么。

## Changes / 改动摘要

<!-- Keep changes focused. Never attach passwords, tokens, QR codes, private sessions or client data.
     请保持变更范围可审核，禁止附加密码、Token、二维码、私人会话或客户资料。 -->

## Verification / 测试

- [ ] `npm test` passes (state OS; Windows ACL-specific cases require Windows).
- [ ] `git diff --check` passes.
- [ ] `npm pack --dry-run` contains only approved files.
- [ ] If modifying launch/auth, verify loopback-only, password auth, and safe stop.
- [ ] If modifying docs or regional benefits, update **English and 简体中文** and cite official terms.
- [ ] Optional Star prompt never blocks install, auto-stars, or collects credentials.

## Risk and rollback / 风险与回退

Which platforms change and how do you roll back? / 哪些平台受影响，如何撤回？
