// src/components/Events/EventDetailModal.jsx 
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, ScrollView } from 'react-native';
import axios from 'axios';
import { handleProcessPayment} from "@/lib/utils";
import { usePhoneNumberStore, useShareUsernameStore } from "@/store";

const EventDetailModal = ({ isVisible, onClose, event, userId, userBalance, fetchUserProfile }) => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const [loading, setLoading] = useState(false);
  const { shareUsername } = useShareUsernameStore();
const { phoneNumberStore} =  usePhoneNumberStore() 

    if (!event) return null; // Don't render if no event data

    const handleRegister = async () => {
        setLoading(true);
 if(userBalance < 699){
            Alert.alert(
                'Insufficient Balance',
                "You need to recharge your balance in order to register for this event.",
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Recharge Now',
                        onPress: () => {
                            handleProcessPayment(150, phoneNumberStore, shareUsername)
                        }
                    }
                ]
            );
    setLoading(false);
    return
   }
        try {
    const response = await axios.post( `${API_BASE_URL}/api/events/${event.id}/register`,
            {
                userId, // request body (JSON)
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

            Alert.alert('Success', response.data.message);
            onClose(); // Close modal on success
        } catch (error) {
            console.error('Event Registration Error:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || 'Failed to register for event.';

            if (error.response?.status === 402 && error.response.data.rechargeRequired) {
                Alert.alert(
                    'Insufficient Balance',
                    errorMessage,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Recharge Now',
                            onPress: () => {
                                handleProcessPayment(150, phoneNumberStore, shareUsername)
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Registration Failed', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // Check if user is already registered and paid (for UI display)
    // This requires `myRegisteredEvents` data to be passed or fetched inside this modal
    // For simplicity, we'll assume the parent `EventsScreen` updates its `myRegisteredEvents` and can pass a flag.
    // Or, you can fetch `api/events/:eventId/registration-status/:userId` inside this modal.
    const isRegisteredAndPaid = userBalance !== undefined && userBalance >= event.entry_fee; // Simplified check for demonstration

    // A better check would be to fetch this:
    // const [registrationStatus, setRegistrationStatus] = useState(null);
    // useEffect(() => {
    //     if (isVisible && userId && event) {
    //         axios.get(`${API_BASE_URL}/api/events/${event.id}/registration-status/${userId}`)
    //             .then(response => setRegistrationStatus(response.data))
    //             .catch(err => console.error("Error fetching registration status:", err));
    //     }
    // }, [isVisible, event, userId]);
    // const hasRegistered = registrationStatus?.registered && registrationStatus?.payment_status === 'completed';

    const hasRegistered = false; // Placeholder, integrate actual check as per comment above

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{event.name}</Text>
                    <ScrollView style={styles.detailsScrollView}>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Description:</Text> {event.description || 'No description provided.'}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Type:</Text> {event.event_type.toUpperCase()}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Entry Fee:</Text> {event.entry_fee === 0 ? 'Free' : `${event.entry_fee} Tokens`}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Participants:</Text> {event.current_registrations} / {event.max_participants || 'Unlimited'}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Min Participants:</Text> {event.min_participants}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Status:</Text> {event.status.replace('_', ' ').toUpperCase()}</Text>
                        {event.schedule_details && (
                            <>
                                <Text style={styles.detailLabel}>Schedule:</Text>
                                {event.schedule_details.schedule_type === 'one_time' && (
                                    <Text style={styles.detailText}>   Starts: {new Date(event.schedule_details.start_time).toLocaleString()}</Text>
                                )}
                                {event.schedule_details.schedule_type === 'recurring' && (
                                    <>
                                        <Text style={styles.detailText}>   Frequency: {event.schedule_details.frequency}</Text>
                                        <Text style={styles.detailText}>   Day: {event.schedule_details.day_of_week}</Text>
                                        <Text style={styles.detailText}>   Time: {event.schedule_details.time}</Text>
                                    </>
                                )}
                            </>
                        )}
                        <Text style={styles.currentBalance}>Your Balance: {userBalance !== undefined ? `${userBalance} Tokens` : 'Loading...'}</Text>
                    </ScrollView>

                    <View style={styles.buttonContainer}>
                        {hasRegistered ? (
                            <Text style={styles.registeredText}>You are already registered!</Text>
                        ) : (
                            <TouchableOpacity
                                style={styles.registerButton}
                                onPress={handleRegister}
                                disabled={loading || event.status !== 'upcoming' && event.status !== 'registration_open'}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.registerButtonText}>Register for {event.entry_fee === 0 ? 'Free' : `${event.entry_fee} Tokens`}</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        maxHeight: '80%', // Limit modal height
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    detailsScrollView: {
        maxHeight: '70%', // Allow scrolling for long descriptions/schedules
        marginBottom: 15,
    },
    detailText: {
        fontSize: 16,
        marginBottom: 8,
        color: '#555',
    },
    detailLabel: {
        fontWeight: 'bold',
        color: '#333',
    },
    currentBalance: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007bff',
        marginTop: 10,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'column',
        marginTop: 10,
        width: '100%',
    },
    registerButton: {
        backgroundColor: '#28a745', // Green
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    registerButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    registeredText: {
        fontSize: 16,
        color: '#007bff',
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#ccc',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#333',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default EventDetailModal;