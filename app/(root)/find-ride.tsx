import { router } from "expo-router";
import { Text, View, Image, Alert, StyleSheet, TouchableOpacity, ScrollView, Modal, Button, ActivityIndicator } from "react-native";
import { Picker } from '@react-native-picker/picker';
import Checkbox from '@react-native-community/checkbox';

import { useState, useEffect, useRef } from "react";
import CustomButton from "@/components/CustomButton";
import ButtonRow from "@/components/findrideButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import { icons } from "@/constants";
import { calculateRegion } from "@/lib/map";
import CustomAlert from "@/components/modals";

import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { PROVIDER_GOOGLE } from "react-native-maps";
import { useLocationStore, useRideStore, useLanguageStore } from "@/store";
import { findNearbyDrivers, addRideRequest } from "@/firebaseconf";

import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import CancelRideModal from "@/components/cancelRideModal"
import auth from '@react-native-firebase/auth';
import { SafeAreaView } from "react-native-safe-area-context";
import functions from '@react-native-firebase/functions';

import { handleFindSharedRide, fetchDistanceAndTime, listenForRideRequest} from "@/lib/utils";

import { where, doc, onSnapshot,setDoc, Timestamp, GeoPoint, collection, query, orderBy, startAt, endAt, addDoc, updateDoc } from "firebase/firestore"; 
import loadingGif from '../../assets/images/google.gif'; 
import CustomGooglePlacesInput from "@/components/CustomGooglePlacesInput";

