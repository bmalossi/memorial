/**
 * Patch para o expo-notifications no Expo SDK 53+.
 *
 * No SDK 53+, a equipe do Expo removeu os módulos nativos de Push Remoto (FCM) do Expo Go no Android:
 * - ExpoTopicSubscriptionModule
 * - ExpoPushTokenManager
 * - NotificationsServerRegistrationModule
 * E incluiu um `throw new Error(...)` na inicialização do pacote.
 *
 * Este script garante que o app funcione perfeitamente no Expo Go (para lembretes locais agendados e desenvolvimento)
 * sem travar na tela vermelha por falta desses módulos remotos.
 */
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../node_modules/expo-notifications/build');

// 1. warnOfExpoGoPushUsage.js
const warnFile = path.join(baseDir, 'warnOfExpoGoPushUsage.js');
if (fs.existsSync(warnFile)) {
  let content = fs.readFileSync(warnFile, 'utf8');
  if (content.includes("if (Platform.OS === 'android')")) {
    content = content.replace(
      /if \(Platform\.OS === 'android'\) \{\s*throw new Error\(message\);\s*\}\s*else if \(__DEV__\) \{/g,
      'if (__DEV__) {'
    );
    fs.writeFileSync(warnFile, content, 'utf8');
    console.log('[patch-expo-notifications] Sucesso: patched warnOfExpoGoPushUsage.js.');
  }
}

// 2. TopicSubscriptionModule.android.js
const topicFile = path.join(baseDir, 'TopicSubscriptionModule.android.js');
if (fs.existsSync(topicFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
const nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
export default nativeModule ?? {
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
    subscribeToTopicAsync: () => Promise.resolve(null),
    unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
`;
  fs.writeFileSync(topicFile, content, 'utf8');
  console.log('[patch-expo-notifications] Sucesso: patched TopicSubscriptionModule.android.js.');
}

// 3. PushTokenManager.native.js
const pushTokenFile = path.join(baseDir, 'PushTokenManager.native.js');
if (fs.existsSync(pushTokenFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
const nativeModule = requireOptionalNativeModule('ExpoPushTokenManager');
export default nativeModule ?? {
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
    getDevicePushTokenAsync: () => Promise.resolve(null),
};
`;
  fs.writeFileSync(pushTokenFile, content, 'utf8');
  console.log('[patch-expo-notifications] Sucesso: patched PushTokenManager.native.js.');
}

// 4. ServerRegistrationModule.native.js
const serverRegFile = path.join(baseDir, 'ServerRegistrationModule.native.js');
if (fs.existsSync(serverRegFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
const nativeModule = requireOptionalNativeModule('NotificationsServerRegistrationModule');
export default nativeModule ?? {
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
    getRegistrationInfoAsync: () => Promise.resolve(null),
    setRegistrationInfoAsync: () => Promise.resolve(null),
};
`;
  fs.writeFileSync(serverRegFile, content, 'utf8');
  console.log('[patch-expo-notifications] Sucesso: patched ServerRegistrationModule.native.js.');
}

console.log('[patch-expo-notifications] Todos os patches foram aplicados com sucesso.');
