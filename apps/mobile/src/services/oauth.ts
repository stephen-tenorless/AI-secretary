import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Required for web-based auth to work properly
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  error?: string;
}

// Get the appropriate Google Client ID for the platform
function getGoogleClientId(): string {
  if (Platform.OS === 'ios') {
    return GOOGLE_CLIENT_ID_IOS;
  } else if (Platform.OS === 'android') {
    return GOOGLE_CLIENT_ID_ANDROID;
  }
  return GOOGLE_CLIENT_ID_WEB;
}

// Google Sign-In using expo-auth-session
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.aisecretary.app',
    });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const request = new AuthSession.AuthRequest({
      clientId: getGoogleClientId(),
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
      const { access_token } = result.params;

      // Fetch user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const userInfo = await userInfoResponse.json();

      const user = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };

      // Store auth data
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      return { success: true, token: access_token, user };
    }

    return { success: false, error: 'Authentication cancelled or failed' };
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    return { success: false, error: err.message || 'Google sign-in failed' };
  }
}

// Apple Sign-In (iOS only)
export async function signInWithApple(): Promise<AuthResult> {
  try {
    // Apple Sign-In is only available on iOS
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Apple Sign-In is only available on iOS' };
    }

    // Note: Apple Sign-In requires native build, not available in Expo Go
    // For now, return a dev mode placeholder
    return {
      success: false,
      error: 'Apple Sign-In requires native build. Use Google Sign-In for now.',
    };
  } catch (err: any) {
    console.error('Apple sign-in error:', err);
    return { success: false, error: err.message || 'Apple sign-in failed' };
  }
}

export async function signOut(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

export async function getIdToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (err) {
    return null;
  }
}
