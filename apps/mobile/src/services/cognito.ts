import AsyncStorage from '@react-native-async-storage/async-storage';

// DEV MODE: Skip Amplify auth due to native module issues in Expo
// Set to false to enable real Cognito authentication (requires native build)
const DEV_MODE_SKIP_AUTH = true;

// Storage key for dev mode token
const DEV_TOKEN_KEY = 'dev_auth_token';

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

// Generate a simple dev token
function generateDevToken(email: string): string {
  return `dev-token-${email}-${Date.now()}`;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (DEV_MODE_SKIP_AUTH) {
    console.log('[DEV MODE] Bypassing Cognito auth for:', email);
    // In dev mode, accept any non-empty credentials
    if (email && password) {
      const token = generateDevToken(email);
      await AsyncStorage.setItem(DEV_TOKEN_KEY, token);
      return { success: true, token };
    }
    return { success: false, error: 'Email and password required' };
  }

  // Real Cognito auth would go here when DEV_MODE_SKIP_AUTH is false
  // For now, return error since native modules aren't available
  return { success: false, error: 'Cognito auth requires native build. Enable DEV_MODE_SKIP_AUTH for testing.' };
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
  if (DEV_MODE_SKIP_AUTH) {
    console.log('[DEV MODE] Bypassing Cognito signup for:', email);
    // In dev mode, simulate successful signup and auto-sign-in
    if (email && password && name) {
      const token = generateDevToken(email);
      await AsyncStorage.setItem(DEV_TOKEN_KEY, token);
      return { success: true, token };
    }
    return { success: false, error: 'All fields required' };
  }

  return { success: false, error: 'Cognito auth requires native build. Enable DEV_MODE_SKIP_AUTH for testing.' };
}

export async function signOut(): Promise<void> {
  if (DEV_MODE_SKIP_AUTH) {
    console.log('[DEV MODE] Signing out');
    await AsyncStorage.removeItem(DEV_TOKEN_KEY);
    return;
  }
}

export async function getIdToken(): Promise<string | null> {
  if (DEV_MODE_SKIP_AUTH) {
    return AsyncStorage.getItem(DEV_TOKEN_KEY);
  }
  return null;
}
