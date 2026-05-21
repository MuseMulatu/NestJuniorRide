import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ButtonRow = ({ IconLeft, IconRight, onPressL, onPressR }) => {
  
  return (
    <View style={styles.buttonRow}>
      <TouchableOpacity onPress={onPressL} style={styles.button}>
        {IconLeft && < IconLeft />}
        <Text style={styles.buttonText}>Solo</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>or</Text>

      <TouchableOpacity onPress={onPressR} style={styles.button}>
              {IconRight && <IconRight />}
        <Text style={styles.buttonText}>Shared</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
  },
  button: {
     // Take up 1/3rd of the row width

    borderRadius: 50,
    paddingVertical: 15,
    width: 160,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: '#141414',
    marginHorizontal: 10, // Add some space between buttons
  },
  buttonText: {
    paddingHorizontal: 7,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1ab0a6', // Tailwind's text-red-100 equivalent
  },
   buttonIcon: {
 marginRight: 55
  },
  orText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FE0499',
    marginHorizontal: 5,
  },
});

export default ButtonRow;
