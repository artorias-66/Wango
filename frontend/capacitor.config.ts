import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wango.app',
  appName: 'Wango',
  webDir: 'dist',
  // On Android emulator, 10.0.2.2 routes to host machine's localhost
  // On a physical device, replace with your LAN IP: http://192.168.1.3:3001
  server: {
    // Remove this block entirely when deploying to production with a real URL
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true, // Required for http:// in dev (remove in prod)
  },
  plugins: {
    Geolocation: {
      // Android permissions are declared in AndroidManifest.xml automatically
    },
  },
};

export default config;
