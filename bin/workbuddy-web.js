#!/usr/bin/env node
'use strict';

/* A tiny launcher for the OFFICIAL CodeBuddy CLI Web UI.
 * No bundled CodeBuddy binary, API key, model proxy or permission bypass.
 * No npm postinstall side effects.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const cp = require('node:child_process');
const readline = require('node:readline');
const { version } = require('../package.json');
const windowsStorage = require('./windows-private-storage');

const OFFICIAL_PACKAGE = '@tencent-ai/codebuddy-code';
// Update once the separately approved PUBLIC repository is created.
const STAR_REPO_URL = 'https://github.com/dhy365-creator/chatgpt-workbuddy-workspace';
const DEFAULT_PORT = 18862;
const C = ['--serve', '--host', '127.0.0.1',
  '--port', null, '--auth', 'password', '--agent', 'cli',
  '--permission-mode', 'auto'];

function fail(message, code = 2) {
  process.stderr.write('ERROR: ' + message + '\n');
  process.exitCode = code;
}
function cfgRoot() {
  const testOverride = process.env.WORKBUDDY_WEB_CONFIG_DIR;
  if (testOverride) {
    if (!path.isAbsolute(testOverride)) throw new Error('Config override must be absolute');
    return path.resolve(testOverride);
  }
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA ||
      path.join(os.homedir(), 'AppData', 'Local'), 'WorkBuddyNativeWeb');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'workbuddy-native-web');
}
function configFile() { return path.join(cfgRoot(), 'config.json'); }
function stateFile() { return path.join(cfgRoot(), 'service.json'); }
function logFile() { return path.join(cfgRoot(), 'native-web.private.log'); }
function ensureDir() {
  if (process.platform === 'win32') {
    const root = cfgRoot();
    windowsStorage.assertChain(root);
    const files = [configFile(), stateFile(), logFile()];
    // Retained atomic-write files can contain private state after an interrupted run.
    try {
      for (const name of fs.readdirSync(root)) {
        if (/^(config\.json|service\.json)\.\d+\.new$/.test(name)) files.push(path.join(root, name));
      }
    } catch (error) {
      if (error.code !== 'ENOENT')
        throw new Error('Windows private storage security check failed; refusing CodeBuddy execution');
    }
    windowsStorage.protect(root, files, true);
    return;
  }
  fs.mkdirSync(cfgRoot(), { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(cfgRoot());
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error('Unsafe configuration directory');
  if (process.platform !== 'win32') fs.chmodSync(cfgRoot(), 0o700);
}
function privateWrite(file, value) {
  ensureDir();
  const temp = file + '.' + process.pid + '.new';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 });
  if (process.platform === 'win32') {
    windowsStorage.protect(cfgRoot(), [temp]);
    windowsStorage.assertFile(cfgRoot(), file);
  }
  fs.renameSync(temp, file);
  if (process.platform === 'win32') windowsStorage.protect(cfgRoot(), [file]);
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
}
function readJson(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw new Error('Unsafe config file');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function parse(args) {
  const options = { project: null, port: null, foreground: false, installCli: false };
  if (!args.length || /^(-h|--help|help)$/.test(args[0])) return { action: 'help', options };
  if (args[0] === '--version' || args[0] === '-v') return { action: 'version', options };
  const action = args[0];
  if (!['doctor', 'setup', 'install', 'start', 'status', 'stop'].includes(action))
    throw new Error('Unknown command: ' + action);
  for (let i = 1; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === '--project' || flag === '--port') {
      const val = args[++i];
      if (!val || val.startsWith('--')) throw new Error(flag + ' requires a value');
      options[flag.slice(2)] = val;
    } else if (flag === '--foreground') options.foreground = true;
    else if (flag === '--install-codebuddy') options.installCli = true;
    else throw new Error('Unknown option: ' + flag);
  }
  if (options.port !== null) {
    if (!/^\d+$/.test(options.port)) throw new Error('Port must be an integer');
    options.port = Number(options.port);
    if (options.port < 1024 || options.port > 65535) throw new Error('Port out of range');
  }
  return { action, options };
}
function requireProject(input) {
  if (!input || !path.isAbsolute(input)) throw new Error('--project must be an absolute path');
  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) throw new Error('Project directory does not exist: ' + resolved);
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink() ||
    fs.realpathSync(resolved) !== resolved)
    throw new Error('Project path must be an existing canonical directory (no symlinks)');
  return resolved;
}
function nodeOK() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  return major > 18 || (major === 18 && minor >= 20);
}
function versionProbe() {
  const windows = process.platform === 'win32';
  const command = windows ? (process.env.ComSpec || 'cmd.exe') : 'codebuddy';
  const args = windows ? ['/d', '/c', 'codebuddy --version'] : ['--version'];
  const result = cp.spawnSync(command, args, {
    timeout: 8000, encoding: 'utf8', windowsHide: true
  });
  if (result.error || result.status !== 0) return null;
  return (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0].slice(0, 120);
}
function installCli() {
  process.stdout.write('Installing official CodeBuddy CLI from npm (explicitly requested)...\n');
  const windows = process.platform === 'win32';
  const cmd = windows ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = windows ?
    ['/d', '/c', 'npm install -g ' + OFFICIAL_PACKAGE] :
    ['install', '-g', OFFICIAL_PACKAGE];
  const result = cp.spawnSync(cmd, args, { stdio: 'inherit', timeout: 240000, windowsHide: true });
  if (result.error || result.status !== 0)
    throw new Error('Official CLI install failed; consult https://www.codebuddy.cn/docs/cli/installation');
  if (!versionProbe()) throw new Error('Official CLI installed but not resolvable on current PATH');
}
function loadConfig() {
  const cfg = readJson(configFile());
  if (!cfg) throw new Error('Not configured. Run: workbuddy-web setup --project "<absolute path>"');
  const project = requireProject(cfg.project);
  const port = Number(cfg.port || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid saved port');
  return { project, port };
}
function serviceFlags(port) {
  const args = C.slice();
  args[4] = String(port);
  return args;
}
function ownPidActive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function health(port) {
  return new Promise(resolve => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/',
      timeout: 1250, headers: { Connection: 'close' } },
    res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}
function portFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ port, host: '127.0.0.1', exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}
function emitHealth(port, alive, managed) {
  process.stdout.write(JSON.stringify({
    url: 'http://127.0.0.1:' + port + '/', webHealthy: alive,
    managedProcess: managed, password: 'VIEW ONLY IN LOCAL PRIVATE LOG'
  }, null, 2) + '\n');
}
async function doctor() {
  const cfg = readJson(configFile());
  const cli = versionProbe();
  let project = null, port = DEFAULT_PORT;
  if (cfg) {
    project = cfg.project;
    port = Number(cfg.port || port);
  }
  process.stdout.write(JSON.stringify({
    node: process.version, supportedNode: nodeOK(), platform: process.platform,
    codebuddy: cli || 'NOT_INSTALLED',
    project: project || 'NOT_CONFIGURED',
    port, webHealthy: await health(port),
    codexRequiredForCLI: false, localMcpRequired: false
  }, null, 2) + '\n');
  if (!nodeOK()) fail('Node.js >=18.20 required');
}
function interfaceLanguage() {
  const configured = String(
    process.env.WORKBUDDY_WEB_LANG ||
    process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG ||
    Intl.DateTimeFormat().resolvedOptions().locale || 'en'
  );
  return /^zh(?:[_-]|$)/i.test(configured) ? 'zh' : 'en';
}

async function offerVoluntaryStar() {
  // Never open a browser automatically and never run this as npm postinstall.
  // In Codex/headless sessions, return a clickable link instead of waiting for input.
  const chinese = interfaceLanguage() === 'zh';
  process.stdout.write(chinese
    ? '\n⭐ WorkBuddy Bridge 安装成功。如有帮助，欢迎自愿给项目一个 GitHub Star。\n'
    : '\n⭐ WorkBuddy Bridge installation complete. If you find it useful, a voluntary GitHub Star is appreciated.\n');
  process.stdout.write((chinese ? '项目地址：' : 'Project: ') + STAR_REPO_URL + '\n');
  if (!process.stdin.isTTY || !process.stdout.isTTY) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = await new Promise(resolve => {
      let done = false;
      let timer;
      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      };
      // A Codex terminal may have a PTY but no human at the keyboard.
      // Default to No after a short timeout; never stall completed installation.
      timer = setTimeout(() => { rl.close(); finish(''); }, 15000);
      rl.question(chinese ? '是否打开 GitHub 项目页？[y/N] ' : 'Open the GitHub project page? [y/N] ', finish);
    });
  } finally {
    rl.close();
  }
  if (!/^(y|yes|是|好)$/i.test(String(answer || '').trim())) return;
  // The user must personally click Star on GitHub. Never access their account or star automatically.
  const cmd = process.platform === 'darwin' ? 'open' :
    (process.platform === 'win32' ? 'explorer.exe' : 'xdg-open');
  try {
    const child = cp.spawn(cmd, [STAR_REPO_URL], {
      stdio: 'ignore', detached: true, windowsHide: true, shell: false
    });
    child.on('error', () => process.stderr.write((chinese ? '无法打开浏览器，请自行访问：' : 'Could not open your browser. Visit: ') + STAR_REPO_URL + '\n'));
    child.unref();
  } catch {
    process.stderr.write((chinese ? '请手动访问：' : 'Visit the project manually: ') + STAR_REPO_URL + '\n');
  }
}
async function setup(options, autoStart) {
  if (!nodeOK()) throw new Error('Node.js >=18.20 required');
  const old = readJson(configFile());
  const project = requireProject(options.project || (old && old.project));
  const port = options.port || (old && old.port) || DEFAULT_PORT;
  if (!versionProbe()) {
    if (!options.installCli && !autoStart)
      throw new Error('CodeBuddy missing. Run with --install-codebuddy to install official npm package');
    installCli();
  }
  privateWrite(configFile(), { schema: 1, project, port });
  process.stdout.write('Configured work directory: ' + project + '\n');
  process.stdout.write('Local URL: http://127.0.0.1:' + port + '/\n');
  process.stdout.write('Project cwd is not an operating-system sandbox.\n');
  if (autoStart) {
    await start({ ...options, foreground: false });
    await offerVoluntaryStar();
  }
}
function verifiedCommandLine(pid, port) {
  let commandLine = '';
  if (process.platform === 'win32') {
    const ps = cp.spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      '$p=Get-CimInstance Win32_Process -Filter "ProcessId=' + pid +
      '";if($p){[Console]::WriteLine($p.CommandLine)}'],
    { encoding: 'utf8', timeout: 7000, windowsHide: true });
    if (ps.status === 0) commandLine = ps.stdout || '';
  } else {
    const ps = cp.spawnSync('ps', ['-p', String(pid), '-o', 'command='],
      { encoding: 'utf8', timeout: 7000 });
    if (ps.status === 0) commandLine = ps.stdout || '';
  }
  return /codebuddy/i.test(commandLine) && /--serve/.test(commandLine) &&
    /127\.0\.0\.1/.test(commandLine) &&
    new RegExp('--port\\s+' + port + '(?:\\s|$)').test(commandLine);
}
async function start(options) {
  const cfg = loadConfig();
  const port = options.port || cfg.port;
  const state = readJson(stateFile());
  if (state && ownPidActive(state.pid))
    throw new Error('A managed service is already recorded. Use status; do not start a duplicate');
  if (!(await portFree(port)))
    throw new Error('Port ' + port + ' is in use; will not terminate unknown services');
  if (!versionProbe()) throw new Error('CodeBuddy not installed; run setup --install-codebuddy');
  const args = serviceFlags(port);
  if (options.foreground) {
    process.stdout.write('Starting OFFICIAL Web in foreground: http://127.0.0.1:' +
      port + '/\nKeep this terminal open. The official CLI will show a PRIVATE password locally.\n');
    const child = cp.spawn('codebuddy', args, {
      cwd: cfg.project, stdio: 'inherit', shell: process.platform === 'win32',
      windowsHide: false
    });
    await new Promise((resolve, reject) => {
      child.on('exit', code => { process.exitCode = code || 0; resolve(); });
      child.on('error', reject);
    });
    return;
  }
  ensureDir();
  if (fs.existsSync(logFile())) {
    const existing = fs.lstatSync(logFile());
    if (!existing.isFile() || existing.isSymbolicLink() || existing.nlink !== 1)
      throw new Error('Unsafe private log file; refusing to follow a symlink');
  }
  const log = fs.openSync(logFile(), 'a', 0o600);
  if (process.platform !== 'win32') fs.chmodSync(logFile(), 0o600);
  let child;
  try {
    if (process.platform === 'win32') windowsStorage.protect(cfgRoot(), [logFile()]);
    child = cp.spawn('codebuddy', args, {
      cwd: cfg.project, stdio: ['ignore', log, log], detached: true,
      shell: process.platform === 'win32', windowsHide: true
    });
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
  } finally { fs.closeSync(log); }
  try {
    privateWrite(stateFile(), { schema: 1, pid: child.pid, project: cfg.project,
      port, startedAt: new Date().toISOString(), logFile: logFile() });
  } catch {
    // This PID/tree was created by this invocation; never touch an existing service.
    let cleanupFailed = false;
    if (process.platform === 'win32') {
      const result = cp.spawnSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
        ['/PID', String(child.pid), '/T', '/F'], { timeout: 9000, windowsHide: true });
      cleanupFailed = Boolean(result.error || result.status !== 0) && ownPidActive(child.pid);
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { cleanupFailed = ownPidActive(child.pid); }
    }
    child.unref();
    if (cleanupFailed)
      throw new Error('Could not save private service state or confirm cleanup of the just-started process; inspect status before retrying');
    throw new Error('Could not save private service state; the just-started process was terminated');
  }
  child.unref();
  let ok = false;
  for (let i = 0; i < 28; i += 1) {
    ok = await health(port);
    if (ok) break;
    if (!ownPidActive(child.pid)) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ok) throw new Error('Service did not return HTTP 200 within startup window. ' +
    'Original state/logs preserved; inspect status and local private log.');
  process.stdout.write('Started official CodeBuddy Web: http://127.0.0.1:' + port + '/\n');
  process.stdout.write('View Web login password privately on THIS COMPUTER in:\n' + logFile() + '\n');
  process.stdout.write('Never paste password-bearing login URLs or secrets into Codex/Chat/GitHub.\n');
}
async function status() {
  const state = readJson(stateFile());
  const cfg = readJson(configFile());
  const port = state ? state.port : (cfg ? cfg.port : DEFAULT_PORT);
  const active = state ? ownPidActive(state.pid) : false;
  emitHealth(port, await health(port), active);
}
async function stop() {
  const state = readJson(stateFile());
  if (!state || !ownPidActive(state.pid))
    throw new Error('No managed running service recorded. Refusing to stop unknown processes');
  if (!verifiedCommandLine(state.pid, state.port))
    throw new Error('Process identity not verified as this native Web instance; refusing to stop');
  if (process.platform === 'win32') {
    const result = cp.spawnSync('taskkill.exe',
      ['/PID', String(state.pid), '/T', '/F'], { timeout: 9000, windowsHide: true });
    if (result.status !== 0) throw new Error('Could not stop verified Windows process tree');
  } else {
    process.kill(state.pid, 'SIGTERM');
  }
  for (let i = 0; i < 20; i += 1) {
    if (!ownPidActive(state.pid) && !(await health(state.port))) {
      privateWrite(stateFile(), { ...state, stoppedAt: new Date().toISOString() });
      process.stdout.write('Stopped verified managed service. Local config/logs preserved.\n');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Stop not fully verified. Do not kill unrelated processes.');
}
function help() {
  process.stdout.write([
    'WorkBuddy Native Web ' + version + ' (third-party CodeBuddy launcher)',
    '',
    'Two installation routes: Codex reads repository README/AGENTS.md, or npm install.',
    '  workbuddy-web doctor',
    '  workbuddy-web install --project "<existing absolute directory>" [--port 18862]',
    '  workbuddy-web setup --project "<existing absolute directory>" [--install-codebuddy]',
    '  workbuddy-web start [--foreground]',
    '  workbuddy-web status',
    '  workbuddy-web stop',
    '',
    'Official CLI installed separately: npm install -g ' + OFFICIAL_PACKAGE,
    'Password/account login must be completed by the user, locally.',
    'No installation-time postinstall, public listening or bypassPermissions.',
    ''
  ].join('\n'));
}
async function main() {
  const parsed = parse(process.argv.slice(2));
  const action = parsed.action, options = parsed.options;
  if (action === 'help') return help();
  if (action === 'version') return process.stdout.write(version + '\n');
  if (process.platform === 'win32') ensureDir();
  if (action === 'doctor') return doctor();
  if (action === 'setup') return setup(options, false);
  if (action === 'install') return setup({ ...options, installCli: true }, true);
  if (action === 'start') return start(options);
  if (action === 'status') return status();
  if (action === 'stop') return stop();
}
main().catch(error => fail(error && error.message ? error.message : String(error)));
