const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adiciona suporte a .mjs (necessário para lucide-react-native e outros pacotes ESM)
config.resolver.sourceExts.push('mjs');

// Garante que o resolver tenta extensões CJS antes de ESM quando necessário
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
