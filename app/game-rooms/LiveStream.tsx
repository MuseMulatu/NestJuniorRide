import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Image, Dimensions } from 'react-native';
//import * as Haptics from 'expo-haptics';
import WebView from 'react-native-webview'; // Import WebView for animations
import { HMSSDK, HMSNoiseCancellationPlugin, HMSConfig, HMSUpdateListenerActions } from '@100mslive/react-native-hms';
import { useLocalSearchParams, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { io } from 'socket.io-client';
import { CustomModal } from '@/components/modals';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { Video } from 'expo-av';
import { useShareUsernameStore, usePhoneNumberStore } from "@/store";

const API_URL = 'https://app.share-rides.com';
const DEFAULT_AVATAR = 'https://placehold.co/100x100/orange/white?text=User';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// --- Gamification Settings ---
const STREAM_GOALS = [
    { duration: 30 * 60, points: 200, gracePeriod: 1 * 60 }, // 30 minutes, 1000 points goal, 5 min grace
    { duration: 60 * 60, points: 1000, gracePeriod: 5 * 60 }, // 1 hour, 2500 points goal
    { duration: 120 * 60, points: 2500, gracePeriod: 5 * 60 }, // 2 hours, 5000 points goal
];

const LiveStreamScreen = () => {
  const { channelName, streamId } = useLocalSearchParams();
  const router = useRouter();
  const user = auth()?.currentUser;
  const userId = user?.uid;
  const {profileImageUrl} = usePhoneNumberStore()
  const hmsInstanceRef = useRef < HMSSDK | null > (null);
  const noiseCancellationPluginRef = useRef < HMSNoiseCancellationPlugin | null > (null);
  const socketRef = useRef < any > (null);
  const timerIntervalRef = useRef(null); // Ref for the timer

  const [loading, setLoading] = useState(true);
  const [localPeer, setLocalPeer] = useState < any > (null);
  const [HmsView, setHmsView] = useState < any > (null);
  const [viewers, setViewers] = useState < any[] > ([]);
  const [messages, setMessages] = useState < any[] > ([]);
  const [chatInput, setChatInput] = useState('');
  const [leaderboard, setLeaderboard] = useState < any[] > ([]);

  // --- Gamification State ---
  const [streamPoints, setStreamPoints] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [warningMessage, setWarningMessage] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isNoiseCancellationOn, setIsNoiseCancellationOn] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [giftAnimationUrl, setGiftAnimationUrl] = useState(null);

const videoRef = useRef(null);

  const giftAnimations = {
    'ice_cream': 'https://share-rides.com/wp-content/uploads/2025/08/LionRoar.mp4',
    'rose': 'https://share-rides.com/wp-content/uploads/2025/08/LionRoar.mp4',
    'tiktok': 'https://s3.amazonaws.com/veo.js/fireworks.mp4',
  };

  const handleEndStream = useCallback(async (reason = 'Stream ended by host.') => {
    if (!timerIntervalRef.current) return; // Prevent multiple calls
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;

    setLoading(true);
    setModalMessage(reason);
    setModalVisible(true);

    try {
      if (hmsInstanceRef.current) {
        await hmsInstanceRef.current.leave({ endRoom: true });
      }
      const response = await fetch(`${API_URL}/api/streams/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
        body: JSON.stringify({ streamId: streamId, roomId: channelName, userId: userId })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end stream on backend.');
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(root)/(tabs)/home');
      }
    } catch (error) {
      console.error("Failed to end stream:", error);
    }
  }, []);

  const showGiftAnimation = (gift) => {
    const videoUrl = giftAnimations[gift.id] || null;
    if (videoUrl) {
      setGiftAnimationUrl(videoUrl);
      setTimeout(() => {
        setGiftAnimationUrl(null);
      }, 20000);
    }
  };

  // Effect for Timers and Goal Checking
  useEffect(() => {
    if (loading) return;

    timerIntervalRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    };
  }, [loading]);

  // Effect to check goals when time changes
  useEffect(() => {
    const goal = STREAM_GOALS[currentGoalIndex];
    if (!goal) {
        if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        return;
    }

    if (warningMessage && timeElapsed >= goal.duration + goal.gracePeriod) {
        if (streamPoints < goal.points) {
            handleEndStream(`Stream ended: Goal of ${goal.points} points not met.`);
        } else {
            setWarningMessage(null);
            setCurrentGoalIndex(prev => prev + 1);
        }
    }
    else if (!warningMessage && timeElapsed >= goal.duration) {
        if (streamPoints < goal.points) {
            setWarningMessage(`Warning: You have 5 minutes to reach ${goal.points} points!`);
        } else {
            setCurrentGoalIndex(prev => prev + 1);
        }
    }
  }, [timeElapsed, streamPoints, currentGoalIndex, warningMessage, handleEndStream]);

  useEffect(() => {
    if (!user || !channelName || !streamId) {
      setModalMessage("Missing user, channel, or stream ID.");
      setModalVisible(true);
      setLoading(false);
      return;
    }
    let isMounted = true;
    const setupSockets = () => {
      if (socketRef.current) return;
      socketRef.current = io(API_URL);
      const socketUser = { id: user.uid, username: user.displayName };
      socketRef.current.emit('joinStreamRoom', { streamId, user: socketUser });

      socketRef.current.on('userJoined', (viewer) => {
        if (isMounted) setViewers(prev => prev.some(v => v.id === viewer.id) ? prev : [...prev, viewer]);
      });
      socketRef.current.on('userLeft', (viewerId) => {
        if (isMounted) setViewers(prev => prev.filter(v => v.id !== viewerId));
      });
      socketRef.current.on('newChatMessage', (msg) => {
        if (isMounted) setMessages(prev => [msg, ...prev]);
      });
      socketRef.current.on('streamEnded', ({ message }) => {
        if (!isMounted) return;
        setModalMessage(message);
        setModalVisible(true);
        hmsInstanceRef.current?.leave();
        setTimeout(() => router.back(), 3000);
      });
      socketRef.current.on('giftReceived', (data) => {
        if (isMounted) {
          showGiftAnimation(data.gift);
          setStreamPoints(prev => prev + data.gift.cost); // Update points
        }
      });
      socketRef.current.on('leaderboardUpdate', (data) => {
        if (isMounted) setLeaderboard(data);
      });
    };
    setupSockets();

    const init = async () => {
      try {
        const cameraPermission = await Camera.requestCameraPermissionsAsync();
        const microphonePermission = await Camera.requestMicrophonePermissionsAsync();
        if (cameraPermission.status !== 'granted' || microphonePermission.status !== 'granted') {
          setModalMessage('Permissions Required');
          setModalVisible(true);
          if (isMounted) setLoading(false);
          return;
        }

        const tokenRes = await fetch(`${API_URL}/api/rtc/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
          body: JSON.stringify({ roomId: channelName, userId: userId, role: 'broadcaster' }),
        });
        if (!tokenRes.ok) throw new Error('Failed to fetch token');
        const tokenJson = await tokenRes.json();
        const token = tokenJson.token.token;
        if (!token) throw new Error('Auth token not received');

        noiseCancellationPluginRef.current = new HMSNoiseCancellationPlugin();
        const hms = await HMSSDK.build({ audioPlugins: [noiseCancellationPluginRef.current] });
        if (!isMounted) return;
        hmsInstanceRef.current = hms;
        setHmsView(() => hms.HmsView);

        const onUpdate = (data) => {
          if (!isMounted) return;
          if (data.peer?.isLocal) setLocalPeer(data.peer);
          if (loading && (data.peer?.isLocal ? data.peer : localPeer)?.videoTrack?.trackId) {
            setLoading(false);
          }
        };

        const onError = (data) => {
          console.error("HMS Error:", data);
          setModalMessage(`Stream Error: ${data?.error?.message || "Unknown error."}`);
          setModalVisible(true);
          setLoading(false);
        };

        hms.addEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE, onUpdate);
        hms.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, onUpdate);
        hms.addEventListener(HMSUpdateListenerActions.ON_ERROR, onError);

        const hmsConfig = new HMSConfig({ authToken: token, username: user?.displayName ?? "Broadcaster" });
        await hms.join(hmsConfig);
      } catch (err) {
        console.error("Error initializing stream:", err);
        setModalMessage(err.message || "Unable to start stream.");
        setModalVisible(true);
        if (isMounted) setLoading(false);
      }
    };
    init();

    return () => {
      isMounted = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (hmsInstanceRef.current) {
        hmsInstanceRef.current.leave({ endRoom: true });
        hmsInstanceRef.current.removeAllListeners();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [channelName, user, userId, streamId]);

  const handleToggleNoiseCancellation = async () => {
    if (!noiseCancellationPluginRef.current) return;
    try {
      const isEnabled = await noiseCancellationPluginRef.current.isEnabled();
      if (!isEnabled) {
        await noiseCancellationPluginRef.current.enable();
      } else {
        await noiseCancellationPluginRef.current.disable();
      }
      setIsNoiseCancellationOn(!isEnabled);
    } catch (e) {
      console.error("Error toggling NC:", e);
    }
  };

  const handleInviteToBattle = (viewer) => {
    setModalMessage(`You have invited ${viewer.username} to a battle!`);
    setModalVisible(true);
    if (socketRef.current) {
      socketRef.current.emit('inviteToBattle', { streamId, hostId: userId, invitedViewerId: viewer.id, invitedViewerUsername: viewer.username });
    }
  };

  const handleToggleAudio = async () => {
    const localPeer = await hmsInstanceRef.current?.getLocalPeer();
    if (localPeer) {
      const currentlyMuted = localPeer.audioTrack.isMute();
      await localPeer.audioTrack.setMute(!currentlyMuted);
      setIsMuted(!currentlyMuted);
    }
  };

  const handleToggleVideo = async () => {
    const localPeerInstance = await hmsInstanceRef.current?.localPeer;
    const localVideoTrack = localPeerInstance?.videoTrack;
    if (localVideoTrack) {
      const currentlyMuted = await localVideoTrack.isMute();
      await localVideoTrack.setMute(!currentlyMuted);
      setIsVideoOff(!currentlyMuted);
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim() && socketRef.current) {
      const socketUser = { id: user?.uid, username: user?.displayName };
      socketRef.current.emit('streamChatMessage', { streamId, message: chatInput, user: socketUser });
      setChatInput('');
    }
  };

  const renderChatItem = ({ item }) => (
    <View style={styles.chatItem}>
      <Text style={styles.chatUsername}>{item.user.username}:</Text>
      <Text style={styles.chatMessage}>{item.message}</Text>
    </View>
  );

  const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderGoalTracker = () => {
      const goal = STREAM_GOALS[currentGoalIndex];
      if (!goal) return <Text style={styles.goalText}>All goals completed!</Text>;

      if (warningMessage) {
          const timeLeft = (goal.duration + goal.gracePeriod) - timeElapsed;
          return (
              <View style={[styles.goalTracker, styles.warningTracker]}>
                  <MaterialIcons name="warning" size={20} color={"#FFFFFF"} />
                  <Text style={styles.warningText}>{warningMessage}</Text>
                  <Text style={styles.warningTimer}>Time Left: {formatTime(timeLeft > 0 ? timeLeft : 0)}</Text>
              </View>
          );
      }

      const timeToNextGoal = goal.duration - timeElapsed;
      return (
          <View style={styles.goalTracker}>
              <Text style={styles.goalText}>Points: {streamPoints} / {goal.points}</Text>
              <Text style={styles.goalText}>Next Goal: {formatTime(timeToNextGoal > 0 ? timeToNextGoal : 0)}</Text>
          </View>
      );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.backgroundWhite} />
        <Text style={styles.loadingText}>Starting Stream...</Text>
      </View>
    );
  }

  const localTrackId = localPeer?.videoTrack?.trackId;

  return (
    <SafeAreaView style={styles.container}>
      {HmsView && localTrackId && !isVideoOff ? (
        <HmsView trackId={localTrackId} style={StyleSheet.absoluteFill} mirror={true} />
      ) : (
        <View style={[styles.previewPlaceholder, StyleSheet.absoluteFill]}>
          <MaterialIcons name="videocam-off" size={80} color={Colors.textLight} />
          <Text style={styles.infoText}>{isVideoOff ? 'Camera is Off' : 'Waiting for video...'}</Text>
        </View>
      )}

{giftAnimationUrl && (
  <View style={styles.giftAnimationOverlay}>
    <Video
      ref={videoRef}
      source={{ uri: giftAnimationUrl }}
      style={styles.giftAnimationVideo}
      shouldPlay
      isLooping={false}
      resizeMode="contain"
      useNativeControls={false}
      isMuted={false}
      volume={1.0}
      onError={(e) => console.log("Video Error:", e)}
      onLoad={() => {
        // force play once it loads
        videoRef.current?.playAsync();
      }}
    />
  </View>
)}

      <View style={styles.topOverlay}>
        <View style={styles.hostInfo}>
          <Image source={{ uri: profileImageUrl || user?.photoURL || DEFAULT_AVATAR }} style={styles.hostAvatar} />
          <View>
            <Text style={styles.hostName}>{user?.displayName || 'You'}</Text>
            <View style={styles.liveStatusBadge}>
              <MaterialIcons name="fiber-manual-record" size={12} color={Colors.liveRed} />
              <Text style={styles.liveStatusText}>LIVE {formatTime(timeElapsed)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.topControls}>
          <View style={styles.leaderboardContainer}>
            <Text style={styles.leaderboardTitle}>Top Viewers</Text>
            <FlatList
              data={leaderboard.slice(0, 3)}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => (<Text style={styles.leaderboardName}>{item.username} 🎖️{item.value}</Text>)}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        </View>
      </View>

      {renderGoalTracker()}

      <View style={styles.bottomOverlay}>
        <View style={styles.chatContainer}>
          <FlatList
            data={messages}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={renderChatItem}
            inverted
            style={styles.chatList}
          />
          <View style={styles.chatInputContainer}>
            <TextInput style={styles.chatInput} placeholder="Say something..." placeholderTextColor={Colors.textLight} value={chatInput} onChangeText={setChatInput} />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendChat}>
              <Ionicons name="send" size={20} color={Colors.backgroundWhite} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.viewersContainer}>
          <Text style={styles.viewersTitle}>Viewers ({viewers.length})</Text>
          <FlatList
            data={viewers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.viewerItem} onPress={() => handleInviteToBattle(item)}>
                <Text style={styles.viewerName}>{item.username}</Text>
                <Text style={styles.battleButtonText}> Invite </Text>
              </TouchableOpacity>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'start',}}>
          <TouchableOpacity style={styles.controlButton} onPress={handleToggleAudio}>
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={Colors.backgroundWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleToggleVideo}>
            <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={24} color={Colors.backgroundWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleToggleNoiseCancellation}>
            <MaterialIcons name={isNoiseCancellationOn ? 'volume-off' : 'volume-up'} size={24} color={Colors.backgroundWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.endStreamButton]} onPress={() => handleEndStream()}>
            <Text style={styles.endStreamButtonText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  previewPlaceholder: { backgroundColor: Colors.textDark, justifyContent: 'center', alignItems: 'center' },
  infoText: { color: Colors.backgroundWhite, marginTop: 10, fontFamily: 'Jakarta-Medium', fontSize: 16 },
  giftAnimationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: 'transparent', },
  giftAnimationWebView: { flex: 1, width: screenWidth, height: screenHeight, backgroundColor: 'transparent' },
    giftAnimationVideo: {
    width: '100%',
    height: '100%',
  },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 30, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingBottom: 10, zIndex: 10 },
  hostInfo: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: Colors.overlayDark, borderRadius: 20 },
  hostAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.backgroundWhite, marginRight: 10, backgroundColor: Colors.backgroundLightGray },
  hostName: { color: Colors.backgroundWhite, fontSize: 16, fontFamily: 'Jakarta-Bold' },
  liveStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningRed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
  liveStatusText: { color: Colors.backgroundWhite, fontSize: 10, fontFamily: 'Jakarta-SemiBold', marginLeft: 4 },
  topControls: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  controlButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  endStreamButton: { backgroundColor: Colors.warningRed, paddingHorizontal: 12, borderRadius: 20 },
  endStreamButtonText: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Bold', fontSize: 14 },
  leaderboardContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.overlayDark, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  leaderboardTitle: { color: Colors.goldStar, fontFamily: 'Jakarta-Bold', fontSize: 14, marginRight: 10 },
  leaderboardName: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', fontSize: 14, marginRight: 8 },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 15, paddingBottom: 10, zIndex: 10 },
  chatContainer: { height: 250, justifyContent: 'flex-end', marginBottom: 10 },
  chatList: { flexGrow: 1 },
  chatItem: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '80%' },
  chatUsername: { color: Colors.secondaryTeal, fontFamily: 'Jakarta-Bold', fontSize: 13 },
  chatMessage: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', fontSize: 14, marginTop: 2 },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: Colors.backgroundWhite, borderRadius: 25, paddingHorizontal: 15, height: 45, fontSize: 15, fontFamily: 'Jakarta-Medium' },
  sendButton: { backgroundColor: Colors.primaryOrange, padding: 10, borderRadius: 25, marginLeft: 10, justifyContent: 'center', alignItems: 'center', width: 45, height: 45 },
  viewersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.overlayDark, padding: 8, borderRadius: 10, marginTop: 10 },
  viewersTitle: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Bold', fontSize: 14, marginRight: 8 },
  viewerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.overlayLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 8 },
  viewerName: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Medium', marginRight: 8, fontSize: 12 },
  battleButtonText: { color: Colors.primaryOrange, fontFamily: 'Jakarta-Bold', fontSize: 12 },
  // Gamification Styles
  goalTracker: {
    position: 'absolute',
    top: 120, // Adjusted to be below the main top overlay
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  goalText: {
    color: Colors.backgroundWhite,
    fontWeight: 'bold',
    fontSize: 14,
    marginHorizontal: 10,
  },
  warningTracker: {
    backgroundColor: Colors.warningRed,
    borderWidth: 2,
    borderColor: Colors.backgroundWhite,
  },
  warningText: {
    color: Colors.backgroundWhite,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  warningTimer: {
    color: Colors.backgroundWhite,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 15,
  }
});

export default LiveStreamScreen;
