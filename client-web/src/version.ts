// Version injected from package.json at build time via Vite define (__APP_VERSION__)
// Single source of truth: package.json "version" field
declare const __APP_VERSION__: string;
export const VERSION = __APP_VERSION__;
