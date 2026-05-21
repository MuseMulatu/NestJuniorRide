// game-rooms/index.jsx (Live Stream Hub)
import { useRouter, Stack } from 'expo-router';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, Pressable, SafeAreaView, Image, Dimensions, Alert } from 'react-native';
import { io } from 'socket.io-client';
import auth from '@react-native-firebase/auth';
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useCallback
import * as HMS from '@100mslive/react-native-hms'; // Assuming 100ms is the chosen SDK
import { useShareUsernameStore, usePhoneNumberStore } from "@/store"; // Assuming these are correctly imported
import { CustomModal } from '@/components/modals'; // Import CustomModal for alerts
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // For icons

const API_URL = 'https://app.share-rides.com';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window'); // <--- ADD THIS LINE
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';

// Define consistent color palette
const Colors = {
  primaryOrange: "#FF8C00", // Inviting Orange
  secondaryTeal: "#0FB1BB", // Vibrant Teal
  textDark: "#1A202C", // Dark Charcoal
  textMedium: "#4A5568", // Medium Gray
  textLight: "#718096", // Light Gray
  backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC",
  borderLight: "#E2E8F0",
  successGreen: "#22C55E",
  warningRed: "#EF4444",
  // New: Specific colors for live status
  liveRed: "#EF4444",
  liveGreen: "#22C55E",
};

