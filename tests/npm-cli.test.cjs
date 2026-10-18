'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const cp = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cli = path.join(projectRoot, 'bin', 'workbuddy-web.js');
const base = process.env.WORKBUDDY_TEST_ROOT || path.join(os.tmpdir(), 'workbuddy-native-web-isolated');
const windows = process.platform === 'win32';
const systemRoot = process.env.SystemRoot || 'C:\\Windows';
const powershell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const modulePath = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules');
const auditScript = String.raw`
$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$paths=[Console]::In.ReadToEnd() | ConvertFrom-Json
$current=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$rows=@(foreach($p in $paths) {
  $acl=Get-Acl -LiteralPath $p -ErrorAction Stop
  [pscustomobject]@{path=$p;currentSid=$current;owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value;
    protected=$acl.AreAccessRulesProtected;sddl=$acl.Sddl;
    rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]) | ForEach-Object {
      [pscustomobject]@{sid=$_.IdentityReference.Value;rights=[int]$_.FileSystemRights;
        inherited=$_.IsInherited;type=[string]$_.AccessControlType;
        inheritance=[int]$_.InheritanceFlags;propagation=[int]$_.PropagationFlags}
    })}
})
ConvertTo-Json -InputObject $rows -Depth 8 -Compress
`;
function ps(script, input) {
  const result=cp.spawnSync(powershell,['-NoProfile','-NonInteractive','-EncodedCommand',
    Buffer.from(script,'utf16le').toString('base64')],{
    input:JSON.stringify(input),encoding:'utf8',timeout:20000,windowsHide:true,
    env:{...process.env,PSModulePath:modulePath}
  });
  assert.equal(result.status,0,result.stderr);
  return result.stdout.trim();
}
function audit(paths) { return JSON.parse(ps(auditScript,paths)); }
function assertPrivate(rows) {
  for(const row of rows) {
    assert.equal(row.protected,true,row.path+' inheritance');
    assert.equal(row.owner,row.currentSid,row.path+' owner');
    assert.deepEqual(row.rules.map(r=>r.sid).sort(),[row.currentSid,'S-1-5-18','S-1-5-32-544'].sort(),row.path);
    for(const rule of row.rules) {
      assert.equal(rule.type,'Allow');assert.equal(rule.rights,2032127);
      assert.equal(rule.inherited,false);assert.equal(rule.propagation,0);
      assert.equal(rule.inheritance,fs.statSync(row.path).isDirectory()?3:0);
    }
  }
}
function broaden(directory) {
  ps(String.raw`
$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
$p=[Console]::In.ReadToEnd() | ConvertFrom-Json
$a=Get-Acl -LiteralPath $p
$a.SetAccessRuleProtection($true,$false)
$a.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
  [Security.Principal.SecurityIdentifier]::new('S-1-5-32-545'),
  [Security.AccessControl.FileSystemRights]::FullControl,
  [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
  [Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow))
Set-Acl -LiteralPath $p -AclObject $a
`,directory);
}
const source = [
  "const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');",
  "if(process.env.WORKBUDDY_TEST_EVENTS) fs.appendFileSync(process.env.WORKBUDDY_TEST_EVENTS,process.argv.includes('--version')?'version\\n':'server\\n');",
  "if(process.argv.includes('--version')) { console.log('CodeBuddy Test Stub 0.0.0'); process.exit(0); }",
  "const p=process.argv.indexOf('--port');const port=Number(process.argv[p+1]);",
  "const required=['--serve','--auth','password','--agent','cli','--permission-mode','auto'];",
  "if(required.some(x=>!process.argv.includes(x)) || process.argv[process.argv.indexOf('--host')+1]!=='127.0.0.1') process.exit(24);",
  "if(process.platform==='win32' && process.env.WORKBUDDY_TEST_START_ACL) {",
  'const script='+JSON.stringify(auditScript)+';',
  "const root=process.env.WORKBUDDY_WEB_CONFIG_DIR;const files=[root,path.join(root,'native-web.private.log')];",
  "const system=process.env.SystemRoot || 'C:\\\\Windows';",
  "const result=cp.spawnSync(path.join(system,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{input:JSON.stringify(files),encoding:'utf8',windowsHide:true,timeout:20000,env:{...process.env,PSModulePath:path.join(system,'System32','WindowsPowerShell','v1.0','Modules')}});",
  "if(result.status!==0)process.exit(25);const rows=JSON.parse(result.stdout);",
  "if(rows.some(row=>!row.protected || row.owner!==row.currentSid || row.rules.length!==3 || row.rules.some(r=>![row.currentSid,'S-1-5-18','S-1-5-32-544'].includes(r.sid)||r.inherited||r.type!=='Allow'||r.rights!==2032127)))process.exit(26);",
  "fs.writeFileSync(process.env.WORKBUDDY_TEST_START_ACL,JSON.stringify(rows));}",
  "if(process.env.WORKBUDDY_TEST_FOREGROUND_EXIT==='1')process.exit(0);",
  "console.log('Password: TEST_ONLY_NOT_A_REAL_SECRET');",
  "http.createServer((req,res)=>{res.statusCode=200;res.end('CodeBuddy stub HTML');}).listen(port,'127.0.0.1');"
].join('\n')+'\n';
function cmd(args,env,timeout=60000) {
  return cp.spawnSync(process.execPath,[cli,...args],{env,encoding:'utf8',timeout,windowsHide:true});
}
async function freePort() {
  const forbidden=new Set([18862,8766,61582,56293,18863,18864]);
  while(true) {
    const port=await new Promise((resolve,reject)=>{
      const s=net.createServer();s.once('error',reject);
      s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
    });
    if(!forbidden.has(port))return port;
  }
}
function ping(port) {
  return new Promise(resolve=>{
    const req=http.get({host:'127.0.0.1',port,path:'/',timeout:1000},res=>{res.resume();resolve(res.statusCode===200);});
    req.on('error',()=>resolve(false));req.on('timeout',()=>req.destroy());
  });
}
function fixture({broad=false,newConfig=false}={}) {
  fs.mkdirSync(base,{recursive:true,mode:0o700});
  // Retain every fixture. Cleanup requires separate approval.
  const root=fs.mkdtempSync(path.join(base,'npm-test-'));
  if(broad)broaden(root);
  const mockbin=path.join(root,'bin'),config=path.join(root,'config'),workspace=path.join(root,'Project With Spaces');
  fs.mkdirSync(mockbin);if(!newConfig)fs.mkdirSync(config);fs.mkdirSync(workspace);
  const sourcePath=path.join(mockbin,'codebuddy-test-server.js');
  fs.writeFileSync(sourcePath,source,{mode:0o600});
  fs.writeFileSync(path.join(mockbin,'codebuddy'),'#!/bin/sh\nexec node "'+sourcePath.replace(/"/g,'')+'" "$@"\n',{mode:0o755});
  fs.writeFileSync(path.join(mockbin,'codebuddy.cmd'),'@echo off\r\nnode "%~dp0codebuddy-test-server.js" %*\r\n',{mode:0o600});
  const events=path.join(root,'events.txt');
  const env={...process.env,PATH:mockbin+path.delimiter+process.env.PATH,WORKBUDDY_WEB_CONFIG_DIR:config,WORKBUDDY_TEST_EVENTS:events};
  return {root,mockbin,config,workspace:fs.realpathSync(workspace),events,env};
}
function writeConfig(f,port) {
  fs.writeFileSync(path.join(f.config,'config.json'),JSON.stringify({schema:1,project:f.workspace,port}));
}
function stopOnlyFixture(f) {
  const file=path.join(f.config,'service.json');
  if(!fs.existsSync(file))return;
  const state=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!state.pid)return;
  try { process.kill(state.pid,0); } catch { return; }
  if(windows)cp.spawnSync(path.join(systemRoot,'System32','taskkill.exe'),['/PID',String(state.pid),'/T','/F'],{windowsHide:true,timeout:9000});
  else { try { process.kill(state.pid,'SIGTERM'); } catch {} }
}

test('Mac/Windows safe npm CLI works with an isolated fake CodeBuddy',{timeout:240000},async t=>{
  const f=fixture({broad:windows});t.after(()=>stopOnlyFixture(f));
  const port=await freePort();writeConfig(f,port);
  const startAcl=path.join(f.root,'startup-acl.json');
  if(windows)f.env.WORKBUDDY_TEST_START_ACL=startAcl;
  assert.equal(cmd(['--help'],f.env).status,0);
  assert.match(cmd(['--help'],f.env).stdout,/install/);
  assert.match(cmd(['--version'],f.env).stdout,/0\.2\.1/);
  assert.equal(cmd(['setup','--project',f.workspace,'--port','not_a_port'],f.env).status,2);
  assert.equal(cmd(['setup','--project',path.join(f.root,'missing')],f.env).status,2);
  const initial=cmd(['doctor'],f.env);assert.equal(initial.status,0,initial.stderr);
  const installed=cmd(['install','--project',f.workspace,'--port',String(port)],f.env,150000);
  assert.equal(installed.status,0,installed.stderr+'\n'+installed.stdout);
  assert.match(installed.stdout,/GitHub Star/,'successful install should offer an optional Star link');
  assert.match(installed.stdout,/https:\/\/github\.com\/dhy365-creator\/chatgpt-workbuddy-workspace/);
  assert.doesNotMatch(installed.stdout,/是否打开 GitHub/,'headless install must never block for input');
  assert.equal(installed.stdout.includes('TEST_ONLY_NOT_A_REAL_SECRET'),false);
  assert.equal(installed.stdout.includes('?password='),false);
  const state=JSON.parse(fs.readFileSync(path.join(f.config,'service.json'),'utf8'));
  assert.equal(state.port,port);assert.equal(state.project,f.workspace);assert.ok(Number.isInteger(state.pid));
  assert.equal(await ping(port),true);
  const status=cmd(['status'],f.env);assert.equal(status.status,0,status.stderr);assert.match(status.stdout,/"webHealthy": true/);
  const duplicate=cmd(['start'],f.env);assert.equal(duplicate.status,2);assert.match(duplicate.stderr,/already recorded/);
  const files=[f.config,...['config.json','service.json','native-web.private.log'].map(n=>path.join(f.config,n))];
  if(windows) {
    assertPrivate(audit(files));
    const atSpawn=JSON.parse(fs.readFileSync(startAcl,'utf8'));assertPrivate(atSpawn);
    console.log('WINDOWS_ACL_AT_SERVER_START='+JSON.stringify(atSpawn));
  } else {
    assert.equal(fs.statSync(f.config).mode&0o077,0);
    for(const file of files.slice(1))assert.equal(fs.statSync(file).mode&0o077,0,file+' private mode');
  }
  const stopped=cmd(['stop'],f.env,60000);assert.equal(stopped.status,0,stopped.stderr);
  assert.equal(await ping(port),false);
  assert.equal(cmd(['stop'],f.env).status,2);
  console.log('ISOLATED_QA_ROOT='+f.root);console.log('TEST_PORT='+port);
});

test('Windows: new private root repairs broad parent inheritance; repeat is stable',{skip:!windows,timeout:120000},async()=>{
  const f=fixture({broad:true,newConfig:true}),port=await freePort();
  const parentBefore=audit([f.root])[0].sddl;
  const setup=cmd(['setup','--project',f.workspace,'--port',String(port)],f.env);
  assert.equal(setup.status,0,setup.stderr);
  const files=[f.config,path.join(f.config,'config.json')];
  const before=audit(files);assertPrivate(before);
  assert.equal(cmd(['doctor'],f.env).status,0);
  assert.equal(cmd(['status'],f.env).status,0);
  const after=audit(files);assertPrivate(after);
  assert.deepEqual(after.map(r=>r.sddl),before.map(r=>r.sddl));
  assert.equal(audit([f.root])[0].sddl,parentBefore,'outside parent ACL unchanged');
  console.log('WINDOWS_NEW_ROOT_AND_IDEMPOTENCE='+JSON.stringify(after));
});

test('Windows: existing broad sensitive files and retained atomic files are repaired',{skip:!windows,timeout:60000},async()=>{
  const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
  const names=['config.json','service.json','native-web.private.log','config.json.12345.new','service.json.12345.new'];
  for(const name of names.slice(1))fs.writeFileSync(path.join(f.config,name),name==='service.json'?JSON.stringify({pid:0,port}):'SYNTHETIC_PRIVATE_DATA');
  const files=[f.config,...names.map(n=>path.join(f.config,n))];
  const content=files.slice(1).map(file=>fs.readFileSync(file,'utf8'));
  assert.ok(audit(files).some(row=>!row.protected || row.rules.some(r=>r.sid==='S-1-5-32-545')));
  const result=cmd(['status'],f.env);assert.equal(result.status,0,result.stderr);
  const rows=audit(files);assertPrivate(rows);
  assert.deepEqual(files.slice(1).map(file=>fs.readFileSync(file,'utf8')),content,'contents preserved');
  console.log('WINDOWS_EXISTING_FILE_REPAIR='+JSON.stringify(rows));
});

test('Windows: ACL failure gates every sensitive command before config reads, probes or spawn',{skip:!windows,timeout:120000},async()=>{
  const f=fixture({broad:true}),port=await freePort();
  fs.writeFileSync(path.join(f.config,'config.json'),'SYNTHETIC_MALFORMED_SECRET');
  const hook=path.join(f.root,'deny-acl.cjs');
  fs.writeFileSync(hook,"const cp=require('node:child_process'),fs=require('node:fs');const original=cp.spawnSync;cp.spawnSync=function(command,args,options){if(/powershell\\.exe$/i.test(command))return {status:1,stdout:'',stderr:'synthetic denied'};fs.appendFileSync(process.env.WORKBUDDY_TEST_EVENTS,'unexpected-probe\\n');return original.apply(this,arguments)};cp.spawn=function(){fs.appendFileSync(process.env.WORKBUDDY_TEST_EVENTS,'unexpected-spawn\\n');throw Error('unexpected spawn')};");
  const env={...f.env,NODE_OPTIONS:'--require '+JSON.stringify(hook)};
  for(const args of [['doctor'],['setup','--project',f.workspace,'--port',String(port)],['install','--project',f.workspace,'--port',String(port)],['start'],['start','--foreground'],['status'],['stop']]) {
    const result=cmd(args,env);assert.equal(result.status,2,args.join(' '));
    assert.match(result.stderr,/private storage security check failed/);
    assert.equal(result.stderr.includes('SYNTHETIC_MALFORMED_SECRET'),false);
  }
  assert.equal(fs.existsSync(f.events),false,'no version probe, npm or service spawn');
  assert.equal(cmd(['--help'],env).status,0);assert.equal(cmd(['--version'],env).status,0);
  assert.equal(await ping(port),false);
  console.log('WINDOWS_ACL_DENY_ALL_COMMANDS_NO_PROBE_OR_SPAWN=true');
});

test('Windows: root/ancestor junctions and sensitive hard links fail without changing external ACLs',{skip:!windows,timeout:60000},async()=>{
  const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
  const target=path.join(f.root,'external');fs.mkdirSync(target);
  const targetBefore=audit([target])[0].sddl;
  const junction=path.join(f.root,'junction');fs.symlinkSync(target,junction,'junction');
  for(const config of [junction,path.join(junction,'nested'),path.parse(f.root).root]) {
    const result=cmd(['setup','--project',f.workspace,'--port',String(port)],{...f.env,WORKBUDDY_WEB_CONFIG_DIR:config});
    assert.equal(result.status,2);assert.match(result.stderr,/private storage security check failed/);
  }
  assert.equal(audit([target])[0].sddl,targetBefore);assert.equal(fs.existsSync(path.join(target,'nested')),false);
  const externalFile=path.join(target,'synthetic.json');fs.writeFileSync(externalFile,'SYNTHETIC_ONLY');
  const externalBefore=audit([externalFile])[0].sddl;
  fs.linkSync(externalFile,path.join(f.config,'service.json'));
  const linked=cmd(['start','--foreground'],f.env);assert.equal(linked.status,2);
  assert.match(linked.stderr,/private storage security check failed/);
  assert.equal(audit([externalFile])[0].sddl,externalBefore);
  assert.equal(fs.existsSync(f.events),false,'link gate runs before version probe');
  console.log('WINDOWS_REPARSE_AND_HARDLINK_REJECTED=true');
});

test('Windows: foreground keeps terminal semantics and creates no background artifacts',{skip:!windows,timeout:90000},async()=>{
  const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
  const result=cmd(['start','--foreground'],{...f.env,WORKBUDDY_TEST_FOREGROUND_EXIT:'1'});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/foreground/);
  assert.equal(fs.existsSync(path.join(f.config,'service.json')),false);
  assert.equal(fs.existsSync(path.join(f.config,'native-web.private.log')),false);
  assertPrivate(audit([f.config,path.join(f.config,'config.json')]));
  console.log('WINDOWS_FOREGROUND_PRIVATE_GATE_PRESERVED=true');
});

