const { withMainActivity, withAndroidStyles } = require('@expo/config-plugins');

/**
 * Expo Config Plugin para ativar o modo 100% Imersivo Sticky (Tela Cheia Nativa)
 * Oculta tanto a barra de status (notificações, relógio, bateria) quanto
 * a barra de navegação/gestos inferior, reaparecendo apenas temporariamente
 * como overlay ao deslizar a tela com os dedos e auto-ocultando em seguida.
 */
module.exports = function withImmersiveMode(config) {
  // 1. Injeta android:windowFullscreen no styles.xml
  config = withAndroidStyles(config, (modConfig) => {
    const styles = modConfig.modResults;
    const appTheme = styles.resources.style?.find((s) => s.$.name === 'AppTheme');
    if (appTheme) {
      if (!appTheme.item) appTheme.item = [];
      const hasFullscreen = appTheme.item.some((i) => i.$.name === 'android:windowFullscreen');
      if (!hasFullscreen) {
        appTheme.item.push({
          $: { name: 'android:windowFullscreen' },
          _: 'true',
        });
      }
    }
    return modConfig;
  });

  // 2. Injeta WindowCompat e BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE no MainActivity.kt
  config = withMainActivity(config, (modConfig) => {
    let content = modConfig.modResults.contents;

    // Adiciona imports se não existirem
    if (!content.includes('import androidx.core.view.WindowCompat')) {
      content = content.replace(
        /package\s+[\w\.]+/,
        (match) => `${match}\nimport androidx.core.view.WindowCompat\nimport androidx.core.view.WindowInsetsCompat\nimport androidx.core.view.WindowInsetsControllerCompat`
      );
    }

    // Injeta chamada hideSystemBars() no onCreate e o método na classe
    if (!content.includes('hideSystemBars()')) {
      const helperMethods = `
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      hideSystemBars()
    }
  }

  private fun hideSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
    windowInsetsController.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
  }
`;
      // Insere hideSystemBars() no onCreate
      content = content.replace(
        'super.onCreate(null)',
        'super.onCreate(null)\n    hideSystemBars()'
      );

      // Insere os métodos auxiliares antes do fechamento da classe
      const lastBraceIndex = content.lastIndexOf('}');
      content = content.substring(0, lastBraceIndex) + helperMethods + '\n}\n';
    }

    modConfig.modResults.contents = content;
    return modConfig;
  });

  return config;
};
