/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly GMAIL_USER: string;
  readonly GMAIL_APP_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}