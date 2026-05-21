import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CustomModal } from '@/components/modals'; // Assuming you have this for general alerts
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

// --- Constants ---
const API_BASE_URL = 'https://app.share-rides.com/api'; 
const CLOUD_NAME = "dpccavqia";       // from Cloudinary dashboard
const UPLOAD_PRESET = "expo_profile_images"; // create in Cloudinary settings

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

const SCHOOL_RIDE_OPTIONS = [
  { key: 'private', title: 'Private Ride', description: 'Dedicated vehicle for your child.', icon: 'car-hatchback', color: Colors.secondaryTeal },
  { key: 'shared', title: 'Shared Minivan', description: 'Affordable transport with others.', icon: 'bus-school', color: Colors.primaryOrange },
];

const SUBSCRIPTION_OPTIONS = [
    { label: 'Monthly', value: 'monthly', durationMonths: 1, discount: 0 },
    { label: 'Quarterly (5% off)', value: 'quarterly', durationMonths: 3, discount: 0.05 },
    { label: 'Semi-Annually (10% off)', value: 'semi_annually', durationMonths: 6, discount: 0.10 },
];

const TRIP_TYPE_OPTIONS = {
    'private': [
        { label: 'Round Trip (Morning & Afternoon)', value: 'round-trip', multiplier: 2.0 },
        { label: 'Morning Only', value: 'morning', multiplier: 1.0 },
        { label: 'Afternoon Only', value: 'afternoon', multiplier: 1.0 },
    ]
};

// --- Interfaces for Data Types ---

interface Child { id: string; name: string; school_name: string; photo_url: string | null; }

interface BookingFormState {
    rideType: 'private' | 'shared' | null;
    childId: string | null;
    tripType: 'round-trip' | 'morning' | 'afternoon';
    subscription: 'monthly' | 'quarterly' | 'semi_annually';
}

interface RideService {
    ride_id: string;
    ride_type: 'private' | 'shared';
    status: string;
    title: string;
    school_name: string;
    driver_name: string | null;
    driver_photo_url: string | null;
    child_photo_url: string | null;
}

const ParentScreen = () => {
    const router = useRouter();
    const user = auth()?.currentUser;
    const { userLatitude, userLongitude, destinationLatitude, destinationLongitude, destinationAddress } = useLocationStore();

    // --- (Keep existing state variables) ---
    const [rides, setRides] = useState<RideService[]>([]);
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingState, setBookingState] = useState<BookingFormState>({ rideType: null, childId: null, tripType: 'round-trip', subscription: 'monthly' });
    const [distance, setDistance] = useState<number | null>(null);
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [isBooking, setIsBooking] = useState(false);

  // --- NEW STATE for Manual Payment Flow ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentBookingInfo, setCurrentBookingInfo] = useState({ rideId: '', amount: 0, reference: '' });
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

   // --- NEW STATE for child selection and modal ---
    const [selectedPrivateChildIds, setSelectedPrivateChildIds] = useState<Set<string>>(new Set());
    const [showAddChildModal, setShowAddChildModal] = useState(false);

    const [newChildName, setNewChildName] = useState('');
    const [newChildSchool, setNewChildSchool] = useState('');
    const [newChildPhotoUri, setNewChildPhotoUri] = useState<string | null>(null); // For the local image URI
    const [isAddingChild, setIsAddingChild] = useState(false);

