import { View, Text, Button, TouchableOpacity, Image, Alert, StyleSheet, Modal, Animated } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Link } from 'expo-router';
import { useEffect, useState } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import firestore from '@react-native-firebase/firestore'; // RNF Firestore
import QRCode from 'react-native-qrcode-svg';
import CancelRideModal from "@/components/cancelRideModal"
import { useLocationStore, usePhoneNumberStore, useGroupStore, useSharedDriverStore, useDriverDetailsStore } from "@/store";
import { haversineDistance,} from "@/firebaseconf";
import axios from 'axios';
import { decode, encode } from "@googlemaps/polyline-codec";
import { PROVIDER_GOOGLE } from "react-native-maps";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import * as Linking from 'expo-linking';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import MapViewDirections from "react-native-maps-directions";
import auth from '@react-native-firebase/auth';

import { fetchDistanceAndTime, handleCall, handleFindSharedRide, trackDriverLocation} from "@/lib/utils";

const WaitScreen =  () => {
const { phoneNumberStore } =  usePhoneNumberStore()  
   const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };
  const user = auth().currentUser;
  const userId = user.uid;
 const groupMembers = useGroupStore(state => state.groupMembers); 
 const driverId = useSharedDriverStore(state => state.driverId);
  const [fadeAnim] = useState(new Animated.Value(0));

const [isModalVisible, setModalVisible] = useState(false);
const [qrVisible, setQrVisible] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
    const { setDriverDetails, ratingSum, driverprofileImage,   drivername,  driverpnumber,
            drivergender, plateNumber, carModel, driverlat, carColor,
            driverlng,  totalRatings, seatType, rideRequestId } = useDriverDetailsStore();
  const [rideStarted, setRideStarted] = useState(false);
  const [googleRoute, setGoogleRoute] = useState(null);
  const [distance, setDistance] = useState(null);  // Corrected line
  const [timeTaken, setTimeTaken] = useState(" ");
  const {userLatitude, userLongitude, destinationLatitude, destinationLongitude, userAddress, destinationAddress } = useLocationStore() 
const [statusMessage, setStatusMessage] = useState(" ");
const [pathCoordinates, setPathCoordinates] = useState([]);

const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const PassengerQRCode = ({ origin, pnumber }) => {
  const qrValue = JSON.stringify({ share: "Share", userLatitude, phoneNumberStore });; // Unique to this passenger

  return (
    <View className="items-center">
      <QRCode value={qrValue} size={200} />
      <Text className="text-center mt-4">Show this QR to your driver</Text>
    </View>
  );
};

const snapPoints = ['25%', '50%', '70%'];
  const bottomSheetRef = useRef(null);

  // QR Code Generation
  const generateQRData = () => JSON.stringify({ share: "Share", userLatitude, phoneNumberStore });
  // Pickup Animation
  const animatePickup = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true
    }).start();
  };

  // Enhanced Driver Tracking
  const renderDriverMarker = () => (
    <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}>
      <Animated.View style={[styles.carMarker, { opacity: fadeAnim }]}>
        <FontAwesome6 name="car-side" size={32} color="#0F77EA" />
        <View style={styles.driverBadge}>
          <Text style={styles.driverBadgeText}>ETA: {timeTaken}</Text>
        </View>
      </Animated.View>
    </Marker>
  );

  const AvatarBadge = ({ source, status = 'pending', size = 64, style }) => {
  const statusConfig = {
    success: {
      color: '#4CAF50',
      icon: 'check-circle',
    },
    pending: {
      color: '#9E9E9E',
      icon: 'clock',
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;

  return (
    <View style={[styles.avaContainer, style]}>
      <Image
        source={source}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 }
        ]}
      />
      <View style={[
        styles.avaBadge,
        {
          backgroundColor: currentStatus.color,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
        }
      ]}>
        <FontAwesome6
          name={currentStatus.icon}
          size={size * 0.2}
          color="white"
          solid
        />
      </View>
    </View>
  );
};

  // Co-Rider List Item
  const renderCoRider = ({ item, index }) => (
    <View key={`${item.pnumber}-${index}`} style={styles.coRiderCard}>
      <AvatarBadge 
        source={{ uri: item?.profileImage || "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg" }} 
        status={item.pickedUp ? 'success' : 'pending'}
      />
      <View style={styles.coRiderInfo}>
        <Text style={styles.coRiderName}>{item.name}</Text>
        <Text style={styles.coRiderStatus}>
          {item.pickedUp ? 'Picked Up' : 'En Route'}
        </Text>
      </View>
      {item.pickedUp && (
        <FontAwesome6 name="check-circle" size={24} color="#4CAF50" />
      )}
    </View>
  );

//
const fetchDriverData = async () => {
  try {
    const driverDoc = await firestore().collection('drivers').doc(driverId?.driverId).get();
    if (driverDoc.exists) {
      const driverData = driverDoc.data();
          setDriverDetails({
            drivername: driverData.name,
            driverpnumber: driverData.pnumber,
            plateNumber: driverData.plateNumber,
            carModel: driverData.carModel,
            carColor: driverData.carColor,
            seatType: driverData.seatType,
            driverlat: driverData.lat,
            driverlng: driverData.lng,
            ratingSum: driverData.ratingSum,
            totalRatings: driverData.totalRatings,
            driverprofileImage: driverData.profileImage
          });
   if (driverData && driverData.lat !== undefined && driverData.lng !== undefined) {
        // Update the driver location if valid data is returned
        setDriverLocation({ lat: driverData.lat, lng: driverData.lng });
      }
      setStatusMessage("Driver found, driver on route");
    }
  } catch (error) {
    console.error("Error fetching driver data: ", error);
  }
};

