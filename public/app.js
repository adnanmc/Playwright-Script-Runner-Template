const searchInput = document.getElementById('scriptSearch');
const scriptNavigation = document.getElementById('scriptNavigation');
const scriptCount = document.getElementById('scriptCount');
const emptyState = document.getElementById('emptyState');
const scriptPanel = document.getElementById('scriptPanel');
const scriptGroup = document.getElementById('scriptGroup');
const scriptName = document.getElementById('scriptName');
const scriptDescription = document.getElementById('scriptDescription');
const scriptForm = document.getElementById('scriptForm');
const inputContainer = document.getElementById('inputContainer');
const runButton = document.getElementById('runButton');
const runningMessage = document.getElementById('runningMessage');
const resultPanel = document.getElementById('resultPanel');
const resultSummary = document.getElementById('resultSummary');
const duration = document.getElementById('duration');
const resultJson = document.getElementById('resultJson');
const copyResult = document.getElementById('copyResult');

const apiDocumentation = document.getElementById('apiDocumentation');
const apiEndpoint = document.getElementById('apiEndpoint');
const apiRequestJson = document.getElementById('apiRequestJson');
const apiCurl = document.getElementById('apiCurl');
const apiFetch = document.getElementById('apiFetch');
const apiSuccessResponseJson = document.getElementById('apiSuccessResponseJson');
const apiFailureResponseJson = document.getElementById('apiFailureResponseJson');
const apiSensitiveNotice = document.getElementById('apiSensitiveNotice');
const copyApiJson = document.getElementById('copyApiJson');
const copyApiCurl = document.getElementById('copyApiCurl');
const copyApiFetch = document.getElementById('copyApiFetch');

let allScripts = [];
let selectedScript = null;
let latestResult = null;
let latestApiExamples = {
  requestJson: '',
  curl: '',
  fetch: ''
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function friendlyGroup(group) {
  if (!group) return 'General';
  return group
    .split('/')
    .map((part) => part.replace(/[-_]/g, ' '))
    .map((part) => part.replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(' / ');
}

function buildGroupTree(scripts) {
  const root = { children: {}, scripts: [] };

  for (const script of scripts) {
    const parts = script.group ? script.group.split('/') : ['General'];
    let node = root;

    for (const part of parts) {
      if (!node.children[part]) {
        node.children[part] = { children: {}, scripts: [] };
      }
      node = node.children[part];
    }

    node.scripts.push(script);
  }

  return root;
}

function renderGroupNode(node, label, depth = 0) {
  const wrapper = document.createElement('div');
  wrapper.className = depth === 0 ? 'mt-2' : 'ml-3 mt-2 border-l border-slate-200 pl-3';

  const details = document.createElement('details');
  details.open = true;

  const summary = document.createElement('summary');
  summary.className = 'cursor-pointer select-none py-1 text-sm font-semibold text-slate-700';
  summary.textContent = label.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  details.appendChild(summary);

  const content = document.createElement('div');
  content.className = 'mt-1 space-y-1';

  for (const script of node.scripts.sort((a, b) => a.name.localeCompare(b.name))) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.scriptId = script.id;
    button.className = [
      'w-full rounded-lg px-3 py-2 text-left text-sm transition',
      selectedScript && selectedScript.id === script.id
        ? 'bg-slate-900 font-medium text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    ].join(' ');
    button.textContent = script.name;
    button.addEventListener('click', () => selectScript(script));
    content.appendChild(button);
  }

  for (const [childLabel, childNode] of Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b))) {
    content.appendChild(renderGroupNode(childNode, childLabel, depth + 1));
  }

  details.appendChild(content);
  wrapper.appendChild(details);
  return wrapper;
}

function renderNavigation(scripts) {
  scriptNavigation.innerHTML = '';
  scriptCount.textContent = `${scripts.length} found`;

  if (scripts.length === 0) {
    scriptNavigation.innerHTML = '<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No scripts match your search.</p>';
    return;
  }

  const tree = buildGroupTree(scripts);

  for (const [label, node] of Object.entries(tree.children).sort(([a], [b]) => a.localeCompare(b))) {
    scriptNavigation.appendChild(renderGroupNode(node, label));
  }
}

