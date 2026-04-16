import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AI Secretary',
  slug: 'ai-secretary',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#1E1B4B',
    resizeMode: 'contain',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.aisecretary.app',
    infoPlist: {
      UIBackgroundModes: ['remote-notification', 'fetch'],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#1E1B4B',
    },
    package: 'com.aisecretary.app',
    permissions: ['NOTIFICATIONS', 'INTERNET'],
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './src/assets/notification-icon.png',
        color: '#6366F1',
      },
    ],
  ],
  extra: {
    apiUrl:
      process.env.API_URL ||
      'https://vqqp2yoa4h.execute-api.us-east-1.amazonaws.com/prod',
    cognitoUserPoolId: 'us-east-1_Uw5riBKhs',
    cognitoClientId: '29uv5nv5rn5d9hks1iq790japm',
    eas: {
      projectId: 'your-eas-project-id',
    },
  },
});
