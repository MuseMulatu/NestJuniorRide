import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { io } from 'socket.io-client';
import * as HMS from '@100mslive/react-native-hms';
import { HMSView } from '@100mslive/react-native-hms'; // <--- Change this line

const BattleScreen = () => {

  const user = auth()?.currentUser;
  const userId = user?.uid;
  const router = useRouter();
  const { streamId, channelName, role, battleParticipants } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [localPeer, setLocalPeer] = useState(null);
  const [remotePeers, setRemotePeers] = useState([]); // All peers in the room
  const [battleHost1, setBattleHost1] = useState(null);
  const [battleHost2, setBattleHost2] = useState(null);
  const hmsSDK = useRef(null); // Reference to the HMSSDK instance

  // Assume battleParticipants are passed as an array of Peer objects relevant to the battle

  const initializeBattleRoom = useCallback(async () => {
    setLoading(true);
    try {
      const hmsInstance = new HMS.default();
      hmsSDK.current = hmsInstance;

      // Listeners for peer and track updates remain essential
      hmsInstance.addListener(HMS.HMSUpdateListenerActions.ON_PEER_UPDATE, ({ peer, update }) => {
        console.log("Battle ON_PEER_UPDATE:", peer.name, update);
        if (peer.isLocal) {
          setLocalPeer(peer);
        }
        setRemotePeers(prev => {
            if (update === HMS.HMSPeerUpdate.PEER_JOINED) {
              if (!prev.some(p => p.peerID === peer.peerID)) {
                return [...prev, peer];
              }
              return prev;
            } else if (update === HMS.HMSPeerUpdate.PEER_LEFT) {
              return prev.filter(p => p.peerID !== peer.peerID);
            } else {
              return prev.map(p => p.peerID === peer.peerID ? peer : p);
            }
          });
      });

      hmsInstance.addListener(HMS.HMSUpdateListenerActions.ON_TRACK_UPDATE, ({ track, peer, update }) => {
        console.log("Battle ON_TRACK_UPDATE:", track.id, peer.name, update);
        if (peer.isLocal) {
          setLocalPeer(peer);
        } else {
          setRemotePeers(prev => prev.map(p => p.peerID === peer.peerID ? peer : p));
        }
      });

      hmsInstance.addListener(HMS.HMSUpdateListenerActions.ON_JOIN, ({ localPeer: joinedLocalPeer, remotePeers: initialRemotePeers }) => {
        console.log("Battle ON_JOIN successful!");
        setLocalPeer(joinedLocalPeer);
        setRemotePeers(initialRemotePeers || []);
      });

      hmsInstance.addListener(HMS.HMSUpdateListenerActions.ON_ERROR, (error) => {
        console.error("HMS Battle Error:", error);
        Alert.alert("Battle Error", error.description || "An unexpected error occurred in battle.");
        if (error.isTerminal) {
          router.goBack(); // Exit battle if fatal error
        }
      });

      // Join the room (already joined in LiveStreamScreen, but ensuring we're connected)
      // This might be a no-op if already joined, but good for robust setup.
      const response = await fetch(`${API_URL}/api/rtc/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({ role: role, room_id: channelName }), // Use the role user came with (broadcaster/co-host)
      });

      const data = await response.json();
      if (!response.ok || !data.token) {
        throw new Error(data.message || 'Failed to get auth token for battle');
      }
      const hmsToken = data.token;

      const config = new HMS.HMSConfig({
        userName: user?.displayName || user?.email || `User_${userId}`,
        authToken: hmsToken,
      });
      await hmsInstance.join(config); // Re-join or confirm join

      const initialRoom = await hmsInstance.getRoom();
      setLocalPeer(initialRoom.localPeer);
      setRemotePeers(initialRoom.remotePeers);

      // Identify battle participants based on passed data or their roles
      const currentBattleHost1 = battleParticipants.find(p => p.peerID === localPeer?.peerID) || initialRoom.remotePeers.find(p => p.peerID === battleParticipants[0]?.peerID);
      const currentBattleHost2 = battleParticipants.find(p => p.peerID !== localPeer?.peerID) || initialRoom.remotePeers.find(p => p.peerID === battleParticipants[1]?.peerID);

      setBattleHost1(currentBattleHost1);
      setBattleHost2(currentBattleHost2);

      Alert.alert("Battle Mode", "You have entered battle mode!");

    } catch (error) {
      console.error("Error setting up battle:", error);
      Alert.alert("Error", `Could not enter battle mode: ${error.message || 'Unknown error'}`);
      router.goBack();
    } finally {
      setLoading(false);
    }
  }, [userId, channelName, role, user, battleParticipants]);

  useEffect(() => {
    initializeBattleRoom();

    return () => {
      console.log("Leaving battle mode and cleaning up listeners.");
      if (hmsSDK.current) {
        // Decide if we should leave the room entirely or just change role back
        // For simplicity, we'll assume leaving the battle means returning to the previous LiveStreamScreen role.
        // The LiveStreamScreen's useEffect will handle full room cleanup if user navigates back to Home.
        HMS.HMSManagerModule.removeListeners(HMS.HMSUpdateListenerActions.ON_PEER_UPDATE);
        HMS.HMSManagerModule.removeListeners(HMS.HMSUpdateListenerActions.ON_TRACK_UPDATE);
        HMS.HMSManagerModule.removeListeners(HMS.HMSUpdateListenerActions.ON_JOIN);
        HMS.HMSManagerModule.removeListeners(HMS.HMSUpdateListenerActions.ON_ERROR);
      }
    };
  }, [initializeBattleRoom]);

  const leaveBattle = async () => {
    if (!hmsSDK.current || !localPeer) return;
    try {
      // Change local peer's role back to original role (broadcaster/co-host)
      const originalRole = (await HMS.HMSManagerModule.getRoles()).find(r => r.name === role); // Role user had when entering battle
      if (originalRole) {
        await HMS.HMSManagerModule.changeRole(originalRole);
        Alert.alert("Left Battle", "You have returned to your previous stream status.");
        router.push('LiveStream', { streamId, channelName, role: originalRole.name }); // Go back to original stream screen
      } else {
        Alert.alert("Error", "Original role not found.");
        router.goBack(); // Fallback to home if role not found
      }
    } catch (e) {
      console.error("Failed to leave battle:", e);
      Alert.alert("Error", `Failed to leave battle: ${e.message}`);
    }
  };

  const getParticipantTrack = (peer) => {
    return peer?.videoTrack; // Assuming battle participants will always have a video track
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Preparing for battle...</Text>
      </SafeAreaView>
    );
  }

  const host1Track = getParticipantTrack(battleHost1?.peerID === localPeer?.peerID ? localPeer : remotePeers.find(p => p.peerID === battleHost1?.peerID));
  const host2Track = getParticipantTrack(battleHost2?.peerID === localPeer?.peerID ? localPeer : remotePeers.find(p => p.peerID === battleHost2?.peerID));


  return (
    <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ title: 'Battle' }} />
      <View style={styles.battleHeader}>
        <Text style={styles.battleTitle}>⚡️ Live Battle! ⚡️</Text>
        <TouchableOpacity onPress={leaveBattle} style={styles.leaveBattleButton}>
          <Text style={styles.leaveBattleButtonText}>Leave Battle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoGrid}>
        <View style={styles.videoParticipant}>
          {host1Track ? (
            <HMSView
              style={styles.battleVideoView}
              trackId={host1Track.id}
              mirror={host1Track.peerID === localPeer?.peerID}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.infoText}>{battleHost1?.name || 'Host 1'} No Video</Text>
            </View>
          )}
          <Text style={styles.participantName}>{battleHost1?.name || 'Host 1'}</Text>
          <Text style={styles.scoreText}>Score: 0</Text>
        </View>

        <View style={styles.vsTextContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.videoParticipant}>
          {host2Track ? (
            <HMSView
              style={styles.battleVideoView}
              trackId={host2Track.id}
              mirror={host2Track.peerID === localPeer?.peerID}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.infoText}>{battleHost2?.name || 'Host 2'} No Video</Text>
            </View>
          )}
          <Text style={styles.participantName}>{battleHost2?.name || 'Host 2'}</Text>
          <Text style={styles.scoreText}>Score: 0</Text>
        </View>
      </View>

      {/* Battle specific controls (e.g., voting, power-ups) would go here */}
      <View style={styles.battleControls}>
        <TouchableOpacity style={styles.battleActionButton}>
          <Text style={styles.battleActionButtonText}>Give Points</Text>
        </TouchableOpacity>
        {/* More battle specific UI */}
      </View>

      {/* Chat (perhaps battle specific chat) */}
      <View style={styles.chatContainer}>
        <Text style={styles.chatTitle}>Battle Chat</Text>
        {/* Implement real chat here */}
        <Text style={styles.chatMessage}>Spectator: Go Host 1!</Text>
        <Text style={styles.chatMessage}>Spectator: Host 2 rocks!</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFD700',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    position: 'absolute',
    top: 50,
    zIndex: 1,
  },
  battleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  leaveBattleButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  leaveBattleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    flex: 1, // Take up vertical space
    paddingTop: 100, // Account for header
  },
  videoParticipant: {
    alignItems: 'center',
    width: '45%',
  },
  battleVideoView: {
    width: '100%',
    aspectRatio: 9 / 16, // TikTok-like aspect ratio
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  participantName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoreText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  vsTextContainer: {
    marginHorizontal: 10,
  },
  vsText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  battleControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 20,
  },
  battleActionButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  battleActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatContainer: {
    width: '100%',
    height: 150, // Fixed height for battle chat
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
  },
  chatTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  chatMessage: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 3,
  },
});

export default BattleScreen;
