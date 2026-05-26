import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CustomModal } from '@/components/modals'; 
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { useLocationStore } from "@/store";
import CustomGooglePlacesInput from "@/components/CustomGooglePlacesInput";
import { fetchDistanceAndTime } from "@/lib/utils";
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'https://app.share-rides.com/api'; 
const CLOUD_NAME = "dpccavqia";       
const UPLOAD_PRESET = "expo_profile_images"; 

const Colors = {
    primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C",
    textMedium: "#4A5568", textLight: "#718096", backgroundWhite: "#FFFFFF",
    backgroundLightGray: "#F7FAFC", borderLight: "#E2E8F0", successGreen: "#22C55E", warningRed: "#EF4444",
};

const SCHOOL_RIDE_OPTIONS = [
  { key: 'private', title: 'Private Ride', description: 'Dedicated vehicle for your children.', icon: 'car-hatchback', color: Colors.secondaryTeal },
  { key: 'shared', title: 'Shared SUV / Minivan', description: 'Matched with other kids in the neighborhood.', icon: 'bus-school', color: Colors.primaryOrange },
];

const SUBSCRIPTION_OPTIONS = [
    { label: 'Monthly', value: 'monthly', durationMonths: 1, discount: 0 },
    { label: 'Quarterly (5% off)', value: 'quarterly', durationMonths: 3, discount: 0.05 },
];

const TRIP_TYPE_OPTIONS = [
    { label: 'Round Trip (Morning & Afternoon)', value: 'round-trip', multiplier: 2.0 },
    { label: 'Morning Only', value: 'morning', multiplier: 1.0 },
    { label: 'Afternoon Only', value: 'afternoon', multiplier: 1.0 },
];

