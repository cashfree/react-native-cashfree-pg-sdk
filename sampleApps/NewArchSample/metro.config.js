const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Repo root, so Metro can read the SDK straight from src/ instead of lib/.
// package.json's "react-native" field points at src/index, so instrumenting
// src/ shows up in this app without a rebuild.
const sdkRoot = path.resolve(__dirname, '..', '..');

// Every module below MUST resolve to exactly one copy.
//
// react / react-native: the repo root pins react-native 0.73.6 as a
// devDependency. If Metro ever reaches it, this app silently runs a mix of
// 0.73 and 0.81.
//
// cashfree-pg-api-contract: two copies make `cfPayment instanceof CFUPIPayment`
// in src/index.ts#makePayment return false. makePayment then falls through to
// its else branch, logs 'Wrong payment object', and returns without calling
// native at all — no UPI app, no callback, Pay button resets. That is
// indistinguishable from the New Architecture bug we are chasing, so pin it
// here and keep boundary log #1 in App.tsx to prove which one we hit.
const singletons = ['react', 'react-native', 'cashfree-pg-api-contract'];

const appModules = path.resolve(__dirname, 'node_modules');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  // Watch the SDK source so edits to src/ and android/ hot-reload here.
  watchFolders: [sdkRoot],

  resolver: {
    // Resolve app-local first; never walk up into the repo root's modules.
    nodeModulesPaths: [appModules],

    // Force the singletons to the app's copy regardless of who imports them.
    extraNodeModules: singletons.reduce(
      (acc, name) => {
        acc[name] = path.join(appModules, name);
        return acc;
      },
      {
        // The SDK itself resolves to the repo root (src/index via the
        // "react-native" field), not to a published copy from npm.
        'react-native-cashfree-pg-sdk': sdkRoot,
      },
    ),

    // Hard block the root's node_modules. Without this, a stray `yarn` at the
    // repo root reintroduces react-native 0.73.6 and the duplicate contract
    // package, and the failure looks like a native bug.
    blockList: [
      new RegExp(
        `^${sdkRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/.*$`,
      ),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
