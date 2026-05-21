import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Image, Dimensions, Animated } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Video } from 'expo-av'; // Import Video from expo-av
import { usePhoneNumberStore } from "@/store";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Colors and Mock Data (No Changes) ---
const Colors = {
  primaryOrange: "#FF8C00",
  secondaryTeal: "#0FB1BB",
  textDark: "#1A202C",
  textMedium: "#4A5568",
  textLight: "#718096",
  backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC",
  borderLight: "#E2E8F0",
  successGreen: "#22C55E",
  warningRed: "#EF4444",
  liveRed: "#FF0000",
  overlayDark: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(255,255,255,0.2)',
  goldStar: '#FFD700',
};

const MOCK_LEADERBOARD = [
  { userId: '1', username: 'Bella', value: 34999 },
  { userId: '2', username: 'Jossy', value: 2500 },
  { userId: '3', username: 'Tigist', value: 1000 },
];

const MOCK_HOST_NAME = 'Lidu';
const MOCK_VIEWER_COUNT = 1893;

const MOCK_CHAT_MESSAGES = [
    { username: 'Muse', message: 'ሊዱ ዛሬ አልተቻልሽም! 🔥' },
    { username: 'ቤላ', message: 'ሊዱዬ ይገባሻል!!! 🦁🖤' },
    { username: 'Betty', message: 'This is the best live I have seen all week!' },
    { username: 'Abel', message: '❤️❤️❤️😂😂 ' },
    { username: 'Sara', message: 'OMG Bella is going crazy!' },
    { username: 'Jossy', message: 'Wow! እንዴት ያለ ስጦታ ነው።! 👑' },
    { username: 'Helen', message: 'That Black Lion is majestic!' },
    { username: 'Natty', message: 'ለዚህ ነው እኛ ምንደግፍሽ!' },
];

const GIFT_NAME = 'ጥቁር አንበሳ';
const GIFT_SENDER = 'Bella';

