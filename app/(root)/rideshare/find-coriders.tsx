import { router } from "expo-router";
import { Text, View, StyleSheet, ScrollView, Modal, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import CustomButton from "@/components/CustomButton";
//import GoogleTextInput from "@/components/GoogleTextInput";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { useLocationStore, useRideStore, useStore } from "@/store";
import { findMatchingCoriders} from "@/lib/utils";

import {modalStyles} from "@/lib/styles";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import firestore from '@react-native-firebase/firestore'; // RNF Firestore
import auth from '@react-native-firebase/auth'

//import { getFirestore, doc, collection, getDoc, updateDoc, setDoc, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";


const FindCoriders = () => {
  const user = auth().currentUser;
  const userId = user.uid;

  const { setRideRequestIdZus, clearRideRequestIdZus } = useRideStore();
  const { userAddress, destinationAddress, setUserLocation,  userLatitude, userLongitude, destinationLatitude, destinationLongitude, } = useLocationStore();
    const { setGroupArr } = useStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoRider, setSelectedCoRider] = useState(null);
console.log(
  "destinationLatitude, destinationLongitude, destinationAddress",
  destinationLatitude,
  destinationLongitude,
  destinationAddress
);

console.log(
  "userLatitude, userLongitude, userAddress",
  userLatitude,
  userLongitude,
  userAddress
);
  const openCoRiderProfile = (coRider) => {
    setSelectedCoRider(coRider);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedCoRider(null);
    setModalVisible(false);
  };


  const userLocation = { latitude: 7, longitude: 37 };
  userLocation.longitude = 39;

  const { latitude, longitude } = useLocalSearchParams(); // Get destination from searchParams
  const destinationLocation = { latitude, longitude };

  const [group, setGroup] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFindRide = async (userLatitude, userLongitude, destinationLatitude, destinationLongitude) => {
    setLoading(true);
    setError(null);

try {
    const coRiderRequest = {
      userId,
      origin: [userLatitude, userLongitude],
      destination: [destinationLatitude, destinationLongitude],
      requestTime:firestore.FieldValue.serverTimestamp(),
      maxCoRiders: 3, // e.g., wants 3 co-riders
    };
    
    const docRef = await addDoc(collection(firestore(), 'corider-requests'), coRiderRequest);
    console.log('Co-rider request created with ID: ', docRef.id);
  }catch (e) {
    console.error('Error adding co-rider request: ', e);  
       setError("Unable to find co-riders. Please try again.");
  } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Ensure latitude and longitude exist before calling handleFindRide
    if (userLatitude && userLongitude) {
      handleFindRide(
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude
      );
    }
  }, [latitude, longitude]); // Add dependencies to avoid multiple calls

 


  return (
    <>
      <View style={modalStyles.container}>
        <Text className="text-xl font-JakartaBold mt-1">Your Co-riders</Text>
        {group.length > 0 ? (
          <View style={modalStyles.groupContainer}>
            <Text className="text-xl font-Jakarta mb-2">Matched Co-Riders</Text>
            {group.map((corider, index) => (
              <TouchableOpacity
                key={corider.id || index} // Preferably use a unique identifier
                onPress={() => openCoRiderProfile(corider)}
              >
                <View style={styles.coriderCard}>
                  <Text className="text-xl font-JakartaBold ">
                    {corider.name}
                  </Text>
                  <Text className="text-sm font-Jakarta">
                    Rating: {corider.rating}/5 ⭐ |  • View Profile •
                  </Text>
                  {/* <Text className="text-sm font-Jakarta">• View Profile •</Text> */}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text>No co-riders found yet.</Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <CustomButton
          title="Confirm Group"
          onPress={handleFindRide}
          style={styles.confirmButton}
          disabled={group.length === 0}
        />
        <CustomButton
          title="Change Group"
          onPress={handleFindRide}
          style={styles.changeButton}
        />
      </View>
      {/* Co-Rider Profile Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            {selectedCoRider && (
              <>
                <Text style={modalStyles.modalTitle}>
                  {selectedCoRider.name}'s Profile
                </Text>
                <Text style={modalStyles.modalRating}>
                  Rating: {selectedCoRider.rating}/5 ⭐
                </Text>
                <Text style={modalStyles.modalCommentsHeading}>
                  Recent comments by co-riders:
                </Text>
                {selectedCoRider.comments &&
                selectedCoRider.comments.length > 0 ? (
                  selectedCoRider.comments.slice(-3).map((comment, idx) => (
                    <Text key={idx} style={modalStyles.modalComment}>
                      • {comment}
                    </Text>
                  ))
                ) : (
                  <Text style={modalStyles.modalNoComments}>
                    No comments available.
                  </Text>
                )}
                <TouchableOpacity
                  onPress={closeModal}
                  style={modalStyles.modalCloseButton}
                >
                  <Text style={modalStyles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  coriderCard: {
    backgroundColor: "#ebfbeb",
    padding: 5,
    paddingLeft: 12,
    paddingBottom: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  errorText: {
    color: "red",
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: "#209876",
    padding: 16,
    borderRadius: 8,
  },
  changeButton: {
    backgroundColor: "#000e3a",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
});

export default FindCoriders;

  // const adjustDestinationToMainRoad = async (address) => {
  //   try {
  //     const response = await (address); // Fetch from Google API to adjust to main road
  //     return response.adjustedLocation; // Return adjusted location (main road)
  //   } catch (error) {
  //     console.error("Error adjusting to main road:", error);
  //     throw error;
  //   }
  // };


  