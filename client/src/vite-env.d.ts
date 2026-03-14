/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LAST_UPDATED: string; // For privacy policy and terms of service last updated date
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}
