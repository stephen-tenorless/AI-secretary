import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
// Amplify native module disabled - causes "Native module is null" error in Expo Go
// import '@aws-amplify/react-native';
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
