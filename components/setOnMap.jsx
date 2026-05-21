import React, { useState, useEffect } from 'react';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { View, ActivityIndicator } from 'react-native';
import { PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useLocationStore } from "@/store";
import {
  calculateRegion,
  generateMarkersFromData,
} from "@/lib/map";


const MapComponent = () => {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true); // New loading state

  const directionsAPI = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const { 
    setUserLocation,   setDestinationLocation, userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();

  const [selectedLocation, setSelectedLocation] = useState({
    latitude: userLatitude + 0.001 || 0,
    longitude: userLongitude + 0.002 || 0,
  });

  const getLocationWithRetries = async (maxAttempts = 10, delayMs = 1000) => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        let location = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: `${address[0].name}, ${address[0].region}`,
        });
console.log("Attempt number", attempts, ", location value is:", address[0].name, address[0].region)
        return; // Exit the loop if location is successfully fetched
      } catch (error) {
        console.error(`Attempt ${attempts}: Unable to fetch location`, error);
        if (attempts >= maxAttempts) {
          console.warn("Max attempts reached. Unable to fetch location.");
        } else {
          await new Promise((resolve) => setTimeout(resolve, delayMs)); // Wait before retrying
        }
      }
    }
  };

  useEffect(() => {
    if (userLatitude && userLongitude) {
      const r = calculateRegion({
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      });
      setRegion(r);
      setLoading(false); // Set loading to false when user location is available
    }

     if (!userLatitude || !userLongitude) {
          (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        return;
      }

 await getLocationWithRetries();
        setLoading(false);

    })();
    }   
  }, [userLatitude, userLongitude]);

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });

    const address = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    console.log({ latitude, longitude }, "selectedLocation");
    console.log(address, "address");

    // Update destination in the parent component
    setDestinationLocation({
      latitude,
      longitude,
      address: address[0]?.formattedAddress || "Unknown", // Use the first returned address or fallback
    });

    console.log(destinationLatitude, "destinationLatitude")
  };

  // Show the loader until user latitude and longitude are available
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F74DA" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_GOOGLE}
        className="w-full h-full rounded-2xl"
        tintColor="black"
        mapType="standard"
        initialRegion={region}
        showsUserLocation={true}
        userInterfaceStyle="light"
        onPress={handleMapPress} // Handle user tap to set destination
      >
        {userLatitude && userLongitude && (
          <Marker
            key="destination"
            coordinate={{
              latitude: destinationLatitude || userLatitude + 0.001 || 8.958,
              longitude: destinationLongitude || userLongitude + 0.001 || 38.7,
            }}
            title="Destination"
          />
        )}
      </MapView>
    </View>
  );
};

export default MapComponent;