export default function ParentScreen() {
    const router = useRouter();
    const user = auth()?.currentUser;
    const { userLatitude, userLongitude, destinationLatitude, destinationLongitude, userAddress, destinationAddress } = useLocationStore();

    const [rides, setRides] = useState([]);
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBookingModal, setShowBookingModal] = useState(false);
    
    const [bookingState, setBookingState] = useState({ rideType: null, tripType: 'round-trip', subscription: 'monthly' });
    const [selectedChildIds, setSelectedChildIds] = useState(new Set());
    
    const [distance, setDistance] = useState(null);
    const [estimatedPrice, setEstimatedPrice] = useState(null);
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        if (user) fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        setLoading(true);
        // Mocking fetches for brevity - replace with your axios calls
        setChildren([
            { id: '1', name: 'Sarah', school_name: 'Beteseb Academy', photo_url: null },
            { id: '2', name: 'Leo', school_name: 'Beteseb Academy', photo_url: null }
        ]);
        setLoading(false);
    };

    // Calculate Price dynamically based on explicit map coordinates
    useEffect(() => {
        const calculate = async () => {
            if (userLatitude && destinationLatitude) {
                const { distance: dist } = await fetchDistanceAndTime(userLatitude, userLongitude, destinationLatitude, destinationLongitude);
                setDistance(dist);
                
                const basePricePerKm = bookingState.rideType === 'private' ? 40 : 15;
                const kidsMultiplier = selectedChildIds.size > 0 ? selectedChildIds.size : 1;
                
                // Base calc
                let total = (basePricePerKm * (dist/1000) * 22); 
                if (bookingState.rideType === 'private') total = total * 1.5; // Private premium
                if (bookingState.rideType === 'shared') total = total * kidsMultiplier; // Shared charges per seat

                setEstimatedPrice(Math.round(total));
            }
        };
        calculate();
    }, [userLatitude, destinationLatitude, bookingState.rideType, selectedChildIds]);

    const handleToggleChild = (childId) => {
        const newSelection = new Set(selectedChildIds);
        newSelection.has(childId) ? newSelection.delete(childId) : newSelection.add(childId);
        setSelectedChildIds(newSelection);
    };

    const handleBookingSubmit = async () => {
        if (!userLatitude || !destinationLatitude) {
            Alert.alert("Missing Map Data", "Please use the search bars to select explicit Home and School locations.");
            return;
        }
        if (selectedChildIds.size === 0) {
            Alert.alert("Select Children", "Please select at least one child for this route.");
            return;
        }

        setIsBooking(true);
        try {
            const payload = {
                userId: user?.uid,
                rideType: bookingState.rideType,
                childIds: Array.from(selectedChildIds),
                subscriptionType: bookingState.subscription,
                tripType: bookingState.tripType,
                pickup_address: userAddress,
                dropoff_address: destinationAddress,
                pickup_lat: userLatitude,
                pickup_lng: userLongitude,
                dropoff_lat: destinationLatitude,
                dropoff_lng: destinationLongitude,
                estimatedPrice
            };
            
            // Send to your backend matching agents
            // await axios.post(`${API_BASE_URL}/school-rides/book`, payload);
            
            Alert.alert("Success", "Request sent! Our agents have your exact coordinates and will assign a CareDriver shortly.");
            setShowBookingModal(false);
        } catch (error) {
            Alert.alert("Booking Failed", "We couldn't process your request.");
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          
          <View style={styles.header}>
            <Text style={styles.title}>My Subscriptions</Text>
            <TouchableOpacity style={styles.newRideButton} onPress={() => setShowBookingModal(true)}>
              <Ionicons name="add" size={24} color={Colors.backgroundWhite} />
            </TouchableOpacity>
          </View>

          {/* Render Active Rides list here... */}

          <Modal visible={showBookingModal} animationType="slide">
            <SafeAreaView style={styles.bookingModalContainer}>
             <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
              
              <View style={styles.bookingModalHeader}>
                <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                  <Ionicons name="close" size={30} color={Colors.textMedium} />
                </TouchableOpacity>
                <Text style={styles.bookingModalTitle}>Order School Ride</Text>
              </View>

              {/* ROBUST ORIGIN & DESTINATION INPUTS */}
              <View style={styles.mapInputsSection}>
                  <Text style={styles.formSectionTitle}>1. Route Details</Text>
                  
                  {/* Z-Index ensures the autocomplete dropdown flows over the elements below */}
                  <View style={{ zIndex: 20, marginBottom: 10 }}>
                      <Text style={styles.inputLabel}>Home (Pickup Location)</Text>
                      <CustomGooglePlacesInput type="pickup" placeholder="Search home address..." />
                  </View>
                  
                  <View style={{ zIndex: 10 }}>
                      <Text style={styles.inputLabel}>School (Drop-off Location)</Text>
                      <CustomGooglePlacesInput type="destination" placeholder="Search school address..." />
                  </View>
              </View>

              <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>2. Select Service</Text>
                  {SCHOOL_RIDE_OPTIONS.map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.rideOptionCard, bookingState.rideType === item.key && styles.rideOptionCardSelected]}
                      onPress={() => setBookingState(prev => ({...prev, rideType: item.key}))}
                    >
                      <View style={[styles.rideOptionIconContainer, { backgroundColor: item.color + '20' }]}>
                         <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                      </View>
                      <View style={styles.rideOptionDetails}>
                        <Text style={styles.rideOptionTitle}>{item.title}</Text>
                        <Text style={styles.rideOptionDescription}>{item.description}</Text>
                      </View>
                       {bookingState.rideType === item.key && <Ionicons name="checkmark-circle" size={24} color={Colors.successGreen} />}
                    </TouchableOpacity>
                  ))}
              </View>

              {bookingState.rideType && (
                  <View style={styles.formSection}>
                      <Text style={styles.formSectionTitle}>3. Select Children</Text>
                      <Text style={styles.inputNote}>Which kids are taking this specific route?</Text>
                      
                      {children.map(child => (
                          <TouchableOpacity 
                              key={child.id}
                              style={styles.childSelectItem}
                              onPress={() => handleToggleChild(child.id)}
                          >
                              <Ionicons name={selectedChildIds.has(child.id) ? 'checkbox' : 'square-outline'} size={24} color={Colors.secondaryTeal} />
                              <View style={{ marginLeft: 15 }}>
                                  <Text style={styles.childSelectText}>{child.name}</Text>
                                  <Text style={styles.childSelectSub}>{child.school_name}</Text>
                              </View>
                          </TouchableOpacity>
                      ))}
                      
                      <TouchableOpacity style={styles.addChildButton}>
                          <Ionicons name="add-circle-outline" size={20} color={Colors.primaryOrange} />
                          <Text style={styles.addChildButtonText}>Register Another Child</Text>
                      </TouchableOpacity>

                      <View style={styles.priceEstimateContainer}>
                          <Text style={styles.priceEstimateLabel}>Monthly Estimate:</Text>
                          <Text style={styles.priceEstimateValue}>
                              {estimatedPrice ? `ETB ${estimatedPrice.toLocaleString()}` : 'Select locations to calculate'}
                          </Text>
                      </View>

                      <TouchableOpacity style={styles.confirmButton} onPress={handleBookingSubmit} disabled={isBooking || !estimatedPrice}>
                          {isBooking ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm & Find Driver</Text>}
                      </TouchableOpacity>
                  </View>
              )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLightGray },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: Colors.backgroundWhite },
    title: { fontSize: 24, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
    newRideButton: { backgroundColor: Colors.secondaryTeal, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    bookingModalContainer: { flex: 1, backgroundColor: Colors.backgroundLightGray },
    bookingModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: Colors.backgroundWhite },
    bookingModalTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginRight: 30 },
    mapInputsSection: { padding: 20, backgroundColor: Colors.backgroundWhite, marginBottom: 10, zIndex: 100 },
    formSection: { padding: 20, backgroundColor: Colors.backgroundWhite, marginBottom: 10 },
    formSectionTitle: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 15 },
    inputLabel: { fontSize: 14, fontFamily: 'Jakarta-SemiBold', color: Colors.textMedium, marginBottom: 6 },
    inputNote: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: Colors.textLight, marginBottom: 10 },
    rideOptionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundWhite, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: Colors.borderLight },
    rideOptionCardSelected: { borderColor: Colors.successGreen },
    rideOptionIconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    rideOptionDetails: { flex: 1 },
    rideOptionTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
    rideOptionDescription: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
    childSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    childSelectText: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
    childSelectSub: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: Colors.textLight },
    addChildButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
    addChildButtonText: { marginLeft: 8, color: Colors.primaryOrange, fontFamily: 'Jakarta-Bold', fontSize: 16 },
    priceEstimateContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.backgroundLightGray, padding: 16, borderRadius: 12, marginTop: 20 },
    priceEstimateLabel: { fontSize: 16, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
    priceEstimateValue: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
    confirmButton: { backgroundColor: Colors.primaryOrange, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 20 },
    confirmButtonText: { color: Colors.backgroundWhite, fontSize: 18, fontFamily: 'Jakarta-Bold' },
});