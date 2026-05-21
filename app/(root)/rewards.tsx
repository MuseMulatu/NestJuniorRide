import { View,Text,Button,StyleSheet, ScrollView, Image,TouchableOpacity,TextInput, Alert} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import auth from '@react-native-firebase/auth';
import { useRouter} from "expo-router";
// import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import InputField from "@/components/InputField";
import firestore from '@react-native-firebase/firestore';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const Profile = () => {
  const user = auth().currentUser;
  const userId = user.uid
  const [loading, setLoading] = useState(true);

  const [convertAmount, setConvertAmount] = useState('');
const [conversionMessage, setConversionMessage] = useState('');

const fetchUserTrips = async (userId: string) => {
   const userDoc = await firestore().collection("riders").doc(userId).get();
   return userDoc.exists ? userDoc.data() : null;
};

const calculateRewards = (rideSummary) => {
   const weeklyReward = {
      silverTickets: rideSummary.weeklyTripsCount.count,
      goldTicket: rideSummary.monthlyTripsCount.count > 10,
   };
   let goldT = Math.floor((rideSummary.monthlyTripsCount.count)/10)
   const monthlyReward = {
      goldDrawEligible: weeklyReward.goldTicket,
      goldTicket: goldT
   };
   const cashbackAmount = rideSummary.cashback
   return { weeklyReward, monthlyReward, cashbackAmount};
};

   const [rideSummary, setRideSummary] = useState(null);
   const [rewards, setRewards] = useState(null);

const resetCountersIfNeeded = async (userId) => {
  const userDocRef = firestore().collection('riders').doc(userId);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) return;

  const rideSummary = userDoc.data()?.rideSummary;
  if (!rideSummary) return;

  const now = new Date();
  const firstDay = new Date(now);
  const dayOffset = now.getDay(); // Sunday is 0, Monday is 1, etc.
  firstDay.setDate(now.getDate() - dayOffset+1); // Move back to Sunday
  firstDay.setHours(0, 0, 0, 0); // Reset time to midnight

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const updates = {};
//console.log("firstDay", firstDay, dayOffset, new Date(now), "and now.getDate() is:", now.getDate()-dayOffset)
  // Check and reset weeklyTripsCount
console.log("rideSummary.monthlyTripsCount?.createdAt < firstOfMonth", rideSummary.monthlyTripsCount?.createdAt < firstOfMonth)  
  if (
    rideSummary.weeklyTripsCount?.createdAt < firstDay
  ) {
    updates['rideSummary.weeklyTripsCount'] = {
      createdAt: firestore.Timestamp.fromDate(now),
      count: 0,
    };
    updates['rideSummary.weeklyFareTotal'] = 0;
  }

  // Check and reset monthlyTripsCount
  if (
    rideSummary.monthlyTripsCount?.createdAt < firstOfMonth
  ) {
    updates['rideSummary.monthlyTripsCount'] = {
      createdAt: firestore.Timestamp.fromDate(now),
      count: 0,
    };
    updates['rideSummary.monthlyFareTotal'] = 0;
  }

  if (Object.keys(updates).length > 0) {
    await userDocRef.update(updates);
  }
};



useEffect(() => {
  const user = auth().currentUser;
  if (!user) return;

  const userId = user.uid;

  fetchUserTrips(userId).then((data) => {
    const rideData = data.rideSummary
    setRideSummary(rideData);
    setRewards(calculateRewards(rideData));
    // Reset counters if needed
    setLoading(false);
    resetCountersIfNeeded(userId);
  });
}, []);

