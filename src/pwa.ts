// Virtual module for PWA registration
// This file is imported in main.tsx to ensure PWA registration happens

import { registerSW } from 'virtual:pwa-register';

// This will be replaced by the plugin with the actual registration code
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user to refresh for new content
    if (confirm('New content available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
    // You could show a notification here if you want
  },
  immediate: true
});

export default updateSW;
