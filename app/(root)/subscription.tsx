import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CustomGooglePlacesInput from "@/components/CustomGooglePlacesInput";
import { useLocationStore } from "@/store";
import { fetchDistanceAndTime } from "@/lib/utils";

const Colors = {
  primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C",
  textMedium: "#4A5568", textLight: "#718096", backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC", borderLight: "#E2E8F0", successGreen: "#22C55E",
};

export default function SubscriptionScreen() {
  const { userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();
  
  const [selectedPlan, setSelectedPlan] = useState('shared');
  const [selectedChildIds, setSelectedChildIds] = useState(new Set());
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock Children
  const children = [
      { id: '1', name: 'Sarah', school: 'Beteseb Academy' },
      { id: '2', name: 'Leo', school: 'Beteseb Academy' }
  ];

  // Dynamic Price Calculation based on actual map coordinates
  useEffect(() => {
    const calculate = async () => {
        if (userLatitude && destinationLatitude) {
            const { distance: dist } = await fetchDistanceAndTime(userLatitude, userLongitude, destinationLatitude, destinationLongitude);
            
            const basePricePerKm = selectedPlan === 'private' ? 40 : 15;
            const kidsMultiplier = selectedChildIds.size > 0 ? selectedChildIds.size : 1;
            
            let total = (basePricePerKm * (dist/1000) * 22); // 22 school days
            if (selectedPlan === 'private') total = total * 1.5; 
            if (selectedPlan === 'shared') total = total * kidsMultiplier; 

            setEstimatedPrice(Math.round(total));
        }
    };
    calculate();
  }, [userLatitude, destinationLatitude, selectedPlan, selectedChildIds]);

  const handleToggleChild = (childId) => {
    const newSelection = new Set(selectedChildIds);
    newSelection.has(childId) ? newSelection.delete(childId) : newSelection.add(childId);
    setSelectedChildIds(newSelection);
  };

  const handleSubscribe = async () => {
    if (!userLatitude || !destinationLatitude) {
      Alert.alert('Locations Required', 'Please enter your exact Home and School locations.');
      return;
    }
    if (selectedChildIds.size === 0) {
      Alert.alert('Select Children', 'Please select at least one child for this route.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        Alert.alert('Subscription Requested!', 'Our matching agents have your coordinates and will assign a CareDriver shortly.', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Route Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* 1. MAP INPUTS */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Set Exact Route</Text>
            <View style={{ zIndex: 20, marginBottom: 10 }}>
                <Text style={styles.inputLabel}>Home Location</Text>
                <CustomGooglePlacesInput type="pickup" placeholder="Search home address..." />
            </View>
            <View style={{ zIndex: 10 }}>
                <Text style={styles.inputLabel}>School Location</Text>
                <CustomGooglePlacesInput type="destination" placeholder="Search school address..." />
            </View>
        </View>

        {/* 2. PLAN SELECTION */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Choose Service</Text>
            <View style={styles.plansContainer}>
            <TouchableOpacity style={[styles.planCard, selectedPlan === 'shared' && styles.planCardActive]} onPress={() => setSelectedPlan('shared')}>
                <MaterialCommunityIcons name="bus-school" size={28} color={selectedPlan === 'shared' ? Colors.backgroundWhite : Colors.primaryOrange} />
                <Text style={[styles.planTitle, selectedPlan === 'shared' && styles.textWhite]}>Shared SUV</Text>
                <Text style={[styles.planDesc, selectedPlan === 'shared' && styles.textWhite]}>Matched with neighbors.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.planCard, selectedPlan === 'private' && styles.planCardActive]} onPress={() => setSelectedPlan('private')}>
                <MaterialCommunityIcons name="car" size={28} color={selectedPlan === 'private' ? Colors.backgroundWhite : Colors.secondaryTeal} />
                <Text style={[styles.planTitle, selectedPlan === 'private' && styles.textWhite]}>Private Ride</Text>
                <Text style={[styles.planDesc, selectedPlan === 'private' && styles.textWhite]}>Dedicated CareDriver.</Text>
            </TouchableOpacity>
            </View>
        </View>

        {/* 3. MULTI-CHILD SELECTION */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Select Children</Text>
            {children.map(child => (
                <TouchableOpacity key={child.id} style={styles.childSelectItem} onPress={() => handleToggleChild(child.id)}>
                    <Ionicons name={selectedChildIds.has(child.id) ? 'checkbox' : 'square-outline'} size={24} color={Colors.secondaryTeal} />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.childSelectText}>{child.name}</Text>
                        <Text style={styles.childSelectSub}>{child.school}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>

      </ScrollView>

      <View style={styles.footer}>
          <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Monthly Estimate:</Text>
              <Text style={styles.priceValue}>{estimatedPrice ? `ETB ${estimatedPrice.toLocaleString()}` : '--'}</Text>
          </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubscribe} disabled={loading || !estimatedPrice}>
          {loading ? <ActivityIndicator color={Colors.backgroundWhite} /> : <Text style={styles.submitBtnText}>Request Matching</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontFamily: 'Jakarta-SemiBold', color: Colors.textMedium, marginBottom: 6 },
  plansContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  planCard: { width: '48%', backgroundColor: Colors.backgroundLightGray, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  planCardActive: { backgroundColor: Colors.secondaryTeal, borderColor: Colors.secondaryTeal },
  planTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginTop: 12, marginBottom: 4 },
  planDesc: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
  textWhite: { color: Colors.backgroundWhite },
  childSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  childSelectText: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  childSelectSub: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.backgroundWhite, padding: 20, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  priceLabel: { fontSize: 14, fontFamily: 'Jakarta-SemiBold', color: Colors.textMedium },
  priceValue: { fontSize: 20, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  submitBtn: { backgroundColor: Colors.primaryOrange, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.backgroundWhite },
});