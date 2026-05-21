import firestore from '@react-native-firebase/firestore';
import {geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common"; // Assuming you're using 'geofire-common'

//import { getFirestore, doc, collection, getDoc, updateDoc, setDoc, onSnapshot, query, where, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import auth from '@react-native-firebase/auth';
// const db = firestore();
// const firebaseConfig = {
//     apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
//     authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
//     databaseURL: "https://moringa-rides-default-rtdb.europe-west1.firebasedatabase.app",
//     projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
//     storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
//     messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//     appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
//     measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID
// };

// const app = initializeApp(firebaseConfig);


async function updateRiderGeohash(userId, lat, lng) {
  // Generate geohash for the given location
  const hash = geohashForLocation([lat, lng]);

  try {
    // Update the document with the geohash and coordinates
    await setDoc(doc(db, "riders", userId), {
      geohash: hash,
      lat: lat,
      lng: lng,
    });
    console.log(lat, lng)
    console.log(`Geohash and coordinates updated for city ${userId}`);
  } catch (error) {
    console.error("Error updating document:", error);
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  // Radius of Earth in kilometers
  const R = 6371;

  // Convert degrees to radians
  const toRad = (value) => (value * Math.PI) / 180;

  // Haversine formula
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  const distance = R * c;

  return distance;
}


async function findNearbyDrivers(center, radiusInM, type) {
  try {
    const [riderLat, riderLng] = center;
    console.log("Searching for drivers near:", riderLat, riderLng, "with radius:", radiusInM, "and seat type:", type);

    // Generate geohash bounds for the rider location and radius
    const bounds = geohashQueryBounds([riderLat, riderLng], radiusInM);
    if (!bounds.length) {
      console.error("No geohash bounds found for the given center and radius.");
      return [];
    }
    const promises = bounds.map(([start, end]) =>
      firestore()
        .collection('drivers')
        // .where('seatType', '==', type)
        .orderBy('geohash')
        .startAt(start)
        .endAt(end)
        .get()
    );
    // Wait for all queries to resolve
    const snapshots = await Promise.all(promises);

    const matchingDrivers = [];
    snapshots.forEach((snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        const { lat, lng, driverId } = data;

        if (!lat || !lng) {
          console.warn("Driver missing location data:", driverId);
          return;
        }

        // Calculate distance and validate within radius
        const distance = distanceBetween([riderLat, riderLng], [lat, lng]) * 1000; // Convert km to meters
        console.log(`Driver ${driverId} is ${distance.toFixed(2)}m away.`);

        if (distance <= radiusInM) {
          matchingDrivers.push(data);
        }
      });
    });

    console.log(`Found ${matchingDrivers.length} drivers matching criteria.`);
    return matchingDrivers;
  } catch (error) {
    console.error("Error in findNearbyDrivers:", error);
    throw error;
  }
}


const uploadLocation = async (collection, docId, lat, long) => {
  try {
    await firestore()
      .collection(collection)
      .doc(docId)
      .set({
        location: new firestore.GeoPoint(lat, long),
        time: firestore.Timestamp.fromDate(new Date()),
      });
    console.log('Location uploaded successfully');
  } catch (error) {
    console.error('Error uploading location: ', error);
  }
};
 const user = auth().currentUser;

const addRideRequest = async (setCurrentRideRequestId, userLocation, destinationLocation, nearbyDrivers, userId, destinationAddress, expoToken, pnumber, estimatedPrice) => {
  try {
    const docRef = firestore().collection('requests').doc(); // Generate a new document with auto ID
    const user = auth().currentUser;
    await docRef.set({
      type: "solo",
      pnumber: pnumber, // Ensure pnumber is defined
      userLocation,
      destinationAddress,
      destinationLocation,
      createdAt: firestore.Timestamp.fromDate(new Date()), // RNF Timestamp
      status: 'looking-for-driver',
      userId,
      driverSetPrice: false 
    });
setCurrentRideRequestId(docRef.id)
      if (nearbyDrivers.length > 0) {
      const messages = nearbyDrivers.map((driver) => {
        const baseMessage = "Automatic system matching";
        const priceMessage = ""
        return {
          to: driver.expoToken,
          title: '📍 New Ride Request',
          body: "A  new job has been requested. Open your app to respond  quickly before it's taken.",
          channelId: 'ride_notifications',
          data: {
            rideRequestId: docRef.id,
            userLocation,
            createdAt: firestore.Timestamp.fromDate(new Date()),
            destinationLocation,
            pnumber,
            destinationAddress,
            rideType: "solo",
            estimatedPrice,
            origin: userLocation,
            destination: destinationLocation,
            name: user?.displayName,
            expoToken,
            message: `${baseMessage} (${priceMessage})`,
            driverSetPrice: false
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

    return docRef.id; // Return document ID
  } catch (error) {
    console.error('Error adding ride request: ', error);
    throw error;
  }
};



const createFirestoreUser = async (
  collection,
  docId,
  name,
  email,
  pnumber,
) => {
  try {
    // Add a new document in the specified collection with the given document ID
    await setDoc(doc(db, collection, docId), {
      name: name,
      email: email,
      phone: pnumber,
      status: "dormant", // Default status
      activeRideId: null, // No active ride at creation
      location: new GeoPoint(9.3, 38.55), // Geopoint for location
      time: Timestamp.fromDate(new Date()), // Timestamp for the current time
      rating: 0
    });
    console.log("Document successfully written!");
  } catch (error) {
    console.error("Error writing document: ", error);
  }
};



export {
  uploadLocation,
  createFirestoreUser,
  updateRiderGeohash,
  findNearbyDrivers,
  addRideRequest,
  haversineDistance,
  // getDb,
};

