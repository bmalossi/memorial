/**
 * Script de Automação de Versionamento Mobile
 * Em conformidade estrita com o "guia_versionamento_mobile.md":
 * - Version Name: Segue SemVer 2.0.0 (X.Y.Z) em app.json e package.json.
 * - Version Code: Inteiro estritamente crescente (versionCode no Android, buildNumber no iOS).
 *
 * Uso:
 *   node scripts/bump-version.js build  -> Incrementa apenas build/code (fase pré-lançamento)
 *   node scripts/bump-version.js patch  -> 1.0.0 -> 1.0.1 (+ build/code)
 *   node scripts/bump-version.js minor  -> 1.0.0 -> 1.1.0 (+ build/code)
 *   node scripts/bump-version.js major  -> 1.0.0 -> 2.0.0 (+ build/code)
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.resolve(__dirname, '../app.json');
const pkgJsonPath = path.resolve(__dirname, '../package.json');

const mode = (process.argv[2] || 'build').toLowerCase();

if (!['build', 'patch', 'minor', 'major'].includes(mode)) {
  console.error('Modo inválido. Use: build, patch, minor ou major');
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

const currentVersion = appJson.expo.version || '1.0.0';
const currentCode = Number(appJson.expo.android?.versionCode || 1);

let [major, minor, patch] = currentVersion.split('.').map((n) => parseInt(n, 10) || 0);
let newCode = currentCode + 1;

if (mode === 'patch') {
  patch += 1;
} else if (mode === 'minor') {
  minor += 1;
  patch = 0;
} else if (mode === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
}
// Se for 'build', mantém major.minor.patch inalterados (desenvolvimento pré-lançamento)

const newVersion = `${major}.${minor}.${patch}`;

// Atualizar app.json
appJson.expo.version = newVersion;
if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = newCode;

if (!appJson.expo.ios) appJson.expo.ios = {};
appJson.expo.ios.buildNumber = String(newCode);

// Atualizar package.json
pkgJson.version = newVersion;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

// Atualizar src/version.ts para import estático no React Native
const versionTsPath = path.resolve(__dirname, '../src/version.ts');
const versionTsContent = `/**
 * version.ts — Gerado automaticamente por scripts/bump-version.js
 * NÃO edite manualmente. Use: npm run bump:build
 */

export const APP_VERSION = '${newVersion}';
export const APP_BUILD = ${newCode};
export const APP_VERSION_LABEL = 'v${newVersion} (Build ${newCode})';
`;
fs.writeFileSync(versionTsPath, versionTsContent);

console.log('----------------------------------------------------');
console.log('🚀 Versionamento Mobile Atualizado com Sucesso:');
console.log(`   Modo:          ${mode.toUpperCase()}`);
console.log(`   Version Name:  ${currentVersion} -> ${newVersion} (SemVer)`);
console.log(`   Version Code:  ${currentCode} -> ${newCode} (Android versionCode & iOS buildNumber)`);
console.log('----------------------------------------------------');
