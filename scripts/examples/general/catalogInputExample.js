module.exports = {
  name: 'Master Input Catalog Example',
  description: 'Shows how a script can select reusable inputs by name without redefining labels, types, placeholders, or options.',

  // These definitions are all pulled from scripts/_config/inputCatalog.js by the server.
  inputs: [
    'environment',
    'flightNumber',
    'departureDate',
    'confirmationCode',
    'delayMinute',
    'flightGate',
    'flightTerminal',
    'reasonCode'
  ],

  async run(inputs) {
    return {
      message: 'All input metadata came from scripts/_config/inputCatalog.js.',
      received: inputs
    };
  }
};
