const path = require('path');
const dotenv = require('dotenv');

// Load local environment variables before the server or any scripts read process.env.
// Existing operating-system environment variables are left untouched by dotenv.
const envResult = dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const PUBLIC_DIR = path.join(__dirname, 'public');
const INFO_FILE = path.join(__dirname, 'info.json');
const INPUT_CATALOG_FILE = path.join(SCRIPTS_DIR, '_config', 'inputCatalog.js');

const DEFAULT_APP_INFO = {
  title: 'QA Script Runner',
  description: 'Standalone Node tasks and Playwright browser automation powered by Express.',
  runnerLabel: 'Script Runner',
  recorderLabel: 'Recorder Converter',
  recorderDescription: "Convert Chrome DevTools Recorder JSON into this app's standalone Playwright script format."
};

function loadAppInfo() {
  try {
    const raw = fs.readFileSync(INFO_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const info = { ...DEFAULT_APP_INFO };

    for (const key of Object.keys(DEFAULT_APP_INFO)) {
      if (typeof parsed[key] === 'string' && parsed[key].trim()) {
        info[key] = parsed[key].trim();
      }
    }

    return info;
  } catch (error) {
    console.warn('Unable to read info.json. Using built-in application defaults.');
    console.warn(error.message);
    return { ...DEFAULT_APP_INFO };
  }
}

const appInfo = loadAppInfo();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(PUBLIC_DIR));

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function loadInputCatalog() {
  try {
    if (!fs.existsSync(INPUT_CATALOG_FILE)) {
      console.warn('Input catalog not found. Scripts can still use full inline input objects.');
      return {};
    }

    delete require.cache[require.resolve(INPUT_CATALOG_FILE)];
    const catalog = require(INPUT_CATALOG_FILE);

    if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
      throw new Error('scripts/_config/inputCatalog.js must export an object.');
    }

    return catalog;
  } catch (error) {
    console.error('Unable to load scripts/_config/inputCatalog.js');
    console.error(error);
    return {};
  }
}

function resolveInputDefinitions(inputDefinitions, relativePath, inputCatalog) {
  if (!Array.isArray(inputDefinitions)) {
    return [];
  }

  const resolved = [];
  const usedNames = new Set();

  for (const input of inputDefinitions) {
    let definition;

    // Preferred simple style: inputs: ['url', 'email', 'password']
    if (typeof input === 'string') {
      const preset = inputCatalog[input];

      if (!preset) {
        throw new Error(
          `Unknown input catalog key "${input}" in ${relativePath}. ` +
          'Add it to scripts/_config/inputCatalog.js or use a full input object for this one script.'
        );
      }

      // Clone the shared definition so scripts cannot accidentally mutate the catalog.
      definition = { ...preset };
      if (Array.isArray(preset.options)) {
        definition.options = preset.options.map((option) =>
          typeof option === 'object' && option !== null ? { ...option } : option
        );
      }
    } else if (input && typeof input === 'object' && !Array.isArray(input)) {
      // Backward compatibility with the original v1.2.4 full-object style.
      definition = { ...input };
      if (Array.isArray(input.options)) {
        definition.options = input.options.map((option) =>
          typeof option === 'object' && option !== null ? { ...option } : option
        );
      }
    } else {
      throw new Error(`Invalid input definition in ${relativePath}.`);
    }

    if (typeof definition.name !== 'string' || !definition.name.trim()) {
      throw new Error(`Input in ${relativePath} must have a non-empty name.`);
    }

    if (usedNames.has(definition.name)) {
      throw new Error(
        `Duplicate input name "${definition.name}" in ${relativePath}. ` +
        'Choose catalog entries whose resolved input names are unique.'
      );
    }

    usedNames.add(definition.name);
    resolved.push(definition);
  }

  return resolved;
}

