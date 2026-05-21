import { router, useLocalSearchParams } from "expo-router";
import { Link } from 'expo-router';
import { useLocationStore} from "@/store";
import MapView, { Marker, Polyline } from "react-native-maps";
import { FlatList, Text, View, Image, TouchableOpacity, Alert, StyleSheet, Animated } from "react-native";
import { useState, useEffect } from "react";
import CustomButton from "@/components/CustomButton";
import DriverCard from "@/components/DriverCard";
import RideLayout from "@/components/RideLayout";
import CancelRideModal from "@/components/cancelRideModal"
//import firestore from '@react-native-firebase/firestore';
import { useRideStore, useDriverDetailsStore, useDriverStore } from "@/store";
import { haversineDistance} from "@/firebaseconf";
import { PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import loadingGif from '../../assets/images/google.gif'; 
import { icons } from "@/constants";
import { handleFindSharedRide, listenForRideRequest, trackDriverLocation, handleCall, handleCancelRide, fetchDistanceAndTime} from "@/lib/utils";
import axios from 'axios';
import * as Linking from 'expo-linking';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useRef, memo, Fragment } from "react";
import firestore from '@react-native-firebase/firestore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import auth from '@react-native-firebase/auth';
import { PulsatingCircle, AnimatedPulseText } from "@/components/animation";

const ConfirmRide = ({  rideRequestId, onCancel, contactedDrivers}) => {
  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const { rideRequestIdZus, clearRideRequestIdus } = useRideStore();
    const { setDriverDetails, driverprofileImage,   drivername,  driverpnumber,
            drivergender, plateNumber, carModel, driverlat, carColor,
            driverlng, ratingSum,  totalRatings, seatType} = useDriverDetailsStore();
  const [statusMessage, setStatusMessage] = useState("Waiting for drivers to respond...");
  const [statusMessagePulse, setStatusMessagePulse] = useState("Contacting drivers...");
// const { rideRequestId, shared } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
 const [showPulse, setShowPulse] = useState(true);

  const [matchedGroup, setMatchedGroup] = useState(null);
const[driverId, setDriverId] = useState(null)
  const [driverLocation, setDriverLocation] = useState({"lat": null, "lng": null});
    const [distance, setDistance] = useState(null);  // Corrected line
  const [timeTaken, setTimeTaken] = useState(" ");
  const bottomSheetRef = useRef(null);

const [isModalVisible, setModalVisible] = useState(false);
const [pathCoordinates, setPathCoordinates] = useState([]);
  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    onCancel();
  };

const {  userLatitude,   userLongitude, destinationLatitude, destinationLongitude,  userAddress, destinationAddress} = useLocationStore() 


useEffect(() => {
const shared = false  
if(shared){
  setStatusMessage("Looking for co-riders on your route")
}
}, []);



const user = auth().currentUser;
 const userId = user.uid;


useEffect(() => {
  if (!rideRequestId) return;

  // Reference to the 'requests' document
  const rideRequestRef = firestore().collection('requests').doc(rideRequestId);

  // Listener for updates to the 'requests' document
  const unsubscribe = rideRequestRef.onSnapshot(async (docSnap) => {
    if (docSnap.exists) {
      const data = docSnap.data();

      // Check if 'acceptedBy' field exists (indicating a driver has accepted)
      if (data.acceptedBy) {
        setDriverId(data.acceptedBy);
        setIsLoading(false);

        // Fetch driver details from the 'drivers' collection
        const driverDoc = await firestore().collection('drivers').doc(data.acceptedBy).get();

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
          setStatusMessagePulse(`A driver, ${driverData.name || "John"} is on the way to pick you up in a ${driverData.carColor} ${driverData.carModel}`)
        }
      }

      // If the ride status changes to 'started'
      if (data.status === "started") {
         router.replace({
        pathname: "/(root)/ride-screen",
        params: {
        rideRequestId,
        },
      });

        router.push(`/(root)/ride-screen?rideRequestId=${rideRequestId}`);
      }
    }
  });

  // Cleanup listener on component unmount
  return () => {
    unsubscribe();
    // clearRideRequestIdZus(); // Assuming this is a cleanup function for Zustand store
  };
}, [rideRequestId]);

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
const snapPoints = ['25%', '50%', '70%'];

useEffect(() => {
  if (driverId) {
console.log(driverId, "driverId in trackDriverLocation useEffect")
    //console.log(driverLocation.lat, driverLocation.lng)
   // const unsubscribeDriverTracking = trackDriverLocation(driverId, setDriverLocation);
    fetchDistanceAndTime(  userLatitude, userLongitude, driverLocation?.lat || driverlat, driverlng || driverlat )
        .then(({ distance, timeTaken }) => {
          setDistance(distance);
          console.log(distance, "distance fetching ")
          setTimeTaken(timeTaken);
        })
        .catch((error) => {
console.log(error, "error occured in fetching distance, time")
        });
  //  return () => unsubscribeDriverTracking(); // Cleanup the listener
  }

  console.log(driverLocation.lat, "driverLocation")
    if (driverId) {
      console.log("dId exists")

}
}, [driverId, driverLocation.lat]);

