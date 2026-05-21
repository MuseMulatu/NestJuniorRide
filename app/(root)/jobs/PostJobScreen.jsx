// src/screens/Jobs/PostJobScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { userProfileById } from "@/lib/utils";
import { router, useLocalSearchParams, Stack } from "expo-router";

const API_BASE_URL = 'https://app.share-rides.com';
const PostJobScreen = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [jobType, setJobType] = useState('full_time');
    const [location, setLocation] = useState('');
    const [salaryRange, setSalaryRange] = useState('');
    const [howToApplyType, setHowToApplyType] = useState('in_app');
    const [externalInstructions, setExternalInstructions] = useState('');
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userJobPostCount, setUserJobPostCount] = useState(0);

    const FREE_POST_LIMIT = 3; // Keep in sync with backend constant
    const JOB_POST_PRICE_BIRR = 500; // Keep in sync with backend constant

    const user = auth()?.currentUser;
    const userId = user?.uid;

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Fetch categories
                const catResponse = await axios.get(`${API_BASE_URL}/api/jobs/categories`);
                setCategories(catResponse.data);
                if (catResponse.data.length > 0) {
                    setCategoryId(catResponse.data[0].id.toString()); // Set default category
                }

                // Fetch user's current job post count
                const userProfile = await userProfileById(userId);
                setUserJobPostCount(userProfile.employer_job_post_count);

            } catch (error) {
                console.error('Error loading initial data:', error);
                Alert.alert('Error', 'Failed to load initial data for job posting.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
        console.log("categories:", categories)
    }, []);

    const handlePostJob = async () => {
        if (!title || !description || !categoryId || !jobType || !howToApplyType) {
            Alert.alert('Missing Fields', 'Please fill in all required fields.');
            return;
        }
        if (howToApplyType === 'external_instructions' && !externalInstructions) {
            Alert.alert('Missing Instructions', 'Please provide external instructions for application.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title,
                description,
                category_id: parseInt(categoryId),
                job_type: jobType,
                location: location || null,
                salary_range: salaryRange || null,
                how_to_apply_type: howToApplyType,
                external_instructions: howToApplyType === 'external_instructions' ? externalInstructions : null,
                employer_id: userId
            };

            const response = await axios.post(`${API_BASE_URL}/api/jobs`, payload );

            Alert.alert('Success', response.data.message);
            // Optionally, refresh user profile to update job post count
         //   await fetchUserProfile(authState.user.id);
            navigation.goBack(); // Go back to jobs list or employer dashboard
        } catch (error) {
            console.error('Job Post Error:', error.response?.data || error.message);
            if (error.response?.status === 402) {
                Alert.alert(
                    'Payment Required',
                    `You have reached your free job post limit (${FREE_POST_LIMIT}). A payment of ${JOB_POST_PRICE_BIRR} ETB is required to post this job.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Pay Now',
                            onPress: async () => {
                                // Simulate SantimPay flow (backend would handle actual payment)
                                Alert.alert('Simulating Payment', 'Redirecting to SantimPay gateway...');
                                // In a real app, you would navigate to a webview for SantimPay or trigger an in-app payment
                                // For this example, we assume the backend's POST /api/jobs handles the payment initiation
                                // and returns success/failure. If it requires *frontend* initiation, you'd call
                                // your SantimPay helper function here.
                                // If the backend call failed with 402, it means the backend *already* tried
                                // to process payment or determined it's required. The current backend logic
                                // for `/api/jobs` will either succeed (if free post) or handle the SantimPay
                                // directly. So if we got 402, it means backend *requires* payment.
                                // For simplicity here, if 402, we tell user to pay and assume next attempt (after they
                                // theoretically pay externally or if backend logic is tweaked) will work.
                                // A more robust flow: Backend returns a SantimPay payment URL, frontend navigates to it.
                                // On payment success, SantimPay webhook notifies your backend, which then marks job as paid.
                                Alert.alert('Payment Flow', 'This action would typically redirect you to SantimPay or initiate an in-app payment. Please retry after payment processing completes.');
                                setLoading(false); // Stop loading, user needs to handle payment external to this flow for now
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Post Job Failed', error.response?.data?.message || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && categories.length === 0) { // Show full screen loader if initial data is loading
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{ marginTop: 10 }}>Loading job posting form...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
        <Stack.Screen options={{ title: 'Go Back' }} />
            <Text style={styles.header}>Post a New Job</Text>
            <Text style={styles.infoText}>
                You have {FREE_POST_LIMIT - userJobPostCount > 0 ? FREE_POST_LIMIT - userJobPostCount : 0} free posts remaining.
                {userJobPostCount >= FREE_POST_LIMIT && ` Subsequent posts cost ${JOB_POST_PRICE_BIRR} ETB.`}
            </Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Job Title *</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Senior Software Engineer" />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Job Description *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide a detailed description of the job..."
                    multiline
                    numberOfLines={6}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={categoryId}
                        onValueChange={(itemValue) => setCategoryId(itemValue)}
                        style={styles.picker}
                    >
                        {categories.map(cat => (
                            <Picker.Item key={cat.id} label={cat.name} value={cat.id.toString()} />
                        ))}
                    </Picker>
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Job Type *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={jobType}
                        onValueChange={(itemValue) => setJobType(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Full-time" value="full_time" />
                        <Picker.Item label="Part-time" value="part_time" />
                        <Picker.Item label="Freelance" value="freelance" />
                        <Picker.Item label="Remote" value="remote" />
                        <Picker.Item label="Hybrid" value="hybrid" />
                    </Picker>
                </View>
            </View>

            {jobType !== 'remote' && (
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Location</Text>
                    <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g., Addis Ababa" />
                </View>
            )}

            <View style={styles.formGroup}>
                <Text style={styles.label}>Salary Range (Optional)</Text>
                <TextInput style={styles.input} value={salaryRange} onChangeText={setSalaryRange} placeholder="e.g., 10000 - 20000 ETB/month" />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>How to Apply *</Text>
                <View style={styles.radioGroup}>
                    <TouchableOpacity
                        style={styles.radioButton}
                        onPress={() => setHowToApplyType('in_app')}
                    >
                        <View style={styles.radioCircle}>
                            {howToApplyType === 'in_app' && <View style={styles.selectedRadioCircle} />}
                        </View>
                        <Text style={styles.radioLabel}>Apply In-App (through Share/Yegara)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.radioButton}
                        onPress={() => setHowToApplyType('external_instructions')}
                    >
                        <View style={styles.radioCircle}>
                            {howToApplyType === 'external_instructions' && <View style={styles.selectedRadioCircle} />}
                        </View>
                        <Text style={styles.radioLabel}>Provide External Instructions</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {howToApplyType === 'external_instructions' && (
                <View style={styles.formGroup}>
                    <Text style={styles.label}>External Application Instructions *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={externalInstructions}
                        onChangeText={setExternalInstructions}
                        placeholder="e.g., Send your resume to careers@example.com or visit our office at..."
                        multiline
                        numberOfLines={4}
                    />
                </View>
            )}

            <TouchableOpacity
                style={styles.postButton}
                onPress={handlePostJob}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.postButtonText}>Post Job</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: '#f0f2f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#444',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    radioGroup: {
        flexDirection: 'column',
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 8,
    },
    radioCircle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007bff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    selectedRadioCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007bff',
    },
    radioLabel: {
        fontSize: 16,
        color: '#555',
    },
    postButton: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default PostJobScreen;