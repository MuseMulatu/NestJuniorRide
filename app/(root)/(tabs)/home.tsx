import { Animated, Easing, ScrollView, Button, Modal, StyleSheet, Dimensions } from "react-native";
import * as Location from "expo-location";
import AntDesign from '@expo/vector-icons/AntDesign';
import { router, Stack } from "expo-router"; // Import Stack for header options
import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { Text, View, TouchableOpacity, Image, FlatList, ActivityIndicator, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleFindSharedRide, fetchDistanceAndTime, listenForRideRequest, listenForStartedRequests, userProfileById } from "@/lib/utils";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient'; // Keep if used for buttons/backgrounds
import inAppMessaging from '@react-native-firebase/in-app-messaging'; // Keep if used
import { db, dynamoDbData, fetchAdminData, getLimits } from "@/lib/localDB";
import ConfirmRide from "@/app/(root)/confirm-ride";
import SharedWaitRoom from "@/app/(root)/rideshare/confirm-coride";
import CustomGooglePlacesInput from "@/components/CustomGooglePlacesInput";
import CustomGooglePlacesInput2 from "@/components/CustomGooglePlacesInput2"; // Assuming this is for destination
import Map from "@/components/Map"; // Assuming this is your custom Map component
import MapComponent from "@/components/setOnMap"; // Assuming this is your custom Map component
import LocationButton from "@/components/cmybutton"; // Assuming this is your custom button
import RideCard from "@/components/RideCard"; // Assuming this is your custom RideCard
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
import PostsPage from "@/app/(root)/(tabs)/posts"; // Embedded component
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import CustomModal for consistent alerts
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
//
// --- NEW & IMPROVED: Service Card Data ---
const services = [
  {
    key: 'school',
    title: 'School Ride',
    icon: 'bus-school',
    color: '#3B82F6', // Blue
    action: () => router.push('/parent-screen'), // <-- This will navigate to your new screen
  },
  {
    key: 'schedule',
    title: 'Schedule Ride',
    icon: 'calendar-clock',
    color: '#10B981', // Green
    action: () => { /* Logic to open schedule modal */ },
  },
  // {
  //   key: 'games',
  //   title: 'Game Rooms',
  //   icon: 'cards-playing',
  //   color: '#8B5CF6', // Purple
  //  action: () => router.push('/active-ride'),
  // //  action: () => { /* Logic for premium rides */ },
  // },
   {
    key: 'premium',
    title: 'Premium Ride',
    icon: 'shield-check',
    color: '#000000', // Black for premium
    action: () => { /* Logic for premium rides */ },
  },
];

