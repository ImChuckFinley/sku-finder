const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable worker threads — workaround for Node 24 compatibility with Metro 0.84
config.transformer = {
  ...config.transformer,
  useWorkerThreads: false,
};

module.exports = config;
