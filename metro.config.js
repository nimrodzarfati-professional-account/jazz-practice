const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support WebAssembly for expo-sqlite web worker
config.resolver.assetExts.push('wasm');

module.exports = config;
