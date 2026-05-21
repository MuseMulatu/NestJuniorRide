import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import axios from "axios";
import { useLocationStore, useLanguageStore } from "@/store";
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Feather } from '@expo/vector-icons';

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const CustomOSMPlacesInput = ({ placeholder = "Search your destination here", type, selectionOpener, homepage = false }) => {
  const { language } = useLanguageStore();
  const { userAddress, destinationAddress, setUserLocation, setDestinationLocation } = useLocationStore();
  
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState({ type: null, predictions: [] });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [origin, setOrigin] = useState(userAddress || "");
  const [destination, setDestination] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
const cancelTokenRef = useRef(axios.CancelToken.source());

  const translations = {
    ENG: { box: "Where to?" },
    ORM: { box: "Bakka itti geessan barbaadi" },
    AMH: { box: "መድረሻ ይፈልጉ" },
  };const fetchAddressSuggestions = useCallback(async (query, searchType) => {
  if (query.length < 2) {
    setSuggestions({ type: null, predictions: [] });
    return;
  }

  setLoading(true);

  try {
    cancelTokenRef.current = axios.CancelToken.source();

    const bbox = "38.6,8.8,39.0,9.1"; 

    const localUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&bbox=${bbox}`;
    const globalUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;

    const [localRes, globalRes] = await Promise.all([
      axios.get(localUrl, { cancelToken: cancelTokenRef.current.token }),
      axios.get(globalUrl, { cancelToken: cancelTokenRef.current.token }),
    ]);

    const parse = (res) =>
      res.data.features.map((f) => ({
        displayName: [
          f.properties.name,
          f.properties.street,
          f.properties.city,
          f.properties.state,
          f.properties.country,
        ].filter(Boolean).join(", "),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }));

    const local = parse(localRes);
    const global = parse(globalRes);

    // Optional: remove duplicate Addis results from the global list
    const filteredGlobal = global.filter(
      (g) => !g.displayName.includes("Addis Ababa")
    );

    setSuggestions({
      type: searchType,
      predictions: [
        { section: "Local Results (Addis Ababa)", items: local },
        { section: "Global Results", items: filteredGlobal },
      ],
    });
  } catch (err) {
    if (!axios.isCancel(err)) {
      console.error("Photon API failed:", err);
    }
  } finally {
    setLoading(false);
  }
}, []);


// Replace searchTimeout state with useRef
const timeoutRef = useRef(null);

// Update debouncedSearch function
const debouncedSearch = useCallback((text, searchType) => {
  // Cancel previous request
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  if (cancelTokenRef.current) {
    cancelTokenRef.current.cancel('Operation canceled by new request');
  }

  timeoutRef.current = setTimeout(() => {
    fetchAddressSuggestions(text, searchType);
  }, 300);
}, [fetchAddressSuggestions]);

const handleInputChange = (text, setter, searchType) => {
  setter(text);
  if (text.length === 0) {
    setSuggestions({ type: null, predictions: [] });
  }
  debouncedSearch(text, searchType);
};

  const handleSuggestionPress = (item, setter, locationSetter) => {
setModalVisible(false)
    const location = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.displayName,
    };

    setter(location.address?.substring(0, 31) + " ...");
    locationSetter(location);
    setSuggestions({ type: null, predictions: [] });
    if (homepage){
    selectionOpener(true)
    }
  };

  const clearInput = () => {
    setDestination("");
    setSuggestions({ type: null, predictions: [] });
  };

useEffect(() => {
  return () => {
    // Cleanup any pending requests
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Component unmounted');
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);

useEffect(() => {
if(!origin){
setOrigin(userAddress)
}
console.log("origin, userAddress", origin, userAddress)
  }, [userAddress]);

useEffect(() => {
if(!origin){
setOrigin(userAddress)
}
console.log("origin, userAddress", origin, userAddress)
  }, [userAddress]);

  const { box } = translations[language];
 return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.searchTrigger}
        onPress={() => setModalVisible(true)}
      >
        <Feather name="search" size={20} color="#6B7280" />
        <Text style={styles.placeholderText}>
          {destination || translations[language].box}
        </Text>
      </TouchableOpacity>

      <Modal 
        visible={modalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plan Your Journey</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="my-location"
                  size={20}
                  color="orange"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputField, styles.originInput]}
                  value={origin}
                  onChangeText={(text) => handleInputChange(text, setOrigin, "origin")}
                  placeholder="Current location"
                  placeholderTextColor="#BB9206"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="place"
                  size={20}
                  color="#EF4444"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.inputField, styles.destinationInput]}
                  value={destination}
                  onChangeText={(text) => handleInputChange(text, setDestination, "destination")}
                  placeholder="Enter destination"
                  placeholderTextColor="#9CA3AF"
                />
                {destination && (
                  <TouchableOpacity
                    onPress={clearInput}
                    style={styles.clearButton}
                  >
                    <Feather name="x-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

           {loading ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color="#3B82F6" />
    <Text style={styles.loadingText}>Searching locations...</Text>
  </View>
) : suggestions.predictions.length > 0 ? (
  <FlatList
    data={suggestions.predictions}
    keyExtractor={(section, index) => `section-${index}`}
    renderItem={({ item: section }) => (
      <View style={{ marginBottom: 10 }}>
        {/* Section Title */}
        <Text style={styles.sectionHeader}>{section.section}</Text>
        <View style={styles.sectionDivider} />

        {/* Location rows */}
        {section.items.map((location, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.suggestionItem}
            onPress={() =>
              handleSuggestionPress(
                location,
                suggestions.type === "origin" ? setOrigin : setDestination,
                suggestions.type === "origin" ? setUserLocation : setDestinationLocation
              )
            }
          >
            <Feather name="map-pin" size={16} color="#6B7280" />
            <Text style={styles.suggestionText} numberOfLines={2}>
              {location.displayName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  />
) : (
  <View style={styles.emptyState}>
    <Feather name="compass" size={40} color="#E5E7EB" />
    <Text style={styles.emptyStateText}>
      {destination ? "whoops, no such location found" : "Start typing to find locations"}
    </Text>
  </View>
)}
            <View style={styles.footer}>
              <Text style={styles.attributionText}>Search powered by Hulum Super-app</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
  },
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-around',
  },
  modalCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 16,
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  inputGroup: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    paddingVertical: 8,
  },
  originInput: {
    color: '#BB9206',
  },
  destinationInput: {
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    marginLeft: 32,
  },
  clearButton: {
    padding: 8,
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 12,
  },
  listDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 44,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#9CA3AF',
    fontFamily: 'Inter-Medium',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    marginTop: 24,
  },
  attributionText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  sectionHeader: {
  fontSize: 14,
  fontWeight: "600",
  color: "#6B7280",
  marginBottom: 4,
  marginTop: 6,
  paddingLeft: 4,
},

sectionDivider: {
  height: 1,
  backgroundColor: "#E5E7EB",
  marginBottom: 6,
},

});

export default CustomOSMPlacesInput;