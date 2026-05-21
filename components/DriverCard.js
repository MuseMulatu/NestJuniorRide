// DriverCard.js
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome6 } from '@expo/vector-icons';

const DriverCard = ({ name, rating, carModel, plateNumber, profileImage }) => (
  <View style={styles.container}>
    <Image
      source={{ uri: profileImage || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSg5rJ9bo6bWmO5V55oahnFe3fH8B38cp6guQ&s"}}
      style={styles.avatar}
    />
    
    <View style={styles.infoContainer}>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.ratingContainer}>
        <FontAwesome6 name="star" size={16} color="#FFD700" />
        <Text style={styles.ratingText}>{rating}</Text>
      </View>
      
      <View style={styles.carInfo}>
        <Text style={styles.carModel}>{carModel}</Text>
        <Text style={styles.plateNumber}>{plateNumber}</Text>
      </View>
    </View>
    
    <TouchableOpacity style={styles.chatButton}>
      <FontAwesome6 name="comment-dots" size={20} color="#0F77EA" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  carInfo: {
    marginTop: 8,
    gap: 2,
  },
  carModel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  plateNumber: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F77EA',
  },
  chatButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
  },
});

export default DriverCard;