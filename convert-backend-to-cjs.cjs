const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'backend', 'src');

const isJsFile = (p) => p.endsWith('.js');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && isJsFile(full)) out.push(full);
  }
  return out;
}

function convertImports(source) {
  // Side-effect imports: import 'x';
  source = source.replace(/^\s*import\s+['"]([^'"]+)['"]\s*;\s*$/gm, "require('$1');");

  // Namespace imports: import * as X from 'x';
  source = source.replace(
    /^\s*import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"]\s*;\s*$/gm,
    "const $1 = require('$2');"
  );

  // Named imports: import { A, B as C } from 'x';
  source = source.replace(
    /^\s*import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]\s*;\s*$/gm,
    (_m, names, mod) => {
      const normalized = names
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => p.replace(/\s+as\s+/g, ': '))
        .join(', ');
      return `const { ${normalized} } = require('${mod}');`;
    }
  );

  // Default imports: import X from 'x';
  source = source.replace(
    /^\s*import\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"]\s*;\s*$/gm,
    "const $1 = require('$2');"
  );

  return source;
}

function convertExports(source) {
  const named = new Set();
  let defaultExport = null;

  // export const X =
  source = source.replace(/^\s*export\s+const\s+([A-Za-z0-9_$]+)\s*=/gm, (_m, name) => {
    named.add(name);
    return `const ${name} =`;
  });

  // export function X(
  source = source.replace(/^\s*export\s+function\s+([A-Za-z0-9_$]+)\s*\(/gm, (_m, name) => {
    named.add(name);
    return `function ${name}(`;
  });

  // export default X;
  source = source.replace(/^\s*export\s+default\s+([A-Za-z0-9_$]+)\s*;\s*$/gm, (_m, name) => {
    defaultExport = name;
    return '';
  });

  // export { A, B as C };
  source = source.replace(/^\s*export\s+\{\s*([^}]+)\s*\}\s*;\s*$/gm, (_m, names) => {
    names
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((part) => {
        const [orig, alias] = part.split(/\s+as\s+/).map((s) => s.trim());
        named.add(alias || orig);
      });
    return '';
  });

  // If file already has module.exports, don't append another.
  if (/^\s*module\.exports\s*=/.test(source) || /^\s*exports\./m.test(source)) {
    return { source, changed: true };
  }

  const exportLines = [];
  if (defaultExport && named.size === 0) {
    exportLines.push(`module.exports = ${defaultExport};`);
  } else if (defaultExport || named.size > 0) {
    const entries = [];
    for (const name of Array.from(named)) entries.push(name);
    if (defaultExport) entries.push(`default: ${defaultExport}`);
    exportLines.push(`module.exports = { ${entries.join(', ')} };`);
  }

  const outSource =
    exportLines.length > 0
      ? `${source.trimEnd()}\n\n${exportLines.join('\n')}\n`
      : source;

  return { source: outSource, changed: true };
}

function convertFile(filePath) {
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before;
  after = convertImports(after);
  const exp = convertExports(after);
  after = exp.source;

  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    return true;
  }
  return false;
}

const files = walk(ROOT);
let changed = 0;
for (const f of files) {
  const did = convertFile(f);
  if (did) changed += 1;
}

console.log(`Converted ${changed}/${files.length} files to CommonJS`);

