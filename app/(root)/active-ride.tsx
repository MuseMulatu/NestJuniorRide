// (app)/(driver)/active-ride.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
//import { BarCodeScanner } from 'expo-barcode-scanner';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { HMSSDK, HMSConfig, HMSUpdateListenerActions } from '@100mslive/react-native-hms';
import { CustomModal } from '@/components/modals';
const API_BASE_URL = 'https://app.share-rides.com'; 
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
};

const { height: screenHeight } = Dimensions.get('window');
interface Child {
    id: string;
    name: string;
    photo_url: string;
    status: 'pending' | 'boarded';
}

const ActiveRideScreen = () => {
    const user = auth().currentUser;
    const hmsInstanceRef = useRef<HMSSDK | null>(null);

    const [rideDetails, setRideDetails] = useState(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    
    // QR Scanner State
    const [hasPermission, setHasPermission] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    
    // 100ms Broadcast State
    const [HmsView, setHmsView] = useState<any>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [localPeer, setLocalPeer] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
    
    // In (app)/(driver)/active-ride.tsx

    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates on unmounted component

        // Helper function to setup HMS listeners, just like in your other screens
        const setupHMSListeners = (hmsInstance) => {
            const onPeerUpdate = (data) => {
                if (isMounted && data.peer?.isLocal) {
                    console.log("[HMS LISTENER] Local Peer Update:", data.peer);
                    setLocalPeer(data.peer);
                }
            };
            const onTrackUpdate = (data) => {
                 if (isMounted && data.peer?.isLocal) {
                    console.log("[HMS LISTENER] Local Track Update:", data.track);
                    // The peer object in onTrackUpdate might be minimal, so it's often best to
                    // just update the whole peer object to ensure consistency.
                    setLocalPeer(data.peer);
                }
            };

            hmsInstance.addEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE, onPeerUpdate);
            hmsInstance.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, onTrackUpdate);
        };

        // Main initialization function
        const init = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // 1. Get Camera/Mic Permissions
                const camPermission = await Camera.requestCameraPermissionsAsync();
                const micPermission = await Camera.requestMicrophonePermissionsAsync();
                if (camPermission.status !== 'granted' || micPermission.status !== 'granted') {
                    throw new Error('Camera and Microphone permissions are required.');
                }
                setHasPermission(true);

                // 2. Build the HMS SDK instance and set up listeners
                console.log('[HMS SDK] Building instance...');
                const hms = await HMSSDK.build();
                if (!isMounted) return; // Check if component unmounted during async build
                
                hmsInstanceRef.current = hms;
                setHmsView(() => hms.HmsView);
                setupHMSListeners(hms);
                console.log('[HMS SDK] Instance built and listeners attached.');

                // 3. Fetch the ride data
                console.log('[DATA] Fetching ride data for driver:', user.uid);
                const response = await axios.get(`${API_BASE_URL}/api/driver/assigned-ride/${user.uid}`);
                if (!isMounted) return;

                console.log('[DATA] Backend responded successfully.');
                const fetchedChildren = response.data.children.map(c => ({ ...c, status: 'pending' }));
                setRideDetails(response.data.ride);
                setChildren(fetchedChildren);

            } catch (error) {
                if (isMounted) {
                    console.error('[INIT ERROR]', error.response?.data || error.message);
                    setModalMessage(error.response?.data?.message || error.message || "An error occurred during setup.");
                    setModalVisible(true);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        init();

        // Cleanup function
        return () => {
            isMounted = false;
            console.log('[CLEANUP] Leaving HMS room and removing listeners.');
            hmsInstanceRef.current?.leave();
            hmsInstanceRef.current?.removeAllListeners();
        };
    }, [user]);
    
    const handleBarCodeScanned = async ({ type, data }) => {
        setIsScanning(false);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/school-rides/checkin`, {
                rideId: rideDetails.id,
                childQrId: data,
            });
            
            // Update UI instantly
            setChildren(prev => prev.map(child => 
                child.id === response.data.childId ? { ...child, status: 'boarded' } : child
            ));
            Alert.alert("Success", "Child has been checked in.");
        } catch (error) {
            Alert.alert("Scan Failed", error.response?.data?.error || "Could not process QR code.");
        }
    };
    // In (app)/(driver)/active-ride.tsx

    const startBroadcast = useCallback(async () => {
        if (!rideDetails?.hms_room_id || !user || !hmsInstanceRef.current) {
            Alert.alert("Error", "Broadcast service is not ready or ride is not private.");
            return;
        }

        try {
            setIsBroadcasting(true);
            
            console.log('[BROADCAST] Fetching host token...');
            const tokenRes = await axios.get(`${API_BASE_URL}/api/school-rides/${rideDetails.id}/host-token`, {
                params: { userId: user.uid, userName: user.displayName || "Driver" }
            });
            const token = tokenRes.data.token;
            
            console.log('[BROADCAST] Token received. Joining room...');
            const hmsConfig = new HMSConfig({ authToken: token, username: user.displayName ?? "Driver" });
            await hmsInstanceRef.current.join(hmsConfig);
            console.log('[BROADCAST] Join command issued successfully.');

        } catch (e) {
            console.error("Broadcast Start Error:", e);
            Alert.alert("Broadcast Failed", "Could not start the live stream.");
            setIsBroadcasting(false);
        }
    }, [rideDetails, user]); // Dependencies are correct

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;
    if (!rideDetails) return <View style={styles.coyyyntainer}><Text>No active ride.</Text></View>;

    const localTrackId = localPeer?.videoTrack?.trackId;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Active Ride' }} />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{rideDetails.ride_type === 'private' ? 'Private Ride' : 'Shared Route'}</Text>
                {rideDetails.ride_type === 'private' && !isBroadcasting && (
                    <TouchableOpacity style={styles.broadcastButton} onPress={startBroadcast}>
                        <Ionicons name="videocam" size={20} color="white" />
                        <Text style={styles.broadcastButtonText}>Start Broadcast</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isBroadcasting && HmsView && localTrackId && (
                <View style={styles.broadcastView}>
                    <HmsView trackId={localTrackId} style={StyleSheet.absoluteFill} mirror={true} />
                    <Text style={styles.liveBadge}>LIVE</Text>
                </View>
            )}

            <FlatList
                data={children}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.childCard}>
                        <Image source={{ uri: item.photo_url || 'https://placehold.co/100x100' }} style={styles.childAvatar} />
                        <Text style={styles.childName}>{item.name}</Text>
                        <View style={{ flex: 1 }} />
                        {item.status === 'boarded' ? (
                             <View style={styles.statusChipBoarded}>
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text style={styles.statusChipText}>On Board</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.scanButton} onPress={() => setIsScanning(true)}>
                                <Ionicons name="qr-code" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                ListHeaderComponent={<Text style={styles.listHeader}>Passenger List</Text>}
            />

            <Modal visible={isScanning} animationType="slide">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {hasPermission === null && <Text>Requesting camera permission...</Text>}
                    {hasPermission === false && <Text>No access to camera.</Text>}

                    <TouchableOpacity style={styles.closeScannerButton} onPress={() => setIsScanning(false)}>
                        <Text style={{ color: 'white', fontSize: 18 }}>Cancel</Text>
                    </TouchableOpacity>
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
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundWhite,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Colors.textDark,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.backgroundWhite,
    },
    broadcastButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondaryTeal,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 8,
    },
    broadcastButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    broadcastView: {
        height: screenHeight * 0.25,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: Colors.liveRed,
        color: 'white',
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        fontSize: 12,
        overflow: 'hidden', // Ensures rounded corners on iOS
    },
    listHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.textMedium,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        backgroundColor: Colors.backgroundLightGray,
    },
    childCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.backgroundWhite,
    },
    childAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: Colors.backgroundLightGray,
    },
    childName: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.textDark,
    },
    statusChipBoarded: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successGreen,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    statusChipText: {
        color: 'white',
        fontWeight: 'bold',
    },
    scanButton: {
        backgroundColor: Colors.primaryOrange,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeScannerButton: {
        position: 'absolute',
        bottom: 50,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
    }
});

export default ActiveRideScreen;