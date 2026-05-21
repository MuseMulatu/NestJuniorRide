import React, { useState } from 'react';
import { Modal, Text, View, TouchableOpacity, FlatList } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from "expo-router";

const CancelRideModal = ({ visible, onClose, rideRequestId }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const reasons = ["Changed my mind", "Driver taking too long", "Driver asked me to cancel", "Found another ride", "Other"];

  const handleCancelRide = async (reason) => {
    await firestore()
      .collection('requests')
      .doc(rideRequestId)
      .update({
        status: 'cancelled',
        cancellationReason: reason,
      });
      router.push('/(root)/(tabs)/home')
    onClose(); // Close the modal after cancellation
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cancel Ride</Text>
          <Text style={styles.modalSubTitle}>Please select a reason for cancellation:</Text>

          <FlatList
            data={reasons}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.reasonButton} onPress={() => handleCancelRide(item)}>
                <Text style={styles.reasonText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: "mon",
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubTitle: {
       fontFamily: "mon",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  reasonButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  reasonText: {
    fontFamily: "mon",
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#ff5757',
    padding: 10,
    marginTop: 20,
    fontFamily: "mon-sb",
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
};

export default CancelRideModal;
