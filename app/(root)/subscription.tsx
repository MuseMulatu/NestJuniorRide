import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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
};

export default function SubscriptionScreen() {
  const params = useLocalSearchParams();
  const initialPlan = params.type === 'Private Ride' ? 'private' : 'shared';

  const [selectedPlan, setSelectedPlan] = useState<'shared' | 'private'>(initialPlan);
  const [childName, setChildName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  const [morningTime, setMorningTime] = useState(new Date(new Date().setHours(7, 0, 0, 0)));
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!childName || !schoolName) {
      Alert.alert('Missing Details', 'Please enter your child\'s name and school.');
      return;
    }

    setLoading(true);
    try {
      const user = auth().currentUser;
      await firestore().collection('subscriptions').add({
        userId: user?.uid || 'anonymous',
        planType: selectedPlan,
        childName,
        schoolName,
        morningPickupTime: morningTime.toISOString(),
        status: 'pending_matching', // Requires admin matching for shared routes
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      
      Alert.alert(
        'Subscription Requested!', 
        'Our agents are matching your route with a vetted CareDriver. We will notify you once confirmed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nest Junior Plans</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Choose a monthly transport plan for your child.</Text>

        {/* Plan Selectors */}
        <View style={styles.plansContainer}>
          <TouchableOpacity 
            style={[styles.planCard, selectedPlan === 'shared' && styles.planCardActive]}
            onPress={() => setSelectedPlan('shared')}
          >
            <MaterialCommunityIcons name="van-shuttle" size={32} color={selectedPlan === 'shared' ? Colors.backgroundWhite : Colors.secondaryTeal} />
            <Text style={[styles.planTitle, selectedPlan === 'shared' && styles.textWhite]}>Shared SUV</Text>
            <Text style={[styles.planDesc, selectedPlan === 'shared' && styles.textWhite]}>Max 6 kids in your neighborhood.</Text>
            {selectedPlan === 'shared' && <View style={styles.checkBadge}><Ionicons name="checkmark" size={16} color={Colors.secondaryTeal} /></View>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.planCard, selectedPlan === 'private' && styles.planCardActive]}
            onPress={() => setSelectedPlan('private')}
          >
            <FontAwesome5 name="car" size={28} color={selectedPlan === 'private' ? Colors.backgroundWhite : Colors.primaryOrange} />
            <Text style={[styles.planTitle, selectedPlan === 'private' && styles.textWhite]}>Private Sedan</Text>
            <Text style={[styles.planDesc, selectedPlan === 'private' && styles.textWhite]}>Dedicated vetted CareDriver.</Text>
            {selectedPlan === 'private' && <View style={styles.checkBadge}><Ionicons name="checkmark" size={16} color={Colors.secondaryTeal} /></View>}
          </TouchableOpacity>
        </View>

        {/* Form Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Child Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Child's Full Name"
            value={childName}
            onChangeText={setChildName}
            placeholderTextColor={Colors.textLight}
          />
          <TextInput
            style={styles.input}
            placeholder="School Name (e.g., Beteseb Academy)"
            value={schoolName}
            onChangeText={setSchoolName}
            placeholderTextColor={Colors.textLight}
          />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recurring Schedule</Text>
          
          <TouchableOpacity style={styles.timePickerBtn} onPress={() => setShowMorningPicker(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sunny" size={20} color={Colors.primaryOrange} style={{ marginRight: 10 }} />
              <Text style={styles.timeLabel}>Morning Pickup Time</Text>
            </View>
            <Text style={styles.timeValue}>
              {morningTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>

          {showMorningPicker && (
            <DateTimePicker
              value={morningTime}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                setShowMorningPicker(false);
                if (selectedDate) setMorningTime(selectedDate);
              }}
            />
          )}

          {/* Value Props */}
          <View style={styles.valuePropsBox}>
            <View style={styles.valueRow}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.successGreen} />
              <Text style={styles.valueText}>Driven by vetted, female CareDrivers</Text>
            </View>
            <View style={styles.valueRow}>
              <Ionicons name="videocam" size={20} color={Colors.successGreen} />
              <Text style={styles.valueText}>Live snapshot & look-in features included</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubscribe} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.backgroundWhite} />
          ) : (
            <Text style={styles.submitBtnText}>Request Monthly Plan</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  scrollContent: { padding: 20, paddingBottom: 100 },
  subtitle: { fontSize: 15, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, marginBottom: 20 },
  plansContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  planCard: { width: '48%', backgroundColor: Colors.backgroundLightGray, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  planCardActive: { backgroundColor: Colors.secondaryTeal, borderColor: Colors.secondaryTeal, shadowColor: Colors.secondaryTeal, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  planTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginTop: 12, marginBottom: 4 },
  planDesc: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
  textWhite: { color: Colors.backgroundWhite },
  checkBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.backgroundWhite, borderRadius: 12, padding: 2 },
  formSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginBottom: 12 },
  input: { backgroundColor: Colors.backgroundLightGray, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 16, fontSize: 15, fontFamily: 'Jakarta-Medium', marginBottom: 12, color: Colors.textDark },
  timePickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.backgroundLightGray, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 16, marginBottom: 12 },
  timeLabel: { fontSize: 15, fontFamily: 'Jakarta-Medium', color: Colors.textDark },
  timeValue: { fontSize: 15, fontFamily: 'Jakarta-Bold', color: Colors.secondaryTeal },
  valuePropsBox: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#BBF7D0' },
  valueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  valueText: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: '#166534', marginLeft: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.backgroundWhite, padding: 20, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  submitBtn: { backgroundColor: Colors.secondaryTeal, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.backgroundWhite },
});