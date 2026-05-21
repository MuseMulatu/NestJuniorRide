import { Ride } from "@/types/type";
import { FlatList, Text, View, Image, TouchableOpacity, Alert, Modal } from "react-native";
import { getFirestore, doc,where, setDoc, Timestamp, GeoPoint, collection, query, orderBy, startAt, endAt, getDocs, updateDoc, onSnapshot, deleteDoc  } from "firebase/firestore"; 
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common"; // Assuming you're using 'geofire-common'
import { haversineDistance } from "@/firebaseconf";
import { DirectionsService } from '@react-native-maps/directions'; // Install if needed
import { decode } from '@mapbox/polyline'; // Install via npm
import axios from 'axios';
import { router } from "expo-router";
import * as ExpLinking from 'expo-linking';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Share, Linking } from 'react-native';

export const sortRides = (rides: Ride[]): Ride[] => {
  const result = rides.sort((a, b) => {
    const dateA = new Date(`${a.created_at}T${a.ride_time}`);
    const dateB = new Date(`${b.created_at}T${b.ride_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return result.reverse();
};

const formatToInternational = (phoneNumber) => {
  let formattedPhoneNumber = phoneNumber;

  // Convert 0-prefixed local number to +251 format
  if (phoneNumber.startsWith('0') && phoneNumber.length === 10) {
    formattedPhoneNumber = '+251' + phoneNumber.slice(1); // Replace '0' with '+251'
  }

  // Return the original if it's already in +251 format
  return formattedPhoneNumber;
};


export function formatTime(minutes: number): string {
  const formattedMinutes = +minutes?.toFixed(0) || 0;

  if (formattedMinutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(formattedMinutes / 60);
    const remainingMinutes = formattedMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day < 10 ? "0" + day : day} ${month} ${year}`;
}


export const addCoRiderRequest = async (userLocation, destinationLocation, coRiderId, userId) => {
  try {
    const docRef = firestore().collection('corider-requests').doc(); // Auto-generated ID

    await docRef.set({
      userLocation,
      destinationLocation,
      coRiderId,
      userId,
      createdAt: firestore.Timestamp.fromDate(new Date()), // RNF Timestamp
      status: 'pending', // pending, accepted, rejected
      rating: null,
      comment: '',
    });

    return docRef.id; // Return document ID
  } catch (error) {
    console.error('Error adding co-rider request: ', error);
    throw error;
  }
};


const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

export const getRoutePolyline = async (origin, destination) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_API_KEY}`
    );
    const data = await response.json();
    if (data.routes.length > 0) {
      const route = data.routes[0];
      const decodedPolyline = decode(route.overview_polyline.points);
      return decodedPolyline; // Array of [lat, lng]
    } else {
      throw new Error('No route found');
    }
  } catch (error) {
    console.error('Error fetching route:', error);
    return [];
  }
};


export const initialRideRequest = async (userId, destinationLocation) => {
  try {
    const requestRef = firestore().collection('riders').doc(userId); // Adjust collection path if necessary

    await requestRef.set({
      status: 'looking-for-coriders',
      destination: destinationLocation,
      createdAt: firestore.Timestamp.fromDate(new Date()), // RNF Timestamp
    });

    console.log('Ride request created successfully');
  } catch (error) {
    console.error('Error making ride request:', error);
    throw error;
  }
};

const getTrafficAdjustedDistance = (rawMeters) => {
  const paddingRatio = 0.25; // 25% extra to account for traffic
  return rawMeters * (1 + paddingRatio);
};

const AVERAGE_SPEED_KMPH = 35;

export const fetchDistanceAndTime = async ( userLatitude, userLongitude, driverLocationLat, driverLocationLng ) => {
  // try {
  //   const response = await axios.get(
  //     `https://maps.googleapis.com/maps/api/distancematrix/json`,
  //     {
  //       params: {
  //         origins: `${userLatitude},${userLongitude}`,
  //         destinations: `${driverLocationLat},${driverLocationLng}`,
  //         key: GOOGLE_API_KEY,
  //       },
  //     }
  //   );

  //   const data = response.data;
  //   const distance = data.rows[0].elements[0].distance.value;
  //   const timeTaken = data.rows[0].elements[0].duration.value;

  //   return { distance, timeTaken };
  // } catch (error) {
  //   console.warn("Google API failed, using fallback. Error:", error.message);

    const rawDistance = distanceBetween(
      [userLatitude, userLongitude],
      [driverLocationLat, driverLocationLng]
    ) * 1000;

    // Dynamic padding: 20% of the raw distance
    const paddedDistance = rawDistance * 1.25;

    const averageSpeedMps = (AVERAGE_SPEED_KMPH * 1000) / 3600;
    const estimatedTime = Math.round(1.5 * (paddedDistance / averageSpeedMps));
console.log("rawDistance", rawDistance, "paddedDistance:", paddedDistance, "averageSpeedMps", averageSpeedMps, "estimatedTime", estimatedTime )
    return {
      distance: Math.round(paddedDistance),
      timeTaken: estimatedTime,
    };
//  }
};

export const handleCall = (phoneNumber) => {
  let formattedPhoneNumber = phoneNumber;
    // Remove the country code (+251) and replace it with a 0
   if (phoneNumber.startsWith('+251')) {
    formattedPhoneNumber = '0' + phoneNumber.slice(4); // Deletes "+251" and prepends "0"
}
console.log(formattedPhoneNumber)
    // Format the tel URL
    const telNumber = `tel:${formattedPhoneNumber}`;
    
    ExpLinking.openURL(telNumber)
      .then(data => {
        console.log('Opened phone:', data);
      })
      .catch(error => {
        console.error('Error opening phone:', error);
      });
};

export const handleFindSharedRide = async (userId, userLatitude, userLongitude, destinationLatitude, destinationLongitude, setStatusMessage, setLoading) => {
   const user = auth().currentUser;
  if (!destinationLatitude || !userLongitude) {
    Alert.alert('Please enter a destination or check your internet connection');
    return;
  }

  try {
    setStatusMessage('Looking for Co-riders with overlapping routes...');
    setLoading(true);

await firestore().collection('corider-requests').doc(userId).set({
  name: user?.displayName,
  pnumber: user.phoneNumber,
  origin: [userLatitude, userLongitude], // Store as an array of [latitude, longitude]
  destination: [destinationLatitude, destinationLongitude], // Store as an array of [latitude, longitude]
  requestTime: firestore.Timestamp.fromDate(new Date()), // RNF Timestamp
});


    console.log('Co-rider request created for user: ', userId);
  } catch (error) {
    console.error('Error adding co-rider request: ', error);
    // setLoading(false);
  }
};



export const listenForRideRequest = (userId) => {
  const twentyMinutesInMillis = 20 * 60 * 1000; // 20 minutes in milliseconds
  const now = new Date().getTime(); // Current time

  const q = firestore()
    .collection('requests')
    .where('userId', '==', userId)
    .where('status', '==', 'looking-for-driver');

  console.log(userId, 'userId from listenForRideRequest');
  const unsubscribe = q.onSnapshot((snapshot) => {
    snapshot.forEach(async (doc) => {
      const rideRequest = doc.data();
      const createdAt = rideRequest.createdAt;

      if (createdAt instanceof firestore.Timestamp) {
        const requestTime = createdAt.toMillis();
        const timeDifference = now - requestTime;

        if (timeDifference <= twentyMinutesInMillis) {
          const rideRequestId = doc.id;
          // Navigate to the ride confirmation screen
          router.push(`/(root)/confirm-ride?rideRequestId=${rideRequestId}`);
        } else {
          // Request is older than 20 minutes, delete it
          try {
            await firestore().collection('requests').doc(doc.id).delete();
            console.log(`Deleted request ${doc.id} due to timeout`);
          } catch (error) {
            console.error('Error deleting request:', error);
          }
        }
      }
    });
  });

  return unsubscribe; // Return unsubscribe function to stop listening when needed
};


export const listenForStartedRequests = (userId) => {
const q = firestore()
    .collection('requests')
    .where('userId', '==', userId)
    .where('status', '==', 'started');
    
  
console.log(userId, "userId from listenForStartedRequests")
const unsubscribe = q.onSnapshot((snapshot) => {
    snapshot.forEach(async (doc) => {
      const rideRequest = doc.data();
dbDestinationLat = rideRequest.destinationLocation[0]
dbDestinationLng = rideRequest.destinationLocation[1]
const rideRequestId = doc.id;
if (rideRequestId && dbDestinationLat && dbDestinationLng) {
  router.push({
    pathname: "/(root)/ride-screen",
    params: {
      rideRequestId: rideRequestId,
      dbDestinationLat: dbDestinationLat,
      dbDestinationLng: dbDestinationLng
    },
  });
} else {
  console.error("Missing required parameters for navigation", { rideRequestId, dbDestinationLat, dbDestinationLng });
}
    });
  });

  return unsubscribe; // Return the unsubscribe function to stop listening when needed
};

export const trackDriverLocation = (driverId, setDriverLocation) => {
  const driverDocRef = firestore().collection('drivers').doc(driverId);

  const unsubscribe = driverDocRef.onSnapshot((driverDocSnap) => {
    if (driverDocSnap.exists) {
      const driverData = driverDocSnap.data();
      console.log(driverData, "driverData in trackDriverLocation")
      if (driverData && driverData.lat !== undefined && driverData.lng !== undefined) {
        // Update the driver location if valid data is returned
        setDriverLocation({ lat: driverData.lat, lng: driverData.lng });
        console.log(driverId, "driverId in trackDriverLocation");
      } else {
        console.warn("Driver location data is missing lat or lng");
      }
    } else {
      console.warn("Driver document does not exist");
    }
  });

  // Return the unsubscribe function to stop listening when no longer needed
  return () => unsubscribe();
};

export const createUser = async (updates) => {
  try {
    const response = await axios.post(
      'https://server-7az0.onrender.com/users',
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true };
  } catch (err) {
    const errorMessage = err.response?.data?.error || err.message?.error;

    if (JSON.stringify(errorMessage).includes("duplicate key value")) {
      throw new Error("DuplicateDriverError");
    }
    throw err;
  }
};

export const createUser2 = async (updates) => {
  try {
    const response = await axios.post(
      'https://app.share-rides.com/api/register',
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message;

    if (JSON.stringify(errorMessage).includes("duplicate key")) {
      throw new Error("DuplicateDriverError");
    }
    throw err;
  }
};


export const updateUser = async (userId, updates) => {
  try {
    const response = await axios.patch(`https://app.share-rides.com/users/${userId}`, updates);

  } catch (err) {
console.log(err)
  }
};

export const updateByUsername = async (username, updates) => {
  try {
    const response = await axios.patch(`https://app.share-rides.com/users/username/${username}`, updates);

  } catch (err) {

  }
};

export const userProfile = async (username) => {
  //console .log("driverId, type", driverId, type)
  const maxRetries = 10;
  let retryCount = 0;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      //console .log(`https://api.share-rides.com/drivers/${driverId}?type=${type}`)
      const response = await axios.get(`https://app.share-rides.com/users/username/${username}`);
      console.log("response.data", response.data)
      return response.data;
    } catch (err) {
      console.error("userProfile err", err)
      if (err.isAxiosError && err.message === 'Network Error') {
        retryCount++;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s cap
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw err; // Re-throw non-network errors
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: Network Error`);
};

export const userProfileBytheirId = async (userId) => {
  //console .log("driverId, type", driverId, type)
  const maxRetries = 10;
  let retryCount = 0;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      //console .log(`https://api.share-rides.com/drivers/${driverId}?type=${type}`)/api/users/:userId/profile
      const response = await axios.get(`https://app.share-rides.com/api/users/${userId}/profile`);
      console.log("response.data", response.data)
      return response.data;
    } catch (err) {
      console.error("userProfile err", err)
      if (err.isAxiosError && err.message === 'Network Error') {
        retryCount++;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s cap
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw err; // Re-throw non-network errors
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: Network Error`);
};

export const userProfileById = async (userId) => {
  //console .log("driverId, type", driverId, type)
  const maxRetries = 10;
  let retryCount = 0;
  const baseDelay = 1000; // 1 second base delay

  while (retryCount < maxRetries) {
    try {
      //console .log(`https://api.share-rides.com/drivers/${driverId}?type=${type}`)
      const response = await axios.get(`https://app.share-rides.com/users/${userId}`);
//console.log("response", response)
      return response.data;
    } catch (err) {
      console.error("errerrerr", err)
      if (err.isAxiosError && err.message === 'Network Error') {
        retryCount++;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s cap

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw err; // Re-throw non-network errors
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: Network Error`);
};

export const handleProcessPayment = async (amountInETB, phoneNumberStore, shareUsername) => {
    const user = auth()?.currentUser;
    const userId = user?.uid;

  console.log("shareUsername", shareUsername)
    if (!userId ) {
      Alert.alert('Authentication Required', 'Please log in to send a tip.');
      return;
    }
    if (!amountInETB || parseFloat(amountInETB) <= 0) {
      Alert.alert('Invalid Amount', 'Please select a tip package or enter a positive custom amount.');
      return;
    }
    try {
      const response = await fetch("https://app.share-rides.com/api/payment/initiate", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount: parseFloat(amountInETB),
          context: 'Wallet', // Indicate this is a tip payment
          referenceId: `${shareUsername}`, // Unique reference for this tip
          tipRecipientId: userId, // Pass the recipient ID (post author),
          phone: formatToInternational(phoneNumberStore)
        }),
      });

console.log()
const text = await response.text();
console.log("Raw response from server:", text);

let data;
try {
  data = JSON.parse(text);
} catch (jsonError) {
  console.error("JSON parse failed:", jsonError);
  Alert.alert("Server Error", "The server did not return valid JSON.");
  return;
}
      if (response.ok) {
        if (data.paymentUrl) {
          const supported = await ExpLinking.canOpenURL(data.paymentUrl);
          if (supported) {
            await ExpLinking.openURL(data.paymentUrl);

            Alert.alert(
              'Complete Payment',
              'Please complete your tip payment on the SantimPay page that just opened. You can close this prompt if you are done with your payment.'
            );
          } else {
            Alert.alert('Error', `Don't know how to open this URL: ${data.paymentUrl}`);
          }
        } else {
          Alert.alert('Payment Error', 'No payment URL received from the server.');
        }
      } else {
        console.error('Payment Initiation Failed', data.error || 'Something went wrong on the server.')
        Alert.alert('Payment Initiation Failed', data.error || 'Something went wrong on the server.');
      }
    } catch (error) {
      console.error('Frontend SantimPay Tip Error:', error);
      Alert.alert('Network Error', 'Could not connect to the server. Please try again.');
    } 
  };
// --- MOCK DATA & HELPERS (Keep these in your file) ---
export const GIFT_CATEGORIES = [
  {
    title: 'Trending',
    data: [
      { id: 'ice_cream', name: 'Ice Cream', cost: 25, image: 'https://img.icons8.com/emoji/96/soft-ice-cream-emoji.png' },
      { id: 'rose', name: 'Rose', cost: 50, image: 'https://img.icons8.com/emoji/96/rose-emoji.png' },
      { id: 'tiktok', name: 'Lets Go!', cost: 99, image: 'https://img.icons8.com/fluency/96/tiktok-logo.png' },
      { id: 'heart_gift', name: 'Heart Box', cost: 199, image: 'https://img.icons8.com/emoji/96/heart-with-ribbon-emoji.png' },
    ],
  },
  {
    title: 'Premium',
    data: [
      { id: 'diamond', name: 'Diamond', cost: 499, image: 'https://img.icons8.com/emoji/96/gem-stone-emoji.png' },
      { id: 'money_bag', name: 'Money Bag', cost: 999, image: 'https://img.icons8.com/emoji/96/money-bag-emoji.png' },
      { id: 'crown', name: 'Crown', cost: 1999, image: 'https://img.icons8.com/emoji/96/crown-emoji.png' },
      { id: 'trophy', name: 'Trophy', cost: 2500, image: 'https://img.icons8.com/emoji/96/trophy-emoji.png' },
    ],
  },
  {
    title: 'Luxury',
    data: [
      { id: 'sports_car', name: 'Sports Car', cost: 7000, image: 'https://img.icons8.com/emoji/96/racing-car-emoji.png' },
      { id: 'private_jet', name: 'Private Jet', cost: 15000, image: 'https://img.icons8.com/emoji/96/airplane-emoji.png' },
      { id: 'lion', name: 'Lion King', cost: 29999, image: 'https://img.icons8.com/emoji/96/lion-emoji.png' },
      { id: 'universe', name: 'Hulum Universe', cost: 45000, image: 'https://img.icons8.com/fluency/96/galaxy.png' },
    ],
  },
];

export const RECHARGE_OPTIONS = [
  { amount: 100, cost: '100 ETB' },
  { amount: 200, cost: '500 ETB' },
  { amount: 500, cost: '500 ETB' },
  { amount: 1000, cost: '1000 ETB' },
];

// Define consistent color palette
export const Colors = {
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
  overlayDark: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(255,255,255,0.2)',
  goldStar: '#FFD700', // For leaderboard/balance
};

export { addCoRiderRequest };

