'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

// Fixed source + JSON stdin: paths never become PowerShell/C# or shell source.
const script = String.raw`
$ErrorActionPreference = 'Stop'
$handles = [Collections.Generic.List[Microsoft.Win32.SafeHandles.SafeFileHandle]]::new()
try {
  [Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $nativeCode = @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class WorkBuddyPrivateAcl {
  [StructLayout(LayoutKind.Sequential)] struct FileInfo {
    public uint Attributes;
    public System.Runtime.InteropServices.ComTypes.FILETIME Creation, Access, Write;
    public uint Volume, SizeHigh, SizeLow, Links, IndexHigh, IndexLow;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern SafeFileHandle CreateFileW(string name, uint access, uint share,
    IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool GetFileInformationByHandle(SafeFileHandle handle, out FileInfo info);
  [DllImport("advapi32.dll", SetLastError=true)]
  static extern bool GetSecurityDescriptorOwner(IntPtr descriptor, out IntPtr owner, out bool defaulted);
  [DllImport("advapi32.dll", SetLastError=true)]
  static extern bool GetSecurityDescriptorDacl(IntPtr descriptor, out bool present, out IntPtr dacl, out bool defaulted);
  [DllImport("advapi32.dll")]
  static extern uint SetSecurityInfo(SafeFileHandle handle, uint kind, uint flags,
    IntPtr owner, IntPtr group, IntPtr dacl, IntPtr sacl);
  [DllImport("advapi32.dll")]
  static extern uint GetSecurityInfo(SafeFileHandle handle, uint kind, uint flags,
    out IntPtr owner, out IntPtr group, out IntPtr dacl, out IntPtr sacl, out IntPtr descriptor);
  [DllImport("advapi32.dll")]
  static extern uint GetSecurityDescriptorLength(IntPtr descriptor);
  [DllImport("kernel32.dll")]
  static extern IntPtr LocalFree(IntPtr memory);
  public static SafeFileHandle Open(string path, bool directory, bool writeAcl) {
    // MAXIMUM_ALLOWED suppresses SetSecurityInfo's child-ACL propagation (MS API contract).
    uint access = writeAcl ? 0x02000000u : 0x80u;
    uint share = directory ? 1u : 3u; // Never share DELETE; pin each object until verification ends.
    SafeFileHandle handle = CreateFileW(path, access, share, IntPtr.Zero, 3, 0x02200000u, IntPtr.Zero);
    if (handle.IsInvalid) {
      int error = Marshal.GetLastWin32Error(); handle.Dispose();
      if (!directory && error == 2) return null;
      throw new Win32Exception(error);
    }
    try { Verify(handle, directory); return handle; } catch { handle.Dispose(); throw; }
  }
  public static void Verify(SafeFileHandle handle, bool directory) {
    FileInfo info;
    if (!GetFileInformationByHandle(handle, out info)) throw new Win32Exception(Marshal.GetLastWin32Error());
    if ((info.Attributes & 0x400u) != 0 || ((info.Attributes & 0x10u) != 0) != directory ||
        (!directory && info.Links != 1)) throw new InvalidOperationException("Unsafe private object");
  }
  public static void Apply(SafeFileHandle handle, byte[] bytes) {
    GCHandle pinned = GCHandle.Alloc(bytes, GCHandleType.Pinned);
    try {
      IntPtr descriptor = pinned.AddrOfPinnedObject(), owner, dacl; bool present, defaulted;
      if (!GetSecurityDescriptorOwner(descriptor, out owner, out defaulted) ||
          !GetSecurityDescriptorDacl(descriptor, out present, out dacl, out defaulted) ||
          !present || owner == IntPtr.Zero || dacl == IntPtr.Zero) throw new InvalidOperationException("Missing private ACL");
      uint error = SetSecurityInfo(handle, 1, 0x80000005u, owner, IntPtr.Zero, dacl, IntPtr.Zero);
      if (error != 0) throw new Win32Exception((int)error);
    } finally { pinned.Free(); }
  }
  public static byte[] Read(SafeFileHandle handle) {
    IntPtr owner, group, dacl, sacl, descriptor;
    uint error = GetSecurityInfo(handle, 1, 5, out owner, out group, out dacl, out sacl, out descriptor);
    if (error != 0) throw new Win32Exception((int)error);
    try {
      byte[] bytes = new byte[GetSecurityDescriptorLength(descriptor)];
      Marshal.Copy(descriptor, bytes, 0, bytes.Length); return bytes;
    } finally { LocalFree(descriptor); }
  }
}
"@
  Add-Type -TypeDefinition $nativeCode -ErrorAction Stop
  $root = [IO.Path]::GetFullPath([string]$request.root)
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $principals = @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'),
    [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
  function Protect-And-Verify($handle, [bool]$directory) {
    [WorkBuddyPrivateAcl]::Verify($handle, $directory)
    if ($directory) {
      $security = [Security.AccessControl.DirectorySecurity]::new()
      $actual = [Security.AccessControl.DirectorySecurity]::new()
      $inheritance = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    } else {
      $security = [Security.AccessControl.FileSecurity]::new()
      $actual = [Security.AccessControl.FileSecurity]::new()
      $inheritance = [Security.AccessControl.InheritanceFlags]::None
    }
    $security.SetOwner($sid)
    $security.SetAccessRuleProtection($true, $false)
    foreach ($principal in $principals) {
      $security.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($principal,
        [Security.AccessControl.FileSystemRights]::FullControl, $inheritance,
        [Security.AccessControl.PropagationFlags]::None,
        [Security.AccessControl.AccessControlType]::Allow))
    }
    [WorkBuddyPrivateAcl]::Apply($handle, $security.GetSecurityDescriptorBinaryForm())
    $actual.SetSecurityDescriptorBinaryForm([WorkBuddyPrivateAcl]::Read($handle))
    $rules = @($actual.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    if (-not $actual.AreAccessRulesProtected -or $rules.Count -ne 3 -or
        $actual.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) {
      throw 'Private DACL not verified'
    }
    foreach ($principal in $principals) {
      $matches = @($rules | Where-Object { $_.IdentityReference.Value -eq $principal.Value })
      if ($matches.Count -ne 1) { throw 'Unexpected principal' }
      $rule = $matches[0]
      if ($rule.IsInherited -or $rule.AccessControlType -ne 'Allow' -or
          $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
          $rule.InheritanceFlags -ne $inheritance -or
          $rule.PropagationFlags -ne [Security.AccessControl.PropagationFlags]::None) {
        throw 'Unexpected access rule'
      }
    }
    [WorkBuddyPrivateAcl]::Verify($handle, $directory)
  }
  # Pin ancestors from the volume/share downward. No ACL is written outside $root.
  $chain = [Collections.Generic.List[string]]::new()
  $cursor = $root
  while ($cursor) {
    $chain.Add($cursor)
    $parent = [IO.Directory]::GetParent($cursor)
    if ($null -eq $parent) { break }
    $cursor = $parent.FullName
  }
  $chain.Reverse()
  foreach ($directory in $chain) {
    if (-not [IO.Directory]::Exists($directory)) {
      if (-not $request.create) { throw 'Missing private root' }
      [void][IO.Directory]::CreateDirectory($directory)
    }
    $handles.Add([WorkBuddyPrivateAcl]::Open($directory, $true, $directory -eq $root))
  }
  $rootHandle = $handles[$handles.Count - 1]
  $files = [Collections.Generic.List[Microsoft.Win32.SafeHandles.SafeFileHandle]]::new()
  foreach ($file in $request.files) {
    $target = [IO.Path]::GetFullPath([string]$file)
    if ([IO.Path]::GetDirectoryName($target) -ne $root) { throw 'Outside private root' }
    $handle = [WorkBuddyPrivateAcl]::Open($target, $false, $true)
    if ($null -ne $handle) { $handles.Add($handle); $files.Add($handle) }
  }
  # All file identities/link counts are checked before any ACL write, then again
  # after the root is private. Apply/readback use those same non-renamable handles.
  Protect-And-Verify $rootHandle $true
  foreach ($handle in $files) { Protect-And-Verify $handle $false }
  [Console]::WriteLine('PRIVATE_STORAGE_VERIFIED')
} catch {
  [Console]::Error.WriteLine('PRIVATE_STORAGE_DENIED')
  exit 1
} finally {
  foreach ($handle in $handles) { $handle.Dispose() }
}
`;
function unsafe() {
  return new Error('Windows private storage security check failed; refusing CodeBuddy execution');
}
function assertChain(root) {
  if (path.dirname(root) === root) throw unsafe();
  let cursor = root;
  while (true) {
    try {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe();
    } catch (error) { if (error.code !== 'ENOENT') throw unsafe(); }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}
function assertFile(root, file) {
  if (path.dirname(file).toLowerCase() !== root.toLowerCase()) throw unsafe();
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw unsafe();
  } catch (error) { if (error.code !== 'ENOENT') throw unsafe(); }
}
function protect(root, files, create = false) {
  assertChain(root);
  files.forEach(file => assertFile(root, file));
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  if (!path.isAbsolute(systemRoot)) throw unsafe();
  const powershell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const result = cp.spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand',
    Buffer.from(script, 'utf16le').toString('base64')], {
    input: JSON.stringify({ root, files, create }), encoding: 'utf8',
    env: { ...process.env, PSModulePath: path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') },
    timeout: 20000, windowsHide: true
  });
  if (result.error || result.status !== 0 || (result.stdout || '').trim() !== 'PRIVATE_STORAGE_VERIFIED') throw unsafe();
  assertChain(root);
  files.forEach(file => assertFile(root, file));
}
module.exports = { protect, assertFile, assertChain };