function createInputField(input) {
  const wrapper = document.createElement('div');
  const id = `input-${input.name}`;

  const label = document.createElement('label');
  label.htmlFor = id;
  label.className = 'mb-2 block text-sm font-medium text-slate-700';
  const sensitiveLabel = input.sensitive
    ? ' <span class="font-normal text-slate-400">(sensitive)</span>'
    : '';

  label.innerHTML = `${escapeHtml(input.label || input.name)}${input.required ? ' <span class="text-red-500">*</span>' : ' <span class="font-normal text-slate-400">(optional)</span>'}${sensitiveLabel}`;
  wrapper.appendChild(label);

  let field;

  if (input.type === 'textarea') {
    field = document.createElement('textarea');
    field.rows = 5;
  } else if (input.type === 'select') {
    field = document.createElement('select');
    for (const option of input.options || []) {
      const element = document.createElement('option');
      if (typeof option === 'object') {
        element.value = option.value;
        element.textContent = option.label;
      } else {
        element.value = option;
        element.textContent = option;
      }
      field.appendChild(element);
    }
  } else {
    field = document.createElement('input');
    field.type = input.type || 'text';
  }

  field.id = id;
  field.name = input.name;
  field.required = Boolean(input.required);
  field.placeholder = input.placeholder || '';

  if (input.sensitive) {
    field.autocomplete = 'off';
    field.spellcheck = false;
  }

  field.className = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500';

  wrapper.appendChild(field);

  if (input.helpText) {
    const help = document.createElement('p');
    help.className = 'mt-1 text-xs text-slate-500';
    help.textContent = input.helpText;
    wrapper.appendChild(help);
  }

  return wrapper;
}

function getExampleInputValue(input) {
  if (Object.prototype.hasOwnProperty.call(input, 'example')) {
    return input.example;
  }

  if (input.type === 'select' && Array.isArray(input.options) && input.options.length > 0) {
    const first = input.options[0];
    return typeof first === 'object' ? first.value : first;
  }

  if (input.type === 'checkbox') return true;

  if (input.type === 'number') {
    const numberFromPlaceholder = Number(input.placeholder);
    return input.placeholder !== '' && Number.isFinite(numberFromPlaceholder)
      ? numberFromPlaceholder
      : 1;
  }

  if (input.type === 'date') {
    return new Date().toISOString().slice(0, 10);
  }

  if (input.type === 'datetime-local') {
    return new Date().toISOString().slice(0, 16);
  }

  if (input.placeholder) return input.placeholder;
  if (input.type === 'url') return 'https://example.com';
  if (input.type === 'email') return 'qa@example.com';
  if (input.type === 'password') return 'example-password';

  return `example-${input.name}`;
}

function buildExampleInputs(script) {
  const inputs = {};

  for (const input of script.inputs || []) {
    inputs[input.name] = getExampleInputValue(input);
  }

  return inputs;
}

function renderApiDocumentation(script) {
  const endpoint = `${window.location.origin}/api/run`;
  const requestBody = {
    scriptId: script.id,
    inputs: buildExampleInputs(script)
  };

  const requestJson = JSON.stringify(requestBody, null, 2);
  const compactRequestJson = JSON.stringify(requestBody);

  const curlExample = `curl.exe -X POST "${endpoint}" -H "Content-Type: application/json" -d '${compactRequestJson}'`;

  const fetchExample = [
    'async function runScript() {',
    '  try {',
    `    const response = await fetch('${endpoint}', {`,
    "      method: 'POST',",
    "      headers: { 'Content-Type': 'application/json' },",
    `      body: JSON.stringify(${requestJson.replace(/\n/g, '\n      ')})`,
    '    });',
    '',
    '    const result = await response.json();',
    '',
    '    if (!response.ok || !result.success) {',
    '      throw new Error(',
    '        result.error?.message || `Script request failed with HTTP ${response.status}`',
    '      );',
    '    }',
    '',
    "    console.log('Script succeeded:', result.result);",
    '    return result;',
    '  } catch (error) {',
    "    console.error('Script execution failed:', error.message);",
    '    throw error;',
    '  }',
    '}',
    '',
    'runScript();'
  ].join('\n');

  const successResponseExample = {
    success: true,
    script: script.id,
    durationMs: 1234,
    result: {
      '...': 'JSON returned by this script'
    }
  };

  const failureResponseExample = {
    success: false,
    script: script.id,
    durationMs: 321,
    error: {
      message: 'The script error message is returned here.'
    }
  };

  apiEndpoint.textContent = endpoint;
  apiRequestJson.textContent = requestJson;
  apiCurl.textContent = curlExample;
  apiFetch.textContent = fetchExample;
  apiSuccessResponseJson.textContent = JSON.stringify(successResponseExample, null, 2);
  apiFailureResponseJson.textContent = JSON.stringify(failureResponseExample, null, 2);

  const hasSensitiveInputs = (script.inputs || []).some((input) => input.sensitive);
  apiSensitiveNotice.classList.toggle('hidden', !hasSensitiveInputs);

  latestApiExamples = {
    requestJson,
    curl: curlExample,
    fetch: fetchExample
  };
}

