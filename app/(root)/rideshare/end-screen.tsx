import MapView, { Marker, Polyline } from "react-native-maps";
import { useUser } from "@clerk/clerk-expo";
import { ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { icons } from "@/constants";

import firestore from '@react-native-firebase/firestore'; // RNF Firestore
//import { doc, addDoc, updateDoc, collection, onSnapshot, query, where, serverTimestamp } from "firebase/firestore"

import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { AntDesign, FontAwesome } from "@expo/vector-icons"; // For star icons
import auth from '@react-native-firebase/auth'
const RideCompletedScreen = () => {
  const user = auth().currentUser;
  const userId = user.uid;
  const router = useRouter();
  const {
    rideRequestId,
    farePrice,
    distanceTravelled,
    timeTaken,
    endLat,
    endLng,
    driverId,
    originLat,
    originLng,
  } = useLocalSearchParams();
  
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [address, setAddress] = useState(null);
  const [originAddress, setOriginAddress] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  // Fetch and set addresses
  useEffect(() => {
    (async () => {
      try {
        const oAddress = await Location.reverseGeocodeAsync({
          latitude: parseFloat(originLat),
          longitude: parseFloat(originLng),
        });
        setOriginAddress(oAddress[0].formattedAddress);

        const eAddress = await Location.reverseGeocodeAsync({
          latitude: parseFloat(endLat),
          longitude: parseFloat(endLng),
        });
        setAddress(eAddress[0].formattedAddress);
      } catch (error) {
        console.error("Error fetching addresses: ", error);
      }
    })();
  }, [originLat, originLng, endLat, endLng]);

  // Check if the driver is already a favorite
useEffect(() => {
  if (user && driverId) {
    const userDocRef = firestore().collection('riders').doc(userId);

    const fetchFavorites = async () => {
      try {
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
          const { favoriteDrivers = [] } = userDoc.data();
          setIsFavorite(favoriteDrivers.includes(driverId));
        }
      } catch (error) {
        console.error("Error fetching favorite drivers: ", error);
      }
    };
    fetchFavorites();
  }
}, [user, driverId]);

  // Function to handle favoriting/unfavoriting a driver
const toggleFavorite = async () => {
  if (!userId || !driverId) return;

  setLoadingFavorite(true);
  const userDocRef = firestore().collection('users').doc(userId);

  try {
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      if (isFavorite) {
        // Remove from favorites
        await userDocRef.update({
          favoriteDrivers: arrayRemove(driverId),
        });
        Alert.alert("Removed from Favorites");
      } else {
        // Add to favorites
        await userDocRef.update({
          favoriteDrivers: arrayUnion(driverId),
        });
        Alert.alert("Added to Favorites");
      }
      setIsFavorite(!isFavorite);
    }
  } catch (error) {
    console.error("Error updating favorites: ", error);
    Alert.alert("Error", "Unable to update favorites. Please try again.");
  } finally {
    setLoadingFavorite(false);
  }
};



  // Function to submit rating
const submitRating = async () => {
  if (rating === 0) {
    Alert.alert("Validation Error", "Please provide a rating before submitting.");
    return;
  }

  try {
    const driverDocRef = firestore().collection('drivers').doc(driverId);
    const driverDoc = await driverDocRef.get();

    if (driverDoc.exists) {
      const { ratingSum = 0, totalRatings = 0 } = driverDoc.data();

      // Update driver's rating
      await driverDocRef.update({
        ratingSum: ratingSum + rating, // Add new rating to sum
        totalRatings: totalRatings + 1, // Increment total ratings count
        ratings: arrayUnion({ rideRequestId, userId, rating, comment }), // Store rating with reference
      });

      // Optionally, prompt to add to favorites if rating is high
      if (rating >= 4 && !isFavorite) {
        Alert.alert(
          "Add to Favorites",
          "Would you like to add this driver to your favorites?",
          [
            { text: "No", onPress: () => {} },
            { text: "Yes", onPress: toggleFavorite },
          ]
        );
      }

      router.push("/(root)/(tabs)/home");
      console.log("Rating submitted");
    }
  } catch (error) {
    console.error("Error submitting rating: ", error);
    Alert.alert("Error", "Unable to submit rating. Please try again.");
  }
};

  // Function to sanitize comment input
  const validateComment = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z0-9 .,!?'"()-]/g, "");
    setComment(sanitizedText);
  };

  // Function to format time taken
  const formatTime = (timeInMins) => {
    const hours = Math.floor(timeInMins / 60);
    const minutes = Math.floor((timeInMins % 60));
    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View style={styles.container}>
      <Text style={styles.title}>Ride Completed</Text>

      {/* Map Snapshot Showing Route */}
      <View style={styles.mapContainer}>
        <Image
          source={{
            uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${endLng},${endLat}&zoom=13.6&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
          }}
          style={styles.mapImage}
        />
      </View>

      {/* Ride Information */}
      <View style={styles.infoContainer}>
        {/* Origin Address */}
        <View style={styles.row}>
          <AntDesign name="arrowright" size={24} color="black" />
          <Text style={styles.infoText} numberOfLines={1}>
            Origin: {originAddress}
          </Text>
        </View>

        {/* Destination Address */}
        <View style={styles.row}>
          <FontAwesome name="map-marker" size={24} color="black" />
          <Text style={styles.infoText} numberOfLines={1}>
            Destination: {address}
          </Text>
        </View>

        {/* Time Taken */}
        <View style={styles.row}>
          <AntDesign name="clockcircle" size={24} color="black" />
          <Text style={styles.infoText}>
            Time Taken: {formatTime(timeTaken)}
          </Text>
        </View>
      </View>

      {/* Ride Details */}
      <View style={styles.detailsContainer}>
            <Text className="font-Jakarta text-center" style={styles.detailText}>Distance: {distanceTravelled} km</Text>
        <Text className="text-gray-900 font-JakartaBold text-center" style={styles.detailText}>Fare: {farePrice}Br</Text>
      </View>

      {/* Rating and Comment Section */}
      <View style={styles.ratingContainer}>
        <Text className="text-gray-700 text-center font-JakartaBold" style={styles.sectionTitle}>Rate the Driver</Text>
        
        {/* 5-Star Rating */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <AntDesign
                name={star <= rating ? "star" : "staro"}
                size={32}
                color="#Fc1799"
                style={styles.star}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Favorite Driver Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={toggleFavorite}
          disabled={loadingFavorite}
        >
          <AntDesign
            name={isFavorite ? "heart" : "hearto"}
            size={24}
            color={isFavorite ? "pink" : "red"}
          />
          <Text style={styles.favoriteText}>
            {isFavorite ? "Favorited" : "Add to Favorites?"}
          </Text>
        </TouchableOpacity>
                  <Text className="text-gray-500 text-center mb-2">
            Denbegna this driver by adding them to favorites if you'd like to be picked up by them next time you make a request!
          </Text>

        {/* Comment Input */}
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment (max 140 chars)"
          value={comment}
          onChangeText={validateComment}
          maxLength={140}
          multiline
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitRating}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScrollView>
  );
};

// Stylesheet for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: "#333333",
  },
  mapContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  mapImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  infoContainer: {
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 8,
    color: "#555555",
    flexShrink: 1,
  },
  detailsContainer: {
    backgroundColor: "#F1F1F1",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 15,
    marginBottom: 4,
    color: "#444444",
  },
  ratingContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  star: {
    marginHorizontal: 4,
  },
  favoriteButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  favoriteText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#Fc1799",
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
    height: 100,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#14b8a6",
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default RideCompletedScreen;
