import MapView, { Marker, Polyline } from "react-native-maps";
import { ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { icons } from "@/constants";
import firestore from '@react-native-firebase/firestore'; // RNF Firestore

import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet, Alert, Animated } from "react-native";
//import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { AntDesign, FontAwesome } from "@expo/vector-icons"; // For star icons
import auth from '@react-native-firebase/auth';

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
 
 console.log(endLat, "endLat") 
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

console.log(isFavorite, "isFavorite")
  // Function to handle favoriting/unfavoriting a driver
// Function to handle favoriting/unfavoriting a driver
const toggleFavorite = async () => {
  if (!userId || !driverId) return;

  // Store the optimistic state
  const newFavoriteStatus = !isFavorite;
  setIsFavorite(newFavoriteStatus); // Update the UI immediately
  setLoadingFavorite(true);

  const userDocRef = firestore().collection('riders').doc(userId); // Ensure you're using the correct collection

  try {
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      if (newFavoriteStatus) {
        // Add to favorites
        await userDocRef.update({
          favoriteDrivers: firestore.FieldValue.arrayUnion(driverId),
        });
      } else {
        // Remove from favorites
        await userDocRef.update({
          favoriteDrivers: firestore.FieldValue.arrayRemove(driverId),
        });
      }
    }
  } catch (error) {
    console.error("Error updating favorites: ", error);
    // Revert the state back if there's an error
    setIsFavorite(!newFavoriteStatus);
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
      const { ratingSum = 0, totalRatings = 0, ratings = [] } = driverDoc.data();

       // Add new rating at the front of the array
      const newRating = { rideRequestId, userId, rating, comment };
      const updatedRatings = [newRating, ...ratings].slice(0, 15); // Limit array length to 15

      // Update driver's rating and reviews
      await driverDocRef.update({
        ratingSum: ratingSum + rating, // Add new rating to sum
        totalRatings: totalRatings + 1, // Increment total ratings count
        ratings: updatedRatings, // Update the ratings array
      });

      // Optionally, prompt to add to favorites if rating is high
      if (rating >= 3 && !isFavorite) {
        Alert.alert(
          "Add to Favorites",
          "You rated this driver more than 4. Would you like to add this driver to your favorites so they can pick you up next time?",
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
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6 space-y-6">
        {/* Header */}
        <View className="items-center space-y-2">
          <View className="bg-green-100 p-4 rounded-full">
            <AntDesign name="checkcircle" size={32} color="#16a34a" />
          </View>
          <Text className="text-3xl font-bold text-gray-900">Ride Completed</Text>
          <Text className="text-gray-500">Thanks for choosing our service!</Text>
        </View>

        {/* Map Preview */}
        <View className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <Image
            source={{ uri: `https://maps.geoapify.com/v1/staticmap...` }}
            className="w-full h-48"
          />
          <View className="p-4 border-t border-gray-100">
            <Text className="text-sm font-medium text-gray-500">Route Overview</Text>
          </View>
        </View>

        {/* Ride Summary */}
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <View className="space-y-4">
            <View className="flex-row items-center space-x-3">
              <AntDesign name="clockcircle" size={20} color="#4f46e5" />
              <View>
                <Text className="text-sm text-gray-500">Duration</Text>
                <Text className="font-medium text-gray-900">{timeTaken}</Text>
              </View>
            </View>
            
            <View className="flex-row items-center space-x-3">
              <AntDesign name="arrowright" size={20} color="#4f46e5" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">From</Text>
                <Text className="font-medium text-gray-900" numberOfLines={1}>
                  {originAddress}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-3">
              <FontAwesome name="map-marker" size={20} color="#4f46e5" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">To</Text>
                <Text className="font-medium text-gray-900" numberOfLines={1}>
                  {address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fare Card */}
        <View className="flex-row justify-between space-x-4">
          <View className="bg-indigo-50 flex-1 p-4 rounded-xl border border-indigo-100">
            <Text className="text-sm text-indigo-600">Distance</Text>
            <Text className="text-xl font-bold text-indigo-700">{distanceTravelled} km</Text>
          </View>
          
          <View className="bg-indigo-50 flex-1 p-4 rounded-xl border border-indigo-100">
            <Text className="text-sm text-indigo-600">Total Fare</Text>
            <Text className="text-xl font-bold text-indigo-700">ETB {farePrice}</Text>
          </View>
        </View>

        {/* Rating Section */}
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <Text className="text-lg font-bold text-gray-900">Rate Your Experience</Text>
          
          <View className="flex-row justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity 
                key={star} 
                onPress={() => setRating(star)}
                className={`p-2 ${star <= rating ? 'bg-amber-100' : 'bg-gray-100'} rounded-lg`}
              >
                <AntDesign
                  name={star <= rating ? "star" : "staro"}
                  size={32}
                  color={star <= rating ? "#f59e0b" : "#cbd5e1"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View className="space-y-4">
            <Text className="text-sm text-gray-600">
              Help improve our service by sharing your feedback
            </Text>
            
            <View className="space-y-1">
              <Text className="text-sm font-medium text-gray-700">Comments</Text>
              <TextInput
                className="w-full h-24 p-3 border border-gray-200 rounded-lg text-gray-900"
                placeholder="Share your experience (optional)"
                placeholderTextColor="#9ca3af"
                value={comment}
                onChangeText={validateComment}
                multiline
                maxLength={140}
              />
              <Text className="text-right text-sm text-gray-500">
                {140 - comment.length} characters remaining
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            className={`w-full p-4 rounded-lg ${rating ? 'bg-indigo-600' : 'bg-indigo-100'}`}
            onPress={submitRating}
            disabled={!rating}
          >
            <Text className={`text-center font-medium ${rating ? 'text-white' : 'text-indigo-400'}`}>
              {rating ? 'Submit Review' : 'Select Rating to Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Favorite Section */}
        <TouchableOpacity 
          className={`flex-row items-center justify-center space-x-2 p-4 rounded-xl border ${
            isFavorite ? 'border-pink-200 bg-pink-50' : 'border-gray-200 bg-white'
          }`}
          onPress={toggleFavorite}
          disabled={loadingFavorite}
        >
          <AntDesign
            name={isFavorite ? "heart" : "hearto"}
            size={20}
            color={isFavorite ? "#ec4899" : "#6b7280"}
          />
          <Text className={isFavorite ? "text-pink-600 font-medium" : "text-gray-600 font-medium"}>
            {isFavorite ? 'Favorited Driver' : 'Save to Favorites'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default RideCompletedScreen;
