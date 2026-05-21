import { View, Text, Button, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import firestore from '@react-native-firebase/firestore';
//import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useLocationStore} from "@/store";
import { haversineDistance, } from "@/firebaseconf";
import MapViewDirections from "react-native-maps-directions";
import CustomButton from "@/components/CustomButton";
import { useUser } from "@clerk/clerk-expo";
import { icons } from "@/constants";
import { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import auth from '@react-native-firebase/auth';
import PostsPage from "@/app/(root)/(tabs)/posts"; 
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { fetchDistanceAndTime } from "@/lib/utils";
import axios from "axios";
import { saveRideToLocalHistory } from "@/lib/localDB";
import RideProgress from "@/components/RideProgress";
import DriverCard from "@/components/DriverCard";
import EmergencyAssist from "@/components/EmergencyAssist";
import SocialFeedToggle from "@/components/SocialFeedToggle";
import { FontAwesome6, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDriverDetailsStore } from "@/store";

const BeginRideScreen = () => {
  const user = auth().currentUser;
  const bottomSheetRef = useRef(null);
  const { rideRequestId, dbDestinationLat, dbDestinationLng } = useLocalSearchParams();
    const { setDriverDetails, driverprofileImage,   drivername,  driverpnumber,
            drivergender, plateNumber, carModel, driverlat, carColor,
            driverlng, ratingSum,  totalRatings, seatType } = useDriverDetailsStore();
  const [driverLocation, setDriverLocation] = useState(null);
  const [pathCoordinates, setPathCoordinates] = useState([]);
const [driverId, setDriverId] = useState(null); // Store driverId here
  const [rideStarted, setRideStarted] = useState(true);
   const [intervalId, setIntervalId] = useState(null);
const [activeTab, setActiveTab] = useState('ride');

  const userId = user.uid;
  const [rideProgress] = useState(new Animated.Value(0));
  const sheetRef = useRef(null);
  const snapPoints = ['30%', '50%', '80%'];
    // Animated route styling
  const routeOpacity = rideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1]
  });
    const [distance, setDistance] = useState(null);  // Corrected line
  const [timeTaken, setTimeTaken] = useState(" ");

  const googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const {
    userLatitude, userLongitude, destinationLatitude,  destinationLongitude, userAddress, destinationAddress
  } = useLocationStore() 

  const handleEmergency = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Please enable your location settings so we can know your exact location.");
      console.log('Permission to access location was denied');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    try {
      const userDocRef = firestore().collection('requests').doc(rideRequestId);
      await userDocRef.update({
        userEmergencyLocation: new firestore.GeoPoint(latitude, longitude),
      });
    } catch (error) {
      console.log("Emergency Button error", error);
    }
    console.log("Emergency Button Pressed");
  };

// Move this function outside useEffect
const calculateFare = (distance, timeTaken) => {
  const baseFare = 120; // Base fare for the ride
  const distanceRate = 19; // Price per km
  const timeRate = 2.25; // Price per minute
  const surgeMultiplier = 1.0; // No surge in this case

  return (
    baseFare +
    (distanceRate * distance / 1000) +
    (timeRate * timeTaken/60) * surgeMultiplier
  );
};

const soloP = calculateFare(distance, timeTaken);

  // Track driver's path function (runs every 5 minutes)
  const trackPathTaken = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setPathCoordinates((prevCoordinates) => [
        ...prevCoordinates,
        { latitude, longitude },
      ]);
    } catch (error) {
      console.error('Error tracking path:', error);
    }
  };

  useEffect(() => {
    if (rideRequestId) {
      const rideRequestRef = firestore().collection('requests').doc(rideRequestId);

      const unsubscribe = rideRequestRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          if (data.status === "completed") {
            const { farePrice = 520, distanceTravelled = 10, timeTaken=32, endLocation = [8.7, 38.7], acceptedBy, userLocation= [8.6, 38.6] } = data;
            router.push({
              pathname: "/ride-completed",
              params: {
                rideRequestId,
                farePrice,
                distanceTravelled,
                timeTaken,
                endLat: endLocation[0],
                endLng: endLocation[1],
                driverId: acceptedBy,
                originLat: userLocation[0],
                originLng: userLocation[1],
                driverPhone: driverpnumber || "+251934963090"//
              },
            });
const saveHistory = async () => {
console.log(farePrice, "farePrice  saved to histor", typeof farePrice === 'string' ? parseFloat(farePrice) : farePrice)
    // Save the ride to local history
    const rideDetails = {
      id: rideRequestId,
      driverId: acceptedBy,
      type: "Solo", 
      originAddress: userAddress || "-",
      destinationAddress: destinationAddress || "-",
      userLocation: {lat: userLocation[0], lng: userLocation[1]} || { lat: 8.7, lng: 38.7 },
      destinationLocation: { lat: endLocation[0], lng: endLocation[1] } || { lat: 8.699, lng: 38.699 },
      farePrice: typeof farePrice === 'string' ? parseFloat(farePrice) : farePrice,
      timeTaken: timeTaken || "-",
      createdAt: new Date().toISOString(),

    };
    await saveRideToLocalHistory(rideDetails);
}
saveHistory();
          }
        }
      });

      // Check location permission and set up interval for path tracking every 5 minutes
      const initiatePathTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const id = setInterval(trackPathTaken, 300000);
          setIntervalId(id);
        } else {
          console.log("Location permission not granted for path tracking.");
        }
      };

      initiatePathTracking();

      return () => {
        unsubscribe();
        clearInterval(intervalId);
      };
    }
  }, [rideRequestId]);

