const { randomUUID } = require('crypto');

module.exports = {
  name: 'Generate Mock Test Data',
  description: 'Pure Node.js task example. It does not import Playwright and does not launch a browser.',

  inputs: ['optionalEmailPrefix', 'recordCount'],

  async run(inputs) {
    const count = Number(inputs.count);

    if (!Number.isInteger(count) || count < 1 || count > 20) {
      throw new Error('Number Of Records must be a whole number between 1 and 20.');
    }

    const prefix = String(inputs.prefix || 'qa-user')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-') || 'qa-user';

    const records = Array.from({ length: count }, (_, index) => ({
      id: randomUUID(),
      sequence: index + 1,
      email: `${prefix}-${index + 1}@example.test`,
      reference: `QA-${String(index + 1).padStart(4, '0')}`
    }));

    return {
      taskType: 'node-only',
      playwrightUsed: false,
      generatedAt: new Date().toISOString(),
      count: records.length,
      records
    };
  }
};
