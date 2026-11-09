(async function loadAppInfo() {
  const defaults = {
    title: 'QA Script Runner',
    description: 'Standalone Node tasks and Playwright browser automation powered by Express.',
    runnerLabel: 'Script Runner',
    recorderLabel: 'Recorder Converter',
    recorderDescription: "Convert Chrome DevTools Recorder JSON into this app's standalone Playwright script format."
  };

  let info = defaults;

  try {
    const response = await fetch('/api/info');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const loaded = await response.json();
    info = { ...defaults, ...loaded };
  } catch (error) {
    console.warn('Unable to load info.json. Using built-in defaults.', error);
  }

  const appTitle = document.getElementById('appTitle');
  const appDescription = document.getElementById('appDescription');
  const runnerNavLabel = document.getElementById('runnerNavLabel');
  const recorderNavLabel = document.getElementById('recorderNavLabel');
  const page = document.body.dataset.page || 'runner';

  if (appTitle) {
    appTitle.textContent = info.title;
  }

  if (appDescription) {
    appDescription.textContent = page === 'recorder'
      ? info.recorderDescription
      : info.description;
  }

  if (runnerNavLabel) {
    runnerNavLabel.textContent = info.runnerLabel;
  }

  if (recorderNavLabel) {
    recorderNavLabel.textContent = info.recorderLabel;
  }

  document.title = page === 'recorder'
    ? `${info.recorderLabel} - ${info.title}`
    : info.title;
})();
