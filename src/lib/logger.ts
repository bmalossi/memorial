/**
 * Utilitário seguro de logging condicional (__DEV__ only).
 * Previne vazamento de memórias, termos de oração, passagens e dados pastorais
 * em consoles nativos de produção (logcat / Console.app) e elimina overhead de I/O em runtime.
 */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger = {
  log: (...args: any[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: any[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: any[]): void => {
    if (isDev) {
      console.error(...args);
    }
  },
  info: (...args: any[]): void => {
    if (isDev) {
      console.info(...args);
    }
  },
  debug: (...args: any[]): void => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
