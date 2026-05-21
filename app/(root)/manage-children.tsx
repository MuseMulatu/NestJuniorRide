// (app)/manage-children.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import axios from 'axios';

// Use the same constants and interfaces from parent-screen
const API_BASE_URL = 'https://app.share-rides.com/api'; 
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
    warningRed: "#EF4444",
};

// --- Interfaces for Data Types ---
interface Child {
    id: string;
    name: string;
    school_name: string;
    ride_status: 'Active' | 'Inactive';
    driver_name: string | null;
    driver_photo_url: string | null;
}

const ManageChildrenScreen = () => {
    const user = auth().currentUser;
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for the new child form
    const [childName, setChildName] = useState('');
    const [schoolName, setSchoolName] = useState('');

    useEffect(() => {
        if (user) fetchChildren();
    }, [user]);

    const fetchChildren = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/children/parent/${user.uid}`);
            setChildren(response.data);
        } catch (error) {
            Alert.alert("Error", "Could not fetch children's data.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddChild = async () => {
        if (!childName || !schoolName) {
            Alert.alert("Missing Information", "Please enter your child's name and school name.");
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                parentId: user.uid,
                name: childName,
                schoolName: schoolName,
            };
            await axios.post(`${API_BASE_URL}/children`, payload);
            Alert.alert("Success", `${childName} has been added successfully.`);
            setModalVisible(false);
            setChildName('');
            setSchoolName('');
            fetchChildren(); // Refresh the list
        } catch (error) {
            Alert.alert("Error", "Could not add child.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderChildItem = ({ item }: { item: Child }) => (
        <View style={styles.childCard}>
            <Image source={{ uri: item.photo_url || 'https://placehold.co/100x100' }} style={styles.childAvatar} />
            <View style={styles.childInfo}>
                <Text style={styles.childName}>{item.name}</Text>
                <Text style={styles.schoolName}>{item.school_name}</Text>
            </View>
            <TouchableOpacity>
                <Ionicons name="pencil" size={24} color={Colors.textLight} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Manage My Children' }} />
            {loading ? (
                <ActivityIndicator size="large" color={Colors.primaryOrange} />
            ) : (
                <FlatList
                    data={children}
                    renderItem={renderChildItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text style={styles.emptyText}>No children added yet. Add your first child!</Text>}
                />
            )}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Add a New Child</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Child's Full Name"
                            value={childName}
                            onChangeText={setChildName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="School Name"
                            value={schoolName}
                            onChangeText={setSchoolName}
                        />
                        <TouchableOpacity style={styles.button} onPress={handleAddChild} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Child</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={() => setModalVisible(false)}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// --- (Add styles for this screen) ---
const styles = StyleSheet.create({ /* ... Styles for child list and add modal ... */ });

export default ManageChildrenScreen;