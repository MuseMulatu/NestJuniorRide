import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

const Colors = {
  primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C",
  textMedium: "#4A5568", textLight: "#718096", backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC", borderLight: "#E2E8F0", warningRed: "#EF4444",
};

const dummyKids = [
  { id: '1', name: 'Sarah', school: 'Beteseb Academy', plan: 'Shared SUV', driver: 'Almaz (CareDriver)', pickupTime: '07:15 AM', avatar: 'https://cdn-icons-png.flaticon.com/512/1154/1154448.png', skippedToday: false, roomId: 'room-almaz-123' },
];

export default function ManageChildrenScreen() {
  const [kids, setKids] = useState(dummyKids);

  const handleSkipToggle = (kidId: string, currentSkipState: boolean) => {
    if (currentSkipState) {
        setKids(prev => prev.map(k => k.id === kidId ? { ...k, skippedToday: false } : k));
        return;
    }
    Alert.alert("Skip Today?", "This will notify the driver to bypass your stop.", [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Skip", style: "destructive", onPress: () => {
            setKids(prev => prev.map(k => k.id === kidId ? { ...k, skippedToday: true } : k));
            Alert.alert("Ride Skipped", "The driver has been notified. Feel better!");
        }}
    ]);
  };

  const handleLookIn = (roomId: string) => {
    Alert.alert(
      "Request Live Look-in?", 
      "This will ping the driver's dashcam for a secure 30-second view. You have 2 requests left today.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Connect", onPress: () => {
            // Here you would update Firestore: db.collection('live_requests').add({ roomId, status: 'requested' })
            // For now, we route directly to your existing 100ms spectator screen
            router.push({ pathname: '/game-rooms/SpectatorViewScreen', params: { roomId } });
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Kids</Text>
        {/* FIXED: Routes to the Subscription Flow */}
        <TouchableOpacity onPress={() => router.push('/subscription?type=Private Ride')}>
            <Ionicons name="add-circle" size={28} color={Colors.secondaryTeal} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={kids}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.card, item.skippedToday && styles.cardSkipped]}>
            <View style={styles.cardHeader}>
              <View style={styles.profileSection}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View>
                  <Text style={styles.kidName}>{item.name}</Text>
                  <Text style={styles.schoolName}>{item.school}</Text>
                </View>
              </View>
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
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.skipButton, item.skippedToday && styles.undoSkipButton]} onPress={() => handleSkipToggle(item.id, item.skippedToday)}>
                <Ionicons name={item.skippedToday ? "refresh" : "close-circle-outline"} size={18} color={item.skippedToday ? Colors.textDark : Colors.warningRed} />
                <Text style={[styles.skipButtonText, item.skippedToday && styles.undoSkipText]}>
                  {item.skippedToday ? 'Undo Skip' : 'Skip Today\'s Ride'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.lookInButton, item.skippedToday && { opacity: 0.5 }]} disabled={item.skippedToday} onPress={() => handleLookIn(item.roomId)}>
                <Ionicons name="videocam-outline" size={18} color={Colors.secondaryTeal} />
                <Text style={styles.lookInText}>Look-in</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* TEMPORARY DEV TESTING BUTTON */}
      <View style={styles.devBox}>
         <Text style={styles.devTitle}>🛠 Dev/Test Mode (Driver Side)</Text>
         <TouchableOpacity 
            style={styles.devButton} 
            onPress={() => router.push({ pathname: '/game-rooms/LiveStream', params: { roomId: 'room-almaz-123' } })}
         >
            <Text style={styles.devBtnText}>Simulate Driver: Start 100ms Stream</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: Colors.backgroundWhite, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: Colors.textDark, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  cardSkipped: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFE4E6', marginRight: 12 },
  kidName: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  schoolName: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.textMedium },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#DCFCE7' }, badgeSkipped: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontFamily: 'Jakarta-Bold' }, textActive: { color: '#166534' }, textSkipped: { color: '#991B1B' },
  detailsRow: { flexDirection: 'row', backgroundColor: Colors.backgroundLightGray, padding: 12, borderRadius: 12, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 }, detailText: { fontSize: 13, fontFamily: 'Jakarta-Medium', color: Colors.textDark, marginLeft: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
  undoSkipButton: { backgroundColor: Colors.backgroundWhite, borderColor: Colors.borderLight },
  skipButtonText: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: Colors.warningRed, marginLeft: 6 }, undoSkipText: { color: Colors.textDark },
  lookInButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundWhite, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.secondaryTeal },
  lookInText: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: Colors.secondaryTeal, marginLeft: 6 },
  devBox: { margin: 20, padding: 16, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' },
  devTitle: { fontSize: 12, fontFamily: 'Jakarta-Bold', color: '#B45309', marginBottom: 8 },
  devButton: { backgroundColor: '#D97706', padding: 12, borderRadius: 8, alignItems: 'center' },
  devBtnText: { color: 'white', fontFamily: 'Jakarta-Bold' }
});