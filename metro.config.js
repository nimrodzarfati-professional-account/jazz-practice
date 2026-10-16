// Polyfill Array.prototype.toReversed for Node < 20
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return this.slice().reverse();
  };
}

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support WebAssembly for expo-sqlite web worker
config.resolver.assetExts.push('wasm');

module.exports = config;
