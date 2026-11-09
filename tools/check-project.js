const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHECK_DIRS = ['public', 'scripts', 'tools'];
const ROOT_JS_FILES = ['server.js', 'tailwind.config.js'];

function collectJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function syntaxCheck(filePath) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    const relative = path.relative(ROOT, filePath);
    console.error(`\nSyntax check failed: ${relative}`);
    console.error(result.stderr || result.stdout);
    return false;
  }

  return true;
}

function validateInfoJson() {
  const filePath = path.join(ROOT, 'info.json');
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const required = ['title', 'description', 'runnerLabel', 'recorderLabel', 'recorderDescription'];

  for (const key of required) {
    if (typeof parsed[key] !== 'string' || !parsed[key].trim()) {
      throw new Error(`info.json field "${key}" must be a non-empty string.`);
    }
  }
}

function validateInputCatalog() {
  const filePath = path.join(ROOT, 'scripts', '_config', 'inputCatalog.js');
  delete require.cache[require.resolve(filePath)];
  const catalog = require(filePath);

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('scripts/_config/inputCatalog.js must export an object.');
  }

  for (const [key, definition] of Object.entries(catalog)) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new Error(`Input catalog entry "${key}" must be an object.`);
    }

    if (typeof definition.name !== 'string' || !definition.name.trim()) {
      throw new Error(`Input catalog entry "${key}" must define a non-empty name.`);
    }
  }

  return Object.keys(catalog).length;
}

function main() {
  const files = ROOT_JS_FILES
    .map((file) => path.join(ROOT, file))
    .filter((file) => fs.existsSync(file));

  for (const directory of CHECK_DIRS) {
    files.push(...collectJavaScriptFiles(path.join(ROOT, directory)));
  }

  const uniqueFiles = [...new Set(files)].sort();
  let ok = true;

  for (const file of uniqueFiles) {
    if (!syntaxCheck(file)) ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  validateInfoJson();
  const catalogCount = validateInputCatalog();

  console.log(`Syntax checked ${uniqueFiles.length} JavaScript files.`);
  console.log(`Validated info.json.`);
  console.log(`Validated ${catalogCount} reusable input catalog entries.`);
  console.log('Project check passed.');
}

try {
  main();
} catch (error) {
  console.error(`Project check failed: ${error.message}`);
  process.exitCode = 1;
}
