/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Same singleton pinning as the other two sample apps — see
// sampleApps/README.md for why cashfree-pg-api-contract must resolve exactly
// once (duplicate copies break `instanceof` inside makePayment, which is easy
// to mistake for a native failure).
const sdkRoot = path.resolve(__dirname, '..', '..');
const sharedRoot = path.resolve(__dirname, '..', 'shared');
const appModules = path.resolve(__dirname, 'node_modules');
const singletons = ['react', 'react-native', 'cashfree-pg-api-contract'];

const defaultConfig = getDefaultConfig(__dirname);

const {
  resolver: {sourceExts, assetExts},
} = defaultConfig;

const config = {
  watchFolders: [sdkRoot, sharedRoot],
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    nodeModulesPaths: [appModules],
    extraNodeModules: singletons.reduce(
      (acc, name) => {
        acc[name] = path.join(appModules, name);
        return acc;
      },
      {'react-native-cashfree-pg-sdk': sdkRoot, shared: sharedRoot},
    ),
    blockList: [
      new RegExp(
        `^${sdkRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/.*$`,
      ),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
