// src/components/QuickQuestionsModal.js
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import {Picker} from '@react-native-picker/picker'

const QuickQuestionsModal = ({ visible, onClose, onSubmit }) => {
    const [experienceYears, setExperienceYears] = useState('');
    const [expertiseLevel, setExpertiseLevel] = useState('beginner');

    const handleSubmit = () => {
        if (experienceYears === '') {
            Alert.alert('Input Required', 'Please enter years of experience.');
            return;
        }
        onSubmit(parseInt(experienceYears), expertiseLevel);
        setExperienceYears(''); // Reset for next time
        setExpertiseLevel('beginner'); // Reset
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Quick Application Questions</Text>
                    <Text style={styles.questionText}>How many years of experience do you have in this job field?</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="Years of experience"
                        value={experienceYears}
                        onChangeText={setExperienceYears}
                    />

                    <Text style={styles.questionText}>What is your expertise level?</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={expertiseLevel}
                            onValueChange={(itemValue) => setExpertiseLevel(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Beginner" value="beginner" />
                            <Picker.Item label="Intermediate" value="intermediate" />
                            <Picker.Item label="Expert" value="expert" />
                        </Picker>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit}>
                            <Text style={styles.buttonText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    questionText: {
        fontSize: 16,
        marginBottom: 10,
        color: '#555',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        width: '100%',
        marginBottom: 15,
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        width: '100%',
        marginBottom: 20,
        overflow: 'hidden',
    },
    picker: {
        width: '100%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 10,
        padding: 12,
        elevation: 2,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    submitButton: {
        backgroundColor: '#FF8C00', // Blue
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default QuickQuestionsModal;