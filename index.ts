// Polyfill Array.prototype.toReversed if absent
if (!('toReversed' in Array.prototype)) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function () {
      return this.slice().reverse();
    },
    configurable: true,
    writable: true,
  });
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