useEffect(() => {
  const timeout = setTimeout(() => setShowPulse(false), 30000); // Stop after 30s
  return () => clearTimeout(timeout);
}, []);

console.log(distance, "distance outside", contactedDrivers, "contactedDrivers")
return (
    <View className="flex-1 bg-white ">
    <AnimatedPulseText text={statusMessagePulse}/>
      <View className="flex-1">
        <MapView
          tintColor="black"
          mapType="standard"
          className="flex-1"
          style={{ width: "100%", height: "45%" }}
          provider={PROVIDER_GOOGLE}
          showsPointsOfInterest={false}
          initialRegion={{
            latitude: userLatitude,
            longitude: userLongitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          userInterfaceStyle="light"
        >
          {/* Markers for User and Destination */}
          {userLatitude && userLongitude && (
            <Marker
              coordinate={{
                latitude: userLatitude,
                longitude: userLongitude,
              }}
              title="Pickup"
            />
          )}
          {destinationLatitude && destinationLongitude && (
            <Marker
              coordinate={{
                latitude: destinationLatitude,
                longitude: destinationLongitude,
              }}
              title="Destination"
             pinColor="blue"
            />
          )}

          {contactedDrivers?.map((driver, index) => (
            <Marker
              key={`driver-${driver.id}-${index}`}
              coordinate={{
                latitude: driver.driverLocation[0],
                longitude: driver.driverLocation[1],
              }}
            >
              <PulsatingCircle color={index % 2 ? '#0F52BA' : '#FF6B6B'} />
            </Marker>
          ))}

          {/* Marker for Driver Location */}
        {driverLocation && driverLocation?.lat && (
            <Marker
        coordinate={
           {latitude: driverLocation?.lat || 8.7,
            longitude: driverLocation?.lng || 38.6}
                }
              title={`Driver Location: ${distance || "200m"} away`}
              description={`Driver is ${timeTaken || "3mins"} away`}
              image={icons.marker}
            />
          )}

          {/* Polyline to show the route from User to Destination */}
{pathCoordinates.length > 0 && (
  <Polyline
    coordinates={pathCoordinates}
    strokeColor="#0Fa0e9"
    strokeWidth={3}
  />
)}

        </MapView>
<BottomSheet
  ref={bottomSheetRef}
  snapPoints={snapPoints}
  index={1}
  backgroundComponent={({ style }) => (
    <View style={[style, styles.sheetBackground]} />
  )}  // Properly closed here
>
         <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
              {isLoading ? (

                // Loading animation or GIF
                <View className="flex-1 justify-start items-center bg-white">    
                  <Text className="text-lg text-center mt-3 text-gray-600 font-JakartaBold">
                {statusMessage}
                  </Text>
                  <Image
                    source={loadingGif} // Replace with actual GIF URL
                    style={{ width: 330, height: 175, marginTop: 20 }} // Adjust size as needed
                  />

 <TouchableOpacity onPress={openModal} style={styles.cancelButton}>
  <Text className="text-base text-center text-[#fff] font-JakartaSemiBold">Cancel Ride</Text>
</TouchableOpacity>             
                </View>
              ) : (
              <>
          <View style={styles.driverProfile}>
            <Image
              source={{ uri: driverprofileImage || "https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg", }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{drivername}</Text>
              <View style={styles.ratingContainer}>
                <FontAwesome6 name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {(ratingSum / totalRatings).toFixed(1) || 4.9 }
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
    <View style={styles.coRiderCard}>
      <View style={styles.coRiderInfo}>
        <Text style={styles.coRiderName}>Origin</Text>
        <Text style={styles.coRiderStatus}> {userAddress} </Text>
      </View>
        <FontAwesome6 name="check-circle" size={24} color="#4CAF50" />
    </View>

        <View style={styles.coRiderCard}>
      <View style={styles.coRiderInfo}>
        <Text style={styles.coRiderName}>Destination</Text>
        <Text style={styles.coRiderStatus}> {destinationAddress} </Text>
      </View>
        <FontAwesome6 name="check-circle" size={24} color="#4CAF50" />
    </View>
<TouchableOpacity className="bg-red-500 p-4 rounded-lg items-center">
  <Text className="text-white font-semibold">Cancel Ride</Text>
</TouchableOpacity>
    </>
           )}
        </BottomSheetScrollView>
      </BottomSheet>

      <CancelRideModal
        visible={isModalVisible}
        onClose={closeModal}
        rideRequestId={rideRequestId}
      />
      </View>
    </View>
);
}

  // Supporting Components
const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <FontAwesome6 name={icon} size={20} color="#0F77EA" />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

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

export default ConfirmRide;