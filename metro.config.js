const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure resolver for better Clerk compatibility
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  alias: {
    ...config.resolver.alias,
    'react-dom': path.resolve(__dirname, 'react-dom-shim.js'),
    'react-dom/client': path.resolve(__dirname, 'react-dom-shim.js'),
  },
  resolverMainFields: ['react-native', 'browser', 'main'],
};

// Add transformer options
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config; 