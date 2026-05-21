// src/screens/Jobs/EmployerApplicantListScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { router, useLocalSearchParams } from "expo-router";

const EmployerApplicantListScreen = ({ route, navigation }) => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const user = auth()?.currentUser;
    const userId = user?.uid;
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

const { jobId, jobTitle, isJobPaid } = useLocalSearchParams();
    const fetchApplicants = useCallback(async () => {
        setLoading(true);
        try {
        console.log("jobId, userId", jobId, userId)
        const payload = {
            employerId: userId
            };
            const response = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}/applicants`,   {
    params: { employerId: userId },
    headers: { Accept: 'application/json' }
  } );
            setApplicants(response.data);
            console.log("response.data", response.data)
        } catch (error) {
            console.error('Error fetching applicants:', error.response?.data || error.message);
            Alert.alert('Error', 'Faiyyyyyyled to load applicants for this job.');
          //  navigation.goBack(); // Go back if there's an error
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [jobId]);

    useEffect(() => {
    fetchApplicants(); // Refresh data when screen is focused
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchApplicants();
    }, [ ]);

    // Function to handle changing application status (e.g., shortlist, reject)
    const handleStatusChange = async (applicationId, newStatus) => {
        Alert.alert(
            'Confirm Status Change',
            `Are you sure you want to change this applicant's status to "${newStatus.toUpperCase()}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes',
                    onPress: async () => {
                        try {
                            // You'll need a backend endpoint for this, e.g., PUT /api/applications/:id/status
                            // For simplicity, let's assume it's direct for now or add one later if needed
                            // For now, this is a placeholder. You'll need to implement this backend API:
                            // app.put('/api/job_applications/:id/status', authenticateUser, isEmployer, async (req, res) => { ... });
                            // The backend should also ensure the employer owns the job.
                            Alert.alert('Action', `Simulating status change for application ${applicationId} to ${newStatus}`);
                            // After successful API call, refresh the list:
                            // await axios.put(`${API_BASE_URL}/api/job_applications/${applicationId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${authState.userToken}` }});
                            fetchApplicants();
                        } catch (error) {
                            console.error('Error changing status:', error.response?.data || error.message);
                            Alert.alert('Error', 'Failed to update application status.');
                        }
                    }
                }
            ]
        );
    };

    // Function to handle hiring a freelancer
    const handleHireFreelancer = async (applicationId, applicantName) => {
        Alert.prompt(
            'Hire Freelancer',
            `Enter agreed price for ${applicantName}:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Hire',
                    onPress: async (agreedPrice) => {
                        if (!agreedPrice || isNaN(parseFloat(agreedPrice))) {
                            Alert.alert('Invalid Price', 'Please enter a valid numeric agreed price.');
                            return;
                        }
                        try {
                            const response = await axios.post(`${API_BASE_URL}/api/freelance/hire`,
                                { jobApplicationId: applicationId, agreedPrice: parseFloat(agreedPrice) },
                            );
                            Alert.alert('Success', response.data.message);
                            fetchApplicants(); // Refresh list to show updated status
                        } catch (error) {
                            console.error('Error hiring freelancer:', error.response?.data || error.message);
                            Alert.alert('Hire Failed', error.response?.data?.message || 'Failed to hire freelancer.');
                        }
                    }
                }
            ],
            'plain-text',
            '', // Default value
            'numeric' // Keyboard type
        );
    };


    const renderApplicantItem = ({ item }) => (
        <View style={styles.applicantCard}>
            <Text style={styles.applicantName}>{item.applicant_username}</Text>
            {item.freelancer_rating !== undefined && (
                <Text style={styles.ratingText}>Freelancer Rating: {item.freelancer_rating}/5</Text>
            )}
            {item.verified_badge_status !== 'none' && (
                <Text style={styles.badgeText}>
                    {item.verified_badge_status === 'applicant_premium' && 'Premium Applicant '}
                    {item.verified_badge_status === 'verified_freelancer' && 'Verified Freelancer '}
                </Text>
            )}

            {isJobPaid && ( 
                <View style={styles.paidDetails}>
                    <Text style={styles.detailItem}>Experience: {item.experience_years} years</Text>
                    <Text style={styles.detailItem}>Expertise: {item.expertise_level.toUpperCase()}</Text>
                    {item.application_text && <Text style={styles.detailItem}>Application Text: {item.application_text}</Text>}
                    {item.portfolio_link && (
                        <Text style={styles.linkText} onPress={() => Linking.openURL(item.portfolio_link)}>
                            Portfolio: {item.portfolio_link}
                        </Text>
                    )}
                    {item.resume_link && (
                        <Text style={styles.linkText} onPress={() => Linking.openURL(item.resume_link)}>
                            Resume: {item.resume_link}
                        </Text>
                    )}
                    {/* Parse and display custom questions if any */}
                    {item.custom_question_responses && Object.keys(item.custom_question_responses).length > 0 && (
                        <View>
                            <Text style={styles.subHeader}>Custom Questions:</Text>
                            {Object.entries(item.custom_question_responses).map(([question, answer], index) => (
                                <Text key={index} style={styles.detailItem}>- {question}: {answer}</Text>
                            ))}
                        </View>
                    )}
                </View>
            )}
            {!isJobPaid && (
                <Text style={styles.lockedContentText}>
                    Subscribe to a paid job post to unlock full applicant details.
                </Text>
            )}

            <View style={styles.actionButtons}>
                {/* Example actions, implement backend endpoints and logic for these */}
                <TouchableOpacity
                    style={[styles.actionButton, styles.shortlistButton]}
                    onPress={() => handleStatusChange(item.id, 'shortlisted')}
                >
                    <Text style={styles.actionButtonText}>Shortlist</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleStatusChange(item.id, 'rejected')}
                >
                    <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
{/*                 {job.job_type === 'freelance' && item.application_status !== 'hired' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.hireButton]}
                        onPress={() => handleHireFreelancer(item.id, item.applicant_username)}
                    >
                        <Text style={styles.actionButtonText}>Hire Freelancer</Text>
                    </TouchableOpacity>
                )}*/}
            </View>
        </View>
    );

    if (loading && applicants.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Applicants for "{jobTitle}"</Text>
            {applicants.length === 0 ? (
                <Text style={styles.noApplicantsText}>No applicants yet.</Text>
            ) : (
                <FlatList
                    data={applicants}
                    renderItem={renderApplicantItem}
                    keyExtractor={item => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
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
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    applicantCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    applicantName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    ratingText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 3,
    },
    badgeText: {
        fontSize: 13,
        color: '#007bff',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    paidDetails: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    detailItem: {
        fontSize: 14,
        marginBottom: 5,
        color: '#555',
    },
    linkText: {
        fontSize: 14,
        color: '#007bff',
        textDecorationLine: 'underline',
        marginBottom: 5,
    },
    subHeader: {
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#444',
    },
    lockedContentText: {
        fontSize: 14,
        color: '#FF5722', // Orange for warning
        fontStyle: 'italic',
        marginTop: 10,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    shortlistButton: {
        backgroundColor: '#007bff', // Blue
    },
    rejectButton: {
        backgroundColor: '#DC3545', // Red
    },
    hireButton: {
        backgroundColor: '#28a745', // Green
    },
    noApplicantsText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginTop: 50,
    },
});

export default EmployerApplicantListScreen;