const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const { splitCommandLine, quoteCommandArg, parseLaunchCommand, isWindowsPathLaunch, isUrlLike, findAppKey, findGroupKey } = require('../src/core.cjs');

assert.strictEqual(
  findAppKey({ 'google chrome': { name: 'Google Chrome', shortcut: 'chr' } }, 'chr'),
  'google chrome'
);

assert.strictEqual(
  findGroupKey({ Work: ['google chrome'] }, 'work'),
  'Work'
);

const raw = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --profile-directory="Profile 5" "https://youtube.com"';

assert.deepStrictEqual(
  splitCommandLine(raw),
  [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '--profile-directory=Profile 5',
    'https://youtube.com'
  ]
);

assert.deepStrictEqual(
  parseLaunchCommand(raw),
  {
    command: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--profile-directory=Profile 5', 'https://youtube.com']
  }
);

assert.deepStrictEqual(
  parseLaunchCommand('https://google.com'),
  { command: 'https://google.com', args: [] }
);

assert.deepStrictEqual(
  parseLaunchCommand('"C:\\temp\\script.bat" start'),
  { command: 'C:\\temp\\script.bat', args: ['start'] }
);

assert.strictEqual(
  ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '--profile-directory=Profile 5', 'https://youtube.com']
    .map(quoteCommandArg)
    .join(' '),
  '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" "--profile-directory=Profile 5" https://youtube.com'
);

assert.strictEqual(
  isWindowsPathLaunch('C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Laragon\\Laragon.lnk'),
  true
);
assert.strictEqual(
  isWindowsPathLaunch('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --profile-directory=Default https://youtube.com'),
  false
);
assert.strictEqual(
  isWindowsPathLaunch('https://id.pinterest.com/'),
  false
);
assert.strictEqual(
  isUrlLike('https://github.com/'),
  true
);

const originalPlatform = process.platform;
Object.defineProperty(process, 'platform', { value: 'win32' });
const originalSpawn = childProcess.spawn;
const calls = [];

childProcess.spawn = (...args) => {
  calls.push(args);
  return { on: () => {}, unref: () => {} };
};

delete require.cache[require.resolve('../src/core.cjs')];
const { launchApp } = require('../src/core.cjs');
launchApp('https://github.com/');
assert.strictEqual(calls[0][0], 'explorer.exe');
assert.deepStrictEqual(calls[0][1], ['https://github.com/']);
assert.strictEqual(calls[0][2].shell, false);

launchApp('https://example.com/?value=$(not-a-command)&next=1');
assert.strictEqual(calls[1][0], 'explorer.exe');
assert.deepStrictEqual(calls[1][1], ['https://example.com/?value=$(not-a-command)&next=1']);
assert.strictEqual(calls[1][2].shell, false);

launchApp('https://example.com/download.exe');
assert.strictEqual(calls[2][0], 'explorer.exe');
assert.deepStrictEqual(calls[2][1], ['https://example.com/download.exe']);
assert.strictEqual(calls[2][2].shell, false);

launchApp('"C:\\Program Files\\Zap\\zap.exe" "--profile=one & two"');
assert.strictEqual(calls[3][0], 'C:\\Program Files\\Zap\\zap.exe');
assert.deepStrictEqual(calls[3][1], ['--profile=one & two']);
assert.strictEqual(calls[3][2].shell, false);

childProcess.spawn = originalSpawn;
Object.defineProperty(process, 'platform', { value: originalPlatform });

console.log('command parser tests passed');