const FindRide = () => {
  const user = auth().currentUser; const name = user.displayName;
  const userId = user.uid;

    const [distance, setDistance] = useState(null);  // Corrected line
  const [timeTaken, setTimeTaken] = useState(" ");
  const { setRideRequestIdZus, clearRideRequestIdZus } = useRideStore();
    const [ rideRequestIdState, setRideRequestIdState ] = useState('');
  const {userAddress, destinationAddress, setDestinationLocation, setUserLocation, userLocation, userLongitude, userLatitude, destinationLocation, destinationLatitude, destinationLongitude, 
  } = useLocationStore();

const [driverGender, setDriverGender] = useState("Any");
const [languagesSpoken, setLanguagesSpoken] = useState(["Any"]);
 const [visible, setVisible] = useState(false);
const [driverOptions, setDriverOptions] = useState([]);
const [chosenDrivers, setChosenDrivers] = useState([]);
const [visible1, setVisible1] = useState(false);

const directionsAPI = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const [rideOptions, setRideOptions] = useState([
    { type: 'Solo Economy', price: 130, icon: 'car', people: "You" },
    { type: 'Shared 4 People', price: 35, icon: 'people-group', people: 4 },
    { type: 'Shared 2 People', price: 65, icon: 'people-group', people: 2 },
    { type: 'Shared minivan', price: 15, icon: 'people-group', people: 7 },
    { type: 'Solo minivan (7)', price:170, icon: 'van-shuttle', people: "You" },
    { type: 'Tesla', price:270, icon: 'charging-station', people: "You" }
  ]);
  const [selectedRide, setSelectedRide] = useState(null);

async function handleSharedRide(type) {
  setStatusMessage("Looking for co-riders on your route")
  try {
    setLoading(true);
    const matchCoRiders = functions().httpsCallable("matchCoRiders");
    // Use the corresponding values for solo or shared rides
    let origin = [userLatitude, userLongitude];
    let destination = [destinationLatitude, destinationLongitude];
    const { pnumber } = await fetchUserPhoneNumber()

    // console.log("origin, destination, name, phoneNumber, type, userId:", origin, destination, name, pnumber, type, userId)
    if(userLatitude && userLongitude && origin && destination && name && pnumber && type && userId && destinationAddress ){
const result = await matchCoRiders({ origin, destination, name, pnumber, type, userId, destinationAddress});
}else {
  Alert.alert("Whoops", "Please check your internet connection and try again.")
}

      // setStatusMessage(result?.data?.message)
    // console.log("result.data:", result.data)
  } catch (error) {
    console.error("Error finding ride:", error);
    setStatusMessage("Couldn't find a ride right now.");
  } finally {
console.log("result.data")
  }

}

  const handleSelectRide = (rideType) => {
    setSelectedRide(rideType);
 if (rideType === "Solo Economy") {
 setVisible1(true)

  }
  else if(rideType == "Solo minivan (7)")
    handleFindRide("7")
  else if(rideType == "Shared 4 People"){
 handleSharedRide(4)}
 else if(rideType == "Shared 2 People"){
 handleSharedRide("2")}
 else if(rideType == "Shared minivan"){
 handleSharedRide("7")}
  }
  ;


const [isModalVisible, setModalVisible] = useState(false);

  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

async function fetchUserPhoneNumber() {
  const userRef = firestore().collection('riders').doc(userId);

  try {
    const doc = await userRef.get(); // Await fetching the document
    if (doc.exists) {
      const userData = doc.data();
      const pnumber = userData.pnumber; // Assuming the field name is 'pnumber'
      const gender = userData.gender
      const favoriteDrivers = userData.favoriteDrivers
      return { pnumber, gender, favoriteDrivers }
    } else {
      console.log("No such document in the riders collection!");
    }
  } catch (error) {
    console.error("Error fetching user phone number:", error);
  }
}

useEffect(() => {
  if(userLatitude && destinationLatitude){
  const fetchAndCalculate = async () => {
    try {
      const { distance, timeTaken } = await fetchDistanceAndTime(
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude
      );

      setDistance(distance);
      setTimeTaken(timeTaken);

      const soloP = calculateFare(distance, timeTaken);
      setSoloPrice(soloP);

      setRideOptions([
    { type: 'Solo Economy', price: Math.round(soloP), icon: 'car', people: "You" },
    { type: 'Shared 4 People', price: Math.round(soloP/4), icon: 'people-group', people: 4 },
    { type: 'Shared 2 People', price: Math.round(soloP/2), icon: 'people-group', people: 2 },
    { type: 'Shared minivan', price: Math.round(soloP/7), icon: 'people-group', people: 7 },
    { type: 'Solo minivan (7)', price: Math.round(soloP + 40), icon: 'van-shuttle', people: "You" },
    { type: 'Tesla', price: Math.round(soloP + 240), icon: 'charging-station', people: "You" }
  ])
    } catch (error) {
      console.error('Error fetching distance and time:', error);
    }
  };
  fetchAndCalculate();
}  
}, [destinationLongitude]);

const [statusMessage, setStatusMessage] = useState(" ");
  const [matchedGroup, setMatchedGroup] = useState(null);
const [sharedPrice, setSharedPrice] = useState(null);
const [soloPrice, setSoloPrice] = useState(null);
console.log(destinationLatitude, destinationLongitude, "dest latitude, lng")


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
const [loadingModal, setLoadingModal] = useState(false);

  const handleFindRide = async (num) => {
    setLoading(true);
    setError(null);
try{
      const nearbyDrivers = await findNearbyDrivers([userLatitude, userLongitude], 5000, parseFloat(num));
      const rideRequestId = await addRideRequest(
        [userLatitude, userLongitude],
        [destinationLatitude, destinationLongitude], nearbyDrivers, userId, destinationAddress,
      );
setRideRequestIdState(rideRequestId);

      console.log(
        rideRequestId , "rideRequestIdrideRequestIdrideRequestIdrideRequestId"
      );
      // Navigate to the ConfirmRide screen and pass the rideRequestId and nearby drivers
      router.push(`/(root)/confirm-ride?rideRequestId=${rideRequestId}`);
    } catch (err) {
      setError("WhOops drivers not available momentarily. Please try again.");
      console.log("Unable to find drivers.", err)
    } finally {

    }
  };

useEffect(() => {
  const q = firestore()
    .collection('requests')
    .where('riderIds', 'array-contains', userId)
    .where('status', '==', 'looking-for-driver');

  // Initialize a flag to check if navigation has already happened
  let hasNavigated = false;

  const unsubscribe = q.onSnapshot((snapshot) => {
    const matched = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (matched.length > 0) {
      const matchedDoc = matched[0];
      const documentId = matchedDoc.id;
      setMatchedGroup(matchedDoc);  
      setStatusMessage("Successfully Matched! Waiting for a driver. Happy Travels!");

      const rideRequestRef = firestore().collection('requests').doc(documentId);

      const driverUnsubscribe = rideRequestRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();

          // Check if a driver has accepted and navigation has not happened yet
          if (data.acceptedBy && !hasNavigated) {
            hasNavigated = true; // Set flag to prevent further navigation
            setLoading(false);

            router.push({
              pathname: "/(root)/rideshare/wait-screen",
              params: {
                matchedDoc,
                driverId: data.acceptedBy,
                rideRequestId: documentId,
              },
            });

            // Unsubscribe from driver updates once the driver is found
            driverUnsubscribe();
          }
        }
      });
    } else {
      console.log("No matching requests found");
    }
  });

  return () => {
    unsubscribe();  // Clean up the listener when component unmounts
  };
}, [userId,]);

  const region = calculateRegion({
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
  });