test('Windows: private state write failure terminates only the just-started fake process',{skip:!windows,timeout:120000},async()=>{
  const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
  const pidFile=path.join(f.root,'spawned-pid.json'),hook=path.join(f.root,'deny-after-spawn.cjs');
  fs.writeFileSync(hook,"const cp=require('node:child_process'),fs=require('node:fs');let started=false;const sync=cp.spawnSync,spawn=cp.spawn;cp.spawn=function(){const child=spawn.apply(this,arguments);started=true;child.once('spawn',()=>fs.writeFileSync(process.env.WORKBUDDY_TEST_PID,JSON.stringify(child.pid)));return child};cp.spawnSync=function(command){if(started&&/powershell\\.exe$/i.test(command))return {status:1,stdout:'',stderr:'synthetic state denied'};return sync.apply(this,arguments)};");
  const result=cmd(['start'],{...f.env,NODE_OPTIONS:'--require '+JSON.stringify(hook),WORKBUDDY_TEST_PID:pidFile},90000);
  assert.equal(result.status,2,result.stderr);assert.match(result.stderr,/Could not save private service state/);
  assert.equal(fs.existsSync(path.join(f.config,'service.json')),false);
  const pid=JSON.parse(fs.readFileSync(pidFile,'utf8'));
  assert.throws(()=>process.kill(pid,0));assert.equal(await ping(port),false);
  assert.equal(result.stdout.includes('TEST_ONLY_NOT_A_REAL_SECRET'),false);
  console.log('WINDOWS_POST_SPAWN_STATE_FAILURE_CLEANED_OWN_TREE='+pid);
});
test('Windows: a new log ACL failure prevents the server spawn',{skip:!windows,timeout:60000},async()=>{
  const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
  const hook=path.join(f.root,'deny-new-log.cjs');
  fs.writeFileSync(hook,"const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');const sync=cp.spawnSync;cp.spawnSync=function(command,args,options){if(/powershell\\.exe$/i.test(command) && fs.existsSync(path.join(process.env.WORKBUDDY_WEB_CONFIG_DIR,'native-web.private.log')))return {status:1,stdout:'',stderr:'synthetic log denied'};return sync.apply(this,arguments)};cp.spawn=function(){fs.appendFileSync(process.env.WORKBUDDY_TEST_EVENTS,'unexpected-spawn\\n');throw Error('unexpected spawn')};");
  const result=cmd(['start'],{...f.env,NODE_OPTIONS:'--require '+JSON.stringify(hook)});
  assert.equal(result.status,2,result.stderr);assert.match(result.stderr,/private storage security check failed/);
  assert.equal(fs.readFileSync(f.events,'utf8'),'version\n','only the already gated version probe ran');
  assert.equal(fs.existsSync(path.join(f.config,'service.json')),false);assert.equal(await ping(port),false);
  console.log('WINDOWS_NEW_LOG_DENIED_NO_SERVER_SPAWN=true');
});
test('Windows: pre-lock hardlink and reparse swaps never change outside ACLs or spawn',{skip:!windows,timeout:120000},async()=>{
  for(const mode of ['hardlink','root-junction','file-junction']) {
    const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
    const log=path.join(f.config,'native-web.private.log');fs.writeFileSync(log,'SYNTHETIC_LOG_ONLY');
    const outside=path.join(f.root,'outside-synthetic.json'),outsideDir=path.join(f.root,'outside-directory');
    fs.writeFileSync(outside,'SYNTHETIC_OUTSIDE_ONLY');fs.mkdirSync(outsideDir);
    const before=audit([outside,outsideDir]).map(row=>row.sddl);
    const hook=path.join(f.root,'swap-before-private-lock.cjs'),marker=path.join(f.root,'swapped.txt');
    fs.writeFileSync(hook,"const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');const original=cp.spawnSync;let swapped=false;cp.spawnSync=function(command){if(!swapped&&/powershell\\.exe$/i.test(command)){swapped=true;const root=process.env.WORKBUDDY_WEB_CONFIG_DIR,log=path.join(root,'native-web.private.log');if(process.env.WORKBUDDY_TEST_SWAP==='root-junction'){fs.renameSync(root,root+'.held');fs.symlinkSync(process.env.WORKBUDDY_TEST_OUTSIDE_DIR,root,'junction')}else{fs.renameSync(log,log+'.held');if(process.env.WORKBUDDY_TEST_SWAP==='hardlink')fs.linkSync(process.env.WORKBUDDY_TEST_OUTSIDE,log);else fs.symlinkSync(process.env.WORKBUDDY_TEST_OUTSIDE_DIR,log,'junction')}fs.writeFileSync(process.env.WORKBUDDY_TEST_SWAP_MARKER,'swapped')}return original.apply(this,arguments)};");
    const result=cmd(['start'],{...f.env,NODE_OPTIONS:'--require '+JSON.stringify(hook),
      WORKBUDDY_TEST_SWAP:mode,WORKBUDDY_TEST_OUTSIDE:outside,WORKBUDDY_TEST_OUTSIDE_DIR:outsideDir,
      WORKBUDDY_TEST_SWAP_MARKER:marker});
    assert.equal(result.status,2,result.stderr);assert.match(result.stderr,/private storage security check failed/);
    assert.equal(fs.readFileSync(marker,'utf8'),'swapped','replacement happened after JS validation');
    assert.deepEqual(audit([outside,outsideDir]).map(row=>row.sddl),before,'outside object ACLs unchanged: '+mode);
    assert.equal(fs.readFileSync(outside,'utf8'),'SYNTHETIC_OUTSIDE_ONLY');
    assert.equal(fs.existsSync(f.events),false,'no version probe or server spawn');assert.equal(await ping(port),false);
  }
  console.log('WINDOWS_PRE_LOCK_REPLACEMENT_REJECTED_OUTSIDE_ACL_UNCHANGED=true');
});
test('Windows: root ACL updates do not propagate to unlisted child hardlinks',{skip:!windows,timeout:60000},async()=>{
  const f=fixture({broad:true}),port=await freePort();writeConfig(f,port);
  const outside=path.join(f.root,'outside-unlisted-synthetic.json');fs.writeFileSync(outside,'SYNTHETIC_ONLY');
  fs.linkSync(outside,path.join(f.config,'unlisted-child.txt'));
  const before=audit([outside])[0].sddl;
  const result=cmd(['status'],f.env);assert.equal(result.status,0,result.stderr);
  assertPrivate(audit([f.config,path.join(f.config,'config.json')]));
  assert.equal(audit([outside])[0].sddl,before,'root ACL must not propagate to an external hardlink');
  assert.equal(fs.readFileSync(outside,'utf8'),'SYNTHETIC_ONLY');
  console.log('WINDOWS_ROOT_NO_UNLISTED_CHILD_ACL_PROPAGATION=true');
});