const handleConversion = (availableCashback, amount) => {
    const amountToConvert = parseFloat(amount);
    if (isNaN(amountToConvert) || amountToConvert <= 0) {
        setConversionMessage("Please enter a valid amount.");
        return;
    }
    if (amountToConvert > availableCashback) {
        setConversionMessage("Insufficient cashback balance.");
        return;
    }

    // Process conversion logic (e.g., update backend, adjust balance)
    setRewards((prev) => ({
        ...prev,
        cashbackAmount: prev.cashbackAmount - amountToConvert,
    }));
    setConversionMessage(`Successfully converted ${amountToConvert} Birr to cash!`);
    setConvertAmount('');
};

 if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ fontFamily: 'mon-b', marginTop: 53 }} className="text-2xl mt-5 font-JakartaBold text-gray-600 text-center my-5">
          Loading your rewards...
        </Text>
      </View>
    );
  }

  if (!rewards) {
    return (
      <View style={styles.container}>
        <Text style={{ fontFamily: 'mon-b', marginTop: 53 }} className="text-2xl mt-5 font-JakartaBold text-red-700 text-center my-5">
          Your Awards!
        </Text>
        <View style={styles.section}>
          <Text className="font-JakartaSemiBold" style={styles.sectionTitle}>Weekly Rewards</Text>
          <View style={styles.rewardItem}>
            <Text className="font-Jakarta" style={styles.label}>Cashback</Text>
            <Text className="font-JakartaBold" style={styles.value}>- Birr</Text>
          </View>
          <View style={styles.rewardItem}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome name="money" size={24} color="silver" />
              <Text className="font-Jakarta ml-2" style={styles.label}>Silver Tickets</Text>
            </View>
            <Text className="font-JakartaBold" style={styles.value}>-</Text>
          </View>
          <View style={styles.specialBadge}>
            <Text style={styles.specialText}>Gold Ticket! Eligible for Monthly Draw</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text className="font-JakartaSemiBold" style={styles.sectionTitle}>Monthly Rewards</Text>
          <View style={styles.rewardItem}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome name="money" size={24} color="gold" />
              <Text className="font-Jakarta ml-2" style={styles.label}>Gold Ticket</Text>
            </View>
            <Text className="font-JakartaBold" style={styles.value}>-</Text>
          </View>
          <View style={styles.specialBadge}>
            <Text className="font-Jakarta" style={styles.specialText}>Eligible for Big Prize Monthly Draw</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={{ fontFamily: 'mon-b', marginTop: 53 }} className="text-2xl mt-5 font-JakartaBold text-red-700 text-center my-5">Your Awards!</Text>
      <View style={styles.section}>
        <Text className="font-JakartaSemiBold" style={styles.sectionTitle}>Weekly Rewards</Text>
        <View style={styles.rewardItem}>
          <Text className="font-Jakarta" style={styles.label}>Cashback</Text>
          <Text className="font-JakartaBold" style={styles.value}>{rewards.cashbackAmount} Birr</Text>
        </View>
        <View style={styles.rewardItem}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FontAwesome name="money" size={24} color="silver" />
            <Text className="font-Jakarta ml-2" style={styles.label}>Silver Tickets</Text>
          </View>
          <Text className="font-JakartaBold" style={styles.value}>{rewards.weeklyReward.silverTickets}</Text>
        </View>
        {rewards.weeklyReward.goldTicket && (
          <View style={styles.specialBadge}>
            <Text style={styles.specialText}>Gold Ticket! Eligible for Monthly Draw</Text>
          </View>
        )}
      </View>
      <View style={styles.section}>
        <Text className="font-JakartaSemiBold" style={styles.sectionTitle}>Monthly Rewards</Text>
        <View style={styles.rewardItem}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FontAwesome name="money" size={24} color="gold" />
            <Text className="font-Jakarta ml-2" style={styles.label}>Gold Ticket</Text>
          </View>
          <Text className="font-JakartaBold" style={styles.value}>{rewards.monthlyReward.goldTicket}</Text>
        </View>
        {rewards.monthlyReward.goldDrawEligible && (
          <View style={styles.specialBadge}>
            <Text className="font-Jakarta" style={styles.specialText}>Eligible for Big Prize Monthly Draw</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
    <Text className="text-center" style={styles.sectionTitle}>Convert Your Reward to Cash</Text>
    <TextInput
        style={styles.input}
        placeholder="Enter amount to convert"
        value={convertAmount}
        onChangeText={setConvertAmount}
        keyboardType="numeric"
    />
    <TouchableOpacity
        style={styles.button}
        onPress={() => handleConversion(rewards.cashbackAmount, convertAmount)}
    >
        <Text style={styles.buttonText}>Convert</Text>
    </TouchableOpacity>
    {conversionMessage && <Text style={styles.message}>{conversionMessage}</Text>}
</View>

    </View>
  );
};
const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "#f7f7f7",
      padding: 20,
      alignItems: "center",
   },
   title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: "#333",
   },
   section: {
      backgroundColor: "#ffffff",
      padding: 15,
      borderRadius: 12,
      marginVertical: 10,
      width: "90%",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 4,
   },
   sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: "#4a4a4a",
      marginBottom: 10,
   },
   rewardItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomColor: "#eee",
      borderBottomWidth: 1,
   },
   label: {
      fontSize: 16,
      color: "#666",
   },
   value: {
      fontSize: 16,

      color: "#2a9d8f",
   },
   specialBadge: {
      marginTop: 15,
      backgroundColor: "#0F62BA",
      padding: 10,
      borderRadius: 8,
      alignItems: "center",
   },
   specialText: {
      color: "#fff",
      fontFamily: 'mon-sb',
      fontWeight: "600",
   },
   input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    message: {
        marginTop: 10,
        color: '#d32f2f',
        fontWeight: 'bold',
    },
});

export default Profile;