// Move this function outside useEffect
const calculateFare = (distance, timeTaken) => {
  const baseFare = 120; // Base fare for the ride
  const distanceRate = 18; // Price per km
  const timeRate = 1.8; // Price per minute
  const surgeMultiplier = 1.0; // No surge in this case

  return (
    baseFare +
    (distanceRate * distance / 1000) +
    (timeRate * timeTaken/60) * surgeMultiplier
  );
};

const { language, setLanguage } = useLanguageStore();
const translations = {
  ENG: `You'll arrive at your destination in approximately ${Math.ceil(timeTaken / 60)} minutes`,
  AMH: `በ${Math.ceil(timeTaken / 60)} ደቂቃ አካባቢ መድረሻዎ ላይ ይደርሳሉ`,
  ORM: `Bakka itti deemtan tilmaamaan daqiiqaa ${Math.ceil(timeTaken / 60)} booda ni geessan`
};

const findDriversWithPreferences = async () => {
  try {
   if(userLatitude && userLongitude ){    
    const result = await functions().httpsCallable("findDriversByPreferences")({
      gender: driverGender,
      languages: languagesSpoken,
      location: [userLatitude, userLongitude],
      seatType: 4,
    });

    const drivers = result.data;

    // Calculate price estimation for each driver
    const driverDetails = drivers.map(driver => ({
      ...driver,
      estimatedFare: calculateChosenFare(distance, timeTaken, driver.kmPrice),
    }));

    setDriverOptions(driverDetails);
    setVisible(true); // Open the modal
}else {
  Alert.alert("Whoops", "Please check your internet connection and try again.")
}
} catch (error) {
    Alert.alert("Whoops,", "No drivers found with your preferences... please reset your preferences and try again in a while")
    setLoadingModal(false)
    console.error("Error finding drivers:", error);
  }
};

const calculateChosenFare = (distance, timeTaken, kmPrice=18) => {
  const baseFare = 120; // Base fare for the ride
  const distanceRate = kmPrice; // Price per km
  const timeRate = 1.8; // Price per minute
  const surgeMultiplier = 1.0; // No surge in this case

  return Math.round(
    baseFare +
    (distanceRate * distance / 1000) +
    (timeRate * timeTaken/60) * surgeMultiplier
  );
};

const handleRequestCreation = async () => {
  try {
    const { pnumber, gender, favoriteDrivers }= await fetchUserPhoneNumber()
    console.log(pnumber, "pnumber", gender, favoriteDrivers )
    console.log(chosenDrivers, "chosenDriver")
        let userLocation = [userLatitude, userLongitude];
    let destinationLocation = [destinationLatitude, destinationLongitude];
  
const docRef = firestore().collection('requests').doc(); 
 await docRef.set({
      type: "solo",
      destinationAddress,
      pnumber: pnumber,
      userLocation,
      destinationLocation,
      drivers: chosenDrivers,
      createdAt: firestore.Timestamp.fromDate(new Date()),
      status: 'looking-for-driver',
      userId,
    });
    console.log("Request created successfully");
    setVisible(false); // Close the modal
     router.push(`/(root)/confirm-ride?rideRequestId=${docRef.id}`);
  } catch (error) {
    console.error("Error creating request:", error);
  }
};

const CustomAlert = () => {
  return (
    <Modal visible={visible1} transparent>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={{ padding: 10, backgroundColor: "white", borderRadius: 10 }}>
        <Text className="text-xl font-JakartaBold">Driver Selection</Text>
          <Text className=" font-Jakarta">Would you like to select the driver yourself?</Text>
  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                 <TouchableOpacity className="bg-teal-500 px-1"
               onPress={() => {setVisible1(false); findDriversWithPreferences(); setLoadingModal(true)}}
                style={{ paddingVertical: 20, borderRadius: 5}}
              >
                <Text className=" font-JakartaBold" style={{ color: 'white', fontSize:14}}>Yes, Choose Driver</Text>
              </TouchableOpacity>

    <TouchableOpacity onPress={() => {handleFindRide("4"); setVisible1(false)}} className="px-1 ml-1"
                style={{ paddingVertical: 20, backgroundColor: '#0F72BA', borderRadius: 5, }}
              >
                <Text className="font-JakartaBold flex-shrink" style={{flexWrap: "wrap", color: 'white', fontSize:14}}>No, Find Automatically </Text>
              </TouchableOpacity>
      </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => {setVisible1(false)}}>
            <Text className="text-[#eee]">Close</Text>
          </TouchableOpacity>        
        </View>
      </View>    
    </Modal>
  );
};

