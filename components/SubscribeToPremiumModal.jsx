// src/components/SubscribeToPremiumModal.js
import React, { useState, useEffect, useContext } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { usePhoneNumberStore, useShareUsernameStore } from "@/store";
import { Share, Linking } from 'react-native';
import { handleProcessPayment} from "@/lib/utils";

const SubscribeToPremiumModal = ({ visible, onClose, onSubscribeSuccess, santimPayPrice }) => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const user = auth()?.currentUser;
    const userId = user?.uid;
    const [loading, setLoading] = useState(false);
  const { shareUsername } = useShareUsernameStore();
const { phoneNumberStore} =  usePhoneNumberStore() 

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            // This will trigger the SantimPay flow on the backend
            // The backend will then communicate with SantimPay and update user status
 const res = await fetch(`https://app.share-rides.com/api/users/${userId}/balance`);
  const data = await res.json();
  console.log("balance", data.balance); 
   if(data.balance < 99){
handleProcessPayment(150, phoneNumberStore, shareUsername)
    return
   }

     const response = await axios.post(`${API_BASE_URL}/api/subscriptions/applicant-premium`,
            {
                userId, // request body (JSON)
            },
            {
                headers: {
                    Authorization: `Bearer YOUR_AUTH_TOKEN`, // optional
                    'Content-Type': 'application/json'
                }
            }
        );

            Alert.alert('Success', response.data.message);
            onSubscribeSuccess(); // Notify parent component
        } catch (error) {
            console.error('Subscription error:', error.response?.data || error.message);
            Alert.alert('Subscription Failed', error.response?.data?.message || 'Could not process subscription. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Unlock Freelance Applications</Text>
                    <Text style={styles.modalText}>
                        To apply for unlimited freelance jobs and gain special perks,
                        subscribe to <Text style={styles.highlightText}>Share/Yegara Freelancer Premium</Text>!
                    </Text>
                    <Text style={styles.priceText}>Price: {santimPayPrice} ETB</Text>
                    <Text style={styles.perksTitle}>Premium Perks:</Text>
                    <Text style={styles.perkItem}>• Unlimited freelance job applications</Text>
                    <Text style={styles.perkItem}>• Enhanced profile visibility (future feature)</Text>
                    <Text style={styles.perkItem}>• Access to premium resources (future feature)</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 15 }} />
                    ) : (
                        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
                            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Not now</Text>
                    </TouchableOpacity>
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
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '85%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 10,
    },
    highlightText: {
        fontWeight: 'bold',
        color: '#007bff',
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
        marginBottom: 20,
    },
    perksTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        alignSelf: 'flex-start',
        color: '#333',
    },
    perkItem: {
        fontSize: 15,
        color: '#666',
        alignSelf: 'flex-start',
        marginBottom: 5,
    },
    subscribeButton: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    subscribeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: 15,
        padding: 10,
    },
    closeButtonText: {
        color: '#888',
        fontSize: 16,
    },
});

export default SubscribeToPremiumModal;