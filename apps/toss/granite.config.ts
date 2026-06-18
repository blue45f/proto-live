import { defineConfig } from '@apps-in-toss/web-framework/config'

// 투자 기능 제외, 프로토타입 평가/피드백 특화 미니앱. 비게임=partner.
export default defineConfig({
  appName: 'proto-live',
  brand: {
    displayName: '프로토라이브',
    primaryColor: '#7BDCB5',
    icon: '',
  },
  web: { host: 'localhost', port: 5182, commands: { dev: 'vite', build: 'vite build' } },
  permissions: [
    { name: 'clipboard', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  outdir: 'dist',
  webViewProps: { type: 'partner' },
  navigationBar: { withBackButton: true, withHomeButton: true },
})