const Home = () => {
  const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';
  const { phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, profileImageUrl, gender, bio, seatNumber, setprofileDetails } = usePhoneNumberStore()
  const { setAdminSettings, baseFare, distanceRate, nightRate, timeRate, VAT } = useAdminNumsStore()
  const { adminAlertText, adminCreditAmount, adminCbeAccount, adminTelebirr, setCreditStore, creditRechargeModalContent } = useCreditStore();
  const { tierLimits, setTierLimits } = useTierLimitsStore();
  const { shareUsername, setShareUsername, socialCount, setSocialCount, expoToken, setExpoToken } = useShareUsernameStore();
  const [showConfirmRide, setShowConfirmRide] = useState(false);
  const [showSharedRide, setShowSharedRide] = useState({ show: false, rideType: 'Shared - 4 People' });

  const [currentRideRequestId, setCurrentRideRequestId] = useState(null);
  const [contactedDrivers, setContactedDrivers] = useState([]);

  const [distance, setDistance] = useState(null);
  const [timeTaken, setTimeTaken] = useState("");
  const { setRideRequestIdZus, clearRideRequestIdZus } = useRideStore();
  const [rideRequestIdState, setRideRequestIdState] = useState('');
  const { userAddress, destinationAddress, setDestinationLocation, setUserLocation, userLocation, userLongitude, userLatitude, destinationLocation, destinationLatitude, destinationLongitude,
  } = useLocationStore();

  const [driverGender, setDriverGender] = useState("Any");
  const [languagesSpoken, setLanguagesSpoken] = useState(["Any"]);
  const [showDriverSelectionModal, setShowDriverSelectionModal] = useState(false); // Renamed `visible`
  const [driverOptions, setDriverOptions] = useState([]);
  const [chosenDrivers, setChosenDrivers] = useState([]);
  const [showMatchingOptionsModal, setShowMatchingOptionsModal] = useState(false); // Renamed `visible1`
  const [showChooseDriverSoonModal, setShowChooseDriverSoonModal] = useState(false); // New state for confirmation modal
 const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showRideSelectionModal, setShowRideSelectionModal] = useState(false);
  const directionsAPI = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const [rideOptions, setRideOptions] = useState([
    { type: 'Solo - Economy', price: 0, icon2: 'car', icon: 'person', people: "You" },
    { type: 'Shared - 2 People', price: 0, icon: 'user-group', icon2: 'car', people: 2 },
    { type: 'Shared - 3 People', price: 0, icon: 'users', icon2: 'car', people: 3 },
    { type: 'Solo - Minivan (7)', price: 0, icon: 'person', icon2: 'van-shuttle', people: "You" },
    { type: 'Tesla', price: 270, icon: 'charging-station', people: "You", icon2: 'car' }
  ]);
  const [selectedRide, setSelectedRide] = useState(null);

  const [modalVisible, setModalVisible] = useState(false); // For CustomModal
  const [modalMessage, setModalMessage] = useState(''); // For CustomModal

  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 156) + 79;
    const g = Math.floor(Math.random() * 156) + 79;
    const b = Math.floor(Math.random() * 156) + 79;
    return `rgb(${r}, ${g}, ${b})`;
  };

  async function handleSharedRide(type: string) { // Type safety
    setModalMessage("Looking for co-riders on your route...");
    setModalVisible(true); // Show loading modal
    try {
      if (!userLatitude || !userLongitude || !destinationLatitude || !destinationLongitude || !destinationAddress) {
        setModalMessage("Please set a destination first!");
        setModalVisible(true);
        return;
      }
      const matchCoRiders = functions().httpsCallable("matchCoRiders");
      let origin = [userLatitude, userLongitude];
      let destination = [destinationLatitude, destinationLongitude];
      const { pnumber } = await fetchUserPhoneNumber(); // Assuming this is available

      const result = await matchCoRiders({ origin, destination, name, pnumber, type, userId, destinationAddress });
      setModalVisible(false); // Hide loading modal
      router.push('/(root)/confirm-ride?shared="true"');
    } catch (error: any) { // Type safety
      console.error("Error finding ride:", error);
      setModalMessage(`Couldn't find a ride right now: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
    }
  }

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const user = auth().currentUser; // Get current user here
        if (!user) return; // Exit if no user

          const limits = await getLimits(); // Assuming getLimits is defined
          setTierLimits(limits);
          
        const driverData = await userProfileById(user.uid); // Assuming userProfileById is defined
        setShareUsername(driverData?.username || null);
        setSocialCount(driverData?.follower_count || 0);
             setPhoneNumberStore(driverData?.phone_number || null);
          setProfileImageUrl(driverData.avatar_url)
          setprofileDetails({ gender: driverData?.gender, almaz: driverData?.balance });
          setExpoToken(driverData?.expo_token || null);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchDriverData();
  }, [userId]); // Runs when `userId` changes


const handleSelectRide = (rideType) => {
    if (!destinationLatitude && !destinationLongitude) {
      setModalMessage("Please set a a destination first!");
      setModalVisible(true);
      return;
    }
  setLoading(true)
  setSelectedRide(rideType);
 if (rideType === "Solo - Economy") {
  setLoading(false)
setShowMatchingOptionsModal(true);
  }
  else if(rideType === "Solo - Minivan (7)"){
    setLoading(false)
    handleFindRide("7")
  }
  else if(rideType === "Shared - 3 People"){
    setLoading(false)
setShowSharedRide({show: true, rideType: "Shared - 3 People"})}
 else if(rideType === "Shared - 2 People"){
  setLoading(false)
setShowSharedRide({show: true, rideType: "Shared - 2 People"})}
 else if(rideType === "Shared - Minivan"){
  setLoading(false)
 setShowSharedRide({show: true, rideType: "Shared - 7 People"})}
  };

  useEffect(() => {
    if (userLatitude && destinationLatitude) {
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
            { type: 'Solo - Economy', price: Math.round(soloP), icon2: 'car', icon: 'person', people: "You" },
            { type: 'Shared - 2 People', price: Math.round(soloP / 2), icon: 'user-group', icon2: 'car', people: 2 },
            { type: 'Shared - 3 People', price: Math.round(soloP / 3), icon: 'users', icon2: 'car', people: 3 },
            { type: 'Solo - Minivan (7)', price: Math.round(soloP + 100), icon: 'person', icon2: 'van-shuttle', people: "You" },
            { type: 'Tesla', price: Math.round(soloP + 240), icon: 'charging-station', people: "You", icon2: 'car' }
          ]);
        } catch (error) {
          console.error('Error fetching distance and time:', error);
          setModalMessage("Error calculating fare. Please try again.");
          setModalVisible(true);
        }
      };
      fetchAndCalculate();
    }
  }, [destinationLongitude, userLatitude, userLongitude, destinationLatitude]); // Added dependencies

  const handlePriceSelect = (driverId: string, priceType: 'driver' | 'company', driverLocation: number[]) => { // Type safety
    setChosenDrivers(prev => {
      const existing = prev.find(d => d.driverId === driverId);
      const driver = driverOptions.find(d => d.driverId === driverId);
      const companyPrice = calculateCompanyPrice(selectedRide?.type);
      const driverFare = driver?.estimatedFare;

      const finalPrice = priceType === 'driver' ? driverFare : companyPrice;

      if (existing) {
        const isSame = existing.priceType === priceType;
        return isSame
          ? prev
          : prev.map(d =>
            d.driverId === driverId
              ? { ...d, priceType, finalPrice, driverLocation }
              : d
          );
      }

      return [...prev, {
        driverId,
        priceType,
        finalPrice,
        driverLocation
      }];
    });
  };

  const calculateCompanyPrice = (type: string | undefined) => { // Type safety
    switch (type) {
      case 'Solo - Economy': return soloPrice;
      case 'Solo - Minivan (7)': return soloMinivanP;
      case 'Lada': return soloLadaP;
      default: return soloPrice;
    }
  };

  const [statusMessage, setStatusMessage] = useState(" ");
  const [matchedGroup, setMatchedGroup] = useState(null);
  const [sharedPrice, setSharedPrice] = useState(null);
  const [soloPrice, setSoloPrice] = useState(null);
  const [soloMinivanP, setSoloMinivanP] = useState(null);
  const [soloLadaP, setSoloLadaP] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false); // This seems redundant with general `loading` and `CustomModal`

  const handleFindRide = async (num: string) => { // Type safety
    setLoading(true);
    setError(null);
    try {
      if (!destinationLatitude || !destinationLongitude) {
        setModalMessage("Please set a destination first!");
        setModalVisible(true);
        setLoading(false);
        return;
      }
      let nearbyDrivers;
      const response = await fetch(`https://app.share-rides.com/nearby-drivers?lat=${userLatitude}&lng=${userLongitude}&radius=5000`);
      const responseText = await response.text();
      try {
        drivers = JSON.parse(responseText).drivers;
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        setModalMessage("Error parsing driver data. Please try again.");
        setModalVisible(true);
        setLoading(false);
        return;
      }
      nearbyDrivers = drivers;

      const rideRequestId = await addRideRequest(setCurrentRideRequestId,
        [userLatitude, userLongitude], [destinationLatitude, destinationLongitude], nearbyDrivers, userId, destinationAddress, expoToken, phoneNumberStore,
        soloPrice,
      );

      if (nearbyDrivers.length < 3) {
        console.log("Fewer than 3 drivers found, contacting admin.");
        try {
          // Assuming your admin contact API is working and correctly configured
          await fetch("https://your-domain.com/api/admin-contact", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rideRequest: {
                origin: [userLatitude, userLongitude],
                destination: [destinationLatitude, destinationLongitude],
                userId: userId,
                destinationAddress: destinationAddress,
                rideType: selectedRide,
                numDriversFound: nearbyDrivers.length,
                phoneNumber: phoneNumberStore,
                requestId: rideRequestId,
              },
              userExpoToken: expoToken,
            }),
          });
          setModalMessage("Fewer than 3 drivers are available right now. We've notified our team and will find you a ride as soon as possible.");
          setModalVisible(true);
        } catch (apiError: any) { // Type safety
          console.error("Error contacting admin API:", apiError);
          setModalMessage(`Could not notify admin: ${apiError.message || 'Please try again later.'}`);
          setModalVisible(true);
        } finally {
          setLoading(false);
        }
      }

      const updatedDrivers = nearbyDrivers.map((driver: any) => ({ // Type safety
        ...driver,
        driverLocation: [driver.latitude, driver.longitude]
      }));
      setContactedDrivers(updatedDrivers);
      setLoading(false);
      setShowConfirmRide(true);
    } catch (err: any) { // Type safety
      setModalMessage(`Whoops, drivers not available momentarily: ${err.message || 'Please try again.'}`);
      setModalVisible(true);
      console.error("Unable to find drivers.", err);
      setLoading(false);
    }
  };

  // Move this function outside useEffect
  const calculateFare = (distance: number, timeTaken: number) => { // Type safety
    const baseFare = 120;
    const distanceRate = 19;
    const timeRate = 2.25;
    const surgeMultiplier = 1.0;

    return (
      baseFare +
      (distanceRate * distance / 1000) +
      (timeRate * timeTaken / 60) * surgeMultiplier
    );
  };

  const translations = {
    ENG: `You'll arrive at your destination in approximately ${Math.ceil(timeTaken / 60)} minutes`,
    AMH: `በ${Math.ceil(timeTaken / 60)} ደቂቃ አካባቢ መድረሻዎ ላይ ይደርሳሉ`,
    ORM: `Bakka itti deemtan tilmaamaan daqiiqaa ${Math.ceil(timeTaken / 60)} booda ni geessan`
  };

  const findDriversWithPreferences = async (type: string) => { // Type safety
    setLoading(true);
    let seatType;
    if (type === "Solo - Economy") {
      seatType = 4
    }
    else if (type == "Solo - Minivan (7)") {
      seatType = 7
    }
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
      const response = await fetch(`https://app.share-rides.com/nearby-drivers?lat=${userLatitude}&lng=${userLongitude}&radius=3000`);
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

      const driverDetails = drivers.map((driver: any) => ({ // Type safety
        ...driver,
        estimatedFare: calculateChosenFare(distance || 0, timeTaken || 0, driver.kmPrice), // Ensure distance/timeTaken are numbers
      }));
      setLoading(false);
      setDriverOptions(driverDetails);
      setShowDriverSelectionModal(true); // Open the modal
    } catch (error: any) { // Type safety
      setModalMessage(`No drivers found with your preferences: ${error.message || 'Please reset your preferences and try again.'}`);
      setModalVisible(true);
      setLoading(false);
    }
  };

  const calculateChosenFare = (distance: number, timeTaken: number, kmPrice = 18) => { // Type safety
    const baseFare = 120;
    const distanceRate = kmPrice;
    const timeRate = 1.8;
    const surgeMultiplier = 1.0;

    return Math.round(
      baseFare +
      (distanceRate * distance / 1000) +
      (timeRate * timeTaken / 60) * surgeMultiplier
    );
  };

  const handleRequestCreation = async () => {
    try {
      if (!destinationLatitude || !destinationLongitude) {
        setModalMessage("Please set a destination first!");
        setModalVisible(true);
        return;
      }
      setLoading(true);
      const userLocation = [userLatitude, userLongitude];
      const destinationLocation = [destinationLatitude, destinationLongitude];

      const docRef = firestore().collection('requests').doc();
      await docRef.set({
        type: "solo",
        destinationAddress,
        pnumber: phoneNumberStore,
        userLocation,
        destinationLocation,
        createdAt: firestore.Timestamp.fromDate(new Date()),
        status: 'looking-for-driver',
        userId,
        driverSetPrice: chosenDrivers.some(d => d.priceType === 'driver')
      });

      if (chosenDrivers.length > 0) {
        const messages = chosenDrivers.map((driver) => {
          const driverData = driverOptions.find(d => d.driverId === driver.driverId);
          const baseMessage = "This passenger chose you. Give them a great service so that they may favorite you!";
          const priceMessage = driver.priceType === 'driver'
            ? "using your price"
            : "";

          return {
            to: driverData?.expoToken, // Ensure driverData and expoToken exist
            title: '📍 New Ride Request',
            body: 'A user has selected you for a ride. Open your app to respond.',
            channelId: 'ride_notifications',
            data: {
              type: 'ride_request',
              requestId: docRef.id,
              userLocation: JSON.stringify(userLocation), // Stringify complex objects for data payload
              createdAt: firestore.Timestamp.fromDate(new Date()).toDate().toISOString(), // Convert to ISO string
              destinationLocation: JSON.stringify(destinationLocation),
              pnumber: phoneNumberStore || '',
              destinationAddress: destinationAddress || '',
              rideType: "solo",
              estimatedPrice: String(driver.finalPrice), // Ensure string
              origin: JSON.stringify(userLocation),
              destination: JSON.stringify(destinationLocation),
              name: user?.displayName || '',
              expoToken: expoToken || '',
              message: `${baseMessage} (${priceMessage})`,
              driverSetPrice: driver.priceType === 'driver' ? 'true' : 'false', // Ensure string
            }
          };
        });

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      }

      console.log("Request created successfully");
      setCurrentRideRequestId(docRef.id);
      setContactedDrivers(chosenDrivers);
      setLoading(false);
      setShowConfirmRide(true);
      setShowDriverSelectionModal(false); // Close driver selection modal
    } catch (error: any) { // Type safety
      console.error("Error creating request:", error);
      setModalMessage(`Error creating request: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   if (destinationLatitude && destinationLongitude && !showRideSelectionModal) {
  //     setShowRideSelectionModal(true);
  //   }
  // }, [destinationLatitude, destinationLongitude, showRideSelectionModal]);

  const RideTypeBadge = ({ icon, label, selected }: { icon: string, label: string, selected: boolean }) => ( // Type safety
    <View className={`p-2 rounded-full ${
      selected ? 'bg-[#F97316]' : 'bg-gray-100'
    }`}>
      <Text className={`font-JakartaMedium ${
        selected ? 'text-white' : 'text-gray-600'
      }`}>
        {label}
      </Text>
    </View>
  );

  const PriceDisplay = ({ price, currency = 'ETB' }: { price: number, currency?: string }) => ( // Type safety
    <View className="flex-row items-baseline">
      <Text className="text-xs font-JakartaMedium text-gray-500">{currency}</Text>
      <Text className="text-xl font-JakartaBold text-gray-900 ml-1">{price}</Text>
    </View>
  );

  const user = auth()?.currentUser;
  const name = user?.displayName || "Guest"; // Default to "Guest"
  const userId = user?.uid || "anonymous_user"; // Default to anonymous ID if not logged in

  const setUserId = useUserIdStore((state) => state.setUserId);
  useEffect(() => {
    setUserId(user?.uid || "anonymous_user"); // Store the user in Zustand
  }, [user?.uid]);


  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [showTip, setShowTip] = useState(true); // Seems unused
  const [showRewards, setShowRewards] = useState(true); // Seems unused
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        setModalMessage("Location permission is required for ride services.");
        setModalVisible(true);
        return;
      }
      setHasPermission(true); // Set to true if granted

      let location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords?.latitude!,
        longitude: location.coords?.longitude!,
      });

      setUserLocation({
        latitude: location.coords?.latitude,
        longitude: location.coords?.longitude,
        address: `${address[0].name}, ${address[0].region}`,
      });
    })();
  }, []);

  const { language, setLanguage } = useLanguageStore();
  const { welcome, currentLocation, informativeTip, rewards, styles: translationStyles, button, warning } = translation1[language]; // Renamed styles to translationStyles

  const handleDateChange = (event: any, selectedDate?: Date) => { // Type safety
    const currentDate = selectedDate || date;
    setShowDatePicker(false);
    setDate(currentDate);
    setShowTimePicker(true);
  };
  const sheetRef = useRef(null);
   const snapPoints = useMemo(() => ['55%', '85%'], []);

  const handleTimeChange = (event: any, selectedTime?: Date) => { // Type safety
    const currentTime = selectedTime || time;
    setShowTimePicker(false);
    const adjustedTime = new Date(currentTime);
    adjustedTime.setHours(adjustedTime.getHours()); // Assuming UTC+3 adjustment is handled elsewhere or not needed here
    setTime(adjustedTime);
  };

  const handleSubmitSchedule = async () => { // Renamed to avoid conflict
    if (!userLatitude || !userLongitude || !destinationLatitude || !destinationLongitude || !destinationAddress) {
      setModalMessage("Please set both pickup and destination for a scheduled ride.");
      setModalVisible(true);
      return;
    }
    const originCoords = [userLatitude, userLongitude];
    const destinationCoords = [destinationLatitude, destinationLongitude];
    const selectedDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes()
    );
    const data = {
      origin: originCoords,
      destination: destinationCoords,
      name: user?.displayName || "User Name",
      pnumber: phoneNumberStore || "User Phone Number",
      type: "scheduled",
      userId: userId,
      scheduledTime: selectedDateTime.toISOString(),
      destinationAddress: destinationAddress,
    };
    // Assuming you have an API endpoint or Firebase function for scheduling rides
    try {
      // Example: await functions().httpsCallable("scheduleRide")(data);
      setModalMessage(`Congratulations! You have successfully scheduled a ride for ${date.toDateString()} at ${time.toLocaleTimeString()}.`);
      setModalVisible(true);
      setShowSchedule(false);
    } catch (error: any) { // Type safety
      console.error("Error scheduling ride:", error);
      setModalMessage(`Failed to schedule ride: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
    }
  };

  const handleDriverSelection = (driverId: string, companyPrice: number, driverLocation: number[]) => { // Type safety
    setChosenDrivers(prev => {
      const exists = prev.find(d => d.driverId === driverId);
      if (exists) {
        return prev.filter(d => d.driverId !== driverId);
      }
      const driver = driverOptions.find(d => d.user_id === driverId); // Use user_id for finding driver in options
      const defaultPriceType = 'driver';
      const finalPrice = driver?.estimatedFare; // Use estimatedFare from driverOptions

      return [...prev, {
        driverId,
        priceType: defaultPriceType,
        finalPrice,
        driverLocation
      }];
    });
  };

  const PriceOption = ({
    type,
    price,
    isSelected,
    onPress
  }: { type: 'driver' | 'company', price: number, isSelected: boolean, onPress: () => void }) => ( 
    <TouchableOpacity
      className={`flex-1 p-3 rounded-lg ${
        isSelected ? 'bg-green-300 border-2 border-green-500' : 'bg-gray-50'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-JakartaMedium text-gray-700">
            {type === 'driver' ? "Driver's Price" : "Market Price"}
          </Text>
          <Text className="text-lg font-JakartaBold text-gray-900">
            {price} Birr
          </Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={type === 'driver' ? Colors.successGreen : Colors.secondaryTeal}
          />
        )}
      </View>
    </TouchableOpacity>
  );


const DriverLocationMap = ({ driverLocations, userLocation }: { driverLocations: any[], userLocation: { latitude: number, longitude: number } }) => { 
    if (!userLocation) return null;

    // Memoize the driver data processing
    const coloredDrivers = useMemo(() => {
      if (!Array.isArray(driverLocations)) return [];
      return driverLocations.map((driver) => ({
        ...driver,
        lat: driver.latitude,
        lng: driver.longitude,
        color: getRandomColor(), // Ensure you have this function available or import it
      }));
    }, [driverLocations]);

    return (
      <View style={styles.miniMapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE} // explicitly set provider
          style={styles.miniMap}
          liteMode={true} // <--- THIS FIXES THE CRASH (Renders as bitmap on Android)
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.0452,
            longitudeDelta: 0.0251,
          }}
        >
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor={Colors.primaryOrange} 
          />
          {coloredDrivers.map((driver) => (
            <Marker
              key={`${driver.user_id || driver.share_username || Math.random()}-${driver.pnumber || Math.random()}`}
              coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
              title={`${driver.share_username || 'Driver'}'s location`}
            >
              <View>
                {/* Ensure FontAwesome6 is imported correctly */}
                <FontAwesome6 name="car" size={32} color={driver.color} />
              </View>
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
        <Text className="mt-2 font-JakartaBold text-gray-700">Executing your request...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Main Map Section */}

      <View style={styles.mapContainer}>
        <MapComponent />
      </View>

      <View style={styles.headerContainer}>
         <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => router.push("/profile")}
         >
            <Image
                style={styles.avatar}
                source={{ uri: profileImageUrl || user?.photoURL || DEFAULT_AVATAR }}
            />
            <View style={styles.onlineIndicator} />
         </TouchableOpacity>

         <View style={styles.inputContainer}>
 <CustomGooglePlacesInput type="pickup" placeholder={currentLocation} selectionOpener={setShowRideSelectionModal} homepage={true}/>
         </View>
      </View>

        <TouchableOpacity
          style={styles.languageMenuButton}
          onPress={() => setShowLanguageModal(true)}
        >
          <Ionicons name="language" size={24} color={Colors.textDark} />
        </TouchableOpacity>

    <BottomSheet
  ref={sheetRef}
  index={0}
  snapPoints={snapPoints}
  backgroundComponent={({ style }) => (
    <View style={[style, styles.rideOptionsOverlay]} />
  )}
          backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
>
  <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
              {/* --- NEW & IMPROVED: Dedicated Services Section --- */}
            <View style={styles.sectionContainer}>
                <Text className="font-JakartaBold" style={styles.sectionTitle}>More Services</Text>
                <FlatList
                    data={services}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.serviceCard} onPress={item.action}>
                            <View style={[styles.serviceIconContainer, { backgroundColor: item.color + '20' }]}>
                               <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                            </View>
                            <Text className="font-JakartaMedium" style={styles.serviceCardTitle}>{item.title}</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingRight: 16 }}
                />
            </View>
          {/* Welcome Header & Location Inputs */}
          <View style={styles.welcomeHeader}>
            <View style={styles.locationInputsContainer}>
            {destinationLatitude && destinationLongitude && (
              <Text style={styles.travelTimeText}>
                {translations[language]}
              </Text>
            )}
          </View>  

                {/* Choose Your Ride Button - Opens Modal */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  {/*<MaterialCommunityIcons name="numeric-1-circle" size={24} color={Colors.primaryOrange} />*/}
                  <Text className="font-JakartaExtraBold"  style={styles.sectionTitle}>Choose Your Ride</Text>
                </View>
                <TouchableOpacity
                  style={styles.chooseRideButton}
                  onPress={() => setShowRideSelectionModal(true)}
                  disabled={!destinationLatitude || !destinationLongitude}
                >
                  <Text style={styles.chooseRideButtonText}>
                    {selectedRide ? `Selected: ${selectedRide}` : 'Tap to Select Ride Type'}
                  </Text>
                  <Ionicons name="chevron-forward" size={24} color={Colors.backgroundWhite} />
                </TouchableOpacity>
                {(!destinationLatitude || !destinationLongitude) && (
                  <Text style={styles.destinationWarningText}>
                    Please set your destination to choose a ride.
                  </Text>
                )}
              </View>
              <View style={styles.locationInputSeparator} />
            </View>
          {/* Other Service Sections */}
          <View style={styles.otherServicesContainer}>
           {/* <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => router.push('/game-rooms')}
            >
              <View style={styles.serviceCardContent}>
                <MaterialIcons name="emergency-recording" size={24} color={Colors.primaryOrange} />
                <Text style={styles.serviceCardTitle}>Go live or watch a live-stream</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
              <Text style={styles.serviceCardDescription}>Gain an audience and make a revenue</Text>
            </TouchableOpacity>*/}

        {/*    <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => setShowSchedule(true)}
            >
              <View style={styles.serviceCardContent}>
                <MaterialIcons name="schedule" size={24} color={Colors.secondaryTeal} />
                <Text style={styles.serviceCardTitle}>Schedule Ride</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
              <Text style={styles.serviceCardDescription}>Plan your rides in advance</Text>
            </TouchableOpacity>*/}

            {/* Embedded Posts Page */}
{/*            <View style={styles.embeddedPostsContainer}>
              <PostsPage
                showHeader={false}
                embeddedView={true}
              />
            </View>*/}
          </View>
  </BottomSheetScrollView>
</BottomSheet>
      {/* Modals */}
      {/* Matching Preferences Modal */}
      <Modal visible={showMatchingOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="numeric-2-circle" size={24} color={Colors.primaryOrange} />
              <Text style={styles.modalTitle}>Matching Preferences</Text>
              <TouchableOpacity onPress={() => setShowMatchingOptionsModal(false)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMedium} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalPrimaryActionButton}
              onPress={() => {
                findDriversWithPreferences(selectedRide?.type || '');
                setShowMatchingOptionsModal(false);
              }}
            >
              <Text style={styles.modalPrimaryActionButtonText}>💥 Choose Your Driver</Text>
            </TouchableOpacity>

            <Text style={styles.modalOptionSeparatorText}>Or</Text>

            <TouchableOpacity
              style={styles.modalOptionButton}
              onPress={() => {
                handleFindRide("4"); // Assuming "4" refers to a default search parameter
                setShowMatchingOptionsModal(false);
              }}
            >
              <Text style={styles.modalOptionButtonText}>🪄 Find Automatic Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

 {/* Ride Selection Modal - NEW */}
        <Modal visible={showRideSelectionModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.rideSelectionModalContent}>
              <View style={styles.modalHeader}>
                <Text className="font-JakartaBold" style={styles.modalTitle}>Choose Your Ride Type</Text>
                <TouchableOpacity onPress={() => setShowRideSelectionModal(false)} style={styles.modalCloseButton}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textMedium} />
                </TouchableOpacity>
              </View>

              {/* Ride Options Grid */}
              <View style={styles.rideOptionsGrid}>
                {rideOptions.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.rideOptionCardGrid, selectedRide === item.type && styles.rideOptionCardSelected]}
                    onPress={() => setSelectedRide(item.type)}
                  >
                    <View style={styles.rideOptionCardTop}>
                      <View style={styles.rideOptionIconGroup}>
                        <FontAwesome6
                          name={item.icon}
                          size={20}
                          color={selectedRide === item.type ? Colors.backgroundWhite : Colors.secondaryTeal}
                        />
                        <Text className="font-Jakarta" style={[styles.rideOptionPeopleText, selectedRide === item.type && styles.rideOptionPeopleTextSelected]}>
                          {item.people} {item.people === "You" ? "" : "People"}
                        </Text>
                      </View>
                      <FontAwesome6
                        name={item.icon2}
                        size={20}
                        color={selectedRide === item.type ? Colors.backgroundWhite : Colors.textDark}
                      />
                    </View>

                    <Text className="font-JakartaSemiBold" style={[styles.rideOptionTypeText, selectedRide === item.type && styles.rideOptionTypeTextSelected]}>
                      {item.type}
                    </Text>

                    <Text style={[styles.rideOptionPriceText, selectedRide === item.type && styles.rideOptionPriceTextSelected]}>
                      ETB {item.price}
                    </Text>

                    {selectedRide === item.type && (
                      <View style={styles.rideOptionSelectedBadge}>
                        <Text style={styles.rideOptionSelectedBadgeText}>
                          Selected
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Button to proceed to matching preferences */}
              <TouchableOpacity
                style={[styles.modalPrimaryActionButton, { marginTop: 20 }]}
                onPress={() => {
                  setShowRideSelectionModal(false);
                  handleSelectRide(selectedRide)
                }}
                disabled={!selectedRide}
              >
                <Text style={styles.modalPrimaryActionButtonText}>
                  Proceed with {selectedRide || 'Ride'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      {/* Feature Coming Soon Modal */}
      <Modal visible={showChooseDriverSoonModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleCentered}>Feature Coming Soon!</Text>
            <Text style={styles.modalDescription}>
              This option will be available soon. Want to match automatically for now?
            </Text>
            <View style={styles.modalActionsContainer}>
              <TouchableOpacity
                style={[styles.modalPrimaryActionButton, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setShowChooseDriverSoonModal(false);
                  handleFindRide("4");
                }}
              >
                <Text style={styles.modalPrimaryActionButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSecondaryActionButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => setShowChooseDriverSoonModal(false)}
              >
                <Text style={styles.modalSecondaryActionButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
{/* Language Selection Modal */}
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
                  <TouchableOpacity
                    key={lang}
                    onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
                    style={[styles.languageOptionButton, language === lang && styles.languageOptionButtonActive]}
                  >
                    <Text style={[styles.languageOptionText, language === lang && styles.languageOptionTextActive]}>
                      {lang === 'ENG' ? 'English' : lang === 'AMH' ? 'አማርኛ' : 'Afan Oromo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

      {/* Schedule Ride Modal */}
      <Modal visible={showSchedule} animationType="slide" transparent={false}>
        <View style={styles.scheduleModalContainer}>
          <View style={styles.scheduleModalHeader}>
            <Text style={styles.scheduleModalTitle}>Schedule Future Ride</Text>
            <TouchableOpacity onPress={() => setShowSchedule(false)}>
              <Ionicons name="close" size={24} color={Colors.textMedium} />
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleDateTimeContainer}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.scheduleDateTimePickerButton}
            >
              <View style={styles.scheduleDateTimePickerContent}>
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.secondaryTeal} />
                <Text style={styles.scheduleDateTimePickerText}>
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.scheduleDateTimePickerChangeText}>Change date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={styles.scheduleDateTimePickerButton}
            >
              <View style={styles.scheduleDateTimePickerContent}>
                <MaterialCommunityIcons name="clock" size={20} color={Colors.secondaryTeal} />
                <Text style={styles.scheduleDateTimePickerText}>
                  {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </Text>
              </View>
              <Text style={styles.scheduleDateTimePickerChangeText}>Select time</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <View style={styles.dateTimePickerWrapper}>
              <DateTimePicker
                value={date}
                mode="date"
                onChange={handleDateChange}
                minimumDate={new Date()}
                accentColor={Colors.secondaryTeal}
                themeVariant="light"
              />
            </View>
          )}

          {showTimePicker && (
            <View style={styles.dateTimePickerWrapper}>
              <DateTimePicker
                value={time}
                mode="time"
                onChange={handleTimeChange}
                display="spinner"
                accentColor={Colors.secondaryTeal}
                themeVariant="light"
              />
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmitSchedule}
            style={styles.scheduleSubmitButton}
          >
            <Text style={styles.scheduleSubmitButtonText}>Confirm Schedule</Text>
          </TouchableOpacity>
        </View>
      </Modal>

{/* Driver Selection Modal */}
      <Modal visible={showDriverSelectionModal} animationType="slide" transparent={false}>
        <View style={styles.driverSelectionModalContainer}>
          <View style={styles.driverSelectionModalHeader}>
            <Text style={styles.driverSelectionModalTitle}>Choose Your Driver</Text>
            <TouchableOpacity onPress={() => setShowDriverSelectionModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textMedium} />
            </TouchableOpacity>
          </View>

          <View style={styles.driverSelectionModalInfoBox}>
            <Text style={styles.driverSelectionModalInfoText}>
              👋 Hi {user?.displayName?.split(" ")[0]}, select preferred drivers and pricing option for:
            </Text>
            <Text style={styles.driverSelectionModalAddressText}>
              {destinationAddress?.substring(0, 31) + " ..."}
            </Text>
          </View>

          {/* This uses the updated component with liteMode={true} */}
          <View style={styles.miniMapWrapper}>
            <DriverLocationMap
              driverLocations={driverOptions}
              userLocation={{ latitude: userLatitude || 0, longitude: userLongitude || 0 }} 
            />
          </View>

          <FlatList
            data={driverOptions}
            keyExtractor={(item) => item.user_id || item.share_username || Math.random().toString()} 
            ItemSeparatorComponent={() => (<View style={styles.driverListItemSeparator} />)}
            contentContainerStyle={styles.driverListContentContainer}
            renderItem={({ item: driver }) => {
              const isChosen = chosenDrivers.some(d => d.driverId === driver.user_id);
              const companyPrice = calculateCompanyPrice(selectedRide?.type);
              const selected = chosenDrivers.find(d => d.driverId === driver.user_id);

              const vehicleDetails = driver.vehicle_details;
              const recentComments = Array.isArray(driver.recent_comments) ? driver.recent_comments : JSON.parse(driver.recent_comments || '[]');

              return (
                <View style={styles.driverCard}>
                  <View style={styles.driverCardTopRow}>
                    <Image
                      source={{ uri: driver.profile_image || DEFAULT_AVATAR }}
                      style={styles.driverAvatar}
                    />
                    <View style={styles.driverInfoColumn}>
                      <View style={styles.driverNameRatingRow}>
                        <Text style={styles.driverName}>{driver.share_username || 'Driver'}</Text>
                        <View style={styles.driverRatingStar}>
                          <Ionicons name="star" size={16} color={Colors.primaryOrange} />
                          <Text style={styles.driverRatingText}>
                            {`${Math.round(driver.rating_sum / driver.rating_count) || "4.85"}`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.driverExperienceRow}>
                        <Text style={styles.driverExperienceText}>
                          {vehicleDetails?.yearsOfExperience || "< 1"}+ years of experience
                        </Text>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.driverRidesCountText}>
                          {driver.rating_count?.toLocaleString() || '0'} rides
                        </Text>
                        {driver.rating_sum / driver.rating_count > 4.5 && (
                          <View style={styles.topRatedBadge}>
                            <Ionicons name="star" size={12} color={Colors.primaryOrange} />
                            <Text style={styles.topRatedBadgeText}>Top Rated</Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={styles.driverBioText}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                       Bio {driver.bio || "Professional driver with excellent service record"}
                      </Text>

                      <Text style={styles.vehicleDetailsText}>
                        {vehicleDetails?.model || 'Toyota Vitz'} • Car Seats: {driver.seat_type || '4'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.priceOptionsContainer}>
                    <PriceOption
                      type="driver"
                      price={driver.estimatedFare || 0} 
                      isSelected={selected?.priceType === 'driver'}
                      onPress={() => handlePriceSelect(driver.user_id, 'driver', [driver.latitude, driver.longitude])}
                    />
                    <Text style={styles.priceOptionSeparatorText}>Or</Text>
                    <PriceOption
                      type="company"
                      price={companyPrice ? companyPrice.toFixed(1) : 0}
                      isSelected={selected?.priceType === 'company'}
                      onPress={() => handlePriceSelect(driver.user_id, 'company', [driver.latitude, driver.longitude])}
                    />
                  </View>

                  <View style={styles.recentCommentsContainer}>
                    <Text style={styles.recentCommentsHeader}>
                      Recent Feedback ({recentComments?.length || 0})
                    </Text>
                    {recentComments?.length > 0 ? (
                      <FlatList
                        horizontal
                        data={recentComments.slice(0, 4)}
                        renderItem={({ item }) => (
                          <View style={styles.commentCard}>
                            <Text style={styles.commentText}>{item.comment}</Text>
                            <Text style={styles.commentRatingText}>Rating: {item.rating}</Text>
                          </View>
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        showsHorizontalScrollIndicator={false}
                      />
                    ) : (
                      <Text style={styles.noCommentsText}>
                        No recent comments available
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.selectDriverButton, isChosen && styles.selectDriverButtonSelected]}
                    onPress={() => handleDriverSelection(driver.user_id, companyPrice, [driver.latitude, driver.longitude])}
                  >
                    <Text style={[styles.selectDriverButtonText, isChosen && styles.selectDriverButtonTextSelected]}>
                      {isChosen ? 'Selected ✓' : 'Select Driver'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          <View style={styles.driverSelectionFooter}>
            <TouchableOpacity
              style={[styles.requestDriversButton, chosenDrivers.length === 0 && styles.requestDriversButtonDisabled]}
              onPress={handleRequestCreation}
              disabled={chosenDrivers.length === 0}
            >
              <Text style={styles.requestDriversButtonText}>
                Request Selected Drivers ({chosenDrivers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* Global Custom Modal for Alerts */}
      <CustomModal
        visible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />

      {/* Confirm Ride / Shared Ride Modals (keep as is, or refine if needed) */}
      {showConfirmRide && (
        <View style={styles.fullScreenOverlay}>
          <ConfirmRide
            rideRequestId={currentRideRequestId}
            onCancel={() => {
              setShowConfirmRide(false);
              setCurrentRideRequestId(null);
            }}
            contactedDrivers={contactedDrivers}
          />
        </View>
      )}
      {showSharedRide.show && (
        <View style={styles.fullScreenOverlay}>
          <SharedWaitRoom
            origin={{ latitude: userLatitude || 0, longitude: userLongitude || 0 }}
            destination={{ latitude: destinationLatitude || 0, longitude: destinationLongitude || 0 }}
            rideType={showSharedRide.rideType}
            destinationAddress={destinationAddress}
            phoneNumberStore={phoneNumberStore}
          />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundWhite,
  },
  mapContainer: {
    width: '100%',
    height: screenHeight * 0.65, // Map takes 65% of screen height
    position: 'absolute', // Position map absolutely to allow overlay
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0, // Ensure map is behind overlay
  },
  rideOptionsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.45, // Overlay takes 45% of screen height
    backgroundColor: Colors.backgroundWhite,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1, // Ensure overlay is above map
  },
  overlayScrollViewContent: {
    paddingBottom: 50, // Add padding for content below scroll view
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundWhite,
  },
  welcomeHeader: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    // fontFamily: 'Jakarta-ExtraBold',
    color: Colors.textDark,
    marginBottom: 16,
  },
  locationInputsContainer: {
    backgroundColor: Colors.backgroundLightGray,
    borderRadius: 12,
    padding: 12,
  },
  locationInputSeparator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 10,
  },
  travelTimeText: {
    fontSize: 14,
    // fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    marginTop: 5,
  },
  sectionContainer: {
    // fontFamily: 'Jakarta-Medium',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 10
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 18,
    color: Colors.textDark,
  },
  rideOptionsList: {
    paddingBottom: 16,
  },
  rideOptionsGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap', // Allow items to wrap to the next line
  justifyContent: 'space-between', // Distribute items evenly
  marginBottom: 16, // Consistent spacing
},
 rideSelectionModalContent: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: screenHeight * 0.8,
    alignItems: 'center',
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
  },
  // NEW: Styles for the Ride Options Grid within the Modal
  rideOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rideOptionCardGrid: {
    width: '48%', // Two columns with a small gap
    padding: 16,
    marginBottom: 12, // Space between rows
    borderRadius: 16,
    backgroundColor: '#FFF1E3',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  rideOptionCardSelected: { // Reused from previous
    backgroundColor: Colors.secondaryTeal,
    borderColor: Colors.secondaryTeal,
  },
  rideOptionCardTop: { // Reused from previous
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rideOptionIconGroup: { // Reused from previous
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  rideOptionPeopleText: { // Reused from previous
    // fontFamily: 'Jakarta-Medium',
    color: Colors.textDark,
    fontSize: 14,
  },
  rideOptionPeopleTextSelected: { // Reused from previous
    color: Colors.backgroundWhite,
  },
  rideOptionTypeText: { // Reused from previous
    fontSize: 16,
    // fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    marginBottom: 8,
  },
  rideOptionTypeTextSelected: { // Reused from previous
    color: Colors.backgroundWhite,
  },
  rideOptionPriceText: { // Reused from previous
    // fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    fontSize: 14,
  },
  rideOptionPriceTextSelected: { // Reused from previous
    color: Colors.backgroundWhite,
  },
  rideOptionSelectedBadge: { // Reused from previous
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.backgroundWhite,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rideOptionSelectedBadgeText: { // Reused from previous
    color: Colors.secondaryTeal,
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 10,
  },
  chooseRideButton: { // Style for the button that opens the ride selection modal
    backgroundColor: Colors.primaryOrange,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
  justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    paddingLeft:12
  },
  chooseRideButtonText: {
    fontFamily: 'Jakarta-Bold',
    color: Colors.backgroundWhite,
    fontSize: 18,
    marginBottom: 8,
    marginRight: 5, 
  },
  destinationWarningText: {
    fontFamily: 'Jakarta-Medium',
    color: Colors.warningRed,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  otherServicesContainer: {
 //   marginTop: 16,
   // marginBottom: 24,
  },
  serviceCard: {
    backgroundColor: Colors.backgroundWhite,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 8,
  },
  serviceCardTitle: {
    fontSize: 8,
    fontFamily: 'font-JakartaMedium',
    color: Colors.textDark,
  },
  serviceCardDescription: {
    fontSize: 13,
    // fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    marginLeft: 36, // Align with title
  },
  embeddedPostsContainer: {
    marginTop: 24,
    minHeight: 300, // Ensure it has some height
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    overflow: 'hidden', // Clip content
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundWhite,
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    marginLeft: 8,
    fontSize: 20,
    // fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOptionButton: {
    backgroundColor: Colors.backgroundLightGray,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  modalOptionButtonText: {
    fontFamily: 'Jakarta-SemiBold',
    textAlign: 'center',
    color: Colors.textDark,
    fontSize: 16,
  },
  modalOptionSeparatorText: {
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textLight,
    marginBottom: 12,
  },
  modalPrimaryActionButton: {
    backgroundColor: Colors.primaryOrange,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    shadowColor: Colors.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalPrimaryActionButtonText: {
    fontFamily: 'Jakarta-Bold',
    color: Colors.backgroundWhite,
    textAlign: 'center',
    fontSize: 18,
  },
  modalTitleCentered: {
    fontSize: 22,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 15,
  },
  modalActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalSecondaryActionButton: {
    backgroundColor: Colors.backgroundLightGray,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalSecondaryActionButtonText: {
    fontFamily: 'Jakarta-Bold',
    color: Colors.textMedium,
    textAlign: 'center',
    fontSize: 18,
  },

  // Schedule Modal Specific Styles
  scheduleModalContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundWhite,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  scheduleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 16,
  },
  scheduleModalTitle: {
    fontSize: 24,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  scheduleInputGroup: {
    marginBottom: 24,
  },
  scheduleInputField: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.backgroundLightGray,
    padding: 12,
  },
  scheduleDateTimeContainer: {
    marginBottom: 32,
    rowGap: 16,
  },
  scheduleDateTimePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundLightGray,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 16,
  },
  scheduleDateTimePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  scheduleDateTimePickerText: {
    color: Colors.textDark,
    fontFamily: 'Jakarta-Medium',
    fontSize: 16,
  },
  scheduleDateTimePickerChangeText: {
    color: Colors.textMedium,
    fontFamily: 'Jakarta-Medium',
    fontSize: 14,
  },
  dateTimePickerWrapper: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 12,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 16,
  },
  scheduleSubmitButton: {
    width: '100%',
    backgroundColor: Colors.secondaryTeal, // Use teal for schedule button
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondaryTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  scheduleSubmitButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 18,
  },

  // Driver Selection Modal Specific Styles
  driverSelectionModalContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundWhite,
  },
  driverSelectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  driverSelectionModalTitle: {
    fontSize: 24,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  driverSelectionModalInfoBox: {
    backgroundColor: Colors.backgroundLightGray,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16,
  },
  driverSelectionModalInfoText: {
    fontSize: 14,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
  },
  driverSelectionModalAddressText: {
    fontSize: 16,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textDark,
    marginTop: 4,
  },
  miniMapWrapper: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  miniMapContainer: {
    height: 140, // Fixed height for mini map
    borderRadius: 12,
    overflow: 'hidden',
  },
  miniMap: {
    flex: 1,
  },
  driverListContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100, // Space for footer button
  },
  driverCard: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  driverCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: Colors.backgroundLightGray, // Placeholder background
  },
  driverInfoColumn: {
    flex: 1,
  },
  driverNameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    flexShrink: 1, // Allow text to shrink
  },
  driverRatingStar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  driverRatingText: {
    fontSize: 14,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    marginLeft: 4,
  },
  driverExperienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 4,
  },
  driverExperienceText: {
    fontSize: 12,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.secondaryTeal,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textLight,
  },
  driverRidesCountText: {
    fontSize: 12,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
  },
  topRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryOrange + '1A', // Light orange background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  topRatedBadgeText: {
    fontSize: 10,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.primaryOrange,
    marginLeft: 4,
  },
  driverBioText: {
    fontSize: 13,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    marginBottom: 4,
  },
  vehicleDetailsText: {
    fontSize: 13,
    fontFamily: 'Jakarta-Medium',
    color: Colors.secondaryTeal,
  },
  priceOptionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceOptionSeparatorText: {
    fontSize: 14,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textLight,
    marginHorizontal: 10,
  },
  recentCommentsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  recentCommentsHeader: {
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textDark,
    marginBottom: 8,
  },
  commentCard: {
    backgroundColor: Colors.backgroundLightGray,
    padding: 12,
    marginRight: 8,
    borderRadius: 10,
  },
  commentText: {
    fontSize: 13,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
  },
  commentRatingText: {
    fontSize: 11,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textLight,
    marginTop: 4,
  },
  selectDriverButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.backgroundLightGray,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  selectDriverButtonSelected: {
    backgroundColor: Colors.primaryOrange,
    shadowColor: Colors.primaryOrange,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  selectDriverButtonText: {
    fontFamily: 'Jakarta-Bold',
    fontSize: 16,
    color: Colors.textMedium,
  },
  selectDriverButtonTextSelected: {
    color: Colors.backgroundWhite,
  },
  driverListItemSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  driverSelectionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.backgroundWhite,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  requestDriversButton: {
    backgroundColor: Colors.secondaryTeal,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.secondaryTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  requestDriversButtonDisabled: {
    backgroundColor: Colors.textLight,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  requestDriversButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 18,
  },
  fullScreenOverlay: { // For ConfirmRide and SharedWaitRoom
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100, // Ensure it's on top
    backgroundColor: Colors.backgroundWhite,
  },
  CustomGooglePlacesInput:{
    position: 'absolute',
    top: 70 , // Adjust for safe area
    zIndex: 12,
    width: 0.65*screenWidth,
    right: 0
  },
    languageMenuButton: {
    position: 'absolute',
    top: 150 , // Adjust for safe area
    right: 20,
    zIndex: 2, // Above map, below bottom sheet handle if it reaches top
    backgroundColor: Colors.backgroundWhite,
    padding: 10,
    borderRadius: 25,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 2,
  },
// Language Modal Specific Styles
  languageModalContent: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
  },
  languageOptionsContainer: {
    flexDirection: 'column', // Stack buttons vertically
    width: '100%',
  },
  languageOptionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10, // Space between buttons
    alignItems: 'center',
    backgroundColor: Colors.backgroundLightGray,
  },
  languageOptionButtonActive: {
    backgroundColor: Colors.primaryOrange,
    borderColor: Colors.primaryOrange,
  },
  languageOptionText: {
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textDark,
    fontSize: 16,
  },
  languageOptionTextActive: {
    color: Colors.backgroundWhite,
  },

  // --- Header and Inputs ---
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.backgroundWhite,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.successGreen,
    borderWidth: 2,
    borderColor: Colors.backgroundWhite,
  },
  inputContainer: {
    flex: 1,
  },
  
  // --- Bottom Sheet ---
  bottomSheetBackground: {
    backgroundColor: Colors.backgroundWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetHandle: {
    backgroundColor: Colors.borderLight,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    color: Colors.textDark,
    marginBottom: 16,
  },

  // --- Services Section (NEW) ---
  serviceCard: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: Colors.backgroundLightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    padding: 8,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },

});

export default Home;