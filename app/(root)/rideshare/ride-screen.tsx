import { View, Text, Button, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect,useRef, useState } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import PostsPage from "@/app/(root)/(tabs)/posts"; 
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import firestore from '@react-native-firebase/firestore';

//import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useLocationStore} from "@/store";
import { haversineDistance, } from "@/firebaseconf";
import MapViewDirections from "react-native-maps-directions";
import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants";
import { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import auth from '@react-native-firebase/auth';

const BeginRideScreen = () => {
  const user = auth().currentUser;
  const { rideRequestId } = useLocalSearchParams();
  const [driverLocation, setDriverLocation] = useState(null);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [rideStarted, setRideStarted] = useState(true);
  const [intervalId, setIntervalId] = useState(null);
 const bottomSheetRef = useRef(null);
 
  const userId = user ? user.uid : null;
  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const [rideCompletedAlertShown, setRideCompletedAlertShown] = useState(false); // Track if alert was shown

  const {
    userLatitude, userLongitude, destinationLatitude,
    destinationLongitude,
    userAddress,
    destinationAddress,
  } = useLocationStore();

  const emergencyButton = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Please enable location access.");
      return;
    }

    if (!rideRequestId || !userId) {
      console.log("Missing rideRequestId or userId; emergency action aborted.");
      Alert.alert("Emergency action cannot proceed; ride details are missing.");
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const userDocRef = firestore().collection('requests').doc(rideRequestId);

      await userDocRef.update({
        userEmergencyLocation: new firestore.GeoPoint(latitude, longitude),
      });

      console.log("Emergency location sent.");
    } catch (error) {
      console.error("Emergency button error:", error);
      Alert.alert("Failed to send emergency location. Please try again.");
    }
  };

  const trackPathTaken = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log("Location permission denied.");
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setPathCoordinates((prevCoordinates) => [
        ...prevCoordinates,
        { latitude, longitude },
      ]);
    } catch (error) {
      console.error("Error tracking path:", error);
    }
  };



useEffect(() => {
    if (!rideRequestId || !userId) {
      console.log("Missing rideRequestId or userId; exiting effect.");
      return;
    }

    const rideRequestRef = firestore().collection("requests").doc(rideRequestId);

  // Initialize a flag to check if navigation has already happened
  let hasNavigated = false;

    // Set up listener for ride completion
    const unsubscribe = rideRequestRef.onSnapshot((docSnap) => {
      if (!hasNavigated && docSnap.exists && docSnap.data().status === "completed" ) {
            hasNavigated = true; // Set flag to prevent further navigation
        if (!rideCompletedAlertShown) {
          setRideCompletedAlertShown(true);
          Alert.alert("Ride completed!");
        }

        // Prevent multiple navigations
                      // const { farePrice, distanceTravelled, timeTaken, endLocation, acceptedBy, userLocation } = data;
            // router.push({
            //   pathname: "/(root)/rideshare/end-screen",
            //   params: {
            //     rideRequestId,
            //     farePrice,
            //     distanceTravelled,
            //     timeTaken,
            //     endLat: endLocation[0],
            //     endLng: endLocation.[1],
            //     driverId: acceptedBy,
            //     originLat: userLocation[0],
            //     originLng: userLocation[1],
            //   },
            // });

          router.push("/(root)/(tabs)/home");
      }
    });

    // Set up interval for path tracking
    const id = setInterval(trackPathTaken, 300000); // Every 5 minutes
    setIntervalId(id);

    // Clean up on unmount
    return () => {
      unsubscribe();
      clearInterval(id);
      setIntervalId(null);
    };
  }, [rideRequestId, userId, rideCompletedAlertShown]);

  return (
    <View style={styles.container}>
      <MapView
        tintColor="black"
        mapType="standard"
        provider={PROVIDER_GOOGLE}
        showsPointsOfInterest={false}
        showsUserLocation={true}
        userInterfaceStyle="light"
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: userLatitude || 0,
          longitude: userLongitude || 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Markers for User and Destination */}
        {userLatitude && userLongitude && (
          <Marker
            coordinate={{ latitude: userLatitude, longitude: userLongitude }}
            title="Pickup"
          />
        )}
        {destinationLatitude && destinationLongitude && (
          <Marker
            coordinate={{ latitude: destinationLatitude, longitude: destinationLongitude }}
            title="Destination"
            pinColor="blue"
          />
        )}

        {/* Polyline to show the route from User to Destination */}
        {userLatitude && destinationLatitude && (
          <MapViewDirections
            origin={{ latitude: userLatitude, longitude: userLongitude }}
            destination={{ latitude: destinationLatitude, longitude: destinationLongitude }}
            apikey={googlePlacesApiKey}
            strokeColor="#0FBABA"
            strokeWidth={2}
          />
        )}

        {/* Default polyline showing the direct path from user to destination */}
        {userLatitude && destinationLatitude && (
          <Polyline
            coordinates={[
              { latitude: userLatitude, longitude: userLongitude },
              { latitude: destinationLatitude, longitude: destinationLongitude },
            ]}
            strokeColor="rgba(20, 150, 20, 0.5)"
            strokeWidth={2}
            lineDashPattern={[15, 5]}
          />
        )}
      </MapView>

      {emergencyButton && (
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Emergency"
            bgVariant="danger"
            onPress={emergencyButton}
          />
        </View>
      )}
      <BottomSheet
            ref={bottomSheetRef}
            snapPoints={["15%", "50%", "90%"]} // Snap points for BottomSheet
            index={1} // Initially open to the first snap point
          >
 <PostsPage/>
          </BottomSheet>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    backgroundColor: '#0F92BA',
    position: 'absolute',
    top: 15, // Adjust as needed to position the button
    left: 0,
    right: 0,
    alignItems: 'center', // Center the button horizontally
  },
});
export default BeginRideScreen;
