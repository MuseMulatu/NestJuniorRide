import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { create } from 'zustand';
import auth from '@react-native-firebase/auth';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { Stack, useRouter } from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const router = useRouter();
  const user = auth()?.currentUser;
      const [ fontsLoaded, error] = useFonts({
    'mon': require('../assets/fonts/Montserrat-Regular.ttf'),
    'mon-sb': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    'mon-b': require('../assets/fonts/Montserrat-Bold.ttf'),
    
    "Jakarta-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Jakarta-ExtraBold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "Jakarta-ExtraLight": require("../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Jakarta-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "Jakarta-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    'Jakarta': require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Jakarta-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),

    'hiwua': require("../assets/fonts/hiwua.ttf"),

    'zelan': require("../assets/fonts/zelan.ttf"),

    'yigezubisratgothic': require("../assets/fonts/yigezubisratgothic.ttf")

  });

    // useURL is deprecated in favor of the event listener, but we can keep it for the initial link
    const url = Linking.useURL();

    // --- REWRITTEN FUNCTION ---
    const handleDeepLink = (incomingUrl) => {
        console.log('Handling Incoming URL:', incomingUrl);
        if (!incomingUrl) return;
      const user = auth()?.currentUser;
      if(!user){
        router.replace('/(auth)/register');
        return
      }
        // Use Linking.parse to break the URL into parts
        const { path } = Linking.parse(incomingUrl);
        if (!path) return;

        // Try to match against different content types
        const postMatch = path.match(/posts\/([^/]+)/);
        const profileMatch = path.match(/profiles\/([^/]+)/);
        const livestreamMatch = path.match(/livestreams\/([^/]+)/);
        const jobMatch = path.match(/jobs\/([^/]+)/);

        if (postMatch && postMatch[1]) {
            const postId = postMatch[1];
            console.log(`Matched post with ID: ${postId}`);
            // Navigate to the post detail screen
            router.push({
                pathname: '/(root)/post-detail',
                params: { postId: postId },
            });
        } else if (profileMatch && profileMatch[1]) {
            const userId = profileMatch[1];
            console.log(`Matched profile with ID: ${userId}`);
            // Navigate to the profile detail screen
            router.push({
                pathname: '/(root)/profile-detail',
                params: { userId: userId, is_anonymous: false },
            });
        } else if (livestreamMatch && livestreamMatch[1]) {
            const streamId = livestreamMatch[1];
            console.log(`Matched livestream with ID: ${streamId}`);
            // Navigate to the livestream spectator view
            router.push({
                pathname: '/game-rooms/SpectatorViewScreen',
                params: { streamId: streamId, role: 'viewer-realtime' },
            });
        } else if (jobMatch && jobMatch[1]) {
            const jobId = jobMatch[1];
            console.log(`Matched job with ID: ${jobId}`);
            // Navigate to the job detail screen
            router.push({
                pathname: '/(root)/jobs/JobDetailScreen',
                params: { jobId: jobId },
            });
        }
    };

    useEffect(() => {
         if (!fontsLoaded) {
      return;
    }
        // 1. Handle initial URL that opened the app
        if (url) {
          console.log("urls", url)
            handleDeepLink(url);
        }
        // 2. Listen for future URLs that are opened while the app is running
        const subscription = Linking.addEventListener('url', (event) => {
            handleDeepLink(event.url);
        });

        // Clean up the listener when the component unmounts
        return () => {
            subscription.remove();
        };
    }, [url]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(root)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
      <Stack.Screen name="game-rooms/LiveStream" options={{ headerShown: false }} />
      <Stack.Screen name="game-rooms/SpectatorViewScreen" options={{ headerShown: false }} />
        </Stack>
      </GestureHandlerRootView>
  );
}