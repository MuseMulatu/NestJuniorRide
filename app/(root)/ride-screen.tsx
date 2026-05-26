import { View, Text, StyleSheet, Alert, Animated, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import firestore from '@react-native-firebase/firestore';
import { useLocationStore, useDriverDetailsStore } from "@/store";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { fetchDistanceAndTime } from "@/lib/utils";
import axios from "axios";
import RideProgress from "@/components/RideProgress";
import DriverCard from "@/components/DriverCard";
import EmergencyAssist from "@/components/EmergencyAssist";
import { FontAwesome6, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import auth from '@react-native-firebase/auth';


const Colors = {
    primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C", backgroundWhite: "#FFFFFF"
};

const ParentActiveRideScreen = () => {
  const user = auth().currentUser;
  const { rideRequestId, dbDestinationLat, dbDestinationLng, roomId } = useLocalSearchParams();
  const { driverprofileImage, drivername, driverpnumber, carModel, plateNumber, ratingSum, totalRatings } = useDriverDetailsStore();
  
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);  
  const [timeTaken, setTimeTaken] = useState(" ");
  
  const sheetRef = useRef(null);
  const snapPoints = ['35%', '60%']; 

  const { userLatitude, userLongitude, destinationLatitude, destinationLongitude, userAddress, destinationAddress } = useLocationStore() 

  const handleEmergency = async () => {
    // Keep your existing emergency logic
    Alert.alert("Emergency Alert Sent", "Our team has been notified of the vehicle's location.");
  };



  const handleLiveLookIn = () => {
      // Connect to the 100ms stream using the roomId passed from the dashboard
      router.push({ 
          pathname: '/game-rooms/SpectatorViewScreen', 
          params: { roomId: roomId || 'room-almaz-123' } 
      });
  };

  // Fetch OSRM Route
  useEffect(() => {
    if (userLatitude && userLongitude && destinationLatitude && destinationLongitude) {
      const fetchOSRMRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${userLongitude},${userLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson`;
          const response = await axios.get(url);
          const coords = response.data.routes[0].geometry.coordinates;
          const formattedCoords = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
          setPathCoordinates(formattedCoords);
        } catch (error) {
          console.error("Error fetching OSRM route:", error);
        }
      };
      fetchOSRMRoute();
    }
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  if (!userLatitude || !userLongitude) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontFamily: 'Jakarta-Medium' }}>Loading live tracking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ELABORATE MAP VIEW */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        showsCompass={false}
        toolbarEnabled={false}
        showsUserLocation={true}
        initialRegion={{
          latitude: userLatitude || 0,
          longitude: userLongitude || 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Origin Marker (Home) */}
        {userLatitude && userLongitude && (
          <Marker coordinate={{latitude: userLatitude, longitude: userLongitude}} title="Pickup">
            <View style={styles.userMarker}>
              <FontAwesome6 name="house-chimney" size={24} color={Colors.primaryOrange} />
            </View>
          </Marker>
        )}
        
        {/* Destination Marker (School) */}
        {destinationLatitude && destinationLongitude && (
          <Marker title="School" coordinate={{latitude: destinationLatitude, longitude: destinationLongitude}}>
            <View style={styles.destinationMarker}>
              <MaterialIcons name="school" size={32} color={Colors.secondaryTeal} />
            </View>
          </Marker>
        )}

        {/* Polylines for Route */}
        {pathCoordinates.length > 0 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor={Colors.secondaryTeal}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Floating Headers */}
      <View style={styles.header}>
        <RideProgress distance={distance || 9} time={timeTaken || 28} price={0} />
      </View>

      <View style={styles.header2}>
        <EmergencyAssist onPress={handleEmergency} />
      </View>

      {/* BOTTOM SHEET - PARENT DASHBOARD */}
      <BottomSheet ref={sheetRef} index={0} snapPoints={snapPoints} backgroundComponent={({ style }) => <View style={[style, styles.sheetBackground]} />}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          
          {/* Driver Details */}
          <DriverCard 
            name={drivername || "Almaz (CareDriver)" }
            rating={(ratingSum / totalRatings) || 4.9}
            carModel={carModel || "Toyota Avanza" }
            plateNumber={plateNumber || "AA-B31234-03" }
            profileImage={driverprofileImage || null}
          />
          
          <View style={styles.divider} />

          {/* NEST JUNIOR: 100ms Live Look-in Trigger */}
          <Text style={styles.sectionTitle}>Child Safety & Verification</Text>
          
          <TouchableOpacity style={styles.lookInBtn} onPress={handleLiveLookIn}>
              <View style={styles.lookInIconBox}>
                 <Ionicons name="videocam" size={28} color={Colors.backgroundWhite} />
              </View>
              <View style={styles.lookInTextBox}>
                  <Text style={styles.lookInTitle}>Request Live Look-In</Text>
                  <Text style={styles.lookInDesc}>Tap to connect to the vehicle's interior dashcam.</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textDark} />
          </TouchableOpacity>

        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { ...StyleSheet.absoluteFillObject },
  header: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header2: { position: 'absolute', top: 210, right: 10 },
  sheetBackground: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  sheetContent: { padding: 24, paddingBottom: 48 },
  userMarker: { backgroundColor: '#FFF', padding: 8, borderRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, borderWidth: 2, borderColor: Colors.primaryOrange },
  destinationMarker: { backgroundColor: '#FFF', padding: 8, borderRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, borderWidth: 2, borderColor: Colors.secondaryTeal },
  divider: { height: 1, backgroundColor: '#ECECEC', marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 12 },
  lookInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 16, borderRadius: 16 },
  lookInIconBox: { backgroundColor: Colors.successGreen, padding: 10, borderRadius: 12, marginRight: 16 },
  lookInTextBox: { flex: 1 },
  lookInTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: '#166534' },
  lookInDesc: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: '#15803D', marginTop: 4 }
});

const mapStyle = [
  { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "visibility": "simplified" }] }
];

export default ParentActiveRideScreen;