useEffect(() => {
  console.log("driverId", driverId, driverId)
  if (!rideRequestId) return;
  const rideRequestRef = firestore().collection('requests').doc(rideRequestId);
  const unsubscribe = rideRequestRef.onSnapshot((docSnap) => {
    if (docSnap.exists && docSnap.data().status === "started") {
                  router.push({
              pathname: "/(root)/rideshare/ride-screen",
              params: {
                rideRequestId: rideRequestId,
              },
            });
    }
  });

  return () => unsubscribe();
  console.log("rideRequestId", rideRequestId, qrVisible)
}, [rideRequestId, userId, driverId]);

useEffect(() => {
  if (userLatitude && userLongitude && destinationLatitude && destinationLongitude) {
    const fetchOSRMRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLongitude},${userLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        const coords = response.data.routes[0].geometry.coordinates;

        const formattedCoords = coords.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));

        setPathCoordinates(formattedCoords);
      } catch (error) {
        console.error("Error fetching OSRM route:", error);
      }
    };

    fetchOSRMRoute();
  }
}, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);


useEffect(() => {
  fetchDriverData();
  if (driverId) {
  //  const unsubscribeDriverTracking = trackDriverLocation(driverId, setDriverLocation);
const fetchDriver = async () => {
    if (driverLocation && userLatitude && !driverLocation?.lat && !driverLocation?.lng) {
      const { distance, timeTaken } = await fetchDistanceAndTime( userLatitude, userLongitude, driverLocation?.lat, driverLocation?.lng );
    setDistance(distance);
    setTimeTaken(timeTaken);
    }
}
fetchDriver()

  }
}, [driverId,]);

console.log(userLatitude, userLongitude, destinationLatitude, destinationLongitude, rideRequestId, "userLatitude, userLongitude, destinationLatitude, destinationLongitude1, rideRequestId")

return (
    <View style={styles.container}>

      {/* Main Map View */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: userLatitude,
          longitude: userLongitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}>
        
        {driverLocation && renderDriverMarker()}
        
{pathCoordinates.length > 0 && (
  <Polyline
    coordinates={pathCoordinates}
    strokeColor="#0Fa0e9"
    strokeWidth={3}
  />
)}
      </MapView>

      {/* Floating Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => setQrVisible(true)}>
          <FontAwesome6 name="qrcode" size={24} color="#FFF" />
          <Text style={styles.distanceText}>scan QR code</Text>
        </TouchableOpacity>
        <View style={styles.etaContainer}>
          <Text style={styles.etaText}>Driver ETA: 2 mins</Text>
          <Text style={styles.distanceText}>{distance || "200m"} away</Text>
        </View>
      </View>

      {/* Enhanced Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundComponent={({ style }) => (
          <View style={[style, styles.sheetBackground]} />
        )}>
        
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {/* Driver Profile Section */}
          <View style={styles.driverProfile}>
            <Image
              source={{ uri: driverprofileImage }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{drivername}</Text>
              <View style={styles.ratingContainer}>
                <FontAwesome6 name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {(ratingSum / totalRatings).toFixed(1)}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => handleCall(driverpnumber)}>
              <FontAwesome6 name="phone" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Vehicle Details Grid */}
          <View style={styles.detailsGrid}>
            <DetailItem icon="car" label="Car Model" value={carModel} />
            <DetailItem icon="paint-brush" label="Color" value={carColor} />
            <DetailItem icon="id-card" label="Plate" value={plateNumber} />
            <DetailItem icon="chair" label="Seats" value={seatType} />
          </View>

          {/* Co-Riders List */}
          <Text style={styles.sectionTitle}>Co-Riders ({groupMembers.length})</Text>
          {groupMembers.map((member, index) => renderCoRider({ item: member, index}))}

          {/* Cancel Ride Button */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={openModal}>
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>

      <CancelRideModal
        visible={isModalVisible}
        onClose={closeModal}
        rideRequestId={rideRequestId}
      />

                {/* QR Code Modal */}
         {qrVisible && (    <Modal isVisible={qrVisible} >
 <View style={styles.qrModal}>
          <Text style={styles.qrTitle}>Show QR to Driver</Text>
          <QRCode
            value={generateQRData()}
            size={250}
            color="#0F77EA"
            backgroundColor="#FFF"
          />
          <Text style={styles.qrHint}>Scan this code when boarding</Text>
          <TouchableOpacity
            style={styles.closeButton}
           onPress={() => setQrVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      )}
    </View>
  );
};

// Supporting Components
const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <FontAwesome6 name={icon} size={20} color="#0F77EA" />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 119, 234, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  qrButton: {
    backgroundColor: '#1A73E8',
    padding: 12,
    borderRadius: 12,
  },
  etaContainer: {
    flex: 1,
    marginLeft: 16,
  },
  etaText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  distanceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  qrModal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
  },
  qrHint: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  driverInfo: {
    flex: 1,
    marginLeft: 16,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  callButton: {
    backgroundColor: '#0F77EA',
    padding: 12,
    borderRadius: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'Inter-Regular',
  },
  detailValue: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'Inter-SemiBold',
  },
  coRiderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  coRiderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  coRiderName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  coRiderStatus: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 24,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  carMarker: {
    alignItems: 'center',
  },
  driverBadge: {
    backgroundColor: '#0F77EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  driverBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
   avaContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avaBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
});

export default WaitScreen;