function selectScript(script) {
  selectedScript = script;
  emptyState.classList.add('hidden');
  scriptPanel.classList.remove('hidden');
  resultPanel.classList.add('hidden');
  apiDocumentation.open = false;

  scriptGroup.textContent = friendlyGroup(script.group);
  scriptName.textContent = script.name;
  scriptDescription.textContent = script.description || 'No description provided.';

  inputContainer.innerHTML = '';

  if (!script.inputs || script.inputs.length === 0) {
    inputContainer.innerHTML = '<p class="text-sm text-slate-500">This script does not require any inputs.</p>';
  } else {
    for (const input of script.inputs) {
      inputContainer.appendChild(createInputField(input));
    }
  }

  renderApiDocumentation(script);
  renderNavigation(getFilteredScripts());
}

function getFilteredScripts() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return allScripts;

  return allScripts.filter((script) => {
    const haystack = [script.name, script.description, script.group, script.id]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

function collectInputs() {
  const values = {};

  for (const definition of selectedScript.inputs || []) {
    const field = document.querySelector(`[name="${CSS.escape(definition.name)}"]`);
    if (!field) continue;

    if (field.type === 'checkbox') {
      values[definition.name] = field.checked;
    } else if (field.type === 'number') {
      values[definition.name] = field.value === '' ? '' : Number(field.value);
    } else {
      values[definition.name] = field.value;
    }
  }

  return values;
}

async function runSelectedScript() {
  if (!selectedScript) return;

  runButton.disabled = true;
  runButton.textContent = 'Running...';
  runningMessage.classList.remove('hidden');
  resultPanel.classList.add('hidden');

  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptId: selectedScript.id,
        inputs: collectInputs()
      })
    });

    latestResult = await response.json();
    showResult(latestResult);
  } catch (error) {
    latestResult = {
      success: false,
      error: { message: `Unable to contact the local server: ${error.message}` }
    };
    showResult(latestResult);
  } finally {
    runButton.disabled = false;
    runButton.textContent = 'Run Script';
    runningMessage.classList.add('hidden');
  }
}

function showResult(result) {
  resultPanel.classList.remove('hidden');
  resultJson.textContent = JSON.stringify(result, null, 2);

  if (result.success) {
    resultSummary.textContent = 'Script completed successfully.';
    resultSummary.className = 'mt-1 text-sm font-medium text-emerald-700';
  } else {
    resultSummary.textContent = result.error?.message || 'Script failed.';
    resultSummary.className = 'mt-1 text-sm font-medium text-red-700';
  }

  duration.textContent = typeof result.durationMs === 'number'
    ? `${(result.durationMs / 1000).toFixed(2)} sec`
    : '';
}

async function copyText(button, text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const temporary = document.createElement('textarea');
    temporary.value = text;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.appendChild(temporary);
    temporary.select();
    document.execCommand('copy');
    temporary.remove();
  }

  const previous = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => {
    button.textContent = previous;
  }, 1000);
}

searchInput.addEventListener('input', () => {
  renderNavigation(getFilteredScripts());
});

scriptForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await runSelectedScript();
});

copyResult.addEventListener('click', async () => {
  if (!latestResult) return;
  await copyText(copyResult, JSON.stringify(latestResult, null, 2));
});

copyApiJson.addEventListener('click', async () => {
  await copyText(copyApiJson, latestApiExamples.requestJson);
});

copyApiCurl.addEventListener('click', async () => {
  await copyText(copyApiCurl, latestApiExamples.curl);
});

copyApiFetch.addEventListener('click', async () => {
  await copyText(copyApiFetch, latestApiExamples.fetch);
});

async function loadScripts() {
  try {
    const response = await fetch('/api/scripts');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    allScripts = await response.json();
    searchInput.disabled = false;
    renderNavigation(allScripts);

    if (allScripts.length > 0) {
      selectScript(allScripts[0]);
    }
  } catch (error) {
    scriptCount.textContent = 'Unavailable';
    scriptNavigation.innerHTML = `<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">Unable to load scripts: ${escapeHtml(error.message)}</p>`;
  }
}

loadScripts();
