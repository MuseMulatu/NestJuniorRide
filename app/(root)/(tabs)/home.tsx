import { Animated, Easing, ScrollView, Button, Modal, StyleSheet, Dimensions } from "react-native";
import * as Location from "expo-location";
import AntDesign from '@expo/vector-icons/AntDesign';
import { router, Stack } from "expo-router"; 
import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { Text, View, TouchableOpacity, Image, FlatList, ActivityIndicator, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleFindSharedRide, fetchDistanceAndTime, listenForRideRequest, listenForStartedRequests, userProfileById } from "@/lib/utils";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient'; 
import inAppMessaging from '@react-native-firebase/in-app-messaging'; 
import { db, dynamoDbData, fetchAdminData, getLimits } from "@/lib/localDB";
import ConfirmRide from "@/app/(root)/confirm-ride";
import SharedWaitRoom from "@/app/(root)/rideshare/confirm-coride";
import CustomGooglePlacesInput from "@/components/CustomGooglePlacesInput";
import CustomGooglePlacesInput2 from "@/components/CustomGooglePlacesInput2"; 
import Map from "@/components/Map"; 
import MapComponent from "@/components/setOnMap"; 
import LocationButton from "@/components/cmybutton"; 
import RideCard from "@/components/RideCard"; 
import { icons, images } from "@/constants";
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useLocationStore, useRideStore, useUserIdStore, useLanguageStore, useAdminNumsStore, useCreditStore, usePhoneNumberStore, useShareUsernameStore, useTierLimitsStore } from "@/store";
import { Ride } from "@/types/type";
import auth from '@react-native-firebase/auth';
import { translation1 } from "@/lib/translations"
import firestore from '@react-native-firebase/firestore';
import { uploadLocation, findNearbyDrivers, addRideRequest } from "@/firebaseconf";
import functions from '@react-native-firebase/functions';
import PostsPage from "@/app/(root)/(tabs)/posts"; 
import { CustomModal } from '@/components/modals';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

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

// --- TWEAKED: Unused Services Section kept for architecture ---
const services = [
  { key: 'school', title: 'School Ride', icon: 'bus-school', color: '#3B82F6', action: () => router.push('/parent-screen'), },
  { key: 'schedule', title: 'Schedule Ride', icon: 'calendar-clock', color: '#10B981', action: () => { /* Logic to open schedule modal */ }, },
  { key: 'premium', title: 'Premium Ride', icon: 'shield-check', color: '#000000', action: () => { /* Logic for premium rides */ }, },
];

// --- Added for Monthly estimates ---
const AVERAGE_SCHOOL_DAYS_PER_MONTH = 22;
const RIDES_PER_DAY = 2; // Morning and Afternoon

