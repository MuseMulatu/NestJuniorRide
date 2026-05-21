import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Dimensions, FlatList, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { HMSSDK, HMSConfig, HMSUpdateListenerActions } from '@100mslive/react-native-hms';
import MapView, { Marker, Polyline } from 'react-native-maps';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
};// (app)/school-ride-details.tsx


// Interfaces matching backend responses
interface RideDetails {
    id: string;
    ride_type: 'private' | 'shared';
    status: string;
    pickup_address: string;
    dropoff_address: string;
    homeLat: number;
    homeLng: number;
    schoolLat: number;
    schoolLng: number;
    driverId: string;
    driver_name: string;
    driver_photo_url: string;
    vehicle_details: { make: string; model: string; plate: string; };
    hms_room_id: string | null;
}

interface ChatMessage {
    sender_id: string;
    sender_name: string;
    message: string;
    created_at: string;
}

const SchoolRideDetailsScreen = () => {
    const { rideId } = useLocalSearchParams();
    const user = auth().currentUser;
    const socketRef = useRef(null);
    const mapRef = useRef<MapView>(null);
    const hmsInstanceRef = useRef<HMSSDK | null>(null);

    const [details, setDetails] = useState<RideDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number }>({
  latitude: 8.99701464187966,
  longitude: 38.76623900609989,
});
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatVisible, setChatVisible] = useState(false);

     const [isHmsMaximized, setIsHmsMaximized] = useState(false);

    // --- HMS State ---
    const [HmsView, setHmsView] = useState<any>(null);
    const [hmsPeers, setHmsPeers] = useState<any[]>([]);
    const [isStreamVisible, setStreamVisible] = useState(false);


    // --- Main Data Fetching and Socket Setup ---
    useEffect(() => {
        let isMounted = true;
        
        const fetchDetailsAndSetup = async () => {
            if (!user) return;
            try {
              console.log("rideId", rideId)
                // Fetch initial ride details from the new endpoint
                const response = await axios.get(`${API_BASE_URL}/api/school-rides/${rideId}`);
                if (isMounted) {
                    setDetails(response.data);
                    // Set initial map region
                    // Set initial driver location if available from backend, otherwise wait for socket
                }
            } catch (error) {
              console.error("fetchDetailsAndSetup error", error)
                if (isMounted) Alert.alert("Error", "Could not load ride details.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const setupSockets = () => {
            if (socketRef.current) return;
            socketRef.current = io(API_BASE_URL);

            socketRef.current.on('connect', () => {
                socketRef.current.emit('joinSchoolRideRoom', rideId);
            });

            socketRef.current.on('newSchoolRideChatMessage', (msg: ChatMessage) => {
              console.log("msg", msg)
                if (isMounted) setMessages(prev => [msg, ...prev]);
            });

            socketRef.current.on('locationUpdate', (newLocation: { lat: number, lng: number }) => {
                console.log("lat", lat, "lng", lng)
                if (isMounted) {
                    const coords = { latitude: newLocation.lat, longitude: newLocation.lng };
                    setDriverLocation(coords);
                    mapRef.current?.animateToRegion({
                        ...coords,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    }, 1000);
                }
            });
        };

        fetchDetailsAndSetup();
        setupSockets();

        return () => {
            isMounted = false;
            socketRef.current?.disconnect();
            hmsInstanceRef.current?.leave();
            hmsInstanceRef.current?.removeAllListeners();
        };
    }, [rideId, user]);

    // --- HMS Live Stream Logic (adapted from your SpectatorViewScreen.tsx) ---
    const joinHMSStream = useCallback(async () => {
        if (!details?.hms_room_id || !user) {
            Alert.alert("No Stream", "A live stream is not available for this ride.");
            return;
        }

        try {
            setStreamVisible(true);
            const hmsInstance = await HMSSDK.build();
            hmsInstanceRef.current = hmsInstance;
            setHmsView(() => hmsInstance.HmsView);

            // --- THE FIX: ADDING ALL NECESSARY LISTENERS FROM YOUR WORKING FILE ---

            const onJoin = (data) => {
                // Set the initial list of peers when you join the room
                const initialPeers = data.room.peers;
                setHmsPeers(initialPeers);
            };

            const onUpdate = (data) => {
                // This robust update logic handles both peer and track updates
                setHmsPeers(prevPeers => {
                    const newPeers = [...prevPeers];
                    const peerIndex = newPeers.findIndex(p => p.peerID === data.peer.peerID);

                    // Merge track info into the peer object to ensure videoTrack is always up to date
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
                    return newPeers;
                });
            };

            hmsInstance.addEventListener(HMSUpdateListenerActions.ON_JOIN, onJoin); // Catches initial state
            hmsInstance.addEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE, onUpdate); // Catches metadata changes
            hmsInstance.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, onUpdate); // Catches video/audio turning on/off

            // --- END FIX ---

            const tokenRes = await axios.get(`${API_BASE_URL}/api/school-rides/${rideId}/viewer-token`, {
                params: { userId: user.uid, userName: user.displayName || "Parent" }
            });
            const token = tokenRes.data.token;

            const hmsConfig = new HMSConfig({ authToken: token, username: user.displayName || "Parent" });
            await hmsInstance.join(hmsConfig);
            setStreamVisible(true);

        } catch (e) {
            console.error("HMS Join Error:", e);
            Alert.alert("Stream Error", "Could not join the live broadcast.");
        }
    }, [details, user, rideId]);

    // --- Action Handlers ---
    const handleEmergency = () => { /* ... (same as your previous code) ... */ };
    const sendEmergencyAlert = async () => { /* ... (same as your previous code) ... */ };
    
    const handleSendChat = () => {
      const newMessage = {
      sender_id: user.uid,
      sender_name: user.displayName || 'Parent',
      message: chatInput,
      created_at: new Date().toISOString(),
    };
      setMessages(prev => [newMessage, ...prev]);
        if (chatInput.trim() && socketRef.current && user) {
            // socketRef.current.emit('sendSchoolRideChatMessage', {
            //     rideId,
            //     message: chatInput,
            //     user: { id: user.uid, username: user.displayName || 'Parent' }
            // });
            setChatInput('');
        }
    };


    // --- UI Rendering ---
    if (loading) {
        return <ActivityIndicator size="large" style={styles.loadingContainer} />;
    }

    if (!details) {
        return <View style={styles.loadingContainer}><Text>Ride not found.</Text></View>;
    }

  // --- NEW, MORE ROBUST CODE (from SpectatorViewScreen.tsx) ---
    const peerWithVideoTrack = hmsPeers.find(p => p.videoTrack?.trackId); //

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
{details && (
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                        latitude: (details.homeLat + details.schoolLat) / 2,
                        longitude: (details.homeLng + details.schoolLng) / 2,
                        latitudeDelta: Math.abs(details.homeLat - details.schoolLat) * 1.5,
                        longitudeDelta: Math.abs(details.homeLng - details.schoolLng) * 1.5,
                    }}
                >
                    {/* The Route */}
                    <Polyline
                        coordinates={[
                            { latitude: details.homeLat, longitude: details.homeLng },
                            { latitude: details.schoolLat, longitude: details.schoolLng }
                        ]}
                        strokeColor={Colors.secondaryTeal}
                        strokeWidth={5}
                        lineDashPattern={[5, 5]}
                    />
                    
                    {/* Markers */}
                    <Marker coordinate={{ latitude: details.homeLat, longitude: details.homeLng }} title="Home">
                        <Ionicons name="home" size={32} color={Colors.successGreen} />
                    </Marker>
                    <Marker coordinate={{ latitude: details.schoolLat, longitude: details.schoolLng }} title="School">
                        <MaterialCommunityIcons name="school" size={32} color={Colors.primaryOrange} />
                    </Marker>
                    {driverLocation && (
                        <Marker coordinate={driverLocation} title="Driver">
                            <MaterialCommunityIcons name="bus-school" size={40} color={Colors.textDark} />
                        </Marker>
                    )}
                </MapView>
            )}

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Live Ride Details</Text>
            </View>

            {isStreamVisible && (
                <View style={[styles.liveBroadcastContainer, isHmsMaximized && styles.liveBroadcastMaximized]}>
                    {HmsView && peerWithVideoTrack ? (
                        <HmsView
                            trackId={peerWithVideoTrack.videoTrack.trackId}
                            style={styles.liveBroadcastVideo}
                        />
                    ) : (
                        <View style={styles.videoPlaceholder}>
                            <ActivityIndicator color="#fff" />
                            <Text style={{color: 'white', marginTop: 10}}>Connecting...</Text>
                        </View>
                    )}
                    <View style={styles.videoControls}>
                         <TouchableOpacity style={styles.videoControlButton} onPress={() => setIsHmsMaximized(!isHmsMaximized)}>
                            <Ionicons name={isHmsMaximized ? "contract" : "expand"} size={18} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.videoControlButton} onPress={() => setStreamVisible(false)}>
                            <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.bottomSheet}>
                <View style={styles.driverInfoCard}>
                    <View style={styles.driverInfoCardLeft}>
                        <Image source={{ uri: details.driver_photo_url || 'https://placehold.co/100x100' }} style={styles.driverAvatar} />
                        <View>
                            <Text style={styles.driverName}>{details.driver_name}</Text>
                            <Text style={styles.vehicleDetails}>{details.vehicle_details?.make} {details.vehicle_details?.model} </Text>
                             <Text style={styles.vehicleDetails}>Plate: ({details.vehicle_details?.plate_number})</Text>
                        </View>
                    </View>
                    <View style={styles.driverInfoCardRight}>
                        {details.ride_type === 'private' && (
                            <TouchableOpacity style={styles.broadcastButton} onPress={joinHMSStream}>
                                <MaterialCommunityIcons name="cctv" size={18} color={Colors.secondaryTeal} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.chatButton} onPress={() => setChatVisible(true)}>
                            <Ionicons name="chatbubbles" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
                    <Ionicons name="warning" size={24} color="white" />
                    <Text style={styles.emergencyButtonText}>Emergency Alert</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={isChatVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <View style={styles.chatModalContainer}>
                        <View style={styles.chatModalContent}>
                            <TouchableOpacity style={styles.closeChatButton} onPress={() => setChatVisible(false)}>
                                <Text style={styles.closeChatText}>Close Chat</Text>
                            </TouchableOpacity>
                            <FlatList
                                data={messages}
                                inverted
                                keyExtractor={(item, index) => `${item.created_at}-${index}`}
                                renderItem={({ item }) => (
                                    <View style={[styles.chatBubble, item.sender_id === user.uid ? styles.myMessage : styles.theirMessage]}>
                                        <Text style={styles.chatSender}>{item.sender_name}</Text>
                                        <Text style={styles.chatMessage}>{item.message}</Text>
                                    </View>
                                )}
                            />
                            <View style={styles.chatInputContainer}>
                                <TextInput
                                    style={styles.chatInput}
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                />
                                <TouchableOpacity style={styles.sendButton} onPress={handleSendChat}>
                                    <Ionicons name="send" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    // ... (Add all necessary styles from your provided `school-ride-details.tsx` and the new chat/video styles)
    container: { flex: 1 },
    header: { 
        position: 'absolute', top: 0, left: 0, right: 0, 
        paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, 
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    // Live Video Styles
    liveBroadcastContainer: {
        position: 'absolute',
        top: 120,
        right: 15,
        width: screenWidth * 0.35,
        height: screenHeight * 0.2,
        backgroundColor: 'black',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 10,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    liveBroadcastMaximized: {
        top: 120, left: 15, right: 15,
        width: screenWidth - 30,
        height: (screenWidth - 30) * 9 / 16, // 16:9 aspect ratio
    },
    liveBroadcastVideo: { flex: 1 },
    videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    videoControls: {
        position: 'absolute',
        top: 5,
        right: 5,
        flexDirection: 'row',
        gap: 8,
    },
    videoControlButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
        borderRadius: 15,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { ...StyleSheet.absoluteFillObject },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 10,
    },
    driverInfoCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    driverInfoCardLeft: { flexDirection: 'row', alignItems: 'center' },
    driverAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
    driverName: { fontSize: 18, fontWeight: 'bold' },
    vehicleDetails: { fontSize: 14, color: Colors.textMedium, marginTop: 4 },
    driverInfoCardRight: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
    broadcastButton: { padding: 10, backgroundColor: Colors.backgroundLightGray, borderRadius: 25 },
    chatButton: { padding: 10, backgroundColor: Colors.secondaryTeal, borderRadius: 25 },
    emergencyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.warningRed, paddingVertical: 15, borderRadius: 12, columnGap: 8 },
    emergencyButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    // Live Video Styles
    liveBroadcastContainer: {
        position: 'absolute', top: 60, right: 15, width: screenWidth * 0.4, height: screenHeight * 0.25,
        backgroundColor: 'black', borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'white', zIndex: 10,
    },
    liveBroadcastVideo: { flex: 1 },
    closeStreamButton: { position: 'absolute', top: 5, right: 5, zIndex: 11 },
    // Chat Modal Styles
    chatModalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    chatModalContent: { height: '80%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 15 },
    closeChatButton: { alignSelf: 'center', marginBottom: 10 },
    closeChatText: { color: Colors.secondaryTeal, fontWeight: 'bold' },
    chatBubble: { padding: 10, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
    myMessage: { backgroundColor: Colors.secondaryTeal, alignSelf: 'flex-end' },
    theirMessage: { backgroundColor: Colors.backgroundLightGray, alignSelf: 'flex-start' },
    chatSender: { fontWeight: 'bold', marginBottom: 4, color: '#333' },
    chatMessage: { fontSize: 15, color: 'white' }, // color will be overridden for theirMessage
    chatInputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
    chatInput: { flex: 1, backgroundColor: Colors.backgroundLightGray, borderRadius: 20, paddingHorizontal: 15, height: 40 },
    sendButton: { backgroundColor: Colors.primaryOrange, padding: 8, borderRadius: 20, marginLeft: 10 },
});

export default SchoolRideDetailsScreen;
