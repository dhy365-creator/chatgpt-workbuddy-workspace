'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('English and Chinese entrypoints, pricing disclaimers and assets stay in sync', () => {
  const en = read('README.md');
  const zh = read('README.zh-CN.md');
  const installEn = read('docs/INSTALL_WITH_CODEX.md');
  const installZh = read('docs/INSTALL_WITH_CODEX.zh-CN.md');
  const packageInfo = JSON.parse(read('package.json'));
  assert.equal(packageInfo.version, '0.2.2');

  assert.match(en, /简体中文/);
  assert.match(zh, /English/);
  assert.match(installEn, /INSTALL_WITH_CODEX\.zh-CN\.md/);
  assert.match(installZh, /INSTALL_WITH_CODEX\.md/);

  for (const source of [en, zh, installEn, installZh]) {
    assert.match(source, /100/); // International basic monthly Free credits
    assert.match(source, /500/); // China trial basic monthly credits
    assert.match(source, /github:dhy365-creator\/chatgpt-workbuddy-workspace#v0\.2\.2/);
    assert.match(source, /CodeBuddy/);
  }
  assert.match(en, /International Site/);
  assert.match(en, /manual handoff/);
  assert.match(zh, /人工交接/);
  assert.match(en, /OpenCode/);
  assert.match(zh, /国际版/);

  for (const file of [
    'CONTRIBUTING.md', 'CONTRIBUTING.zh-CN.md',
    'SECURITY.md', 'SECURITY.zh-CN.md',
    'THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.zh-CN.md',
    'docs/images/vision-main-workspace.en.svg',
    'docs/images/vision-free-credits.en.svg',
    'docs/images/vision-main-workspace.svg',
    'docs/images/vision-free-credits.svg'
  ]) assert.ok(fs.statSync(path.join(root, file)).isFile(), file);

  const docsToScan = [
    'README.md', 'README.zh-CN.md', 'docs/INSTALL_WITH_CODEX.md',
    'docs/INSTALL_WITH_CODEX.zh-CN.md', 'CONTRIBUTING.md',
    'CONTRIBUTING.zh-CN.md', 'SECURITY.md', 'SECURITY.zh-CN.md'
  ];
  for (const file of docsToScan) {
    const source = read(file);
    const reference = /!?\[[^\]]*\]\(([^)]+)\)/g;
    for (const m of source.matchAll(reference)) {
      const target = m[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
      const full = path.resolve(root, path.dirname(file), target);
      assert.ok(full.startsWith(root + path.sep), 'Link escapes repository: ' + file);
      assert.ok(fs.existsSync(full), 'Broken local link: ' + file + ' -> ' + target);
    }
  }

  const files = packageInfo.files;
  assert.ok(files.includes('README.zh-CN.md'));
  assert.ok(files.includes('docs/'));
  assert.ok(!Object.prototype.hasOwnProperty.call(packageInfo.scripts, 'postinstall'));
});
