// EmergencyAssist.js
import { View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EmergencyAssist = ({ onPress }) => {
  const pulseAnim = new Animated.Value(1);

  // Implement pulse animation logic here
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
    >
      <MaterialCommunityIcons 
        name="alert-octagon" 
        size={28} 
        color="#FFFFFF" 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E74C3C',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});

export default EmergencyAssist;