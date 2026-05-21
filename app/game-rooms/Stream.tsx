import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Button, ActivityIndicator, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { io } from 'socket.io-client';
import {
  HmsRoomProvider,
  useHMSRoom,
  HMSView,
  HMSTrackSource,
  HMSTrackType
} from '@100mslive/react-native-hms';
  const user = auth().currentUser;
  const userId = user?.uid;
 // --- /screens/StreamScreen.js ---

// Placeholder for the actual 100ms view component
//const HMSView = (props) => <View {...props} />;
const StreamComponent = () => {
  const user = auth()?.currentUser;
  const userId = user?.uid;
  const router = useRouter();
  const { streamId, channelName, role } = useLocalSearchParams();
  const [hmsToken, setHmsToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    hmsInstance,
    join,
    leave,
    localPeer,
    remotePeers,
  } = useHMSRoom(); // This hook should now be correctly available

  useEffect(() => {
    const getTokenAndJoin = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${API_URL}/api/rtc/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userId}`,
          },
          body: JSON.stringify({ role, room_id: channelName }),
        });

        const data = await response.json();
        if (!response.ok || !data.token) {
          throw new Error(data.message || 'Failed to get auth token');
        }
        setHmsToken(data.token);

        await join({
          userName: user?.displayName || user?.email || `User_${userId}`,
          authToken: data.token,
        });

      } catch (error) {
        console.error("Error joining stream:", error);
        Alert.alert("Error", `Could not join the stream: ${error.message || 'Unknown error'}`);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (user && userId && channelName && role) {
      getTokenAndJoin();
    } else {
        Alert.alert("Error", "Missing stream parameters or user information.");
        router.back();
    }


    return () => {
      if (hmsInstance && hmsInstance.isConnected) {
         leave();
      }
    };
  }, [userId, channelName, role, hmsInstance]);

  const localVideoTrack = localPeer?.videoTrack;
  const remoteVideoTrack = remotePeers.find(peer => peer.videoTrack)?.videoTrack; // Basic logic for one remote viewer

  if (loading) {
    return (
      <SafeAreaView style={styles.streamContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Joining stream...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.streamContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      {role === 'broadcaster' && localVideoTrack ? (
        <HMSView
          style={styles.hmsView}
          trackId={localVideoTrack.id}
          mirror={true}
        />
      ) : role === 'viewer' && remoteVideoTrack ? (
        <HMSView
          style={styles.hmsView}
          trackId={remoteVideoTrack.id}
          mirror={false}
        />
      ) : (
        <View style={styles.hmsViewPlaceholder}>
          <Text style={styles.infoText}>
            {loading ? "Connecting..." : "No live video available."}
          </Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.streamIdText}>Stream ID: {streamId}</Text>
          {role === 'broadcaster' && (
            <TouchableOpacity onPress={() => { /* Implement end stream logic */ Alert.alert("End Stream", "You would call your backend /api/streams/end here. Make sure to pass streamId."); }} style={styles.endStreamButton}>
              <Text style={styles.endStreamButtonText}>End Stream</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.chatContainer}>
          <Text style={styles.chatMessage}>User1: This is awesome!</Text>
          <Text style={styles.chatMessage}>User2: Welcome!</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// This is the exported component that wraps StreamComponent with HmsRoomProvider
const StreamScreen = (props) => {
  return (
    <HmsRoomProvider>
      <StreamComponent {...props} />
    </HmsRoomProvider>
  );
};

export default StreamScreen; // Ensure this is the default export

const styles = StyleSheet.create({
  streamContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hmsView: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  hmsViewPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  endStreamButton: {
    backgroundColor: '#e53935',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  endStreamButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  streamIdText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  chatContainer: {
    width: '100%',
    maxHeight: '30%',
    justifyContent: 'flex-end',
  },
  chatMessage: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  }
});