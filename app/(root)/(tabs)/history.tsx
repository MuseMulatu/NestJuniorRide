import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
  primaryOrange: "#FF8C00", secondaryTeal: "#0FB1BB", textDark: "#1A202C",
  textMedium: "#4A5568", textLight: "#718096", backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC", borderLight: "#E2E8F0", successGreen: "#22C55E",
};

// Dummy Data containing Milestones, Photo pulses, and Skips
const alerts = [
  { id: '1', type: 'dropoff', title: 'Dropped off safely', desc: 'Sarah arrived at Beteseb Academy.', time: '08:05 AM', date: 'Today', icon: 'school', color: Colors.successGreen },
  { id: '2', type: 'photo', title: 'Boarding Snapshot', desc: 'Sarah boarded the SUV.', time: '07:18 AM', date: 'Today', icon: 'camera', color: Colors.secondaryTeal, image: 'https://images.unsplash.com/photo-1601662528567-526cd06f6582?auto=format&fit=crop&q=80&w=200' },
  { id: '3', type: 'start', title: 'Driver is arriving', desc: 'Almaz is 5 minutes away.', time: '07:10 AM', date: 'Today', icon: 'car', color: Colors.primaryOrange },
  { id: '4', type: 'skip', title: 'Ride Skipped', desc: 'You bypassed Leo\'s afternoon ride.', time: 'Yesterday, 02:00 PM', date: 'Yesterday', icon: 'close-circle', color: Colors.textLight },
];

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline & Alerts</Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={styles.timelineItem}>
            {/* Left Timeline Line & Icon */}
            <View style={styles.timelineLeft}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + '1A' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              {index !== alerts.length - 1 && <View style={styles.verticalLine} />}
            </View>

            {/* Right Content */}
            <View style={styles.contentBox}>
              <View style={styles.contentHeader}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemTime}>{item.time}</Text>
              </View>
              <Text style={styles.itemDesc}>{item.desc}</Text>

              {/* Display Milestone Images if present */}
              {item.image && (
                 <View style={styles.imageContainer}>
                     <Image source={{ uri: item.image }} style={styles.milestoneImage} />
                     <View style={styles.imageVerifiedBadge}>
                         <Ionicons name="checkmark-circle" size={14} color={Colors.successGreen} />
                         <Text style={styles.verifiedText}>Verified</Text>
                     </View>
                 </View>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundWhite },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  timelineItem: { flexDirection: 'row', minHeight: 80 },
  timelineLeft: { alignItems: 'center', width: 40, marginRight: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  verticalLine: { width: 2, flex: 1, backgroundColor: Colors.borderLight, marginTop: 4, marginBottom: 4 },
  contentBox: { flex: 1, paddingBottom: 24, paddingTop: 8 },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { fontSize: 16, fontFamily: 'Jakarta-Bold', color: Colors.textDark },
  itemTime: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: Colors.textLight },
  itemDesc: { fontSize: 14, fontFamily: 'Jakarta-Medium', color: Colors.textMedium, lineHeight: 20 },
  imageContainer: { marginTop: 12, borderRadius: 12, overflow: 'hidden', height: 140, position: 'relative' },
  milestoneImage: { width: '100%', height: '100%' },
  imageVerifiedBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: Colors.backgroundWhite, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { fontSize: 10, fontFamily: 'Jakarta-Bold', color: Colors.textDark, marginLeft: 4 }
});