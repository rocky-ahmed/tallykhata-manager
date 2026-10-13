const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Worker count tuned for stable bundling on Windows
config.maxWorkers = 2;

module.exports = config;