const Home = () => {
  const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';
  const { phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, profileImageUrl, gender, bio, seatNumber, setprofileDetails } = usePhoneNumberStore()
  const { setAdminSettings, baseFare, distanceRate, nightRate, timeRate, VAT } = useAdminNumsStore()
  const { adminAlertText, adminCreditAmount, adminCbeAccount, adminTelebirr, setCreditStore, creditRechargeModalContent } = useCreditStore();
  const { tierLimits, setTierLimits } = useTierLimitsStore();
  const { shareUsername, setShareUsername, socialCount, setSocialCount, expoToken, setExpoToken } = useShareUsernameStore();
  
  const [showConfirmRide, setShowConfirmRide] = useState(false);
  const [showSharedRide, setShowSharedRide] = useState({ show: false, rideType: 'Shared - SUV (7)' });
  const [currentRideRequestId, setCurrentRideRequestId] = useState(null);
  const [contactedDrivers, setContactedDrivers] = useState([]);
  const [distance, setDistance] = useState(null);
  const [timeTaken, setTimeTaken] = useState("");
  const { setRideRequestIdZus, clearRideRequestIdZus } = useRideStore();
  const [rideRequestIdState, setRideRequestIdState] = useState('');
  const { userAddress, destinationAddress, setDestinationLocation, setUserLocation, userLocation, userLongitude, userLatitude, destinationLocation, destinationLatitude, destinationLongitude,
  } = useLocationStore();
  
  const [showDriverSelectionModal, setShowDriverSelectionModal] = useState(false);
  const [driverOptions, setDriverOptions] = useState([]);
  const [chosenDrivers, setChosenDrivers] = useState([]);
  const [showMatchingOptionsModal, setShowMatchingOptionsModal] = useState(false); 
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showRideSelectionModal, setShowRideSelectionModal] = useState(false);
  
  const [selectedRideId, setSelectedRideId] = useState(null); // Track by ID now
  const [selectedRide, setSelectedRide] = useState(null); 
  const [modalVisible, setModalVisible] = useState(false); 
  const [modalMessage, setModalMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // --- REPURPOSED: Nested Junior Ride Tiers & Vehicles ---
  const [rideOptions, setRideOptions] = useState([
    { 
        id: 'adhoc_private_4', 
        type: 'Private Ride', 
        people: "You", 
        vehicle: "Standard (4 seats)", 
        subscription: false, 
        price: 0, 
        icon: 'person', 
        icon2: 'car', 
        description: 'One-time dynamic ride.' 
    },
    { 
        id: 'sub_private_4', 
        type: 'Private Ride', 
        people: "You", 
        vehicle: "Standard (4 seats)", 
        subscription: true, 
        price: 0, 
        icon: 'calendar-number', 
        icon2: 'car', 
        description: 'Dedicated transport.' 
    },
    { 
        id: 'sub_shared_7', 
        type: 'Shared Ride', 
        people: "Max 7", 
        vehicle: "SUV (6-7 seats)", 
        subscription: true, 
        price: 0, 
        icon: 'user-group', 
        icon2: 'van-shuttle', 
        description: 'Matched with local kids.' 
    },
  ]);

  const calculateFare = (dist: number, timeT: number) => {
    // Standard rideshare logic kept for ad-hoc
    const baseFareAmt = baseFare || 120;
    const distRate = distanceRate || 19;
    const tRate = timeRate || 2.25;
    const surgeMultiplier = 1.0;
    return ( baseFareAmt + (distRate * dist / 1000) + (tRate * timeT / 60) * surgeMultiplier );
  };

  // --- TWEAKED: Calculate prices based on Nest Junior logic ---
  useEffect(() => {
    if (userLatitude && destinationLatitude) {
      const fetchAndCalculate = async () => {
        try {
          const { distance: dist, timeTaken: tTaken } = await fetchDistanceAndTime(
            userLatitude, userLongitude, destinationLatitude, destinationLongitude
          );
          setDistance(dist);
          setTimeTaken(tTaken);
          
          const perRidePrice = calculateFare(dist, tTaken);
          const monthlyFactor = AVERAGE_SCHOOL_DAYS_PER_MONTH * RIDES_PER_DAY;

          setRideOptions(prev => prev.map(option => {
            let calculatedPrice = 0;
            if (option.id === 'adhoc_private_4') {
                calculatedPrice = Math.round(perRidePrice);
            } else if (option.id === 'sub_private_4') {
                // Subscription Private (Standard) -> Monthly estimate
                calculatedPrice = Math.round(perRidePrice * monthlyFactor * 0.9); // Example 10% subscription discount
            } else if (option.id === 'sub_shared_7') {
                // Subscription Shared (SUV) -> Monthly estimate, heavily discounted per seat
                // Base price is usually higher for SUV, but per seat is cheaper.
                calculatedPrice = Math.round((perRidePrice + 100) * monthlyFactor * 0.4); // Example 60% discount for shared
            }
            return { ...option, price: calculatedPrice };
          }));

        } catch (error) {
          console.error('Error fetching distance and time:', error);
          setModalMessage("Error calculating fare. Please try again.");
          setModalVisible(true);
        }
      };
      fetchAndCalculate();
    }
  }, [destinationLongitude, userLatitude, userLongitude, destinationLatitude, baseFare]); 

  const handleSelectRide = (option: any) => {
    if (!destinationLatitude && !destinationLongitude) {
      setModalMessage("Please set a a destination first!");
      setModalVisible(true);
      return;
    }
    setLoading(true)
    setSelectedRideId(option.id);
    setSelectedRide(option.type); // Keep this for legacy compatibility if needed elsewhere

    if (option.subscription) {
        setLoading(false);
        setModalMessage(`Thank you for choosing a Monthly ${option.type}! Our agents will contact you shortly to finalize matching and scheduling.`);
        setModalVisible(true);
        // router.push(`/(root)/subscription?type=${option.type}&vehicle=${option.vehicle}`);
        setShowRideSelectionModal(false);
    } else {
        // Ad-hoc Private Ride flow
        setLoading(false)
        setShowMatchingOptionsModal(true);
    }
  };

  // Rest of functionality kept but adapted for new options where needed
  const handleFindRide = async (num: string) => { 
    setLoading(true);
    try {
      if (!destinationLatitude || !destinationLongitude) {
        setModalMessage("Please set a destination first!");
        setModalVisible(true);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`https://app.share-rides.com/nearby-drivers?lat=${userLatitude}&lng=${userLongitude}&radius=5000`);
      const responseText = await response.text();
      let drivers;
      try {
        drivers = JSON.parse(responseText).drivers;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        setModalMessage("Error parsing driver data. Please try again.");
        setModalVisible(true);
        setLoading(false);
        return;
      }
      const nearbyDrivers = drivers;

      // Ensure appropriate pricing is sent for ad-hoc private
      const adhocOption = rideOptions.find(o => o.id === 'adhoc_private_4');

      const rideRequestId = await addRideRequest(
        setCurrentRideRequestId,
        [userLatitude, userLongitude],
        [destinationLatitude, destinationLongitude],
        nearbyDrivers,
        userId,
        destinationAddress,
        expoToken,
        phoneNumberStore,
        adhocOption?.price || 0,
      );

      const updatedDrivers = nearbyDrivers.map((driver: any) => ({
        ...driver, driverLocation: [driver.latitude, driver.longitude]
      }));
      setContactedDrivers(updatedDrivers);
      setLoading(false);
      setShowConfirmRide(true);
    } catch (err: any) {
      setModalMessage(`Whoops, drivers not available momentarily: ${err.message || 'Please try again.'}`);
      setModalVisible(true);
      console.error("Unable to find drivers.", err);
      setLoading(false);
    }
  };

  const calculateChosenFare = (dist: number, tTaken: number, kmPrice = 18) => {
    const baseFareAmt = baseFare || 120;
    const tRate = 1.8;
    const surgeMultiplier = 1.0;
    return Math.round( baseFareAmt + (kmPrice * dist / 1000) + (tRate * tTaken / 60) * surgeMultiplier );
  };

  const calculateCompanyPrice = (type: string | undefined) => {
    // Since we only have one ad-hoc type now
    const adhocOption = rideOptions.find(o => o.id === 'adhoc_private_4');
    return adhocOption?.price || 0;
  };

  const findDriversWithPreferences = async (type: string) => {
    setLoading(true);
    // Ad-hoc is always Standard (4 seats)
    const seatType = 4;
    
    try {
      if (!userLatitude || !userLongitude) {
        setModalMessage("Please enable location services or ensure your location is set!");
        setModalVisible(true);
        setLoading(false);
        return;
      }
      if (!destinationLatitude || !destinationLongitude) {
        setModalMessage("Please set a destination first!");
        setModalVisible(true);
        setLoading(false);
        return;
      }
      const response = await fetch(`https://app.share-rides.com/nearby-drivers?lat=${userLatitude}&lng=${userLongitude}&radius=3000&seats=${seatType}`);
      const responseText = await response.text();
      let drivers;
      try {
        drivers = JSON.parse(responseText).drivers;
      } catch (parseError) {
        setLoading(false);
        return;
      }
      const driverDetails = drivers.map((driver: any) => ({
        ...driver, estimatedFare: calculateChosenFare(distance || 0, timeTaken || 0, driver.kmPrice), 
      }));
      setLoading(false);
      setDriverOptions(driverDetails);
      setShowDriverSelectionModal(true); 
    } catch (error: any) {
      setModalMessage(`No drivers found: ${error.message}`);
      setModalVisible(true);
      setLoading(false);
    }
  };

  const handlePriceSelect = (driverId: string, priceType: 'driver' | 'company', driverLocation: number[]) => {
    setChosenDrivers(prev => {
      const existing = prev.find(d => d.driverId === driverId);
      const driver = driverOptions.find(d => d.driverId === driverId);
      const companyPrice = calculateCompanyPrice(''); // Only one type
      const driverFare = driver?.estimatedFare;
      const finalPrice = priceType === 'driver' ? driverFare : companyPrice;
      if (existing) {
        return prev.map(d => d.driverId === driverId ? { ...d, priceType, finalPrice, driverLocation } : d );
      }
      return [...prev, { driverId, priceType, finalPrice, driverLocation }];
    });
  };

  const handleRequestCreation = async () => {
    try {
      if (!destinationLatitude || !destinationLongitude) {
        setModalMessage("Please set a destination first!");
        setModalVisible(true);
        return;
      }
      setLoading(true);
      const userLocationCoords = [userLatitude, userLongitude];
      const destCoords = [destinationLatitude, destinationLongitude];
      const docRef = firestore().collection('requests').doc();
      await docRef.set({ 
          type: "private_adhoc", // repuposed type
          destinationAddress, pnumber: phoneNumberStore, userLocation: userLocationCoords, destinationLocation: destCoords, createdAt: firestore.Timestamp.fromDate(new Date()), status: 'looking-for-driver', userId, driverSetPrice: chosenDrivers.some(d => d.priceType === 'driver') });
      
      // ... rest of push notification logic kept ...
      if (chosenDrivers.length > 0) {
        const messages = chosenDrivers.map((driver) => {
          const driverData = driverOptions.find(d => d.driverId === driver.driverId);
          return { to: driverData?.expoToken, title: '📍 New Ride Request', body: 'Nest Junior Private Ride requested.', channelId: 'ride_notifications', data: { type: 'ride_request', requestId: docRef.id, pnumber: phoneNumberStore || '', destinationAddress: destinationAddress || '', rideType: "private_adhoc", estimatedPrice: String(driver.finalPrice), origin: JSON.stringify(userLocationCoords), destination: JSON.stringify(destCoords), name: name, expoToken: expoToken || '', driverSetPrice: driver.priceType === 'driver' ? 'true' : 'false', } };
        });
        await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json', }, body: JSON.stringify(messages), });
      }
      setCurrentRideRequestId(docRef.id);
      setContactedDrivers(chosenDrivers);
      setLoading(false);
      setShowConfirmRide(true);
      setShowDriverSelectionModal(false);
    } catch (error: any) {
      console.error("Error creating request:", error);
      setModalMessage(`Error creating request: ${error.message}`);
      setModalVisible(true);
      setLoading(false);
    }
  };

  // Re-used helper components
  const PriceDisplay = ({ price, currency = 'ETB' }: { price: number, currency?: string }) => (
    <View className="flex-row items-baseline">
      <Text className="text-xs font-JakartaMedium text-gray-500">{currency}</Text>
      <Text className="text-xl font-JakartaBold text-gray-900 ml-1">{price.toLocaleString()}</Text>
    </View>
  );

  // Auth & Permissions logic kept
  const user = auth()?.currentUser;
  const name = user?.displayName || "Guest";
  const userId = user?.uid || "anonymous_user";
  const setUserId = useUserIdStore((state) => state.setUserId);
  useEffect(() => { setUserId(user?.uid || "anonymous_user"); }, [user?.uid]);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [showSchedule, setShowSchedule] = useState(false);
  
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setModalMessage("Location permission is required.");
        setModalVisible(true);
        return;
      }
      setHasPermission(true);
      let location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords?.latitude!, longitude: location.coords?.longitude!,
      });
      setUserLocation({
        latitude: location.coords?.latitude, longitude: location.coords?.longitude,
        address: `${address[0].name}, ${address[0].region}`,
      });
    })();
  }, []);

  const { language, setLanguage } = useLanguageStore();
  const { welcome, currentLocation } = translation1[language];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(false);
    setDate(currentDate);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(false);
    setTime(currentTime);
  };

  const handleDriverSelection = (driverId: string, companyPrice: number, driverLocation: number[]) => {
    setChosenDrivers(prev => {
      if (prev.some(d => d.driverId === driverId)) {
        return prev.filter(d => d.driverId !== driverId);
      }
      const driver = driverOptions.find(d => d.user_id === driverId);
      return [...prev, { driverId, priceType: 'driver', finalPrice: driver?.estimatedFare, driverLocation }];
    });
  };

  const PriceOption = ({ type, price, isSelected, onPress }: { type: 'driver' | 'company', price: number, isSelected: boolean, onPress: () => void }) => (
    <TouchableOpacity className={`flex-1 p-3 rounded-lg ${ isSelected ? 'bg-green-300 border-2 border-green-500' : 'bg-gray-50' }`} onPress={onPress} >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-JakartaMedium text-gray-700"> {type === 'driver' ? "Driver's Price" : "Market Price"} </Text>
          <Text className="text-lg font-JakartaBold text-gray-900"> {price} Birr </Text>
        </View>
        {isSelected && ( <Ionicons name="checkmark-circle" size={20} color={type === 'driver' ? Colors.successGreen : Colors.secondaryTeal} /> )}
      </View>
    </TouchableOpacity>
  );

  const DriverLocationMap = ({ driverLocations, userLocation }: { driverLocations: any[], userLocation: { latitude: number, longitude: number } }) => {
    if (!userLocation) return null;
    return (
      <View style={styles.miniMapContainer}>
        <MapView provider={PROVIDER_GOOGLE} style={styles.miniMap} liteMode={true} initialRegion={{ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.0452, longitudeDelta: 0.0251, }} >
          <Marker coordinate={userLocation} title="Your Location" pinColor={Colors.primaryOrange} />
          {driverLocations.map((driver) => (
            <Marker key={driver.user_id} coordinate={{ latitude: driver.latitude, longitude: driver.longitude }} >
              <View> <FontAwesome6 name="car" size={32} color={Colors.secondaryTeal} /> </View>
            </Marker>
          ))}
        </MapView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryOrange} />
        <Text className="mt-2 font-JakartaBold text-gray-700">Executing request...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.mapContainer}>
        <MapComponent />
      </View>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push("/profile")} >
          <Image style={styles.avatar} source={{ uri: profileImageUrl || user?.photoURL || DEFAULT_AVATAR }} />
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <CustomGooglePlacesInput type="pickup" placeholder={currentLocation} selectionOpener={setShowRideSelectionModal} homepage={true}/>
        </View>
      </View>
      <TouchableOpacity style={styles.languageMenuButton} onPress={() => setShowLanguageModal(true)} >
        <Ionicons name="language" size={24} color={Colors.textDark} />
      </TouchableOpacity>

      {/* TWEAKED: HIDING RIDESHARE BOTTOM SHEET UI */}
      {false && (
        <BottomSheet index={0} snapPoints={['55%', '85%']} backgroundStyle={styles.bottomSheetBackground} handleIndicatorStyle={styles.bottomSheetHandle} >
          <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
          {/* Content removed for clarity based on hide rule */}
          </BottomSheetScrollView>
        </BottomSheet>
      )}

      {/* --- REPURPOSED MODAL: Matching Preferences for Ad-Hoc --- */}
      <Modal visible={showMatchingOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text className="font-JakartaBold" style={styles.modalTitle}>Request Private Ride</Text>
              <TouchableOpacity onPress={() => setShowMatchingOptionsModal(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMedium} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalPrimaryActionButton} onPress={() => { findDriversWithPreferences('adhoc'); setShowMatchingOptionsModal(false); }} >
              <Text style={styles.modalPrimaryActionButtonText}>💥 Choose Your Driver</Text>
            </TouchableOpacity>
            <Text style={styles.modalOptionSeparatorText}>Or</Text>
            <TouchableOpacity style={styles.modalOptionButton} onPress={() => { handleFindRide("4"); setShowMatchingOptionsModal(false); }} >
              <Text style={styles.modalOptionButtonText}>🪄 Find Automatic Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- TWEAKED MODAL: Ride Selection for Nest Junior --- */}
      <Modal visible={showRideSelectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.rideSelectionModalContent}>
            <View style={styles.modalHeader}>
              <Text className="font-JakartaBold" style={styles.modalTitle}>Choose Service Plan</Text>
              <TouchableOpacity onPress={() => setShowRideSelectionModal(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMedium} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.rideOptionsGrid}>
              {rideOptions.map((item) => {
                const isSelected = selectedRideId === item.id;
                return (
                    <TouchableOpacity 
                        key={item.id} 
                        style={[styles.rideOptionCardGrid, isSelected && styles.rideOptionCardSelected]} 
                        onPress={() => {
                            setSelectedRideId(item.id);
                            // Set legacy states for compatibility
                            setSelectedRide(item.type);
                        }} 
                    >
                        {/* Monthly Badge */}
                        {item.subscription && (
                            <View style={styles.monthlyBadge}>
                                <Text style={styles.monthlyBadgeText}>MONTHLY</Text>
                            </View>
                        )}

                        <View style={styles.rideOptionCardTop}>
                            <View style={styles.rideOptionIconGroup}>
                                <FontAwesome6 name={item.icon} size={20} color={isSelected ? Colors.backgroundWhite : Colors.secondaryTeal} />
                                <Text className="font-Jakarta" style={[styles.rideOptionPeopleText, isSelected && styles.rideOptionPeopleTextSelected]}>
                                    {item.people}
                                </Text>
                            </View>
                            <FontAwesome6 name={item.icon2} size={20} color={isSelected ? Colors.backgroundWhite : Colors.textDark} />
                        </View>
                        
                        <Text className="font-JakartaSemiBold" style={[styles.rideOptionTypeText, isSelected && styles.rideOptionTypeTextSelected]}>
                            {item.type}
                        </Text>
                        
                        <Text style={[styles.rideOptionVehicleText, isSelected && styles.rideOptionPeopleTextSelected]}>
                            {item.vehicle}
                        </Text>
                        
                        <View className="mt-2">
                           <PriceDisplay price={item.price} currency={isSelected ? ' ' : 'ETB'} />
                           <Text style={[styles.rideOptionPriceLabel, isSelected && styles.rideOptionPeopleTextSelected]}>
                               {item.subscription ? 'estimated / month' : 'per ride'}
                           </Text>
                        </View>

                        {isSelected && (
                            <View style={styles.rideOptionSelectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={Colors.secondaryTeal} />
                            </View>
                        )}
                    </TouchableOpacity>
                )
              })}
            </View>
            
            <TouchableOpacity 
                style={[styles.modalPrimaryActionButton, { marginTop: 20 }]} 
                onPress={() => {
                    if (!selectedRideId) return;
                    const option = rideOptions.find(o => o.id === selectedRideId);
                    handleSelectRide(option);
                }} 
                disabled={!selectedRideId}
            >
              <Text style={styles.modalPrimaryActionButtonText}> Proceed with {selectedRide || 'Selection'} </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal kept */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.languageModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMedium} />
              </TouchableOpacity>
            </View>
            <View style={styles.languageOptionsContainer}>
              {['ENG', 'AMH', 'ORM'].map((lang) => (
                <TouchableOpacity key={lang} onPress={() => { setLanguage(lang); setShowLanguageModal(false); }} style={[styles.languageOptionButton, language === lang && styles.languageOptionButtonActive]} >
                  <Text style={[styles.languageOptionText, language === lang && styles.languageOptionTextActive]}>
                    {lang === 'ENG' ? 'English' : lang === 'AMH' ? 'አማርኛ' : 'Afan Oromo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Driver Selection Modal kept, repuposed info */}
      <Modal visible={showDriverSelectionModal} animationType="slide" transparent={false}>
        <View style={styles.driverSelectionModalContainer}>
          <View style={styles.driverSelectionModalHeader}>
            <Text style={styles.driverSelectionModalTitle}>Choose Your Driver</Text>
            <TouchableOpacity onPress={() => setShowDriverSelectionModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textMedium} />
            </TouchableOpacity>
          </View>
          <View style={styles.driverSelectionModalInfoBox}>
            <Text style={styles.driverSelectionModalInfoText}> 👋 Hi {user?.displayName?.split(" ")[0]}, select drivers for your Private Ride. </Text>
          </View>
          <View style={styles.miniMapWrapper}>
            <DriverLocationMap driverLocations={driverOptions} userLocation={{ latitude: userLatitude || 0, longitude: userLongitude || 0 }} />
          </View>
          <FlatList data={driverOptions} keyExtractor={(item) => item.user_id} ItemSeparatorComponent={() => (<View style={styles.driverListItemSeparator} />)} contentContainerStyle={styles.driverListContentContainer} renderItem={({ item: driver }) => {
            const companyPrice = calculateCompanyPrice('');
            const selected = chosenDrivers.find(d => d.driverId === driver.user_id);
            const isChosen = !!selected;
            const vehicleDetails = driver.vehicle_details;
            return (
              <View style={styles.driverCard}>
                <View style={styles.driverCardTopRow}>
                  <Image source={{ uri: driver.profile_image || DEFAULT_AVATAR }} style={styles.driverAvatar} />
                  <View style={styles.driverInfoColumn}>
                    <View style={styles.driverNameRatingRow}>
                      <Text style={styles.driverName}>{driver.share_username || 'Driver'}</Text>
                      <View style={styles.driverRatingStar}>
                        <Ionicons name="star" size={16} color={Colors.primaryOrange} />
                        <Text style={styles.driverRatingText}> {`${Math.round(driver.rating_sum / driver.rating_count) || "4.8"}`} </Text>
                      </View>
                    </View>
                    <Text style={styles.vehicleDetailsText}> {vehicleDetails?.model || 'Standard Sedan'} • Seats: {driver.seat_type || '4'} </Text>
                  </View>
                </View>
                <View style={styles.priceOptionsContainer}>
                  <PriceOption type="driver" price={driver.estimatedFare || 0} isSelected={selected?.priceType === 'driver'} onPress={() => handlePriceSelect(driver.user_id, 'driver', [driver.latitude, driver.longitude])} />
                  <Text style={styles.priceOptionSeparatorText}>Or</Text>
                  <PriceOption type="company" price={companyPrice} isSelected={selected?.priceType === 'company'} onPress={() => handlePriceSelect(driver.user_id, 'company', [driver.latitude, driver.longitude])} />
                </View>
                <TouchableOpacity style={[styles.selectDriverButton, isChosen && styles.selectDriverButtonSelected]} onPress={() => handleDriverSelection(driver.user_id, companyPrice, [driver.latitude, driver.longitude])} >
                  <Text style={[styles.selectDriverButtonText, isChosen && styles.selectDriverButtonTextSelected]}> {isChosen ? 'Selected ✓' : 'Select Driver'} </Text>
                </TouchableOpacity>
              </View>
            );
          }} />
          <View style={styles.driverSelectionFooter}>
            <TouchableOpacity style={[styles.requestDriversButton, chosenDrivers.length === 0 && styles.requestDriversButtonDisabled]} onPress={handleRequestCreation} disabled={chosenDrivers.length === 0} >
              <Text style={styles.requestDriversButtonText}> Request Selected Drivers ({chosenDrivers.length}) </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomModal visible={modalVisible} message={modalMessage} onClose={() => setModalVisible(false)} />
      {showConfirmRide && (
        <View style={styles.fullScreenOverlay}>
          <ConfirmRide rideRequestId={currentRideRequestId} onCancel={() => { setShowConfirmRide(false); setCurrentRideRequestId(null); }} contactedDrivers={contactedDrivers} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.backgroundWhite, },
  mapContainer: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0, },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundWhite, },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20, },
  modalTitle: { marginLeft: 8, fontSize: 20, color: Colors.textDark, fontFamily: 'Jakarta-Bold' },
  modalCloseButton: { padding: 4, },
  modalContent: { backgroundColor: Colors.backgroundWhite, borderRadius: 20, padding: 24, width: '85%', alignItems: 'center', shadowColor: Colors.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 15, },
  modalOptionButton: { backgroundColor: Colors.backgroundLightGray, paddingVertical: 16, borderRadius: 12, marginBottom: 12, width: '100%', },
  modalOptionButtonText: { fontFamily: 'Jakarta-SemiBold', textAlign: 'center', color: Colors.textDark, fontSize: 16, },
  modalOptionSeparatorText: { fontSize: 14, fontFamily: 'Jakarta-SemiBold', color: Colors.textLight, marginBottom: 12, },
  modalPrimaryActionButton: { backgroundColor: Colors.primaryOrange, paddingVertical: 16, borderRadius: 12, width: '100%', shadowColor: Colors.primaryOrange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, },
  modalPrimaryActionButtonText: { fontFamily: 'Jakarta-Bold', color: Colors.backgroundWhite, textAlign: 'center', fontSize: 18, },
  driverSelectionModalContainer: { flex: 1, backgroundColor: Colors.backgroundWhite, },
  driverSelectionModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, },
  driverSelectionModalTitle: { fontSize: 24, fontFamily: 'Jakarta-Bold', color: Colors.textDark, },
  driverSelectionModalInfoBox: { backgroundColor: Colors.backgroundLightGray, padding: 16, borderRadius: 12, marginHorizontal: 24, marginTop: 16, },
  driverSelectionModalInfoText: { fontSize: 14, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, },
  miniMapWrapper: { marginHorizontal: 24, marginTop: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight, },
  miniMapContainer: { height: 140, borderRadius: 12, overflow: 'hidden', },
  miniMap: { flex: 1, },
  driverListContentContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100, },
  driverCard: { backgroundColor: Colors.backgroundWhite, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: Colors.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 5, },
  driverCardTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, },
  driverAvatar: { width: 60, height: 60, borderRadius: 12, marginRight: 16, backgroundColor: Colors.backgroundLightGray, },
  driverInfoColumn: { flex: 1, },
  driverNameRatingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, },
  driverName: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark, flexShrink: 1, },
  driverRatingStar: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, },
  driverRatingText: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginLeft: 4, },
  vehicleDetailsText: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.secondaryTeal, },
  priceOptionsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, },
  priceOptionSeparatorText: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: Colors.textLight, marginHorizontal: 10, },
  selectDriverButton: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.backgroundLightGray, },
  selectDriverButtonSelected: { backgroundColor: Colors.primaryOrange, },
  selectDriverButtonText: { fontFamily: 'Jakarta-Bold', fontSize: 16, color: Colors.textMedium, },
  selectDriverButtonTextSelected: { color: Colors.backgroundWhite, },
  driverListItemSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderLight, marginVertical: 8, marginHorizontal: 16, },
  driverSelectionFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.backgroundWhite, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, zIndex: 10 },
  requestDriversButton: { backgroundColor: Colors.secondaryTeal, paddingVertical: 16, borderRadius: 12, alignItems: 'center', },
  requestDriversButtonDisabled: { backgroundColor: Colors.textLight, },
  requestDriversButtonText: { color: Colors.backgroundWhite, fontFamily: 'Jakarta-Bold', fontSize: 18, },
  fullScreenOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: Colors.backgroundWhite, },
  languageMenuButton: { position: 'absolute', top: 150 , right: 20, zIndex: 2, backgroundColor: Colors.backgroundWhite, padding: 10, borderRadius: 25, shadowColor: Colors.textDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, },
  languageModalContent: { backgroundColor: Colors.backgroundWhite, borderRadius: 20, padding: 24, width: '85%', shadowColor: Colors.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 15, },
  languageOptionsContainer: { flexDirection: 'column', width: '100%', },
  languageOptionButton: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 10, alignItems: 'center', backgroundColor: Colors.backgroundLightGray, },
  languageOptionButtonActive: { backgroundColor: Colors.primaryOrange, borderColor: Colors.primaryOrange, },
  languageOptionText: { fontFamily: 'Jakarta-SemiBold', color: Colors.textDark, fontSize: 16, },
  languageOptionTextActive: { color: Colors.backgroundWhite, },
  headerContainer: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 },
  avatarContainer: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.backgroundWhite, },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.successGreen, borderWidth: 2, borderColor: Colors.backgroundWhite, },
  inputContainer: { flex: 1, },
  bottomSheetBackground: { backgroundColor: Colors.backgroundWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, },
  bottomSheetHandle: { backgroundColor: Colors.borderLight, },
  bottomSheetContent: { paddingHorizontal: 16, paddingBottom: 40, },
  rideSelectionModalContent: { backgroundColor: Colors.backgroundWhite, borderRadius: 20, padding: 24, width: '90%', maxHeight: screenHeight * 0.8, alignItems: 'center', shadowColor: Colors.textDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 15, },
  rideOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  rideOptionCardGrid: { width: '48%', padding: 16, marginBottom: 12, borderRadius: 16, backgroundColor: '#FFF1E3', borderWidth: 1, borderColor: Colors.borderLight, position: 'relative' },
  rideOptionCardSelected: { backgroundColor: Colors.secondaryTeal, borderColor: Colors.secondaryTeal, },
  rideOptionCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, },
  rideOptionIconGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, },
  rideOptionPeopleText: { color: Colors.textDark, fontSize: 12, fontFamily: 'Jakarta-Medium'},
  rideOptionPeopleTextSelected: { color: Colors.backgroundWhite, },
  rideOptionTypeText: { fontSize: 15, color: Colors.textDark, fontFamily: 'Jakarta-Bold' },
  rideOptionTypeTextSelected: { color: Colors.backgroundWhite, },
  rideOptionVehicleText: { fontSize: 11, color: Colors.textMedium, fontFamily: 'Jakarta-Medium', marginBottom: 4 },
  rideOptionPriceLabel: { fontSize: 10, color: Colors.textLight, fontFamily: 'Jakarta'},
  rideOptionSelectedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.backgroundWhite, borderRadius: 10, padding: 2 },
  monthlyBadge: { position: 'absolute', top: -8, left: 12, backgroundColor: Colors.primaryOrange, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, zIndex: 1},
  monthlyBadgeText: { color: Colors.backgroundWhite, fontSize: 9, fontFamily: 'Jakarta-Bold' },
});

export default Home;