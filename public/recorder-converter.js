(function (global) {
  'use strict';

  function asString(value) {
    return String(value ?? '');
  }

  function jsString(value) {
    return JSON.stringify(asString(value));
  }

  function numberOr(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeCandidates(selectors) {
    if (!Array.isArray(selectors)) return [];

    return selectors
      .map((candidate) => {
        if (Array.isArray(candidate)) {
          return candidate.filter((part) => typeof part === 'string' && part.trim());
        }

        return typeof candidate === 'string' && candidate.trim() ? [candidate] : [];
      })
      .filter((candidate) => candidate.length > 0);
  }

  function selectorPartScore(part) {
    const value = part.toLowerCase();

    if (value.startsWith('aria/')) return 100;
    if (/^\[data-(testid|test-id|qa|cy)=/i.test(part)) return 95;
    if (/^#[a-z0-9_-]+$/i.test(part)) return 90;
    if (value.startsWith('text/')) return 80;
    if (value.startsWith('pierce/')) return 70;
    if (value.startsWith('xpath/')) return 30;
    return 75;
  }

  function chooseCandidate(selectors) {
    const candidates = normalizeCandidates(selectors);

    if (candidates.length === 0) return null;

    return candidates
      .map((candidate, index) => ({
        candidate,
        index,
        score: candidate.reduce((sum, part) => sum + selectorPartScore(part), 0) - (candidate.length - 1) * 2
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0].candidate;
  }

  function parseAriaSelector(selector) {
    const raw = selector.slice('aria/'.length);
    const roleMatch = raw.match(/\[role=["']?([^\]"']+)["']?\]\s*$/i);
    const role = roleMatch ? roleMatch[1] : null;
    const name = roleMatch ? raw.slice(0, roleMatch.index).trim() : raw.trim();

    return { role, name };
  }

  function appendLocatorPart(expression, part) {
    if (part.startsWith('aria/')) {
      const aria = parseAriaSelector(part);

      if (aria.role) {
        return `${expression}.getByRole(${jsString(aria.role)}, { name: ${jsString(aria.name)} })`;
      }

      return `${expression}.getByText(${jsString(aria.name)}, { exact: true })`;
    }

    if (part.startsWith('text/')) {
      return `${expression}.getByText(${jsString(part.slice('text/'.length))}, { exact: true })`;
    }

    if (part.startsWith('xpath/')) {
      return `${expression}.locator(${jsString(`xpath=${part.slice('xpath/'.length)}`)})`;
    }

    if (part.startsWith('pierce/')) {
      return `${expression}.locator(${jsString(part.slice('pierce/'.length))})`;
    }

    if (part.startsWith('css/')) {
      return `${expression}.locator(${jsString(part.slice('css/'.length))})`;
    }

    return `${expression}.locator(${jsString(part)})`;
  }

  function buildLocatorExpression(selectors) {
    const candidate = chooseCandidate(selectors);
    if (!candidate) return null;

    return candidate.reduce(
      (expression, part) => appendLocatorPart(expression, part),
      'page'
    );
  }

  function selectorSearchText(selectors) {
    return normalizeCandidates(selectors)
      .flat()
      .join(' ')
      .toLowerCase();
  }

  function detectCatalogInput(step, options) {
    if (!options.detectSensitiveInputs || step.type !== 'change') return null;

    const selectorText = selectorSearchText(step.selectors);

    if (/password|passwd|passcode|pwd/.test(selectorText)) {
      return 'password';
    }

    if (/e-?mail/.test(selectorText)) {
      return 'email';
    }

    return null;
  }

  function mappedMouseButton(button) {
    if (button === 'secondary') return 'right';
    if (button === 'auxiliary') return 'middle';
    return null;
  }

  function stepTimeout(step, flow) {
    return numberOr(step.timeout, numberOr(flow.timeout, 30000));
  }

  function addWarning(context, message) {
    if (!context.warnings.includes(message)) {
      context.warnings.push(message);
    }
  }

  function noteFrameOrTarget(step, context, stepNumber) {
    if (Array.isArray(step.frame) && step.frame.length > 0) {
      addWarning(
        context,
        `Step ${stepNumber} uses a nested frame path (${step.frame.join(' > ')}). The generated line targets the main page and should be reviewed.`
      );
    }

    if (step.target && step.target !== 'main') {
      addWarning(
        context,
        `Step ${stepNumber} targets ${step.target}. The generated line targets the main page and should be reviewed.`
      );
    }
  }

  function convertStep(step, index, flow, context, options) {
    const stepNumber = index + 1;
    const timeout = stepTimeout(step, flow);
    const lines = [`      // Recorder step ${stepNumber}: ${step.type}`];

    noteFrameOrTarget(step, context, stepNumber);

    switch (step.type) {
      case 'setViewport': {
        const width = numberOr(step.width, 1280);
        const height = numberOr(step.height, 720);
        lines.push(`      await page.setViewportSize({ width: ${width}, height: ${height} });`);
        context.supported += 1;
        break;
      }

      case 'navigate': {
        const useInput = options.parameterizeFirstUrl && !context.firstNavigateConverted;
        const targetUrl = useInput ? 'inputs.url' : jsString(step.url);

        if (useInput) context.inputs.add('url');
        context.firstNavigateConverted = true;

        lines.push('      await page.goto(' + targetUrl + ', {');
        lines.push("        waitUntil: 'domcontentloaded',");
        lines.push(`        timeout: ${timeout}`);
        lines.push('      });');
        context.supported += 1;
        break;
      }

      case 'click':
      case 'doubleClick': {
        const locator = buildLocatorExpression(step.selectors);
        if (!locator) {
          addWarning(context, `Step ${stepNumber} (${step.type}) has no usable selector and was left as a TODO.`);
          lines.push(`      // TODO: ${step.type} step had no usable selector.`);
          context.unsupported += 1;
          break;
        }

        const button = mappedMouseButton(step.button);
        const method = step.type === 'doubleClick' ? 'dblclick' : 'click';
        const optionsParts = [];
        if (button) optionsParts.push(`button: ${jsString(button)}`);
        if (Number.isFinite(Number(step.duration)) && Number(step.duration) > 0) {
          optionsParts.push(`delay: ${Math.round(Number(step.duration))}`);
        }

        lines.push(
          optionsParts.length > 0
            ? `      await ${locator}.${method}({ ${optionsParts.join(', ')} });`
            : `      await ${locator}.${method}();`
        );
        context.supported += 1;
        break;
      }

      case 'hover': {
        const locator = buildLocatorExpression(step.selectors);
        if (!locator) {
          addWarning(context, `Step ${stepNumber} (hover) has no usable selector and was left as a TODO.`);
          lines.push('      // TODO: hover step had no usable selector.');
          context.unsupported += 1;
          break;
        }

        lines.push(`      await ${locator}.hover();`);
        context.supported += 1;
        break;
      }

      case 'change': {
        const locator = buildLocatorExpression(step.selectors);
        if (!locator) {
          addWarning(context, `Step ${stepNumber} (change) has no usable selector and was left as a TODO.`);
          lines.push('      // TODO: change step had no usable selector.');
          context.unsupported += 1;
          break;
        }

        context.needsSetValueHelper = true;
        const catalogInput = detectCatalogInput(step, options);

        if (catalogInput) {
          context.inputs.add(catalogInput);
          lines.push(`      await setRecorderValue(${locator}, inputs.${catalogInput});`);
          if (catalogInput === 'password') {
            addWarning(context, 'A password-like field was converted to the shared password input so the recorded password value is not embedded in the generated script.');
          }
        } else {
          lines.push(`      await setRecorderValue(${locator}, ${jsString(step.value)});`);
        }

        context.supported += 1;
        break;
      }

      case 'keyDown':
      case 'keyUp': {
        context.needsKeyHelper = true;
        const method = step.type === 'keyDown' ? 'down' : 'up';
        lines.push(`      await page.keyboard.${method}(normalizeRecorderKey(${jsString(step.key)}));`);
        context.supported += 1;
        break;
      }

      case 'scroll': {
        const x = numberOr(step.x, 0);
        const y = numberOr(step.y, 0);
        const locator = buildLocatorExpression(step.selectors);

        if (locator) {
          lines.push(`      await ${locator}.evaluate((element, position) => {`);
          lines.push('        element.scrollTo(position.x, position.y);');
          lines.push(`      }, { x: ${x}, y: ${y} });`);
        } else {
          lines.push('      await page.evaluate((position) => {');
          lines.push('        window.scrollTo(position.x, position.y);');
          lines.push(`      }, { x: ${x}, y: ${y} });`);
        }

        context.supported += 1;
        break;
      }

      case 'waitForElement': {
        const locator = buildLocatorExpression(step.selectors);
        if (!locator) {
          addWarning(context, `Step ${stepNumber} (waitForElement) has no usable selector and was left as a TODO.`);
          lines.push('      // TODO: waitForElement step had no usable selector.');
          context.unsupported += 1;
          break;
        }

        context.needsWaitHelper = true;
        lines.push(`      await waitForRecorderElement(${locator}, {`);
        lines.push(`        operator: ${jsString(step.operator || '==')},`);
        lines.push(`        count: ${numberOr(step.count, 1)},`);
        lines.push(`        visible: ${step.visible === false ? 'false' : 'true'},`);
        lines.push(`        timeout: ${timeout}`);
        lines.push('      });');

        if (step.attributes || step.properties) {
          addWarning(
            context,
            `Step ${stepNumber} includes waitForElement attribute/property assertions. The generated script waits for count/visibility only; review this step if those assertions matter.`
          );
        }

        context.supported += 1;
        break;
      }

      case 'waitForExpression': {
        lines.push(`      await page.waitForFunction(${jsString(step.expression)}, null, { timeout: ${timeout} });`);
        context.supported += 1;
        break;
      }

      case 'close': {
        lines.push('      await page.close();');
        context.supported += 1;
        break;
      }

      case 'emulateNetworkConditions': {
        addWarning(
          context,
          `Step ${stepNumber} uses emulateNetworkConditions. It was intentionally left as a TODO because Playwright Core does not expose an equivalent portable page API.`
        );
        lines.push('      // TODO: Review recorded network emulation settings.');
        lines.push(`      // download=${numberOr(step.download, 0)}, upload=${numberOr(step.upload, 0)}, latency=${numberOr(step.latency, 0)}`);
        context.unsupported += 1;
        break;
      }

      case 'customStep': {
        addWarning(context, `Step ${stepNumber} is a custom Recorder step and requires manual conversion.`);
        lines.push(`      // TODO: Convert custom Recorder step ${jsString(step.name || 'unnamed')} manually.`);
        context.unsupported += 1;
        break;
      }

      default: {
        addWarning(context, `Step ${stepNumber} uses unsupported Recorder step type ${step.type}.`);
        lines.push(`      // TODO: Unsupported Recorder step type: ${asString(step.type)}`);
        context.unsupported += 1;
        break;
      }
    }

    return lines;
  }

  function setValueHelper() {
    return [
      'async function setRecorderValue(locator, value) {',
      "  const tagName = await locator.evaluate((element) => element.tagName.toLowerCase());",
      "  const inputType = String((await locator.getAttribute('type')) || '').toLowerCase();",
      '',
      "  if (tagName === 'select') {",
      '    await locator.selectOption(String(value));',
      '    return;',
      '  }',
      '',
      "  if (inputType === 'checkbox' || inputType === 'radio') {",
      "    const shouldBeChecked = value === true || value === 'true' || value === 'on' || value === '1';",
      '    if (shouldBeChecked) {',
      '      await locator.check();',
      '    } else if (inputType === \'checkbox\') {',
      '      await locator.uncheck();',
      '    }',
      '    return;',
      '  }',
      '',
      '  await locator.fill(String(value ?? \'\'));',
      '}'
    ].join('\n');
  }

  function keyHelper() {
    return [
      'function normalizeRecorderKey(key) {',
      '  const aliases = {',
      "    ShiftLeft: 'Shift',",
      "    ShiftRight: 'Shift',",
      "    ControlLeft: 'Control',",
      "    ControlRight: 'Control',",
      "    AltLeft: 'Alt',",
      "    AltRight: 'Alt',",
      "    MetaLeft: 'Meta',",
      "    MetaRight: 'Meta',",
      "    NumpadEnter: 'Enter'",
      '  };',
      '',
      '  if (aliases[key]) return aliases[key];',
      "  if (/^Key[A-Z]$/.test(key)) return key.slice(3);",
      "  if (/^Digit[0-9]$/.test(key)) return key.slice(5);",
      '  return key;',
      '}'
    ].join('\n');
  }

  function waitHelper() {
    return [
      'async function waitForRecorderElement(locator, options = {}) {',
      "  const operator = options.operator || '==';",
      '  const expectedCount = Number.isFinite(Number(options.count)) ? Number(options.count) : 1;',
      '  const shouldBeVisible = options.visible !== false;',
      '  const timeout = Number.isFinite(Number(options.timeout)) ? Number(options.timeout) : 30000;',
      '  const deadline = Date.now() + timeout;',
      '',
      '  while (Date.now() <= deadline) {',
      '    const actualCount = await locator.count();',
      "    const countMatches = operator === '>='",
      '      ? actualCount >= expectedCount',
      "      : operator === '<='",
      '        ? actualCount <= expectedCount',
      '        : actualCount === expectedCount;',
      '',
      '    let visibilityMatches = true;',
      '    if (actualCount > 0) {',
      '      const firstVisible = await locator.first().isVisible().catch(() => false);',
      '      visibilityMatches = shouldBeVisible ? firstVisible : !firstVisible;',
      '    } else if (shouldBeVisible) {',
      '      visibilityMatches = false;',
      '    }',
      '',
      '    if (countMatches && visibilityMatches) {',
      '      return;',
      '    }',
      '',
      '    await new Promise((resolve) => setTimeout(resolve, 100));',
      '  }',
      '',
      "  throw new Error(`Timed out waiting for Recorder element condition (${operator} ${expectedCount}, visible=${shouldBeVisible}).`);",
      '}'
    ].join('\n');
  }

  function sanitizeDisplayName(value) {
    const trimmed = asString(value).trim();
    return trimmed || 'Converted Recorder Script';
  }

  function convertRecording(flow, userOptions) {
    const options = {
      scriptName: '',
      description: '',
      parameterizeFirstUrl: true,
      detectSensitiveInputs: true,
      ...userOptions
    };

    if (!flow || typeof flow !== 'object' || Array.isArray(flow)) {
      throw new Error('Recorder JSON must be an object.');
    }

    if (!Array.isArray(flow.steps)) {
      throw new Error('Recorder JSON must contain a steps array.');
    }

    const context = {
      inputs: new Set(),
      warnings: [],
      supported: 0,
      unsupported: 0,
      firstNavigateConverted: false,
      needsSetValueHelper: false,
      needsKeyHelper: false,
      needsWaitHelper: false
    };

    const stepLines = [];

    flow.steps.forEach((step, index) => {
      if (!step || typeof step !== 'object' || Array.isArray(step) || !step.type) {
        addWarning(context, `Step ${index + 1} is malformed and was left as a TODO.`);
        stepLines.push(`      // TODO: Recorder step ${index + 1} is malformed.`);
        context.unsupported += 1;
        return;
      }

      stepLines.push(...convertStep(step, index, flow, context, options), '');
    });

    const scriptName = sanitizeDisplayName(options.scriptName || flow.title);
    const description = asString(options.description).trim() ||
      'Converted from Chrome DevTools Recorder JSON. Review generated selectors and recorded values before adding this file to the scripts folder.';
    const inputList = Array.from(context.inputs);

    const sections = ["const { chromium } = require('playwright-core');"];

    if (context.needsSetValueHelper) sections.push(setValueHelper());
    if (context.needsKeyHelper) sections.push(keyHelper());
    if (context.needsWaitHelper) sections.push(waitHelper());

    const moduleLines = [
      'module.exports = {',
      `  name: ${jsString(scriptName)},`,
      `  description: ${jsString(description)},`,
      '',
      `  inputs: ${JSON.stringify(inputList, null, 2).replace(/^/gm, '  ').trimStart()},`,
      '',
      '  async run(inputs) {',
      '    let browser;',
      '',
      '    try {',
      '      browser = await chromium.launch({',
      "        channel: 'chrome',",
      "        headless: process.env.ENV === 'prod'",
      '      });',
      '',
      '      const page = await browser.newPage();',
      ''
    ];

    if (stepLines.length > 0) {
      moduleLines.push(...stepLines);
    } else {
      moduleLines.push('      // Recording contained no steps.', '');
    }

    moduleLines.push(
      '      return {',
      "        message: 'Converted Recorder flow completed successfully.',",
      `        convertedSteps: ${flow.steps.length},`,
      '        finalUrl: page.isClosed() ? null : page.url()',
      '      };',
      '    } catch (error) {',
      "      if (/executable|chrome/i.test(error.message || '')) {",
      '        throw new Error(',
      "          `Google Chrome could not be started. Make sure stable Chrome is installed. Original error: ${error.message}`",
      '        );',
      '      }',
      '',
      '      throw error;',
      '    } finally {',
      '      if (browser) {',
      '        await browser.close();',
      '      }',
      '    }',
      '  }',
      '};'
    );

    sections.push(moduleLines.join('\n'));

    if (flow.steps.some((step) => step && step.type === 'change' && !detectCatalogInput(step, options))) {
      addWarning(
        context,
        'Recorded form values that were not recognized as email/password are embedded as literal strings. Review them before saving the script, especially if the recording contains sensitive data.'
      );
    }

    return {
      code: sections.join('\n\n'),
      warnings: context.warnings,
      summary: {
        totalSteps: flow.steps.length,
        supportedSteps: context.supported,
        reviewSteps: context.unsupported,
        inputs: inputList
      }
    };
  }

  global.RecorderConverter = {
    convertRecording
  };
})(typeof window !== 'undefined' ? window : globalThis);
