import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// import firestore from '@react-native-firebase/firestore'; // Re-enable for real DB connection

const Colors = {
  primaryOrange: "#FF8C00",
  secondaryTeal: "#0FB1BB",
  textDark: "#1A202C",
  textMedium: "#4A5568",
  textLight: "#718096",
  backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC",
  borderLight: "#E2E8F0",
  warningRed: "#EF4444",
};

// Dummy Data for visual architecture testing
const dummyKids = [
  {
    id: '1',
    name: 'Sarah',
    school: 'Beteseb Academy',
    plan: 'Shared SUV',
    driver: 'Almaz (CareDriver)',
    pickupTime: '07:15 AM',
    avatar: 'https://cdn-icons-png.flaticon.com/512/1154/1154448.png',
    skippedToday: false, // Core state for skip logic
  },
  {
    id: '2',
    name: 'Leo',
    school: 'Beteseb Academy',
    plan: 'Shared SUV',
    driver: 'Almaz (CareDriver)',
    pickupTime: '07:15 AM',
    avatar: 'https://cdn-icons-png.flaticon.com/512/1154/1154486.png',
    skippedToday: true, 
  }
];

export default function ManageChildrenScreen() {
  const [kids, setKids] = useState(dummyKids);

  const handleSkipToggle = (kidId: string, currentSkipState: boolean) => {
    if (currentSkipState) {
        // If already skipped, allow them to undo (if the driver hasn't departed yet)
        setKids(prev => prev.map(k => k.id === kidId ? { ...k, skippedToday: false } : k));
        return;
    }

    Alert.alert(
      "Skip Today's Ride?",
      "Are you sure? This will notify the driver to bypass your stop this morning.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Skip Ride", 
          style: "destructive",
          onPress: () => {
            // Optimistic UI Update
            setKids(prev => prev.map(k => k.id === kidId ? { ...k, skippedToday: true } : k));
            
            // TODO: Backend Logic
            // 1. Update Firebase schedule document
            // 2. Push notification to CareDriver app
            // 3. Inject empty seat into ad-hoc inventory
            Alert.alert("Ride Skipped", "The driver has been notified. Feel better!");
          }
        }
      ]
    );
  };

  const renderKidCard = ({ item }: { item: any }) => (
    <View style={[styles.card, item.skippedToday && styles.cardSkipped]}>
      <View style={styles.cardHeader}>
        <View style={styles.profileSection}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.kidName}>{item.name}</Text>
            <Text style={styles.schoolName}>{item.school}</Text>
          </View>
        </View>
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, item.skippedToday ? styles.badgeSkipped : styles.badgeActive]}>
          <Text style={[styles.statusText, item.skippedToday ? styles.textSkipped : styles.textActive]}>
            {item.skippedToday ? 'Skipped' : 'Active'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="steering" size={16} color={Colors.textMedium} />
          <Text style={styles.detailText}>{item.driver}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={Colors.textMedium} />
          <Text style={styles.detailText}>{item.pickupTime}</Text>
        </View>
      </View>

      {/* The Crucial Skip Button */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.skipButton, item.skippedToday && styles.undoSkipButton]} 
          onPress={() => handleSkipToggle(item.id, item.skippedToday)}
        >
          <Ionicons 
            name={item.skippedToday ? "refresh" : "close-circle-outline"} 
            size={18} 
            color={item.skippedToday ? Colors.textDark : Colors.warningRed} 
          />
          <Text style={[styles.skipButtonText, item.skippedToday && styles.undoSkipText]}>
            {item.skippedToday ? 'Undo Skip' : 'Skip Today\'s Ride'}
          </Text>
        </TouchableOpacity>

        {/* Disabled looking-in if ride is skipped */}
        <TouchableOpacity 
            style={[styles.lookInButton, item.skippedToday && { opacity: 0.5 }]} 
            disabled={item.skippedToday}
        >
          <Ionicons name="videocam-outline" size={18} color={Colors.secondaryTeal} />
          <Text style={styles.lookInText}>Look-in</Text>
        </TouchableOpacity>
      </View>

      {item.skippedToday && (
          <Text style={styles.skipWarningText}>
             Seat has been released to the neighborhood pool for today.
          </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Kids</Text>
        <TouchableOpacity>
            <Ionicons name="add-circle" size={28} color={Colors.secondaryTeal} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={kids}
        keyExtractor={item => item.id}
        renderItem={renderKidCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>No children added yet.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: Colors.backgroundWhite },
  headerTitle: { fontSize: 24, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: Colors.backgroundWhite, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: Colors.textDark, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardSkipped: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFE4E6', marginRight: 12 },
  kidName: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  schoolName: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeSkipped: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontFamily: 'Jakarta-Bold' },
  textActive: { color: '#166534' },
  textSkipped: { color: '#991B1B' },
  detailsRow: { flexDirection: 'row', backgroundColor: Colors.backgroundLightGray, padding: 12, borderRadius: 12, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  detailText: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.textDark, marginLeft: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
  undoSkipButton: { backgroundColor: Colors.backgroundWhite, borderColor: Colors.borderLight },
  skipButtonText: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: Colors.warningRed, marginLeft: 6 },
  undoSkipText: { color: Colors.textDark },
  lookInButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundWhite, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.secondaryTeal },
  lookInText: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: Colors.secondaryTeal, marginLeft: 6 },
  skipWarningText: { marginTop: 12, fontSize: 12, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, textAlign: 'center', fontStyle: 'italic' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyStateText: { marginTop: 10, fontSize: 16, fontFamily: 'Jakarta-Medium', color: Colors.textLight },
});