const bottomSheetRef = useRef(null);
return (
    <ScrollView>
  <View className="flex-1 bg-white"  style={{width: "100%"}}>
<Modal visible={visible} animationType="slide">
<ScrollView>
  <View style={{ padding: 20 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Select Drivers</Text>
        <Text className="font-JakartaRegular mb-2 text-sm text-gray-600">Dear {user.displayName.split(" ")[0]}, you can see each driver's estimated price for your whole trip next to their names, choose those you like and press "call chosen drivers button" ! You will be picked up by the first to respond. Enjoy!</Text>
          <TouchableOpacity style={{backgroundColor: '#0F72BA',  padding: 10, borderRadius: 7}}       onPress={() => {
        if (chosenDrivers.length === 0) {
          Alert.alert('No Drivers Selected', 'Please choose at least one driver first.');
        } else {
          handleRequestCreation(chosenDrivers);
          setLoadingModal(false);
        }
      }}>
    <Text className="font-JakartaSemiBold" style={{ color: '#FFF', textAlign: 'center'}}>Call Chosen Drivers</Text>
  </TouchableOpacity>
<Text className="font-JakartaSemiBold py-2 text-gray-700" >Your destination: {destinationAddress}</Text>
    {driverOptions.map((driver, index) => {
      const isChosen = chosenDrivers.includes(driver.driverId);
      return (
        <View key={index} style={styles.driverBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text className="font-JakartaBold text-blue-600">{driver.name} |</Text>
            <Text className="font-JakartaMedium ">Driver's price: {driver.estimatedFare} Birr</Text>
            <TouchableOpacity
              style={[
                styles.chooseButton,
                isChosen ? { backgroundColor: '#0F72BA' } : { backgroundColor: '#0eb9ba' },
              ]}
              onPress={() => {
                setChosenDrivers((prev) =>
                  isChosen
                    ? prev.filter((id) => id !== driver.driverId)
                    : [...prev, driver.driverId]
                );
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                {isChosen ? 'Chosen ✔' : 'Choose'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="font-JakartaLight ">Rating: {`${Math.round(driver.ratingSum/driver.totalRatings) || "unavailable"}`}</Text>
          <Text className="font-JakartaLight ">Languages: {driver.languagesSpoken.join(', ')}</Text>
          <Text className="font-JakartaLight ">Gender: {driver.gender}</Text>
        </View>
      );
    })}

  </View>
  <TouchableOpacity style={styles.closeButton} onPress={() => { setVisible(false); setLoadingModal(false); setChosenDrivers([])}}>
    <Text style={{ color: '#eee', textAlign: 'center', fontWeight: '600' }}>Close</Text>
  </TouchableOpacity>
 </ScrollView>  
</Modal>

        <CustomAlert visible={visible1} setVisible={setVisible1} />
          <View className="flex flex-row absolute z-10 top-16 items-center justify-start px-5">
            <TouchableOpacity onPress={() => router.back()}>
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
                <Image
                  source={icons.backArrow}
                  resizeMode="contain"
                  className="w-6 h-6"
                />
              </View>
            </TouchableOpacity>
            <Text className="text-xl font-JakartaSemiBold ml-5">
              Order ride
            </Text>
          </View>

    <MapView
      provider={PROVIDER_GOOGLE}
      style={{width: "100%", height: 430}}
      tintColor="black"
      mapType="standard"
      initialRegion={region}
      showsUserLocation={true}
      userInterfaceStyle="light"
    >
    {userLatitude && userLongitude && (
              <Marker
            key="destination"
            coordinate={{
              latitude: userLatitude,
              longitude: userLongitude,
            }}
            title="Destination"
            pinColor="black"
        />
     )}       
      {destinationLatitude && destinationLongitude && (
        <>
          <Marker
            key="destination"
            coordinate={{
              latitude: destinationLatitude,
              longitude: destinationLongitude,
            }}
            title="Destination"
            pinColor="black"
          />
          <MapViewDirections
            origin={{
              latitude: userLatitude,
              longitude: userLongitude,
            }}
            destination={{
              latitude: destinationLatitude,
              longitude: destinationLongitude,
            }}
            apikey={directionsAPI!}
            strokeColor="#0F52BA"
            strokeWidth={2}
          />
        </>
      )}
    </MapView>

   <Text className="text-sm text-center font-JakartaMedium text-[#0F62BA] mt-5">
       {translations[language]}
        </Text>
          {loading ? (   
                          <View className="flex-1 justify-start items-center bg-[#eee5]">    
                <TouchableOpacity onPress={openModal} style={styles.cancelButton}>
  <Text style={styles.cancelButtonText}>Cancel Ride</Text>
</TouchableOpacity>
    
      <CancelRideModal
        visible={isModalVisible}
        onClose={closeModal}
        rideRequestId={rideRequestIdState}
      />
                  <Text className="text-xl text-center mt-2 text-[#0F62BA] font-JakartaBold">
                {statusMessage}
                  </Text>               
                  <Image
                    source={loadingGif} // Replace with actual GIF URL
                    style={{ width: 330, height: 105, marginTop: 14 }} // Adjust size as needed
                  />
                </View>
                      ) : (
   <View>
        <Text className="text-lg text-[#0F62BA] text-center font-JakartaBold">
          {statusMessage}
        </Text>
<View style={{ height: 270, paddingRight: 150, paddingHorizontal: 15, width: 545}}> 
          {loadingModal && <ActivityIndicator size="large" color="#0e99ba" />}
  <ScrollView
    horizontal
    style={styles.horizontalScroll}
    contentContainerStyle={{ flexGrow: 1 }} // Ensure content takes full width for scroll
    showsHorizontalScrollIndicator={false}
  >
          {rideOptions.map((option, index) => (
            <View key={index} style={styles.rideOption}>
              <FontAwesome6 name={option.icon} size={18} color="black" />
            <Text className="text-base font-JakartaMedium text-blue-500" style={styles.rideType}>{option.type}</Text>
            <Text className="text-md text-center font-JakartaMedium text-gray-700 mr-3 " style={styles.rideDescription}>{`Estimated Price: ${option.price}  Birr`}</Text>
              <Text style={styles.rideDescription}>{`Passengers: ${option.people}`}</Text>
              <TouchableOpacity
              className="bg-blue-600"
                style={styles.orderButton}
                onPress={() => handleSelectRide(option.type)}
              >
                <Text style={styles.orderButtonText}>Order {option.type}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        </View>

            </View>
               )}
</View>
<Text className="text-md font-JakartaMedium text-orange-500 ml-4 ">Select preferred driver gender for solo</Text>
<Picker
  selectedValue={driverGender}
  onValueChange={(value) => setDriverGender(value)}
>
  <Picker.Item label="Any" value="Any" />
  <Picker.Item label="Male" value="Male" />
  <Picker.Item label="Female" value="Female" />
</Picker>

  </ScrollView>
);
};

const styles = StyleSheet.create({
    horizontalScroll: {
    marginTop: 20,
    marginBottom: 40, 
  },
  rideOption: {
    width: 200,
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 5,
    backgroundColor: '#e8f0f2',
    alignItems: 'center',
  },
  rideType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rideDescription: {
    fontSize: 14,
    color: '#555',
    marginVertical: 5,
  },
    loadingContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#4fd1d9',
  },
  orderButton: {
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    backgroundColor: '#0F62BA'
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#9aadad', // Red color to indicate cancellation
    padding: 10, // Padding for the button
    borderRadius: 10, // Rounded corners
    marginTop: 20, // Space from the top
    alignItems: 'center', // Center the button text
    justifyContent: 'center', // Center content vertically
    width: '70%', // Width of the button
    alignSelf: 'center', // Center the button horizontally
  },
  cancelButtonText: {
    color: '#fff', // White text color
    fontSize: 18, // Font size for the text
    fontWeight: '600', // Semi-bold text
  },
  driverBox: {
    padding: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  chooseButton: {
    backgroundColor: '#0eb9ba',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    width: "30%"
  },
  closeButton: {
    backgroundColor: '#ff5757',
    padding: 10,
    color:"#eee",
    alignSelf: "center",
    marginTop: 15,
    width: "50%",
    fontFamily: "mon-sb",
    borderRadius: 5,
  },
});
export default FindRide;