const ScreenshotMockup = () => {
  const [chats, setChats] = useState([]);
  const [giftVisible, setGiftVisible] = useState(false);
  const giftAnimation = new Animated.Value(0);
  const {profileImageUrl} = usePhoneNumberStore()

  // --- NEW: Create a ref for the gift video to control it ---
  const giftVideoRef = useRef(null);
  
  // Mock host avatar image (you can replace this with a real one)
  const hostAvatarUrl = 'https://i.pravatar.cc/150?u=lidu';


  // --- DYNAMIC CHAT & GIFT SIMULATION (Updated to play video) ---
  useEffect(() => {
    const chatInterval = setInterval(() => {
      setChats(prevChats => {
        const nextChatIndex = prevChats.length % MOCK_CHAT_MESSAGES.length;
        return [...prevChats, MOCK_CHAT_MESSAGES[nextChatIndex]];
      });
    }, 1000);

    const giftTimeout = setTimeout(() => {
      setGiftVisible(true);
      
      // --- NEW: Play the gift video from the start ---
      giftVideoRef.current?.replayAsync();

      Animated.sequence([
        Animated.timing(giftAnimation, { toValue: 1, duration: 10000, useNativeDriver: true }),
        Animated.delay(3000), // How long the gift stays on screen
        Animated.timing(giftAnimation, { toValue: 0, duration: 10000, useNativeDriver: true }),
      ]).start(() => setGiftVisible(false));
    }, 9000);

    return () => {
      clearInterval(chatInterval);
      clearTimeout(giftTimeout);
    };
  }, []);//

  const giftAnimationStyle = {
    opacity: giftAnimation,
    transform: [
      {
        scale: giftAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* --- NEW: Replaced creator Image with a looping Video background --- */}
      <Video
        source={require('../../assets/creator-live.mp4')} // <-- PLACE YOUR CREATOR VIDEO HERE
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        shouldPlay
        isLooping
        isMuted // Background video should be muted
      />
      
      <View style={styles.gradientOverlayTop} />
      <View style={styles.gradientOverlayBottom} />

      {/* --- Top UI Elements (No Changes) --- */}
      <View style={styles.topContainer}>
        <View style={styles.hostInfo}>
          <Image source={{ uri: profileImageUrl }} style={styles.hostAvatar} />
          <View>
            <Text style={styles.hostName}>{MOCK_HOST_NAME}</Text>
            <View style={styles.liveStatusBadge}>
               <View style={styles.liveDot} />
               <Text style={styles.liveStatusText}>LIVE</Text>
            </View>
          </View>
        </View>
        <View style={styles.topControls}>
          <View style={styles.viewersContainer}>
            <Ionicons name="eye-outline" size={16} color={Colors.backgroundWhite} />
            <Text style={styles.viewersText}>{MOCK_VIEWER_COUNT.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.backgroundWhite} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.leaderboardContainer}>
         <Ionicons name="podium" size={20} color={Colors.goldStar} style={{marginRight: 8}}/>
         {MOCK_LEADERBOARD.map((item, index) => (
            <View key={item.userId} style={styles.leaderboardItem}>
              <Text style={styles.leaderboardRank}>{index + 1}.</Text>
              <Text style={styles.leaderboardName}>{item.username}</Text>
            </View>
         ))}
      </View>


      {/* --- UPDATED: GIFT ANIMATION now uses Video --- */}
      {giftVisible && (
        <Animated.View style={[styles.giftAnimationContainer]}>
          <Text style={styles.giftSenderText}>1x {GIFT_SENDER} sent a</Text>
          {/* --- NEW: Replaced gift Image with a Video component --- */}
          <Video
            ref={giftVideoRef}
            source={require('../../assets/black-lion-gift.mp4')} // <-- PLACE YOUR GIFT VIDEO HERE
            style={styles.giftAnimationVideo}
            resizeMode="contain"
            shouldPlay={false} // We control playback manually
            isMuted={false} // Gift videos should have sound
          />
          <Text style={styles.giftAnimationText}>✨ 45,000 ኮይን 🌕</Text>
        </Animated.View>
      )}

      {/* --- Bottom UI Elements (No Changes) --- */}
      <View style={styles.bottomContainer}>
        <FlatList
            data={chats}
            renderItem={({ item }) => (
                <View style={styles.chatItem}>
                    <Text style={styles.chatUsername}>{item.username}: <Text style={styles.chatMessage}>{item.message}</Text></Text>
                </View>
            )}
            keyExtractor={(item, index) => index.toString()}
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
        />
        <View style={styles.chatInputContainer}>
          <TextInput style={styles.chatInput} placeholder="Add a comment..." placeholderTextColor={Colors.textLight} />
          <TouchableOpacity onPress={() => { setGiftVisible(!giftVisible); }} style={styles.giftButton}>
            <Ionicons name="gift" size={28} color={Colors.backgroundWhite} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    gradientOverlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: screenHeight * 0.25, backgroundColor: 'rgba(0,0,0,0.6)', },
    gradientOverlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: screenHeight * 0.35, backgroundColor: 'rgba(0,0,0,0.6)', },

    topContainer: {
        marginTop: 50,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hostInfo: { flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: Colors.overlayDark, borderRadius: 50 },
    hostAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: Colors.secondaryTeal, marginRight: 8 },
    hostName: { color: Colors.backgroundWhite, fontSize: 16, fontWeight: 'bold' },
    liveStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.liveRed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.backgroundWhite, marginRight: 4 },
    liveStatusText: { color: Colors.backgroundWhite, fontSize: 10, fontWeight: 'bold' },
    
    topControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    viewersContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.overlayDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    viewersText: { color: Colors.backgroundWhite, fontSize: 14, fontWeight: '600', marginLeft: 5 },
    closeButton: { backgroundColor: Colors.overlayLight, padding: 6, borderRadius: 20 },
    
    leaderboardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.overlayDark,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 15,
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    leaderboardItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
    leaderboardRank: { color: Colors.goldStar, fontWeight: 'bold', fontSize: 14, marginRight: 4 },
    leaderboardName: { color: Colors.backgroundWhite, fontWeight: '600', fontSize: 14 },
    
    giftAnimationContainer: {
        position: 'absolute',
        top: screenHeight / 2 - 150,
        alignSelf: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    giftSenderText: {
              position: 'absolute',
        top: screenHeight / 2 - 360,
        color: Colors.backgroundWhite,
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    // --- NEW: Style for the Gift Video ---
    giftAnimationVideo: {
        width: 400,
        height: 400,
   //     marginVertical: 10,
    },
    giftAnimationText: {
        position: 'absolute',
        top: screenHeight / 2 - 130,
        color: Colors.goldStar,
        fontSize: 28,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    
    bottomContainer: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        right: 15,
        height: screenHeight * 0.3,
    },
    chatList: { flex: 1, marginBottom: 10 },
    chatItem: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 8,
        alignSelf: 'flex-start',
        maxWidth: '80%',
    },
    chatUsername: {
        color: Colors.secondaryTeal,
        fontWeight: 'bold',
        fontSize: 14,
    },
    chatMessage: {
        color: Colors.backgroundWhite,
        fontWeight: 'normal',
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatInput: {
        flex: 1,
        backgroundColor: Colors.overlayDark,
        color: Colors.backgroundWhite,
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        fontSize: 15,
        marginRight: 10,
    },
    giftButton: {
        backgroundColor: Colors.primaryOrange,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ScreenshotMockup;

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Image, Dimensions, Animated } from 'react-native';
// import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// import { Stack } from 'expo-router';
// import { Video } from 'expo-av'; // Import Video from expo-av

// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// const Colors = {
//   primaryOrange: "#FF8C00",
//   secondaryTeal: "#0FB1BB",
//   textDark: "#1A202C",
//   textMedium: "#4A5568",
//   textLight: "#718096",
//   backgroundWhite: "#FFFFFF",
//   backgroundLightGray: "#F7FAFC",
//   borderLight: "#E2E8F0",
//   successGreen: "#22C55E",
//   warningRed: "#EF4444",
//   liveRed: "#FF0000",
//   overlayDark: 'rgba(0,0,0,0.6)',
//   overlayLight: 'rgba(255,255,255,0.2)',
//   goldStar: '#FFD700',
// };

// // --- ENHANCED MOCK DATA ---
// const MOCK_LEADERBOARD = [
//   { userId: '1', username: 'ቤላ', value: 34999 },
//   { userId: '2', username: 'Jossy', value: 2500 },
//   { userId: '3', username: 'ትግስት', value: 1000 },
// ];

// const MOCK_HOST_NAME = 'Lidu';
// const MOCK_VIEWER_COUNT = 1893;

// const MOCK_CHAT_MESSAGES = [
//     { username: 'Muse', message: 'Lidu you are on fire tonight! 🔥' },
//     { username: 'ቤላ', message: 'ሊዱዬ ይገባሻል!!! 🦁🖤' },
//     { username: 'Betty', message: 'This is the best live I have seen all week!' },
//     { username: 'Abel', message: '😂😂😂' },
//     { username: 'Sara', message: 'OMG Bella is going crazy!' },
//     { username: 'Jossy', message: 'Wow! What a gift! 👑' },
//     { username: 'Helen', message: 'That Black Lion is majestic!' },
//     { username: 'Natty', message: 'This is why we support you!' },
// ];

// const GIFT_IMAGE_URL = 'https://share-rides.com/wp-content/uploads/2025/08/0a4d785f3b7dca6ccaee85b452288e45-removebg-preview.png';
// const GIFT_NAME = 'ጥቁር አንበሳ';
// const GIFT_SENDER = 'Bella';

// const ScreenshotMockup = () => {
//   const [chats, setChats] = useState([]);
//   const [giftVisible, setGiftVisible] = useState(false);
//   const giftAnimation = new Animated.Value(0);

//   // The excited creator's image
//   const creatorImageUrl = 'https://share-rides.com/wp-content/uploads/2025/08/Excited-Expression-in-Soft-Lighting.png';
//   // Mock host avatar image (you can replace this with a real one)
//   const hostAvatarUrl = 'https://i.pravatar.cc/150?u=lidu';


//   // --- DYNAMIC CHAT & GIFT SIMULATION ---
//   useEffect(() => {
//     // Simulate incoming chats
//     const chatInterval = setInterval(() => {
//       setChats(prevChats => {
//         const nextChatIndex = prevChats.length % MOCK_CHAT_MESSAGES.length;
//         return [...prevChats, MOCK_CHAT_MESSAGES[nextChatIndex]];
//       });
//     }, 1500); // New chat every 1.5 seconds

//     // Trigger the gift animation after a few chats
//     const giftTimeout = setTimeout(() => {
//       setGiftVisible(true);
//       Animated.sequence([
//         Animated.timing(giftAnimation, { toValue: 1, duration: 500, useNativeDriver: true }),
//         Animated.delay(3000),
//         Animated.timing(giftAnimation, { toValue: 0, duration: 500, useNativeDriver: true }),
//       ]).start(() => setGiftVisible(false));
//     }, 4000); // Gift appears after 4 seconds

//     return () => {
//       clearInterval(chatInterval);
//       clearTimeout(giftTimeout);
//     };
//   }, []);

//   const giftAnimationStyle = {
//     opacity: giftAnimation,
//     transform: [
//       {
//         scale: giftAnimation.interpolate({
//           inputRange: [0, 1],
//           outputRange: [0.5, 1],
//         }),
//       },
//     ],
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <Stack.Screen options={{ headerShown: false }} />

//       <Image
//         source={{ uri: creatorImageUrl }}
//         style={StyleSheet.absoluteFillObject}
//         resizeMode="cover"
//       />
      
//       <View style={styles.gradientOverlayTop} />
//       <View style={styles.gradientOverlayBottom} />

//       {/* --- Top UI Elements --- */}
//       <View style={styles.topContainer}>
//         <View style={styles.hostInfo}>
//           <Image source={{ uri: hostAvatarUrl }} style={styles.hostAvatar} />
//           <View>
//             <Text style={styles.hostName}>{MOCK_HOST_NAME}</Text>
//             <View style={styles.liveStatusBadge}>
//                <View style={styles.liveDot} />
//                <Text style={styles.liveStatusText}>LIVE</Text>
//             </View>
//           </View>
//         </View>
//         <View style={styles.topControls}>
//           <View style={styles.viewersContainer}>
//             <Ionicons name="eye-outline" size={16} color={Colors.backgroundWhite} />
//             <Text style={styles.viewersText}>{MOCK_VIEWER_COUNT.toLocaleString()}</Text>
//           </View>
//           <TouchableOpacity style={styles.closeButton}>
//             <Ionicons name="close" size={24} color={Colors.backgroundWhite} />
//           </TouchableOpacity>
//         </View>
//       </View>
      
//       {/* --- Leaderboard --- */}
//       <View style={styles.leaderboardContainer}>
//          <Ionicons name="podium" size={20} color={Colors.goldStar} style={{marginRight: 8}}/>
//          {MOCK_LEADERBOARD.map((item, index) => (
//             <View key={item.userId} style={styles.leaderboardItem}>
//               <Text style={styles.leaderboardRank}>{index + 1}.</Text>
//               <Text style={styles.leaderboardName}>{item.username}</Text>
//             </View>
//          ))}
//       </View>


//       {/* --- GIFT ANIMATION --- */}
//       {giftVisible && (
//         <Animated.View style={[styles.giftAnimationContainer]}>
//           <Text style={styles.giftSenderText}>{GIFT_SENDER} sent a</Text>
//           <Image
//             source={{ uri: GIFT_IMAGE_URL }}
//             style={styles.giftAnimationImage}
//           />
//           <Text style={styles.giftAnimationText}>🦁 {GIFT_NAME} 🦁</Text>
//         </Animated.View>
//       )}

//       {/* --- Bottom UI Elements --- */}
//       <View style={styles.bottomContainer}>
//         <FlatList
//             data={chats}
//             renderItem={({ item }) => (
//                 <View style={styles.chatItem}>
//                     <Text style={styles.chatUsername}>{item.username}: <Text style={styles.chatMessage}>{item.message}</Text></Text>
//                 </View>
//             )}
//             keyExtractor={(item, index) => index.toString()}
//             style={styles.chatList}
//             showsVerticalScrollIndicator={false}
//         />
//         <View style={styles.chatInputContainer}>
//           <TextInput style={styles.chatInput} placeholder="Add a comment..." placeholderTextColor={Colors.textLight} />
//           <TouchableOpacity onPress={() => { setGiftVisible(true); }} style={styles.giftButton}>
//             <Ionicons name="gift" size={28} color={Colors.backgroundWhite} />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: 'black' },
//     gradientOverlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: screenHeight * 0.25, backgroundColor: 'rgba(0,0,0,0.6)', },
//     gradientOverlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: screenHeight * 0.35, backgroundColor: 'rgba(0,0,0,0.6)', },

//     topContainer: {
//         marginTop: 50,
//         paddingHorizontal: 15,
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     hostInfo: { flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: Colors.overlayDark, borderRadius: 50 },
//     hostAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: Colors.secondaryTeal, marginRight: 8 },
//     hostName: { color: Colors.backgroundWhite, fontSize: 16, fontWeight: 'bold' },
//     liveStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.liveRed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
//     liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.backgroundWhite, marginRight: 4 },
//     liveStatusText: { color: Colors.backgroundWhite, fontSize: 10, fontWeight: 'bold' },
    
//     topControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//     viewersContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.overlayDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
//     viewersText: { color: Colors.backgroundWhite, fontSize: 14, fontWeight: '600', marginLeft: 5 },
//     closeButton: { backgroundColor: Colors.overlayLight, padding: 6, borderRadius: 20 },
    
//     leaderboardContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: Colors.overlayDark,
//         paddingHorizontal: 12,
//         paddingVertical: 8,
//         borderRadius: 20,
//         marginHorizontal: 15,
//         marginTop: 10,
//         alignSelf: 'flex-start',
//     },
//     leaderboardItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
//     leaderboardRank: { color: Colors.goldStar, fontWeight: 'bold', fontSize: 14, marginRight: 4 },
//     leaderboardName: { color: Colors.backgroundWhite, fontWeight: '600', fontSize: 14 },
    
//     giftAnimationContainer: {
//         position: 'absolute',
//         top: 150,
//         alignSelf: 'center',
//         alignItems: 'center',
//         zIndex: 100,
//     },
//     giftSenderText: {
//         color: Colors.backgroundWhite,
//         fontSize: 20,
//         fontWeight: 'bold',
//         textShadowColor: 'rgba(0, 0, 0, 0.75)',
//         textShadowOffset: { width: 0, height: 2 },
//         textShadowRadius: 10,
//     },
//     giftAnimationImage: {
//         width: 200,
//         height: 200,
//         resizeMode: 'contain',
//         marginVertical: 10,
//     },
//     giftAnimationText: {
//         color: Colors.goldStar,
//         fontSize: 28,
//         fontWeight: 'bold',
//         textShadowColor: 'rgba(0, 0, 0, 0.75)',
//         textShadowOffset: { width: 0, height: 2 },
//         textShadowRadius: 10,
//     },
    
//     bottomContainer: {
//         position: 'absolute',
//         bottom: 15,
//         left: 15,
//         right: 15,
//         height: screenHeight * 0.3,
//     },
//     chatList: { flex: 1, marginBottom: 10 },
//     chatItem: {
//         backgroundColor: 'rgba(0,0,0,0.3)',
//         paddingVertical: 8,
//         paddingHorizontal: 12,
//         borderRadius: 20,
//         marginBottom: 8,
//         alignSelf: 'flex-start',
//         maxWidth: '80%',
//     },
//     chatUsername: {
//         color: Colors.secondaryTeal,
//         fontWeight: 'bold',
//         fontSize: 14,
//     },
//     chatMessage: {
//         color: Colors.backgroundWhite,
//         fontWeight: 'normal',
//     },
//     chatInputContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     chatInput: {
//         flex: 1,
//         backgroundColor: Colors.overlayDark,
//         color: Colors.backgroundWhite,
//         borderRadius: 25,
//         paddingHorizontal: 15,
//         height: 50,
//         fontSize: 15,
//         marginRight: 10,
//     },
//     giftButton: {
//         backgroundColor: Colors.primaryOrange,
//         width: 50,
//         height: 50,
//         borderRadius: 25,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
// });

// export default ScreenshotMockup;








// import React from 'react';
// import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Image, Dimensions } from 'react-native';
// import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
// import { usePhoneNumberStore } from "@/store";
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// const Colors = {
//   primaryOrange: "#FF8C00",
//   secondaryTeal: "#0FB1BB",
//   textDark: "#1A202C",
//   textMedium: "#4A5568",
//   textLight: "#718096",
//   backgroundWhite: "#FFFFFF",
//   backgroundLightGray: "#F7FAFC",
//   borderLight: "#E2E8F0",
//   successGreen: "#22C55E",
//   warningRed: "#EF4444",
//   liveRed: "#FF0000",
//   overlayDark: 'rgba(0,0,0,0.6)',
//   overlayLight: 'rgba(255,255,255,0.2)',
//   goldStar: '#FFD700',
// };

// // Mock Data for the screenshot
// const MOCK_VIEWERS = [
//   { id: '1', username: 'Lemi' },
//   { id: '2', username: 'Abebe' },
//   { id: '3', username: 'Tigist' },
//   { id: '4', username: 'Selam' },
//   { id: '5', username: 'Bilen' },
//   { id: '6', username: 'Fitsum' },
//   { id: '7', username: 'Hana' },
//   { id: '8', username: 'Birhanu' },
//   { id: '9', username: 'Sara' },
//   { id: '10', username: 'Yonas' },
//   { id: '11', username: 'Almaz' },
// ];

// const MOCK_LEADERBOARD = [
//   { userId: '1', username: 'Bella', value: 34000 },
//   { userId: '2', username: 'Jossy', value: 2500 },
//   { userId: '3', username: 'Tigist', value: 1000 },
//   { userId: '4', username: 'Selam', value: 800 },
// ];

// const MOCK_HOST_NAME = 'Lidu';

// const GIFT_IMAGE_URL = 'https://share-rides.com/wp-content/uploads/2025/08/0a4d785f3b7dca6ccaee85b452288e45-removebg-preview.png'
// const GIFT_NAME = 'ጥቁር አንበሳ';

// const ScreenshotMockup = () => {
//   const {profileImageUrl} = usePhoneNumberStore()
//   // The excited creator's image
//   const creatorImageUrl = 'https://share-rides.com/wp-content/uploads/2025/08/Excited-Expression-in-Soft-Lighting.png';

//   return (
//     <SafeAreaView style={styles.container}>
//           <Stack.Screen options={{ headerShown: false }} />

//       <Image
//         source={{ uri: creatorImageUrl }}
//         style={StyleSheet.absoluteFillObject}
//         resizeMode="cover"
//       />

//       {/* Top Overlay */}
//       <View style={styles.topOverlay}>
//         <View style={styles.hostInfo}>
//           <Image source={{ uri: profileImageUrl }} style={styles.hostAvatar} />
//           <View>
//             <Text style={styles.hostName}>{MOCK_HOST_NAME}</Text>
//             <View style={styles.liveStatusBadge}>
//               <MaterialIcons name="fiber-manual-record" size={12} color={Colors.backgroundLightGray} />
//               <Text style={styles.liveStatusText}>LIVE</Text>
//             </View>
//           </View>
//         </View>
//         <View style={styles.topControls}>
//           <View style={styles.leaderboardContainer}>
//             <Text style={styles.leaderboardTitle}>Top Viewers:</Text>
//             <FlatList
//               data={MOCK_LEADERBOARD.slice(0, 3)}
//               keyExtractor={(item) => item.userId}
//               renderItem={({ item }) => (
//                 <Text style={styles.leaderboardName}>{item.username} 🎖️{item.value}</Text>
//               )}
//               horizontal
//               showsHorizontalScrollIndicator={false}
//             />
//           </View>
//           <TouchableOpacity style={styles.closeButton}>
//             <Ionicons name="close" size={24} color={Colors.backgroundWhite} />
//           </TouchableOpacity>
//         </View>
//       </View>

//         <View style={styles.viewersContainer}>
//       <Ionicons name="eye" size={24} color={Colors.backgroundWhite} />
//           <Text style={styles.viewersTitle}>  189 Viewers </Text>

//         </View>

//       <View style={styles.giftAnimationContainer}>
//         <Image
//           source={{ uri: GIFT_IMAGE_URL }}
//           style={styles.giftAnimationImage}
//         />
//       </View>
// <View style={styles.giftAnimationTextContainer}>
// <Text style={styles.giftAnimationText}>🦁 {GIFT_NAME}</Text>
//  <Text style={styles.giftAnimationText2}>1x sent by Bella!</Text>
// </View>
//       <View style={styles.bottomOverlay}>
//         <View style={styles.chatContainer}>
// <View style={styles.chatList}>
//               <View style={styles.chatItem}>
//                 <Text style={styles.chatUsername}>Muse:</Text>
//                 <Text style={styles.chatMessage}>😂😂</Text>
//               </View>

//               <View style={styles.chatItem}>
//                 <Text style={styles.chatUsername}>Betty:</Text>
//                 <Text style={styles.chatMessage}>Wow! What a gift!</Text>
//               </View>
// </View>
//           <View style={styles.chatInputContainer}>
//             <TextInput style={styles.chatInput} placeholder="Say something..." placeholderTextColor={Colors.textLight} />
//             <TouchableOpacity style={styles.sendButton}>
//               <Ionicons name="send" size={20} color={Colors.backgroundWhite} />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: 'black' },
//   // Overlays
//   topOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     paddingTop: 40,
//     paddingHorizontal: 15,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     paddingBottom: 10,
//     zIndex: 10,
//   },
//   bottomOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     paddingHorizontal: 15,
//     paddingBottom: 10,
//   //  backgroundColor: 'rgba(0,0,0,0.4)',
//     zIndex: 10,
//   },
//   // Host Info
//   hostInfo: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: Colors.overlayDark, borderRadius: 20 },
//   hostAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.backgroundWhite, marginRight: 10 },
//   hostName: { color: Colors.backgroundWhite, fontSize: 16, fontFamily: 'Jakarta-Bold' },
//   liveStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningRed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
//   liveStatusText: { color: Colors.backgroundWhite, fontSize: 10, fontFamily: 'Jakarta-SemiBold', marginLeft: 4 },
//   // Top Controls
//   topControls: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
//   leaderboardContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.overlayDark, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
//   leaderboardTitle: { color: Colors.goldStar, fontFamily: 'Jakarta-Bold', fontSize: 14, marginRight: 10 },
//   leaderboardName: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', fontSize: 14, marginRight: 8 },
//   closeButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
//   // Chat
//   chatContainer: { flex: 1, height: 200, justifyContent: 'flex-end', marginBottom: 10 },
//   chatList: { flexGrow: 1 },
//   chatItem: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '80%' },
//   chatUsername: { color: Colors.secondaryTeal, fontFamily: 'Jakarta-Bold', fontSize: 13 },
//   chatMessage: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', fontSize: 14, marginTop: 2 },
//   chatInputContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
//   chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: Colors.backgroundWhite, borderRadius: 25, paddingHorizontal: 15, height: 45, fontSize: 15, fontFamily: 'Jakarta-Medium' },
//   sendButton: { backgroundColor: Colors.primaryOrange, padding: 10, borderRadius: 25, marginLeft: 10, justifyContent: 'center', alignItems: 'center', width: 45, height: 45 },
//   // Gift Button
//   giftButton: { marginLeft: 10, backgroundColor: Colors.primaryOrange, borderRadius: 30, width: 60, height: 60, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primaryOrange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 10 },
//   giftButtonImage: { width: 35, height: 35, resizeMode: 'contain' },
//   // Gift Animation MOCKUP
//   giftAnimationContainer: {
//     position: 'absolute',
//     bottom: -170, // Center the gift animation vertically
//     right: -90,
//     zIndex: 20, // Ensure it's on top of everything
//     width: '100%', // New size
//     height: '100%', // Square aspect ratio
//   },
//   giftAnimationTextContainer: {
//     position: 'absolute',
//     bottom: -470, // Center the gift animation vertically
//     left: 20,
//     zIndex: 20, // Ensure it's on top of everything
//     width: '100%', // New size
//     height: '100%', // Square aspect ratio
//   },
//   giftAnimationImage: {
//     width: '100%',
//     height: '100%',
//     resizeMode: 'contain',
//   },
//   giftAnimationText: {
//     color: Colors.backgroundWhite,
//     fontSize: 20,
//     fontFamily: 'Jakarta-Bold',
//     marginTop: 10,
//     textShadowColor: 'rgba(0,0,0,0.7)',
//     textShadowOffset: { width: 1, height: 1 },
//     textShadowRadius: 5,
//   },
//     giftAnimationText2: {
//     color: '#ccc',
//     fontSize: 24,
//     fontFamily: 'Jakarta-Bold',
//     textShadowColor: 'rgba(0,0,0,0.7)',
//     textShadowOffset: { width: 1, height: 1 },
//     textShadowRadius: 5,
//   },
//    viewersContainer: { position: 'absolute', top: 109, left: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.overlayDark, padding: 3, borderRadius: 10, marginTop: 10 },
//   viewersTitle: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Bold', fontSize: 14, marginRight: 8 },
//   viewerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.overlayLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 8 },
//   viewerName: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', marginRight: 8, fontSize: 12 },
// });

// export default ScreenshotMockup;