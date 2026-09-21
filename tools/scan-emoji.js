#!/usr/bin/env node
/**
 * P0 门禁：全仓扫描 emoji 字符（禁止 emoji 作为功能图标）。
 *
 * 用法：node tools/scan-emoji.js
 * 退出码：0 = 通过；1 = 发现违规
 *
 * 作者：晨星
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const SCAN_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.css', '.yml', '.yaml', '.html',
]);

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.git', 'out', 'coverage', 'docker-data',
]);

// 与专家团 P0-1 一致的 emoji 检测范围
const EMOJI_RE = new RegExp(
  '[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{FE00}-\\u{FE0F}' +
  '\\u{1F000}-\\u{1F02F}\\u{1F0A0}-\\u{1F0FF}\\u{1F100}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}' +
  '\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{200D}\\u{20E3}' +
  '\\u{E0020}-\\u{E007F}]',
  'u'
);

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SCAN_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    acc.push(full);
  }
  return acc;
}

const files = walk(ROOT, []);
const violations = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (EMOJI_RE.test(line)) {
      violations.push({
        file: path.relative(ROOT, file),
        line: index + 1,
        text: line.trim().slice(0, 120),
      });
    }
  });
}

if (violations.length === 0) {
  console.log(`[scan-emoji] PASS - 扫描 ${files.length} 个文件，未发现 emoji 功能图标。`);
  process.exit(0);
}

console.error(`[scan-emoji] FAIL - 发现 ${violations.length} 处 emoji（P0 禁止 emoji 作功能图标）：`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.text}`);
}
process.exit(1);
