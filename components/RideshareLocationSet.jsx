import React, { useState, useEffect } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { useLocationStore } from "@/store";


const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY; // Add your Google Places API Key here

const RideshareLocationSet = () => {
  const { setDestinationLocation } = useLocationStore();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to fetch address suggestions
  const fetchAddressSuggestions = async (query) => {
    if (query.length < 3) return; // Don't fetch suggestions for short queries
    setLoading(true);
const locationBias = "location=9.03,38.74&radius=20000"
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${GOOGLE_PLACES_API_KEY}&${locationBias}&components=country:et`; // Limit suggestions to Ethiopia

    try {
      const response = await axios.get(url);
      setSuggestions(response.data.predictions);
      console.log(suggestions, "suggestions")
    } catch (error) {
      console.error("Error fetching Google Places suggestions: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle when a user selects a suggestion
  const handleSuggestionPress = async (placeId) => {
    // Fetch place details including lat/lng
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}`;

    try {
      const response = await axios.get(url);
      const { lat, lng } = response.data.result.geometry.location;
      const address = response.data.result.formatted_address;

      const location = {
        latitude: lat,
        longitude: lng,
        address: address,
      };

      setDestinationLocation(location); // Set location in Zustand
setInput(address);
      // Call handleDestinationPress
     // handleDestinationPress(location);
     // router.push("/(root)/find-ride");
    } catch (error) {
      console.error("Error fetching place details: ", error);
    }
  };

  // Handle text input change
  const handleInputChange = (text) => {
    setInput(text);
    fetchAddressSuggestions(text);
  };

  return (
    <View style={styles.container}>
      <TextInput
      className="text-base font-Jakarta text-teal-500"
        value={input}
        onChangeText={handleInputChange}
        placeholder="Enter destination"
        style={styles.input}
      />

      {/* Show suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(item.place_id)}
            >
              <Text className="text-base font-Jakarta text-gray-700">{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading && <Text style={styles.loadingText}>Loading suggestions...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  suggestionText: {
    fontSize: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#888",
  },
});

export default RideshareLocationSet;
