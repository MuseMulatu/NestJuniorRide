import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator, FlatList, Text, View, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Modal, Image, Animated, Easing, SectionList, Button
} from 'react-native';
import { HMSSDK, HMSConfig, HMSUpdateListenerActions } from '@100mslive/react-native-hms';
import { useLocalSearchParams, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { io } from 'socket.io-client';
import { handleProcessPayment, RECHARGE_OPTIONS, GIFT_CATEGORIES, Colors } from "@/lib/utils"; // Assuming this is defined
import { useShareUsernameStore, usePhoneNumberStore } from "@/store"; // Assuming these are defined
import { CustomModal } from '@/components/modals'; // Import CustomModal
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // For icons

const API_URL = 'https://app.share-rides.com';

const SpectatorViewScreen = () => {
  const { channelName, streamId, creatorId, streampfp } = useLocalSearchParams();
  const router = useRouter();
  const user = auth()?.currentUser;
  const userId = user?.uid;
  const hmsInstanceRef = useRef(null);
  const socketRef = useRef(null);
  const giftAnimation = useRef(new Animated.Value(0)).current;
  const { shareUsername, setShareUsername } = useShareUsernameStore();
  const { phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, gender, bio, seatNumber, setprofileDetails, almaz } = usePhoneNumberStore()

  const [HmsView, setHmsView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isGiftModalVisible, setGiftModalVisible] = useState(false);
  const [isRechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [activeGift, setActiveGift] = useState(null);
  const [streamParams, setStreamParams] = useState({ channelName: channelName || null, streamId: streamId || null, creatorId: creatorId || null });
  const [streamEndedMessage, setStreamEndedMessage] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/${user?.uid}/balance`);
      const data = await response.json();
      setCurrentBalance(data.balance);
    } catch (e) {
      console.error("Failed to fetch balance", e);
      setModalMessage("Failed to fetch balance.");
      setModalVisible(true);
    }
  }, [user?.uid]);

 // let HmsView = null;
  // Main useEffect for component lifecycle
  useEffect(() => {
    if (!user || !streamParams.channelName || !streamParams.streamId) {
      setModalMessage("Missing user, channel, or stream ID. Cannot join stream.");
      setModalVisible(true);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initHMS = async () => {
        console.log("DEBUG: Initializing HMS...");
        setLoading(true);
        setPeers([]);
        setStreamEndedMessage(null);
        try {
          const hmsInstance = await HMSSDK.build();
          if (!isMounted) return;
          hmsInstanceRef.current = hmsInstance;
          setHmsView(() => hmsInstance.HmsView);
         // HmsView = hmsInstance.HmsView 
          console.log("HmsView", HmsView)
          console.log("hmsInstance.HmsView", hmsInstance.HmsView)
    
          const onJoin = (data) => {
            console.log("DEBUG: ON_JOIN event received. Room:", data.room.id);
            if (!isMounted) return;
            const initialPeers = data.room.peers;
            console.log("initialPeers", initialPeers, "data.room", data.room)
           console.log("data", data)
            setPeers(initialPeers);
            // Check if the host is already here when we join
            if (initialPeers.some((p) => p.roleName === 'broadcaster' && p.videoTrack?.trackId)) {
              console.log("DEBUG: Broadcaster with video track found in ON_JOIN. Setting loading to false.");
              if (isMounted) setLoading(false);
            } else {
              console.log("DEBUG: Broadcaster not found or has no video track in ON_JOIN. Waiting for updates.");
            }
          };
    
          const onUpdate = (data) => {
            if (!isMounted) return;
            console.log(`DEBUG: ON_PEER_UPDATE or ON_TRACK_UPDATE received for peer: ${data.peer.name}`);
            console.log("data:", data)
            console.log("data?.track?.trackId:", data?.track?.trackId)
            setLoading(false);
 setPeers(prevPeers => {
    const newPeers = [...prevPeers];
    const peerIndex = newPeers.findIndex(p => p.peerID === data.peer.peerID);

    // Merge track info into peer
    const updatedPeer = {
      ...data.peer,
      videoTrack: data.track?.type === "VIDEO" ? data.track : (newPeers[peerIndex]?.videoTrack || null),
      audioTrack: data.track?.type === "AUDIO" ? data.track : (newPeers[peerIndex]?.audioTrack || null),
    };

    if (peerIndex > -1) {
      newPeers[peerIndex] = updatedPeer;
    } else {
      newPeers.push(updatedPeer);
    }

    // Check broadcaster ready as before
    if (loading && newPeers.some(p => p.roleName === "broadcaster" && p.videoTrack?.trackId)) {
      setLoading(false);
    }

    return newPeers;
            });
          };
    
          hmsInstance.addEventListener(HMSUpdateListenerActions.ON_JOIN, onJoin);
          hmsInstance.addEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE, onUpdate);
          hmsInstance.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, onUpdate);
    
          const tokenRes = await fetch(`${API_URL}/api/rtc/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
            body: JSON.stringify({ roomId: streamParams.channelName, userId: userId, role: 'viewer-realtime' }),
          });
          if (!tokenRes.ok) throw new Error('Failed to fetch token');
          const tokenJson = await tokenRes.json();
          // FIX: Correctly access the token property from your server's response
          const token = tokenJson.token.token; 
          if (!token) throw new Error('Auth token not received');
    
          const hmsConfig = new HMSConfig({ authToken: token, username: user?.displayName || "Viewer" });
          await hmsInstance.join(hmsConfig);
          console.log("DEBUG: HMS join command issued.");
        } catch (e) {
          console.error("HMS Init Error:", e);
          setModalMessage(`Failed to join stream: ${e.message || 'An unknown error occurred.'}`);
          setModalVisible(true);
          if (isMounted) setLoading(false);
        }
      };

    const setupSockets = () => {
        if (socketRef.current) socketRef.current.disconnect();
    
        socketRef.current = io(API_URL);
        const socketUser = { id: user?.uid, username: user?.displayName };
        socketRef.current.emit('joinStreamRoom', { streamId: streamParams.streamId, user: socketUser });
    
        socketRef.current.on('streamEnded', ({ message, nextStream }) => {
          setModalMessage(message);
          setModalVisible(true);
          hmsInstanceRef.current?.leave();
    
          setTimeout(() => {
            if (nextStream) {
              setModalMessage('Redirecting to the next live stream...');
              setModalVisible(true);
              router.replace({
                pathname: '/game-rooms/SpectatorViewScreen',
                params: {
                  streamId: nextStream.id.toString(),
                  channelName: nextStream.hms_room_id,
                  creatorId: nextStream.host_id,
                },
              });
            } else {
              setModalMessage('No other live streams available. Returning to Live Hub.');
              setModalVisible(true);
              setTimeout(() => router.back(), 3000);
            }
          }, 2000);
        });
    
        socketRef.current.on('newChatMessage', (msg) => { setMessages(prev => [msg, ...prev]); });
        socketRef.current.on('leaderboardUpdate', (data) => { setLeaderboard(data); });
        socketRef.current.on('giftReceived', (data) => { showGiftAnimation(data.gift); });
        socketRef.current.on('giftSendFailed', (data) => {
          setModalMessage(`Gift Failed: ${data.message}`);
          setModalVisible(true);
        });
      };

    fetchBalance();
    initHMS();
    setupSockets();

    return () => {
      isMounted = false;
      console.log("DEBUG: Spectator screen unmounting. Leaving HMS room and disconnecting socket.");
      hmsInstanceRef.current?.leave();
      if (socketRef.current) {
        socketRef.current.emit('leaveStreamRoom', { streamId: streamParams.streamId, userId: user.uid });
        socketRef.current.disconnect();
      }
      hmsInstanceRef.current?.removeAllListeners();
    };
  }, [user, streamParams]);

  const handleSendChat = () => {
    if (chatInput.trim() && socketRef.current) {
      const socketUser = { id: user?.uid, username: user?.displayName };
      socketRef.current.emit('streamChatMessage', { streamId: streamParams.streamId, message: chatInput, user: socketUser });
      setChatInput('');
    }
   // console.log("...........................................peers", peers)
   // console.log("peer?.videoTrack?.trackId", peers)
  };

  const handleSendGift = async (gift) => {
    console.log("streamParams.creatorId", streamParams.creatorId)
    try {
      const response = await fetch(`${API_URL}/api/users/${user?.uid}/balance`);
      const data = await response.json();
      const latestBalance = data.balance;
      setCurrentBalance(latestBalance);

      if (latestBalance >= gift.cost) {
        const sender = { id: user?.uid, username: user?.displayName };
        socketRef.current.emit('sendGift', { streamId: streamParams.streamId, gift, sender, creatorId: streamParams.creatorId });
        setGiftModalVisible(false);
        setCurrentBalance(prev => prev - gift.cost);
      } else {
        setGiftModalVisible(false);
        setRechargeModalVisible(true);
      }
    } catch (error) {
      console.error("Error sending gift or fetching balance:", error);
      setModalMessage(`Failed to send gift: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
    }
  };

  const showGiftAnimation = (gift) => {
    setActiveGift(gift);
    giftAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(giftAnimation, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(giftAnimation, { toValue: 0, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true })
    ]).start(() => setActiveGift(null));
  };

  const giftAnimStyle = {
    opacity: giftAnimation,
    transform: [
      {
        translateY: giftAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0]
        })
      },
      {
        scale: giftAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 1.2, 1]
        })
      }
    ]
  };

  const renderChatItem = ({ item }) => (
    <View style={styles.chatItem}>
      <Text style={styles.chatUsername}>{item.user.username}:</Text>
      <Text style={styles.chatMessage}>{item.message}</Text>
    </View>
  );

  const renderRechargeItem = ({ item }) => (
    <TouchableOpacity style={styles.rechargeItem} onPress={() => {
      if (handleProcessPayment) {
        handleProcessPayment(item.amount, phoneNumberStore, shareUsername);
        setRechargeModalVisible(false);
      } else {
        setModalMessage("Payment processing is not available.");
        setModalVisible(true);
      }
    }}>
      <Text style={styles.rechargeAmount}>{item.amount} Coins</Text>
      <Text style={styles.rechargeCost}>{item.cost}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loadingScreen}><ActivityIndicator size="large" color={Colors.backgroundWhite} /><Text style={styles.loadingText}>Joining Stream...</Text></View>;
  }

  const hostPeer = peers.find((p) => p.roleName === 'broadcaster');
const peerWithVideoTrack = peers.find(p => p.videoTrack?.trackId);
  return (
    <SafeAreaView style={styles.container}>
    <View style={{ flex: 1, backgroundColor: Colors.backgroundWhite }}>
      {HmsView && peerWithVideoTrack ? (
  <HmsView
    trackId={peerWithVideoTrack.videoTrack.trackId}
style={{ flex: 1  }}
  />
      ) : (
        <View style={[styles.previewPlaceholder, StyleSheet.absoluteFill]}>
          <MaterialIcons name="videocam-off" size={80} color={Colors.textLight} />
          <Text style={styles.infoText}>Waiting for host...</Text>
        </View>
      )}
</View>
      {/* Top Overlay: Host Info & Controls */}
      <View style={styles.topOverlay}>
        <View style={styles.hostInfo}>
          <Image
            source={{ uri: streampfp || 'https://placehold.co/40x40' }} // Use host's avatar
            style={styles.hostAvatar}
          />
          <View>
            <Text style={styles.hostName}>{hostPeer?.name || 'Live Stream'}</Text>
            <View style={styles.liveStatusBadge}>
              <MaterialIcons name="fiber-manual-record" size={12} color={Colors.warningRed} />
              <Text style={styles.liveStatusText}>LIVE</Text>
            </View>
          </View>
        </View>
        <View style={styles.topControls}>
          <View style={styles.viewerCountContainer}>
            <Ionicons name="eye" size={16} color={Colors.backgroundWhite} />
            <Text style={styles.viewerCountText}>{peers.length - 1}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.backgroundWhite} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Gift Animation */}
      {activeGift && (
        <Animated.View style={[styles.giftAnimationContainer, giftAnimStyle]}>
          <Image source={{ uri: activeGift.image }} style={styles.activeGiftImage} />
          <Text style={styles.activeGiftText}>{activeGift.name}!</Text>
        </Animated.View>
      )}

      {/* Chat & Gift Button */}
      <View style={styles.bottomChatAndGiftContainer}>
        <View style={styles.chatContainer}>
          <FlatList
            data={messages}
            renderItem={renderChatItem}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            inverted
            style={styles.chatList}
          />
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
              placeholderTextColor={Colors.textLight}
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendChat}>
              <Ionicons name="send" size={20} color={Colors.backgroundWhite} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gift Button */}
        <TouchableOpacity style={styles.giftButton} onPress={() => setGiftModalVisible(true)}>
          <Image source={{ uri: 'https://img.icons8.com/plasticine/100/gift.png' }} style={styles.giftButtonImage} />
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Modal visible={isGiftModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.giftModalContent}>
            <Text style={styles.modalTitle}>Send a Gift</Text>
            <Text style={styles.balanceText}>Your Balance: {currentBalance} coins</Text>
            <SectionList
              sections={GIFT_CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.giftItem} onPress={() => handleSendGift(item)}>
                  <Image source={{ uri: item.image }} style={styles.giftImage} />
                  <Text style={styles.giftName}>{item.name}</Text>
                  <Text style={styles.giftCost}>{item.cost}</Text>
                </TouchableOpacity>
              )}
              renderSectionHeader={({ section: { title } }) => (
                <Text style={styles.giftSectionHeader}>{title}</Text>
              )}
              numColumns={4}
              columnWrapperStyle={styles.giftRow}
            />
            <TouchableOpacity style={styles.modalCloseButtonBottom} onPress={() => setGiftModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isRechargeModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.rechargeModalContent}>
            <Text style={styles.modalTitle}>Insufficient Balance</Text>
            <Text style={styles.modalSubtitle}>Please recharge your wallet.</Text>
            <FlatList
              data={RECHARGE_OPTIONS}
              renderItem={renderRechargeItem}
              keyExtractor={(item) => item.amount.toString()}
              numColumns={2}
              columnWrapperStyle={styles.rechargeOptionsRow}
            />
            <TouchableOpacity style={styles.modalCloseButtonBottom} onPress={() => setRechargeModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.textDark },
    loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.textDark },
    loadingText: { marginTop: 10, color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', fontSize: 16 },
    previewPlaceholder: {
      backgroundColor: Colors.textDark,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoText: { color: Colors.backgroundWhite, marginTop: 10, fontFamily: 'Jakarta-Medium', fontSize: 16 },
  
    // Top Overlay
    topOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 40,
      paddingHorizontal: 15,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingBottom: 10,
      zIndex: 10,
    },
    hostInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hostAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: Colors.backgroundWhite,
      marginRight: 10,
      backgroundColor: Colors.backgroundLightGray,
    },
    hostName: {
      color: Colors.backgroundWhite,
      fontSize: 16,
      fontFamily: 'Jakarta-Bold',
    },
    liveStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.warningRed,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
      alignSelf: 'flex-start',
    },
    liveStatusText: {
      color: Colors.backgroundWhite,
      fontSize: 10,
      fontFamily: 'Jakarta-SemiBold',
      marginLeft: 4,
    },
    topControls: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
    },
    viewerCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },
    viewerCountText: {
      color: Colors.backgroundWhite,
      fontSize: 14,
      fontFamily: 'Jakarta-Medium',
      marginLeft: 4,
    },
    closeButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      padding: 8,
      borderRadius: 20,
    },
  
    // Gift Animation
    giftAnimationContainer: {
      position: 'absolute',
      top: '30%',
      alignSelf: 'center',
      alignItems: 'center',
      zIndex: 20,
    },
    activeGiftImage: {
      width: 150,
      height: 150,
      resizeMode: 'contain',
    },
    activeGiftText: {
      color: Colors.backgroundWhite,
      fontSize: 24,
      fontFamily: 'Jakarta-Bold',
      marginTop: 10,
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 5,
    },
  
    // Bottom Chat & Gift Container
    bottomChatAndGiftContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 15,
      paddingBottom: 20,
      zIndex: 10,
    },
    chatContainer: {
      flex: 1,
      height: 200,
      justifyContent: 'flex-end',
    },
    chatList: {
      flexGrow: 1,
      marginBottom: 10,
    },
    chatItem: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 15,
      marginBottom: 8,
      alignSelf: 'flex-start',
      maxWidth: '80%',
    },
    chatUsername: {
      color: Colors.secondaryTeal,
      fontFamily: 'Jakarta-Bold',
      fontSize: 13,
    },
    chatMessage: {
      color: Colors.backgroundWhite,
      fontFamily: 'Jakarta-Medium',
      fontSize: 14,
      marginTop: 2,
    },
    chatInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
    },
    chatInput: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: Colors.backgroundWhite,
      borderRadius: 25,
      paddingHorizontal: 15,
      height: 45,
      fontSize: 15,
      fontFamily: 'Jakarta-Medium',
    },
    sendButton: {
      backgroundColor: Colors.primaryOrange,
      padding: 10,
      borderRadius: 25,
      marginLeft: 10,
      justifyContent: 'center',
      alignItems: 'center',
      width: 45,
      height: 45,
    },
    giftButton: {
      marginLeft: 10,
      backgroundColor: Colors.primaryOrange,
      borderRadius: 30,
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: Colors.primaryOrange,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
    },
    giftButtonImage: {
      width: 35,
      height: 35,
      resizeMode: 'contain',
    },
  
    // Modals (Gift & Recharge)
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    giftModalContent: {
      backgroundColor: Colors.textDark,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    rechargeModalContent: {
      backgroundColor: Colors.textDark,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '60%',
    },
    modalTitle: {
      color: Colors.backgroundWhite,
      fontSize: 22,
      fontFamily: 'Jakarta-Bold',
      textAlign: 'center',
      marginBottom: 15,
    },
    modalSubtitle: {
      color: Colors.textLight,
      fontSize: 16,
      fontFamily: 'Jakarta-Medium',
      textAlign: 'center',
      marginBottom: 20,
    },
    balanceText: {
      color: "#FFD700", // Gold
      textAlign: 'center',
      marginBottom: 15,
      fontSize: 16,
      fontFamily: 'Jakarta-SemiBold',
    },
    giftSectionHeader: {
      color: Colors.backgroundWhite,
      fontFamily: 'Jakarta-Bold',
      fontSize: 18,
      marginTop: 10,
      marginBottom: 8,
      width: '100%',
    },
    giftRow: {
      justifyContent: 'space-around',
      marginBottom: 10,
    },
    giftItem: {
      width: '23%',
      alignItems: 'center',
      marginBottom: 15,
      padding: 5,
      borderRadius: 10,
      backgroundColor: Colors.overlayLight,
    },
    giftImage: {
      width: 50,
      height: 50,
      resizeMode: 'contain',
    },
    giftName: {
      color: Colors.backgroundWhite,
      fontFamily: 'Jakarta-Medium',
      marginTop: 5,
      fontSize: 12,
      textAlign: 'center',
    },
    giftCost: {
      color: "#FFD700", // Gold
      fontSize: 12,
      fontFamily: 'Jakarta-SemiBold',
    },
    modalCloseButtonBottom: {
      backgroundColor: Colors.textMedium,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 20,
      alignItems: 'center',
    },
    modalCloseButtonText: {
      color: Colors.backgroundWhite,
      fontFamily: 'Jakarta-Bold',
      fontSize: 16,
    },
    rechargeItem: {
      backgroundColor: Colors.overlayLight,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      alignItems: 'center',
      marginHorizontal: 5,
      width: '45%',
    },
    rechargeAmount: {
      color: Colors.backgroundWhite,
      fontSize: 18,
      fontFamily: 'Jakarta-Bold',
    },
    rechargeCost: {
      color: "#FFD700", // Gold
      fontFamily: 'Jakarta-SemiBold',
      marginTop: 5,
    },
    rechargeOptionsRow: {
      justifyContent: 'space-around',
      marginBottom: 10,
    },
  });

export default SpectatorViewScreen