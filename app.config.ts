import type { ConfigContext, ExpoConfig } from 'expo/config';

// EAS Build only uploads git-tracked files. On EAS, GOOGLE_SERVICES_JSON is a
// file environment variable that holds the path to the uploaded copy.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
