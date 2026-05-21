
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

const RideProgress = ({ distance, time, price }) => (
  <View style={styles.container}>
    <View style={styles.metricContainer}>
      <MaterialIcons name="location-pin" size={24} color="#0F77EA" />
      <Text className="font-JakartaBold" style={styles.metricValue}>{(distance/1000).toFixed(1)} km</Text>
      <Text className="font-Jakarta" style={styles.metricLabel}>Distance</Text>
    </View>

    <View style={styles.separator} />

    <View style={styles.metricContainer}>
      <MaterialIcons name="access-time" size={24} color="#0F77EA" />
      <Text className="font-JakartaBold" style={styles.metricValue}>{(time/60).toFixed(1)} mins</Text>
      <Text className="font-Jakarta" style={styles.metricLabel}>ETA</Text>
    </View>

    <View style={styles.separator} />

    <View style={styles.metricContainer}>
      <MaterialIcons name="attach-money" size={24} color="#0F77EA" />
     <Text className="font-JakartaBold" style={styles.metricValue}>Birr: {price.toFixed(1)}</Text>
      <Text className="font-Jakarta" style={styles.metricLabel}>Estimate</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  metricContainer: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    color: '#1A1A1A',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  separator: {
    width: 1,
    backgroundColor: '#ECECEC',
    marginHorizontal: 8,
  },
});

export default RideProgress;