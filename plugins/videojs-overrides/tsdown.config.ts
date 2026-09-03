import { defineConfig } from "tsdown";

export default defineConfig({
  format: ["iife"],
  entry: ["src/main.ts"],
  dts: false,
  platform: 'browser',
  sourcemap: true,
  copy: { from: 'public/*', flatten: true },
  deps: {
    alwaysBundle: ['@stashapp-plugins/shared']
  }
});