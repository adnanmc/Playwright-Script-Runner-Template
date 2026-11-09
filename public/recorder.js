const recordingJson = document.getElementById('recordingJson');
const scriptName = document.getElementById('converterScriptName');
const scriptDescription = document.getElementById('converterDescription');
const parameterizeFirstUrl = document.getElementById('parameterizeFirstUrl');
const detectSensitiveInputs = document.getElementById('detectSensitiveInputs');
const convertButton = document.getElementById('convertRecording');
const sampleButton = document.getElementById('loadSampleRecording');
const clearButton = document.getElementById('clearRecording');
const outputCode = document.getElementById('generatedScript');
const copyButton = document.getElementById('copyGeneratedScript');
const downloadButton = document.getElementById('downloadGeneratedScript');
const syntaxButton = document.getElementById('checkGeneratedSyntax');
const conversionStatus = document.getElementById('conversionStatus');
const conversionSummary = document.getElementById('conversionSummary');
const conversionWarnings = document.getElementById('conversionWarnings');

let lastFlow = null;

const sampleRecording = {
  title: 'Example.com Recorder Flow',
  timeout: 30000,
  steps: [
    {
      type: 'setViewport',
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    },
    {
      type: 'navigate',
      url: 'https://example.com/'
    },
    {
      type: 'waitForElement',
      selectors: [['h1'], ['xpath//h1']],
      operator: '==',
      count: 1,
      visible: true
    },
    {
      type: 'click',
      target: 'main',
      selectors: [['a'], ['xpath//a'], ['pierce/a']],
      offsetX: 30,
      offsetY: 10
    }
  ]
};

function setStatus(message, kind = 'neutral') {
  conversionStatus.textContent = message;
  conversionStatus.className = 'mt-3 text-sm font-medium';

  if (kind === 'success') {
    conversionStatus.classList.add('text-emerald-700');
  } else if (kind === 'error') {
    conversionStatus.classList.add('text-red-700');
  } else {
    conversionStatus.classList.add('text-slate-500');
  }
}

function renderSummary(result) {
  const summary = result.summary;
  const inputText = summary.inputs.length > 0 ? summary.inputs.join(', ') : 'none';

  conversionSummary.innerHTML = [
    `<span class="font-medium text-slate-700">${summary.totalSteps}</span> total steps`,
    `<span class="font-medium text-emerald-700">${summary.supportedSteps}</span> converted`,
    `<span class="font-medium text-amber-700">${summary.reviewSteps}</span> need review`,
    `inputs: <span class="font-medium text-slate-700">${escapeHtml(inputText)}</span>`
  ].join(' &nbsp;•&nbsp; ');

  conversionWarnings.innerHTML = '';

  if (result.warnings.length === 0) {
    conversionWarnings.innerHTML = '<p class="text-sm text-emerald-700">No conversion warnings.</p>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'space-y-2';

  for (const warning of result.warnings) {
    const item = document.createElement('li');
    item.className = 'rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600';
    item.textContent = warning;
    list.appendChild(item);
  }

  conversionWarnings.appendChild(list);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeFileName(value) {
  const base = String(value || 'converted-recorder-script')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${base || 'converted-recorder-script'}.js`;
}

function parseRecording() {
  const raw = recordingJson.value.trim();
  if (!raw) throw new Error('Paste Chrome Recorder JSON first.');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Recorder JSON must be a JSON object.');
  }

  if (!Array.isArray(parsed.steps)) {
    throw new Error('Recorder JSON must contain a steps array.');
  }

  return parsed;
}

function convert() {
  try {
    const flow = parseRecording();
    lastFlow = flow;

    if (!scriptName.value.trim() && flow.title) {
      scriptName.value = flow.title;
    }

    const result = window.RecorderConverter.convertRecording(flow, {
      scriptName: scriptName.value.trim(),
      description: scriptDescription.value.trim(),
      parameterizeFirstUrl: parameterizeFirstUrl.checked,
      detectSensitiveInputs: detectSensitiveInputs.checked
    });

    outputCode.value = result.code;
    renderSummary(result);
    setStatus('Conversion completed. Review and edit the generated script before adding it to /scripts.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function copyGeneratedScript() {
  const code = outputCode.value;
  if (!code.trim()) {
    setStatus('Convert a recording first.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    setStatus('Generated script copied to clipboard.', 'success');
  } catch (error) {
    setStatus(`Unable to copy automatically: ${error.message}`, 'error');
  }
}

function downloadGeneratedScript() {
  const code = outputCode.value;
  if (!code.trim()) {
    setStatus('Convert a recording first.', 'error');
    return;
  }

  const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName(scriptName.value || lastFlow?.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus('Generated .js file downloaded. Review it before placing it under /scripts.', 'success');
}

function checkGeneratedSyntax() {
  const code = outputCode.value;
  if (!code.trim()) {
    setStatus('Convert a recording first.', 'error');
    return;
  }

  try {
    // Parse only. The generated CommonJS module is not executed in this page.
    new Function(code);
    setStatus('Syntax check passed. The script parses as JavaScript.', 'success');
  } catch (error) {
    setStatus(`Syntax error: ${error.message}`, 'error');
  }
}

function loadSample() {
  recordingJson.value = JSON.stringify(sampleRecording, null, 2);
  scriptName.value = sampleRecording.title;
  scriptDescription.value = '';
  outputCode.value = '';
  conversionSummary.textContent = '';
  conversionWarnings.innerHTML = '';
  setStatus('Sample Recorder JSON loaded. Click Convert Recording.', 'neutral');
}

function clearAll() {
  recordingJson.value = '';
  scriptName.value = '';
  scriptDescription.value = '';
  outputCode.value = '';
  conversionSummary.textContent = '';
  conversionWarnings.innerHTML = '';
  lastFlow = null;
  setStatus('Paste a Chrome Recorder JSON export to begin.', 'neutral');
}

convertButton.addEventListener('click', convert);
sampleButton.addEventListener('click', loadSample);
clearButton.addEventListener('click', clearAll);
copyButton.addEventListener('click', copyGeneratedScript);
downloadButton.addEventListener('click', downloadGeneratedScript);
syntaxButton.addEventListener('click', checkGeneratedSyntax);

recordingJson.addEventListener('input', () => {
  if (outputCode.value.trim()) {
    setStatus('Recorder JSON changed. Convert again to refresh the generated script.', 'neutral');
  }
});
