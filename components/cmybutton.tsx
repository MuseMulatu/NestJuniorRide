import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location"; // Ensure you have 'expo-location' installed
import { GoogleInputProps } from "./types"; // Assuming you have a types file
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import { useState, useEffect } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";

import RideCard from "@/components/RideCard";
import { icons, images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { Ride } from "@/types/type";

import { uploadLocation } from "@/firebaseconf"; 

interface LocationButtonProps {
  icon: any;
  containerStyle: string;
  textStyle?: object;
  handlePress: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

const LocationButton = ({
  icon,
  containerStyle,
  textStyle,
  handlePress,
}: LocationButtonProps) => {
  const onButtonPress = () => {
    // Simulated location data
    const location = {
      latitude: 37.7749, // Example latitude
      longitude: -122.4194, // Example longitude
      address: "San Francisco, CA", // Example address
    };

    // Call the passed in function with the location data
    handlePress(location);
  };

  return (
    <View
      className={`flex flex-row items-center justify-center relative ${containerStyle}`}
    >
      <TouchableOpacity
        onPress={onButtonPress}
        style={{
          backgroundColor: "#4CAF50",
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 10,
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <Image
          style={{ width: 20, height: 20, marginRight: 10 }}
          resizeMode="contain"
        />
        <Text
          style={[
            { color: "white", fontSize: 16, fontWeight: "600" },
            textStyle,
          ]}
        >
          Select Destination
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default LocationButton;