useEffect(() => {
      fetchDistanceAndTime(  userLatitude, userLongitude, destinationLatitude, destinationLongitude )
        .then(({ distance, timeTaken }) => {
          setDistance(distance);
          console.log(distance, "distance fetching ")
          setTimeTaken(timeTaken);
        })
        .catch((error) => {
console.log(error, "error occured in fetching distance, time")
        });

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


   if (!userLatitude || !userLongitude) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }


//console.log(dbDestinationLat, dbDestinationLng, "dbDestinationLat")
return (
    <View style={styles.container}>
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
        {/* Markers for User and Destination */}
        {userLatitude && userLongitude && (
        <Marker coordinate={{latitude: userLatitude, longitude: userLongitude}} title="Origin">
          <View style={styles.userMarker}>
            <FontAwesome6 name="circle-user" size={32} color="#0F77EA" />
          </View>
        </Marker>
        )}
        {destinationLatitude && destinationLongitude && (
            <Marker title="Destination" coordinate={{latitude: destinationLatitude, longitude: destinationLongitude}}>
          <View style={styles.destinationMarker}>
            <MaterialIcons name="location-on" size={40} color="#E74C3C" />
          </View>
        </Marker>
        )}
        {dbDestinationLat && dbDestinationLng && (
          <Marker
            coordinate={{ latitude: parseFloat(dbDestinationLat), longitude: parseFloat(dbDestinationLng) }}
            title="Destination"
            pinColor="blue"
          />
        )}

        {/* Polylines and Directions */}
{pathCoordinates.length > 0 && (
        <Polyline
          coordinates={pathCoordinates}
          strokeColor="#0F77EA"
          strokeWidth={3}
          // opacity={routeOpacity}
        />
)}
      </MapView>

{/* Floating Header */}
      <View style={styles.header}>
        <RideProgress 
          distance={distance || 9}
          time={timeTaken || 28}
          price={soloP || 433}
        />
      </View>

        <View style={styles.header2}>
        <EmergencyAssist onPress={handleEmergency} />
      </View>

<BottomSheet
  ref={sheetRef}
  index={0}
  snapPoints={snapPoints}
  backgroundComponent={({ style }) => (
    <View style={[style, styles.sheetBackground]} />
  )}
>
  <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
    {activeTab === 'ride' ? (
      <>
        <DriverCard 
          name={drivername || "John Driver" }
          rating={(ratingSum / totalRatings) || 4.9}
          carModel={carModel || "Toyota Camry" }
          plateNumber={plateNumber || "AA-B31234-03" }
          profileImage= {driverprofileImage || null}
        />
        
        <SocialFeedToggle 
          activeTab={activeTab}
          onSocialPress={() => {
            sheetRef.current.snapToIndex(2);
            setActiveTab('social');
          }}
          onRidePress={() => setActiveTab('ride')}
        />
        
{/*        <RideDetails 
          pathCoordinates={pathCoordinates}
          safetyScore={89}
          nextTurn="Right on Main St"
        />*/}
      </>
    ) : (
      <View style={{ flex: 1 }}>
        <PostsPage 
          showHeader={false}
          embeddedView={true}
        />
      </View>
    )}
  </BottomSheetScrollView>
</BottomSheet>
    </View>
  );
};

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
  },
    header2: {
    position: 'absolute',
    top: 210,
    right: 10,
  },

  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 48,
  },
  userMarker: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  destinationMarker: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 16,
  },
});

const mapStyle = [
  {
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "visibility": "simplified" }]
  }
];

export default BeginRideScreen;