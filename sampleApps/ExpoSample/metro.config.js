const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

// Same singleton pinning as the other sample apps — see sampleApps/README.md.
// cashfree-pg-api-contract in particular must resolve exactly once, or
// `instanceof CFUPIPayment` inside makePayment returns false and the payment is
// silently dropped with no native call (symptom-identical to the bug we chased).
const sdkRoot = path.resolve(__dirname, '..', '..');
const appModules = path.resolve(__dirname, 'node_modules');
const singletons = ['react', 'react-native', 'cashfree-pg-api-contract'];

const config = getDefaultConfig(__dirname);
config.watchFolders = [sdkRoot];
config.resolver.nodeModulesPaths = [appModules];
config.resolver.extraNodeModules = singletons.reduce(
  (acc, name) => {
    acc[name] = path.join(appModules, name);
    return acc;
  },
  {'react-native-cashfree-pg-sdk': sdkRoot},
);
config.resolver.blockList = [
  new RegExp(`^${sdkRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/.*$`),
];

module.exports = config;
