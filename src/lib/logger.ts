/**
 * Utilitário seguro de logging condicional (__DEV__ only).
 * Previne vazamento de memórias, termos de oração, passagens e dados pastorais
 * em consoles nativos de produção (logcat / Console.app) e elimina overhead de I/O em runtime.
 */
export const logger = {
  log: (...args: any[]): void => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  warn: (...args: any[]): void => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: any[]): void => {
    if (__DEV__) {
      console.error(...args);
    }
  },
  info: (...args: any[]): void => {
    if (__DEV__) {
      console.info(...args);
    }
  },
  debug: (...args: any[]): void => {
    if (__DEV__) {
      console.debug(...args);
    }
  },
};
