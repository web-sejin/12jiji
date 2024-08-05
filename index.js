import {AppRegistry, Text, TextInput} from 'react-native';
import App from './App';
import messaging from '@react-native-firebase/messaging';
import {name as appName} from './app.json';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
});

async function requestUserPermission() {
    const settings = await messaging().requestPermission();

    if (settings) {
        //console.log('Permission settings:', settings);
    }
}

requestUserPermission();

AppRegistry.registerComponent(appName, () => App);
