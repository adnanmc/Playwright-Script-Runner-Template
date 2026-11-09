module.exports = {
  name: 'Echo Inputs',
  description: 'Simple non-browser example showing how script inputs become a JSON result.',

  inputs: ['message', 'optionalCount'],

  async run(inputs) {
    return {
      received: inputs,
      executedAt: new Date().toISOString()
    };
  }
};
