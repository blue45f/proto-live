import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "proto-live",
  brand: {
    primaryColor: "#7BDCB5",
  },
  permissions: [
    { name: 'clipboard', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  webView: {},
  webBundleDir: "dist",
  navigationBar: { withBackButton: true, withHomeButton: true },
});
