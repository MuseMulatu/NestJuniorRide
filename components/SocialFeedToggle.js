// SocialFeedToggle.js
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { FontAwesome6 } from '@expo/vector-icons';

const SocialFeedToggle = ({ activeTab, onSocialPress, onRidePress }) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.tabButton, activeTab === 'ride' && styles.activeTab]}
      onPress={onRidePress}
    >
      <FontAwesome6 name="car-side" size={20} color={activeTab === 'ride' ? '#0F77EA' : '#666'} />
      <Text style={[styles.tabText, activeTab === 'ride' && styles.activeText]}>
        Ride Info
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabButton, activeTab === 'social' && styles.activeTab]}
      onPress={onSocialPress}
    >
      <FontAwesome6 name="users" size={20} color={activeTab === 'social' ? '#0F77EA' : '#666'} />
      <Text style={[styles.tabText, activeTab === 'social' && styles.activeText]}>
        Social Feed
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    marginTop: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#F0F8FF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  activeText: {
    color: '#0F77EA',
  },
});

export default SocialFeedToggle;