const LiveScreen = () => {
  const { shareUsername, setShareUsername, socialCount, setSocialCount, expoToken, setExpoToken } = useShareUsernameStore();
  const router = useRouter();
  const user = auth()?.currentUser;
  const userId = user?.uid;
  const { profileImageUrl } = usePhoneNumberStore(); // Get pfp URL from Zustand store

  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goLiveModalVisible, setGoLiveModalVisible] = useState(false); // Renamed for clarity
  const [streamTitle, setStreamTitle] = useState('');
  const [modalMessage, setModalMessage] = useState(''); // For CustomModal
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false); // For CustomModal

  const intervalRef = useRef(null); // Keep interval ID reference
  const fetchLiveStreams = useCallback(async () => {
    console.log("fetchLiveStreams called.............................................................")
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/streams`, {
        headers: {
          'Authorization': `Bearer ${user?.uid}`, // Ensure auth header is used
        },
      });
      const data = await response.json();
      if (response.ok) {
        setLiveStreams(data);
      } else {
        // Use CustomModal instead of Alert.alert
        setModalMessage(data.error || "No live streams found.");
  //      setIsErrorModalVisible(true);
        setLiveStreams([]); // Clear streams on error
      }
    } catch (error) {
      console.error("Error fetching live streams:", error);
      setModalMessage(`Could not connect to stream server: ${error.message || 'Check connection.'}`);
  //    setIsErrorModalVisible(true);
      setLiveStreams([]); // Clear streams on error
    } finally {
      setLoading(false);
    }
    }, [user?.uid]); // Dependency on user.uid

  useEffect(() => {
   fetchLiveStreams(); // initial fetch
    intervalRef.current = setInterval(fetchLiveStreams, 300000);

    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchLiveStreams]);
  const handleGoLive = async () => {
  if (socialCount < 25) {
    Alert.alert("Whoops", "You need at least 25 followers to start streaming.");
    return;
  }
    if (!streamTitle.trim()) {
      setModalMessage("Please enter a title for your stream.");
      setIsErrorModalVisible(true);
      return;
    }
    setLoading(true); // Show loading state for go-live action
    try {
      const response = await fetch(`${API_URL}/api/streams/go-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}` // Ensure auth header
        },
        body: JSON.stringify({
          userId: userId,
          userName: user?.displayName,
          title: streamTitle,
          pfpUrl: profileImageUrl || user?.photoURL // Send the pfp URL
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGoLiveModalVisible(false);
        router.push({
          pathname: '/game-rooms/LiveStream',
          params: {
            channelName: data.roomId, // Assuming this is HMS Room ID
            streamId: data.streamId, // Assuming this is your backend's stream ID
          },
        });
      } else {
        throw new Error(data.error || 'Failed to start stream');
      }
    } catch (error) {
      setModalMessage(`Error starting stream: ${error.message || 'Please try again.'}`);
      setIsErrorModalVisible(true);
    } finally {
      setLoading(false); // Turn off loading after action
    }
  };

  const handleJoinStream = (stream) => { // Type safety for stream object
console.log("streamId:", stream.channel_name)    
    router.push({
      pathname: '/game-rooms/SpectatorViewScreen',
      params: {
        streamId: stream.channel_name, // Your backend's stream ID
        channelName: stream.hms_room_id, // HMS Room ID
        creatorId: stream.host_id,
        role: 'viewer-realtime',
        streampfp: stream.pfp
      }
    });
  };

  if (loading && liveStreams.length === 0) { // Only show full loading if no streams loaded yet
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryOrange} />
        <Text style={styles.loadingText}>Loading live streams...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{
        headerShown: false, // Hide default header to use custom UI
      }} />

      {/* Top Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Hub</Text>
        <TouchableOpacity style={styles.goLiveButton} onPress={() => setGoLiveModalVisible(true)}>
          <Ionicons name="videocam" size={20} color={Colors.backgroundWhite} style={styles.buttonIcon} />
          <Text style={styles.goLiveButtonText}>Go Live</Text>
        </TouchableOpacity>
      </View>

      {/* Live Streams List */}
      {liveStreams.length === 0 ? (
        <View style={styles.noStreamsContainer}>
          <MaterialIcons name="live-tv" size={60} color={Colors.textLight} />
          <Text style={styles.noStreamsText}>No live streams currently available.</Text>
          <Text style={styles.noStreamsSubText}>Be the first to go live!</Text>
        </View>
      ) : (
        <FlatList
          data={liveStreams}
          keyExtractor={(item) => item.id.toString()} // Ensure key is string
          numColumns={2} // Grid layout for streams
          columnWrapperStyle={styles.streamGridRow}
          contentContainerStyle={styles.streamListContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.streamItem} onPress={() => handleJoinStream(item)}>
              <Image
                source={{ uri: item.pfp || DEFAULT_AVATAR }} // Use host's PFP or default
                style={styles.streamThumbnail}
              />
              <View style={styles.liveBadge}>
                <MaterialIcons name="fiber-manual-record" size={14} color={Colors.liveRed} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <View style={styles.streamInfoOverlay}>
                <Text style={styles.streamTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
                <Text style={styles.streamHost}>{item.host_name || 'Unknown Host'}</Text>
                <View style={styles.viewerCountContainer}>
                  <Ionicons name="eye" size={14} color={Colors.backgroundWhite} />
                  <Text style={styles.viewerCountText}>{item.viewer_count || Math.floor(Math.random() * 156) }</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal for entering stream title */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={goLiveModalVisible}
        onRequestClose={() => setGoLiveModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Describe Your Stream</Text>
            <TextInput
              style={styles.input}
              onChangeText={setStreamTitle}
              value={streamTitle}
              placeholder="Enter a title for your live stream..."
              placeholderTextColor={Colors.textLight}
            />
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={handleGoLive}
              disabled={loading} // Disable if loading
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.backgroundWhite} />
              ) : (
                <Text style={styles.modalButtonText}>Start Streaming</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalActionButton, styles.modalCancelButton]}
              onPress={() => setGoLiveModalVisible(false)}
              disabled={loading} // Disable if loading
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Modal for Alerts */}
      <CustomModal
        visible={isErrorModalVisible}
        message={modalMessage}
        onClose={() => setIsErrorModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 35,
    flex: 1,
    backgroundColor: Colors.backgroundWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.backgroundWhite,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  goLiveButton: {
    backgroundColor: Colors.primaryOrange,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  goLiveButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundWhite,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
  },
  noStreamsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noStreamsText: {
    marginTop: 15,
    fontSize: 18,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textMedium,
    textAlign: 'center',
  },
  noStreamsSubText: {
    marginTop: 5,
    fontSize: 14,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textLight,
    textAlign: 'center',
  },
  streamListContent: {
    paddingHorizontal: 10, // Adjust for grid spacing
    paddingTop: 15,
    paddingnBottom: 60,
  },
  streamGridRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  streamItem: {
    width: (screenWidth / 2) - 30, // Two columns with padding
    aspectRatio: 16 / 9, // Common video aspect ratio
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLightGray,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 10, // Adjust margin for grid
  },
  streamThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  liveBadgeText: {
    color: Colors.backgroundWhite,
    fontSize: 12,
    fontFamily: 'Jakarta-Bold',
    marginLeft: 4,
  },
  streamInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  streamTitle: {
    color: Colors.backgroundWhite,
    fontSize: 13,
    fontFamily: 'Jakarta-Bold',
  },
  streamHost: {
    color: Colors.textLight,
    fontSize: 12,
    fontFamily: 'Jakarta-Medium',
    marginTop: 2,
  },
  viewerCountContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  viewerCountText: {
    color: Colors.backgroundWhite,
    fontSize: 12,
    fontFamily: 'Jakarta-Medium',
    marginLeft: 4,
  },
  // Modal Styles (Go Live Modal)
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    width: '80%',
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 20,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: Colors.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textDark,
  },
  modalActionButton: {
    backgroundColor: Colors.primaryOrange,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalCancelButton: {
    backgroundColor: Colors.textLight, // Muted color for cancel
    shadowColor: Colors.textLight,
    shadowOpacity: 0.2,
    elevation: 4,
  },
  modalButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 16,
  },
});

export default LiveScreen;