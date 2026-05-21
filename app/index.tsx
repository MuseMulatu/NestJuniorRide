import auth from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';
import { Redirect } from "expo-router";
import {  ActivityIndicator } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
//import analytics from '@react-native-firebase/analytics';
import inAppMessaging from '@react-native-firebase/in-app-messaging';
import { initLocalDB  } from '@/lib/localDB'; 
import { registerNotificationListeners, handleNotification } from './notificationHandler';
import * as Notifications from "expo-notifications";

const Page = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false); // To ensure we wait for auth check

  const configureNotificationChannel = async () => {
    try {
      await Notifications.setNotificationChannelAsync("urgent_notifications", {
        name: "Urgent Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "ride_request.mp3",
      vibrationPattern: [0, 200, 100, 1000, 300, 200, 100, 1000, 300],
      });

      await Notifications.setNotificationChannelAsync("happy_notifications", {
  name: "Happy Notifications",
  importance: Notifications.AndroidImportance.HIGH,
  sound: "new_follower.mp3", 
 vibrationPattern: [0, 200, 100, 600, 100, 200, 100, 200, 50],
});

      await Notifications.setNotificationChannelAsync("normal_notifications", {
  name: "Normal Notifications",
  importance: Notifications.AndroidImportance.HIGH,
  sound: "new_follower.mp3", 
 vibrationPattern: [50, 150, 100, 150],
});

    } catch (error) {

    }
  };


  // Request Notification Permission
  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {

    } else {

    }
  };

useEffect(() => {
  // Ensure notifications show and sound plays when received in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,  // ✅ Ensure alert is shown
      shouldPlaySound: true,  // ✅ Enable sound for notifications
      shouldSetBadge: false,
    }),
  });

Notifications.addNotificationReceivedListener(notification => {

   handleNotification(notification); // ✅ Process foreground notifications
});


  // Background notifications (user taps notification)
Notifications.addNotificationResponseReceivedListener(response => {

    handleNotification(response.notification);
  });

}, []);

  useEffect(() => {
 initLocalDB();
console.log(crashlytics, "crashlytics")
crashlytics().setCrashlyticsCollectionEnabled(true);
crashlytics().log('App mounted.');
//analytics().logEvent('event_name', { param: 'value' });

configureNotificationChannel();
requestPermissions();  
    // Handle initial notification if app was opened from a notification
 registerNotificationListeners();

    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        console.log('User is signed in:', user);
      } else {
        console.log('No user signed in');
        setIsSignedIn(false);
      }
      setIsAuthChecked(true); // Auth check is done
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []);


  if (!isAuthChecked) return <ActivityIndicator size="large" color="black" />; // While auth state is being checked, return null or a loading screen

  if (isSignedIn){ 
 return <Redirect href="/(root)/(tabs)/home" />;
}
return <Redirect href="/(auth)/welcome" />;
};

export default Page;
