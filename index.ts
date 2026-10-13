import { registerRootComponent } from 'expo';

// Seguranca: em producao, silencia logs que podem conter conteudo pessoal/pastoral
// (orações, classificações, erros com payloads). Apenas console.error permanece.
if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
