import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons, FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import axios from "axios";
import { useLocationStore, useDriverDetailsStore } from "@/store";

const Colors = {
    primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C", 
    textMedium: "#4A5568", backgroundWhite: "#FFFFFF", successGreen: "#22C55E"
};

export default function LiveFeedTab() {
  const { userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();
  const { drivername, carModel, plateNumber } = useDriverDetailsStore();
  
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const sheetRef = useRef(null);
  const snapPoints = ['35%', '60%'];

  // Fetch Route from Home to School
  useEffect(() => {
    if (userLatitude && userLongitude && destinationLatitude && destinationLongitude) {
      const fetchOSRMRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${userLongitude},${userLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson`;
          const response = await axios.get(url);
          const coords = response.data.routes[0].geometry.coordinates;
          setPathCoordinates(coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
        } catch (error) {
          console.error("Error fetching route:", error);
        }
      };
      fetchOSRMRoute();
    }
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);


const requestLiveStream = async () => {
    setConnecting(true);
    try {
        const user = auth().currentUser;
        // In a real scenario, this roomId comes from your active ride database.
        // For testing, ensure this room actually exists in your 100ms dashboard.
        const activeRoomId = 'your_test_room_id_here'; 

        // 1. Fetch the secure token from your Zabiya backend
        const response = await axios.get('https://api.zabiya.com/api/nest-junior/hms-token', {
            params: {
                roomId: activeRoomId,
                role: 'viewer', // The parent is just a viewer
                userId: user?.uid || 'parent_anonymous'
            }
        });

        const secureToken = response.data.token;

        setConnecting(false);
        
        // 2. Pass the secure token AND roomId to your 100ms Viewer Screen
        router.push({ 
            pathname: '/game-rooms/SpectatorViewScreen', 
            params: { 
                roomId: activeRoomId,
                token: secureToken 
            } 
        });

    } catch (error) {
        setConnecting(false);
        console.error("Live Stream Auth Error:", error);
        Alert.alert("Connection Failed", "Could not securely connect to the vehicle.");
    }
};


  if (!userLatitude || !destinationLatitude) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="map-outline" size={60} color={Colors.textLight} />
        <Text style={styles.noActiveRideText}>No active rides at the moment.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* ELABORATE MAP TRACKING */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        initialRegion={{
          latitude: userLatitude, longitude: userLongitude,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={{latitude: userLatitude, longitude: userLongitude}} title="Home">
          <View style={styles.userMarker}><FontAwesome6 name="house-chimney" size={24} color={Colors.primaryOrange} /></View>
        </Marker>
        
        <Marker coordinate={{latitude: destinationLatitude, longitude: destinationLongitude}} title="School">
          <View style={styles.destinationMarker}><MaterialIcons name="school" size={32} color={Colors.secondaryTeal} /></View>
        </Marker>

        {pathCoordinates.length > 0 && (
          <Polyline coordinates={pathCoordinates} strokeColor={Colors.secondaryTeal} strokeWidth={4} />
        )}
      </MapView>

      <View style={styles.liveIndicatorHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>Active Ride</Text>
          </View>
      </View>

      {/* DASHBOARD BOTTOM SHEET */}
      <BottomSheet ref={sheetRef} index={0} snapPoints={snapPoints} backgroundStyle={{ borderRadius: 24 }}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          
          <View style={styles.driverInfoBox}>
             <Text style={styles.driverName}>{drivername || "Almaz (CareDriver)"}</Text>
             <Text style={styles.carDetails}>{carModel || "Toyota Avanza"} • {plateNumber || "AA-B312"}</Text>
          </View>

          <Text style={styles.sectionTitle}>Child Safety & Verification</Text>
          
          {/* THE 100ms TRIGGER BUTTON */}
          <TouchableOpacity style={styles.lookInBtn} onPress={requestLiveStream} disabled={connecting}>
              <View style={styles.lookInIconBox}>
                 {connecting ? <ActivityIndicator color={Colors.backgroundWhite} /> : <Ionicons name="videocam" size={28} color={Colors.backgroundWhite} />}
              </View>
              <View style={styles.lookInTextBox}>
                  <Text style={styles.lookInTitle}>Request Live Look-In</Text>
                  <Text style={styles.lookInDesc}>Connect to the vehicle's interior dashcam.</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textDark} />
          </TouchableOpacity>

        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noActiveRideText: { marginTop: 16, fontSize: 16, fontFamily: 'Jakarta-Medium', color: '#718096' },
  map: { ...StyleSheet.absoluteFillObject },
  userMarker: { backgroundColor: '#FFF', padding: 8, borderRadius: 40, borderWidth: 2, borderColor: Colors.primaryOrange },
  destinationMarker: { backgroundColor: '#FFF', padding: 8, borderRadius: 40, borderWidth: 2, borderColor: Colors.secondaryTeal },
  liveIndicatorHeader: { position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warningRed, marginRight: 8 },
  liveText: { color: Colors.warningRed, fontSize: 14, fontFamily: 'Jakarta-Bold' },
  sheetContent: { padding: 24, paddingBottom: 48 },
  driverInfoBox: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  driverName: { fontSize: 20, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  carDetails: { fontSize: 14, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 12 },
  lookInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 16, borderRadius: 16 },
  lookInIconBox: { backgroundColor: Colors.successGreen, padding: 10, borderRadius: 12, marginRight: 16, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  lookInTextBox: { flex: 1 },
  lookInTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: '#166534' },
  lookInDesc: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: '#15803D', marginTop: 4 }
});