function validateScriptModule(script, relativePath) {
  const errors = [];

  if (!script || typeof script !== 'object') {
    errors.push('module.exports must be an object');
  } else {
    if (typeof script.name !== 'string' || !script.name.trim()) {
      errors.push('name must be a non-empty string');
    }

    if (script.description !== undefined && typeof script.description !== 'string') {
      errors.push('description must be a string');
    }

    if (script.inputs !== undefined && !Array.isArray(script.inputs)) {
      errors.push('inputs must be an array');
    }

    if (typeof script.run !== 'function') {
      errors.push('run must be a function');
    }
  }

  if (errors.length > 0) {
    console.error(`Skipping invalid script: ${relativePath}`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    return false;
  }

  return true;
}

function walkScripts(directory = SCRIPTS_DIR) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    // Names beginning with _ are project support/configuration and are never
    // treated as runnable scripts. This applies to both folders and files.
    if (entry.name.startsWith('_')) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkScripts(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function discoverScripts() {
  const discovered = [];
  const inputCatalog = loadInputCatalog();

  for (const fullPath of walkScripts()) {
    const relativePath = path.relative(SCRIPTS_DIR, fullPath);
    const posixRelativePath = toPosixPath(relativePath);

    try {
      delete require.cache[require.resolve(fullPath)];
      const script = require(fullPath);

      if (!validateScriptModule(script, posixRelativePath)) {
        continue;
      }

      const id = posixRelativePath.replace(/\.js$/i, '');
      const group = path.posix.dirname(id) === '.' ? '' : path.posix.dirname(id);
      const resolvedInputs = resolveInputDefinitions(script.inputs || [], posixRelativePath, inputCatalog);

      discovered.push({
        id,
        name: script.name.trim(),
        description: script.description || '',
        group,
        inputs: resolvedInputs
      });
    } catch (error) {
      console.error(`Unable to load script: ${posixRelativePath}`);
      console.error(error);
    }
  }

  return discovered.sort((a, b) => {
    const groupCompare = a.group.localeCompare(b.group);
    if (groupCompare !== 0) return groupCompare;
    return a.name.localeCompare(b.name);
  });
}

function getScriptById(scriptId) {
  const scripts = discoverScripts();
  const metadata = scripts.find((script) => script.id === scriptId);

  if (!metadata) {
    return null;
  }

  const fullPath = path.join(SCRIPTS_DIR, ...scriptId.split('/')) + '.js';
  const normalized = path.normalize(fullPath);

  if (!normalized.startsWith(path.normalize(SCRIPTS_DIR + path.sep))) {
    return null;
  }

  delete require.cache[require.resolve(normalized)];
  const script = require(normalized);

  return { metadata, script };
}

function validateRequiredInputs(inputDefinitions, values) {
  const missing = [];

  for (const input of inputDefinitions || []) {
    if (!input.required) continue;

    const value = values[input.name];
    const isEmptyString = typeof value === 'string' && value.trim() === '';

    if (value === undefined || value === null || isEmptyString) {
      missing.push(input.label || input.name);
    }
  }

  return missing;
}

app.get('/api/info', (req, res) => {
  res.json(appInfo);
});

app.get('/api/scripts', (req, res) => {
  res.json(discoverScripts());
});

app.post('/api/run', async (req, res) => {
  const { scriptId, inputs = {} } = req.body || {};
  const startedAt = Date.now();

  if (typeof scriptId !== 'string' || !scriptId.trim()) {
    return res.status(400).json({
      success: false,
      durationMs: Date.now() - startedAt,
      error: { message: 'scriptId is required.' }
    });
  }

  try {
    const loaded = getScriptById(scriptId);

    if (!loaded) {
      return res.status(404).json({
        success: false,
        script: scriptId,
        durationMs: Date.now() - startedAt,
        error: { message: 'Script not found.' }
      });
    }

    const missing = validateRequiredInputs(loaded.metadata.inputs, inputs);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        script: scriptId,
        durationMs: Date.now() - startedAt,
        error: { message: `Missing required input(s): ${missing.join(', ')}` }
      });
    }

    const result = await loaded.script.run(inputs);

    return res.json({
      success: true,
      script: scriptId,
      durationMs: Date.now() - startedAt,
      result: result === undefined ? null : result
    });
  } catch (error) {
    console.error(`Script failed: ${scriptId}`);
    console.error(error);

    return res.status(500).json({
      success: false,
      script: scriptId,
      durationMs: Date.now() - startedAt,
      error: {
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log(appInfo.title);
  console.log(`http://localhost:${PORT}`);
  console.log('');
  console.log(envResult.error ? 'Environment file: .env not found (optional).' : 'Environment file: .env loaded.');
  console.log('Browser automation uses playwright-core with installed Google Chrome.');
  console.log('No Playwright browser download/install command is required.');
  console.log('Project customization lives in info.json, .env, and scripts/.');
  console.log('');
});