// In parent-screen.tsx, add these new handler functions

    // Adapted from your provided code to handle child image picking
    const handleImagePickerForChild = async () => {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
            Alert.alert("Permission required", "Please allow access to your photos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setNewChildPhotoUri(result.assets[0].uri);
        }
    };

    // Adapted from your provided code to upload the image and return the URL
    const uploadImageToCloudinaryForChild = async (imageUri: string): Promise<string | null> => {
        try {
            const data = new FormData();
            data.append("file", { uri: imageUri, type: "image/jpeg", name: "child_profile.jpg" } as any);
            data.append("upload_preset", UPLOAD_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data,
            });
            const json = await res.json();
            return json.secure_url || null;
        } catch (err) {
            console.error("Cloudinary Upload failed:", err);
            return null;
        }
    };

    // The main handler that brings it all together
    const handleAddNewChild = async () => {
        if (!newChildName.trim() || !newChildSchool.trim()) {
            Alert.alert("Missing Information", "Please enter the child's full name and school name.");
            return;
        }
        setIsAddingChild(true);
        
        let uploadedPhotoUrl = null;
        try {
            // Step 1: Upload photo if one was selected
            if (newChildPhotoUri) {
                uploadedPhotoUrl = await uploadImageToCloudinaryForChild(newChildPhotoUri);
                if (!uploadedPhotoUrl) {
                    Alert.alert("Upload Failed", "Could not upload the child's photo. Please try again.");
                    setIsAddingChild(false);
                    return;
                }
            }
            
            // Step 2: Send all data to your backend to create the child
            const response = await axios.post(`${API_BASE_URL}/children`, {
                parentId: user.uid,
                name: newChildName,
                schoolName: newChildSchool,
                photoUrl: uploadedPhotoUrl,
            });
            const newChild = response.data.child;

            // Step 3: Auto-select the newly added child in the form
            if (bookingState.rideType === 'private') {
                handleTogglePrivateChild(newChild.id);
            } else {
                setBookingState(prev => ({ ...prev, childId: newChild.id }));
            }
            
            setShowAddChildModal(false);

        } catch (error) {
            Alert.alert("Error", "Could not add your child. Please try again.");
        } finally {
            // Step 4: Refresh the children list to show the new child in the form
            // This is the key to the good UX you mentioned!
            await fetchChildren(); 
            // Reset the form state
            setNewChildName('');
            setNewChildSchool('');
            setNewChildPhotoUri(null);
            setIsAddingChild(false);
        }
    };
 useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user]);

    const fetchInitialData = async () => {
        setLoading(true);
        // Using Promise.all to fetch rides and children concurrently
        await Promise.all([fetchRideServices(), fetchChildren()]);
        setLoading(false);
    };

    // RENAMED & MODIFIED: The main data fetching function
    const fetchRideServices = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Use the new, correct endpoint
            const response = await axios.get(`${API_BASE_URL}/parent-dashboard/${user.uid}`);
            console.log("response.data", response.data)
            setRides(response.data);
        } catch (error) {
            console.error("Failed to fetch ride services:", error);
            Alert.alert("Error", "Could not load your ride data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };
      const fetchChildren = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/children/parent/${user.uid}`);
            setChildren(response.data);
        } catch (error) {
            console.error("Failed to fetch children:", error);
            // Don't show an alert here as it can be disruptive.
            // The form will simply show "No children found."
        }
    };

    // --- Price Calculation Logic ---
    useEffect(() => {
        const calculateDistance = async () => {
            if (userLatitude && userLongitude && destinationLatitude && destinationLongitude) {
                const { distance: calculatedDistance } = await fetchDistanceAndTime(
                    userLatitude, userLongitude, destinationLatitude, destinationLongitude
                );
                setDistance(calculatedDistance);
            }
        };
        calculateDistance();
    }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);
    
    useEffect(() => {
        if (!distance || !bookingState.rideType) {
            setEstimatedPrice(null);
            return;
        }

        // Pricing constants (in a real app, fetch these from the backend)
        const PRICE_PER_KM_SHARED = 15; // ETB per km for shared
        const PRICE_PER_KM_PRIVATE = 40; // ETB per km for private
        const MONTHLY_BUSINESS_DAYS = 22;

        const basePricePerKm = bookingState.rideType === 'private' ? PRICE_PER_KM_PRIVATE : PRICE_PER_KM_SHARED;
        const subOption = SUBSCRIPTION_OPTIONS.find(opt => opt.value === bookingState.subscription);
        const tripOption = TRIP_TYPE_OPTIONS.private.find(opt => opt.value === bookingState.tripType);
        
        if (!subOption) return;

        let total = basePricePerKm * distance/1000 * MONTHLY_BUSINESS_DAYS;

        // Apply trip type multiplier for private rides
        if (bookingState.rideType === 'private' && tripOption) {
            total *= tripOption.multiplier;
        }

        // Apply subscription discount and duration
        total = total * subOption.durationMonths * (1 - subOption.discount);

        setEstimatedPrice(Math.round(total));

    }, [distance, bookingState]);


    // --- Event Handlers ---
    const handleSelectRideType = (rideType: 'private' | 'shared') => {
        setBookingState(prev => ({ ...prev, rideType, childId: rideType === 'shared' ? children[0]?.id : null }));
    };

// --- MODIFIED: Handles multi-select for private rides ---
    const handleTogglePrivateChild = (childId: string) => {
        const newSelection = new Set(selectedPrivateChildIds);
        if (newSelection.has(childId)) {
            newSelection.delete(childId);
        } else {
            newSelection.add(childId);
        }
        setSelectedPrivateChildIds(newSelection);
    };

    const handleBookingSubmit = async () => {
        if (!user || !bookingState.rideType || !destinationAddress) {
            Alert.alert("Missing Information", "Please select a ride type and set a school location.");
            return;
        }
               if (bookingState.rideType === 'private' && selectedPrivateChildIds.size === 0) {
            Alert.alert("Missing Information", "Please select at least one child for the private ride.");
            return;
        }
        if (bookingState.rideType === 'shared' && !bookingState.childId) {
            Alert.alert("Missing Information", "Please select which child this shared ride is for.");
            return;
        }

        setIsBooking(true);
        try {
            const payload = {
                userId: user.uid,
                username: user.displayName,
                phone: user.phoneNumber,
                rideType: bookingState.rideType,
                 // Conditionally add the correct child ID property
                ...(bookingState.rideType === 'shared' && { childId: bookingState.childId }),
                ...(bookingState.rideType === 'private' && { childIds: Array.from(selectedPrivateChildIds) }),
                childId: bookingState.rideType === 'shared' ? bookingState.childId : null,
                subscriptionType: bookingState.subscription,
                tripType: bookingState.rideType === 'private' ? bookingState.tripType : null,
                pickup_address: useLocationStore.getState().userAddress, // Assuming you store this
                dropoff_address: destinationAddress,
                pickup_lat: userLatitude,
                pickup_lng: userLongitude,
                dropoff_lat: destinationLatitude,
                dropoff_lng: destinationLongitude,
                estimatedPriceFront: estimatedPrice
            };
// Backend now returns info needed for the payment modal
            const response = await axios.post(`${API_BASE_URL}/school-rides/book`, payload);
            const { rideId, referenceId, amountDue } = response.data;
            
            setCurrentBookingInfo({ rideId, amount: amountDue, reference: referenceId });
            setShowBookingModal(false); // Close the booking modal
            setShowPaymentModal(true);  // Open the new payment instruction modal
       } catch (error) {
            console.error("Booking failed:", error);
            Alert.alert("Booking Failed", "We couldn't process your request.");
        } finally {
            setIsBooking(false);
        }
    };

       // --- NEW Handlers for Image Picking and Uploading ---
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setReceiptImage(result.assets[0].uri);
        }
    };

    const handleUploadReceipt = async () => {
        if (!receiptImage) {
            Alert.alert("No Image", "Please select an image of your payment receipt first.");
            return;
        }
        setIsUploading(true);
        try {
            // In a real app, you would upload to a service like Cloudinary first.
            // For simplicity, we'll pretend the URI is a public URL. In reality,
            // you'd get a URL from your upload service and send that.
            // const cloudinaryUrl = await uploadToCloudinary(receiptImage); 
            const cloudinaryUrl = "https://placeholder.url/receipt.jpg"; // Placeholder

            await axios.post(`${API_BASE_URL}/rides/${currentBookingInfo.rideId}/upload-receipt`, { 
                imageUrl: cloudinaryUrl 
            });

            Alert.alert("Receipt Uploaded", "Thank you! We will verify your payment and activate your ride within 24 hours.");
            setShowPaymentModal(false);
            setReceiptImage(null);

        } catch (error) {
            console.error("Receipt upload failed:", error);
            Alert.alert("Upload Failed", "Could not upload your receipt. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // --- UI Rendering ---
    const renderChildCard = ({ item }: { item: Child }) => (
      <TouchableOpacity
        style={styles.childCard}
        onPress={() => router.push({ pathname: 'school-ride-details', params: { childId: item.id } })}
        disabled={item.ride_status !== 'Active'}
      >
        <Image
          source={{ uri: item.driver_photo_url || 'https://placehold.co/100x100/gray/white?text=Kid' }}
          style={styles.childAvatar}
        />
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.schoolName}>{item.school_name}</Text>
          {item.ride_status === 'Active' && <Text style={styles.rideStatusActive}>Ride Active with {item.driver_name}</Text>}
          {item.ride_status === 'Inactive' && <Text style={styles.rideStatusInactive}>No Active Ride</Text>}
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.textMedium} />
      </TouchableOpacity>
    );
    
   // RENAMED & MODIFIED: This function now renders a "Ride Card" for either private or shared rides
    const renderRideCard = ({ item }: { item: RideService }) => (
      <TouchableOpacity
        style={styles.childCard}
        onPress={() => router.push({ pathname: 'school-ride-details', params: { rideId: item.ride_id } })}
        // You might want to disable navigation for pending payment rides
        disabled={item.status.startsWith('pending')}
      >
        <Image
          // Use the child's photo for shared, or a generic icon for private
          source={{ uri: item.child_photo_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/641/880/small_2x/illustration-of-high-school-building-school-building-free-vector.jpg' }}
          style={styles.childAvatar}
        />
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.title}</Text>
          <Text style={styles.schoolName}>{item.school_name}</Text>
          {/* A more detailed status display */}
          <Text style={[styles.rideStatus, styles[item.status]]}>
            Status: {item.status.replace('_', ' ').toUpperCase()}
          </Text>
          {item.driver_name && <Text style={styles.driverText}>Driver: {item.driver_name}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.textMedium} />
      </TouchableOpacity>
    );

    const renderBookingForm = () => (
        <View style={styles.formContainer}>
        {bookingState.rideType === 'shared' && (
                <>
                    <Text style={styles.formLabel}>Which child is this for?</Text>
                    {children.map(child => (
                        <TouchableOpacity 
                            key={child.id}
                            style={styles.childSelectItem}
                            onPress={() => setBookingState(prev => ({...prev, childId: child.id}))}
                        >
                            <Ionicons 
                                name={bookingState.childId === child.id ? 'radio-button-on' : 'radio-button-off'}
                                size={24} color={Colors.secondaryTeal} />
                            <Text style={styles.childSelectText}>{child.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.addChildButton} onPress={() => setShowAddChildModal(true)}>
                        <Ionicons name="add-circle-outline" size={20} color={Colors.primaryOrange} />
                        <Text style={styles.addChildButtonText}>Add a New Child</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* --- UI FOR PRIVATE RIDES --- */}
            {bookingState.rideType === 'private' && (
                 <>
                    <Text style={styles.formLabel}>Which children will be on this ride?</Text>
                    {children.map(child => (
                        <TouchableOpacity 
                            key={child.id}
                            style={styles.childSelectItem}
                            onPress={() => handleTogglePrivateChild(child.id)}
                        >
                            <Ionicons 
                                name={selectedPrivateChildIds.has(child.id) ? 'checkbox' : 'square-outline'}
                                size={24} color={Colors.secondaryTeal} />
                            <Text style={styles.childSelectText}>{child.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.addChildButton} onPress={() => setShowAddChildModal(true)}>
                        <Ionicons name="add-circle-outline" size={20} color={Colors.primaryOrange} />
                        <Text style={styles.addChildButtonText}>Add a New Child for this Ride</Text>
                    </TouchableOpacity>
                </>
            )}


            {/* Subscription Period for All Rides */}
            <Text style={styles.formLabel}>Select Subscription Period</Text>
             <View style={styles.optionGroup}>
            {SUBSCRIPTION_OPTIONS.map(opt => (
                <TouchableOpacity 
                    key={opt.value}
                    style={[styles.optionButton, bookingState.subscription === opt.value && styles.optionButtonSelected]}
                    onPress={() => setBookingState(prev => ({...prev, subscription: opt.value as any}))}
                >
                    <Text style={[styles.optionButtonText, bookingState.subscription === opt.value && styles.optionButtonTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
            ))}
            </View>
            
            {/* Price Estimate */}
            <View style={styles.priceEstimateContainer}>
                <Text style={styles.priceEstimateLabel}>Estimated Price:</Text>
                <Text style={styles.priceEstimateValue}>
                    {estimatedPrice !== null ? `ETB ${estimatedPrice.toLocaleString()}` : 'Calculating...'}
                </Text>
            </View>
            
            <TouchableOpacity style={styles.confirmButton} onPress={handleBookingSubmit} disabled={isBooking || !estimatedPrice}>
                {isBooking ? <ActivityIndicator color={Colors.backgroundWhite} /> : <Text style={styles.confirmButtonText}>Confirm Booking</Text>}
            </TouchableOpacity>

        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          
          <View style={styles.header}>
            <Text style={styles.title}>My Children's Rides</Text>
            <TouchableOpacity style={styles.newRideButton} onPress={() => setShowBookingModal(true)}>
              <Ionicons name="add" size={24} color={Colors.backgroundWhite} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primaryOrange} style={{ marginTop: 50 }}/>
          ) : (
  <FlatList
              data={rides}
              renderItem={renderRideCard}
              keyExtractor={item => item.ride_id}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  {/* MODIFIED: More generic empty message */}
                  <Text style={styles.emptyListText}>You have no active or pending school rides.</Text>
                  <TouchableOpacity style={styles.newRideButtonWide} onPress={() => setShowBookingModal(true)}>
                    <Text style={styles.newRideButtonText}>Book Your First Ride</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
          
          <Modal visible={showBookingModal} animationType="slide" onRequestClose={() => setShowBookingModal(false)}>
            <SafeAreaView style={styles.bookingModalContainer}>
             <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
              <View style={styles.bookingModalHeader}>
                <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                  <Ionicons name="close" size={30} color={Colors.textMedium} />
                </TouchableOpacity>
                <Text style={styles.bookingModalTitle}>Order School Ride</Text>
              </View>
              
              <View style={styles.locationInputContainer}>
                <CustomGooglePlacesInput type="pickup" placeholder="Enter your home pickup location"/>
              </View>

              <FlatList
                data={SCHOOL_RIDE_OPTIONS}
                keyExtractor={item => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.rideOptionCard, bookingState.rideType === item.key && styles.rideOptionCardSelected]}
                    onPress={() => handleSelectRideType(item.key as 'private' | 'shared')}
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
                )}
              />
              {bookingState.rideType && renderBookingForm()}
              </ScrollView>
            </SafeAreaView>
          </Modal>
           <Modal visible={showPaymentModal} transparent={true} animationType="slide">
                <View style={styles.paymentModalOverlay}>
                    <View style={styles.paymentModalContent}>
                        <Text style={styles.modalTitle}>Payment Instructions</Text>
                        <Text style={styles.paymentText}>Please transfer the exact amount to one of the accounts below.</Text>
                        
                        <View style={styles.bankInfo}>
                            <Text style={styles.bankName}>Commercial Bank of Ethiopia</Text>
                            <Text style={styles.accountDetail}>Account: 1000123456789</Text>
                            <Text style={styles.accountDetail}>Name: Nebulon Technologies PLC</Text>
                        </View>
                        
                        <View style={styles.paymentDetails}>
                            <Text>Amount Due: <Text style={{fontWeight: 'bold'}}>{currentBookingInfo.amount} ETB</Text></Text>
                            <Text>Reference ID: <Text style={{fontWeight: 'bold'}}>{currentBookingInfo.reference}</Text></Text>
                        </View>
                        <Text style={styles.paymentWarning}>IMPORTANT: You must include the Reference ID in your bank transfer's "reason" (description) field.</Text>

                        <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                            <Ionicons name="image-outline" size={20} color={Colors.secondaryTeal} />
                            <Text style={styles.pickImageButtonText}>{receiptImage ? "Change Receipt Image" : "Select Receipt Image"}</Text>
                        </TouchableOpacity>

                        {receiptImage && <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />}
                        
                        <TouchableOpacity style={styles.confirmButton} onPress={handleUploadReceipt} disabled={isUploading}>
                           {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Upload and Finish</Text>}
                        </TouchableOpacity>

                         <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                            <Text style={styles.closeButton}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- NEW: "Add Child" Modal --- */}
             <Modal
                animationType="fade"
                transparent={true}
                visible={showAddChildModal}
                onRequestClose={() => setShowAddChildModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Child</Text>
                        
                        <TouchableOpacity style={styles.imagePicker} onPress={handleImagePickerForChild}>
                            {newChildPhotoUri ? (
                                <Image source={{ uri: newChildPhotoUri }} style={styles.childPhotoPreview} />
                            ) : (
                                <View style={styles.imagePickerPlaceholder}>
                                    <Ionicons name="camera" size={32} color={Colors.textLight} />
                                    <Text style={styles.imagePickerText}>Add Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TextInput
                            style={styles.input}
                            placeholder="Child's Full Name"
                            value={newChildName}
                            onChangeText={setNewChildName}
                            placeholderTextColor={Colors.textLight}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="School Name"
                            value={newChildSchool}
                            onChangeText={setNewChildSchool}
                            placeholderTextColor={Colors.textLight}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.buttonClose} onPress={() => setShowAddChildModal(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.buttonConfirm} onPress={handleAddNewChild} disabled={isAddingChild}>
                                {isAddingChild ? <ActivityIndicator color="#fff"/> : <Text style={{color: 'white'}}>Save Child</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// --- Styles --- (Keep your existing styles, but add these new ones)
const styles = StyleSheet.create({
    // ... (your existing styles for container, header, childCard, etc.)
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLightGray,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.backgroundWhite,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textDark,
    },
    newRideButton: {
        backgroundColor: Colors.secondaryTeal,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    childCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundWhite,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: Colors.textDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    childAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
        backgroundColor: Colors.backgroundLightGray,
    },
    childInfo: {
        flex: 1,
    },
    childName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textDark,
    },
    schoolName: {
        fontSize: 14,
        color: Colors.textMedium,
    },
    rideStatusActive: {
        fontSize: 14,
        color: Colors.successGreen,
        fontWeight: 'bold',
    },
    rideStatusInactive: {
        fontSize: 14,
        color: Colors.textLight,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
        paddingHorizontal: 20,
    },
    emptyListText: {
        fontSize: 16,
        color: Colors.textMedium,
        textAlign: 'center',
        marginBottom: 20,
    },
    newRideButtonWide: {
        backgroundColor: Colors.primaryOrange,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    newRideButtonText: {
        color: Colors.backgroundWhite,
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookingModalContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundLightGray,
    },
    bookingModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.backgroundWhite,
    },
    bookingModalTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textDark,
        marginRight: 30,
    },
    locationInputContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        zIndex: 10, // Ensure dropdowns appear over content
    },
    rideOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundWhite,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: Colors.textDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    rideOptionCardSelected: {
        borderColor: Colors.successGreen,
    },
    rideOptionIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rideOptionDetails: {
        flex: 1,
    },
    rideOptionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textDark,
    },
    rideOptionDescription: {
        fontSize: 14,
        color: Colors.textMedium,
    },
    childSelectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    childSelectText: {
        marginLeft: 15,
        fontSize: 16,
        color: Colors.textDark,
    },
    addChildButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        marginTop: 10,
    },
    addChildButtonText: {
        marginLeft: 8,
        color: Colors.primaryOrange,
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Styles for the new modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: Colors.borderLight,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buttonClose: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        backgroundColor: Colors.borderLight,
    },
    buttonConfirm: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        backgroundColor: Colors.secondaryTeal,
    },
    formContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        marginTop: 10,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textDark,
        marginBottom: 10,
        marginTop: 10,
    },
    optionGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionButton: {
        backgroundColor: Colors.backgroundWhite,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    optionButtonSelected: {
        backgroundColor: Colors.secondaryTeal,
        borderColor: Colors.secondaryTeal,
    },
    optionButtonText: {
        color: Colors.textDark,
        fontWeight: '500',
    },
    optionButtonTextSelected: {
        color: Colors.backgroundWhite,
    },
    priceEstimateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.backgroundWhite,
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    priceEstimateLabel: {
        fontSize: 18,
        fontWeight: '500',
        color: Colors.textMedium,
    },
    priceEstimateValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textDark,
    },
    confirmButton: {
        backgroundColor: Colors.primaryOrange,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    confirmButtonText: {
        color: Colors.backgroundWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
     paymentModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    paymentModalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    paymentText: {
        textAlign: 'center',
        marginBottom: 15,
        color: Colors.textMedium,
    },
    bankInfo: {
        width: '100%',
        padding: 15,
        backgroundColor: Colors.backgroundLightGray,
        borderRadius: 10,
        marginBottom: 15,
    },
    bankName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    accountDetail: {
        fontSize: 14,
        marginTop: 4,
    },
    paymentDetails: {
        width: '100%',
        marginBottom: 15,
        alignItems: 'center',
    },
    paymentWarning: {
        textAlign: 'center',
        color: Colors.warningRed,
        fontWeight: '500',
        marginBottom: 20,
    },
    pickImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F7FA',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginBottom: 15,
    },
    pickImageButtonText: {
        marginLeft: 10,
        color: Colors.secondaryTeal,
        fontWeight: 'bold',
    },
    receiptPreview: {
        width: 150,
        height: 100,
        borderRadius: 8,
        marginBottom: 20,
        resizeMode: 'contain',
    },
    closeButton: {
        marginTop: 15,
        color: Colors.textLight,
        fontSize: 16,
    }
});

export default ParentScreen;