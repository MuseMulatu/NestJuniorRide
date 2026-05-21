// app/(root)/affiliates.jsx (or .tsx if you prefer TypeScript)

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';

const API_BASE_URL = 'https://app.share-rides.com/api'; // Ensure your API base URL is correct

const AffiliatesScreen = () => {
  const router = useRouter();
  const user = auth().currentUser;
  const userId = user?.uid;

  const [recommendedCount, setRecommendedCount] = useState(0);
  const [affiliateBalance, setAffiliateBalance] = useState(0); // This is the withdrawable amount
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Withdrawal form states
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  useEffect(() => {
    fetchAffiliateData();
  }, [userId]);

  const fetchAffiliateData = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/affiliate-data`, { // New backend endpoint
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch affiliate data.');
      }
      setRecommendedCount(data.recommended_count);
      setAffiliateBalance(parseFloat(data.affiliate_balance));
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      Alert.alert('Error', error.message || 'Failed to load affiliate data.');
    } finally {
      setIsLoading(false);
    }
  };

  const getWithdrawalRateInfo = () => {
    if (recommendedCount < 100) {
      return "1 ETB per person (for total recommendations below 100)";
    } else {
      return "5 ETB per person (for total recommendations 100 or more)";
    }
  };

  // Calculate potential earnings based on current recommendations (for display, not withdrawable balance)
  const getPotentialEarningsOnRate = (count) => {
    if (count < 10) return 0; // No earnings below 10 for display purposes
    if (count < 100) return count * 1;
    return count * 5;
  };


  const handleOpenWithdrawalModal = () => {
    if (recommendedCount < 10) {
      Alert.alert('Withdrawal Not Available', 'You need at least 10 recommendations to withdraw.');
      return;
    }
    if (affiliateBalance <= 0) {
      Alert.alert('No Withdrawable Amount', 'Your current affiliate balance is 0 ETB.');
      return;
    }
    setShowWithdrawalModal(true);
  };

  const handleSubmitWithdrawal = async () => {
    if (!bankName || !accountNumber || !accountHolderName) {
      Alert.alert('Missing Details', 'Please fill in all bank details.');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal Request',
      `You are requesting to withdraw ${affiliateBalance.toFixed(2)} ETB.\n\nWithdrawal rates:\n- 1 ETB/person for < 100 recommendations.\n- 5 ETB/person for >= 100 recommendations.\n\nPlease ensure your details are correct. Withdrawals are processed manually.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowWithdrawalModal(false) },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsWithdrawing(true);
            try {
              const response = await fetch(`${API_BASE_URL}/affiliates/withdraw`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-Id': userId,
                },
                body: JSON.stringify({ userId: userId, bankName, accountNumber, accountHolderName }),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.message || 'Withdrawal failed.');
              }
              Alert.alert('Success', data.message);
              setShowWithdrawalModal(false);
              fetchAffiliateData(); // Refresh data after withdrawal
            } catch (error) {
              console.error('Withdrawal error:', error);
              Alert.alert('Withdrawal Failed', error.message || 'An error occurred during withdrawal.');
            } finally {
              setIsWithdrawing(false);
            }
          },
        },
      ]
    );
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading affiliate data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Affiliate Marketing' }} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Affiliate Performance</Text>
        <Text style={styles.infoText}>Users Recommended: <Text style={styles.highlightText}>{recommendedCount}</Text></Text>
        <Text style={styles.infoText}>Current Affiliate Balance: <Text style={styles.highlightText}>{affiliateBalance.toFixed(2)} ETB</Text></Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Withdrawal Information</Text>
        <Text style={styles.infoText}>
          You must recommend at least <Text style={styles.highlightText}>10 people</Text> to request a withdrawal.
        </Text>
        <Text style={styles.infoText}>
            Your current rate: <Text style={styles.highlightText}>{getWithdrawalRateInfo()}</Text>
        </Text>
        {recommendedCount < 100 && (
          <Text style={styles.infoText}>
            Next tier at <Text style={styles.highlightText}>100 recommendations!</Text>
          </Text>
        )}
        <Text style={styles.infoText}>
          Potential Earnings (based on current count): <Text style={styles.highlightText}>{getPotentialEarningsOnRate(recommendedCount).toFixed(2)} ETB</Text>
        </Text>

        <TouchableOpacity
          style={[styles.withdrawButton, (recommendedCount < 10 || affiliateBalance <= 0 || isWithdrawing) && styles.disabledButton]}
          onPress={handleOpenWithdrawalModal}
          disabled={recommendedCount < 10 || affiliateBalance <= 0 || isWithdrawing}
        >
          {isWithdrawing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Request Withdrawal</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Future Section for Commission Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Commission Details</Text>
        <Text style={styles.commissionText}>
          Earn commissions when your recommended users spend on the app (e.g., gaming events, job connects, rides).
          Structure for 20% commission on spending is prepared for future implementation.
        </Text>
      </View>

      {/* Withdrawal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showWithdrawalModal}
        onRequestClose={() => setShowWithdrawalModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Withdraw Affiliate Earnings</Text>
            <Text style={styles.modalInfo}>Amount to withdraw: <Text style={styles.highlightText}>{affiliateBalance.toFixed(2)} ETB</Text></Text>
            <Text style={styles.modalInfo}>Current rate: {getWithdrawalRateInfo()}</Text>
            <Text style={styles.modalInfoSmall}>Please provide your bank details. Withdrawals are processed manually by admin.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Bank Name"
              placeholderTextColor="#888"
              value={bankName}
              onChangeText={setBankName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Account Number"
              placeholderTextColor="#888"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Account Holder Name"
              placeholderTextColor="#888"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowWithdrawalModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, isWithdrawing && styles.disabledButton]}
                onPress={handleSubmitWithdrawal}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#4F46E5', // Indigo-600
  },
  withdrawButton: {
    backgroundColor: '#28A745', // Green
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7', // Lighter green for disabled
  },
  commissionText: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
  },
  // Modal Styles
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
    width: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalInfo: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalInfoSmall: {
    fontSize: 13,
    color: '#777',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#EF4444', // Red
  },
  modalButtonConfirm: {
    backgroundColor: '#4F46E5', // Indigo
  },
});

export default AffiliatesScreen;