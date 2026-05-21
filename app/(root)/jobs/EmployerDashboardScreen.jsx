// src/screens/Jobs/EmployerDashboardScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { userProfileById } from "@/lib/utils";
import { router, useLocalSearchParams, Stack } from "expo-router";

const EmployerDashboardScreen = ({ navigation }) => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const user = auth()?.currentUser;
    const userId = user?.uid;
    const [myJobs, setMyJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userJobPostCount, setUserJobPostCount] = useState(0);

    const FREE_POST_LIMIT = 3; // Keep in sync with backend

    const fetchEmployerJobs = useCallback(async () => {
        setLoading(true);
        try {
            // Re-fetch user profile to get latest job post count
            const userProfile = await userProfileById(userId);
            setUserJobPostCount(userProfile.employer_job_post_count);

            // Fetch jobs posted by this employer
            const response = await axios.get(`${API_BASE_URL}/api/jobs?employerId=${userId}`);
            setMyJobs(response.data);
        } catch (error) {
            console.error('Error fetching employer jobs:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load your posted jobs.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userProfileById]);

    useEffect(() => {
            fetchEmployerJobs(); // Refresh data when screen is focused
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchEmployerJobs();
    }, [fetchEmployerJobs]);

    const renderJobItem = ({ item }) => (
        <TouchableOpacity
            style={styles.jobCard}
            onPress={() =>
      router.push({
      pathname: `/jobs/EmployerApplicantListScreen`,
      params: { jobId: item.id, jobTitle: item.title, isJobPaid: item.is_paid_post}
    })}
        >
            <Text className="font-JakartaBold" style={styles.jobTitle}>{item.title}</Text>
            <Text className="font-Jakarta" style={styles.jobStatus}>Status: {item.status.toUpperCase()}</Text>
            <Text className="font-Jakarta" style={styles.jobType}>Type: {item.job_type.replace('_', ' ').toUpperCase()}</Text>
            <Text className="font-JakartaBold" style={styles.paidStatus}>
                {item.is_paid_post ? 'Paid Post' : 'Free Post'}
            </Text>
            <View style={styles.jobActions}>
                <Text className="font-JakartaBold" style={styles.viewApplicantsText}>View Applicants {'>>'}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading && myJobs.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Your Jobs' }} />
            <Text className="font-JakartaBold" style={styles.header}>Employer Dashboard</Text>
            <Text className="font-Jakarta" style={styles.infoText}>
                Jobs Posted: {userJobPostCount} / {FREE_POST_LIMIT} free limit
            </Text>
            <TouchableOpacity
                style={styles.postNewJobButton}
                onPress={() => navigation.navigate('PostJob')}
            >
                <Text style={styles.postNewJobButtonText}>Post New Job</Text>
            </TouchableOpacity>

            <Text className="font-JakartaMedium" style={styles.subHeader}>Your Posted Jobs</Text>
            {myJobs.length === 0 ? (
                <Text className="font-JakartaBold" style={styles.noJobsText}>You haven't posted any jobs yet.</Text>
            ) : (
                <FlatList
                    data={myJobs}
                    renderItem={renderJobItem}
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
        fontSize: 24,
        // fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 15,
    },
    postNewJobButton: {
        backgroundColor: '#28a745', // Green
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    postNewJobButtonText: {
        color: '#fff',
        fontSize: 18,
     //   fontWeight: 'bold',
    },
    subHeader: {
        fontSize: 20,
    //    fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    jobCard: {
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
    jobTitle: {
        fontSize: 18,
   //     fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    jobStatus: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    jobType: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    paidStatus: {
        fontSize: 14,
    //    fontWeight: 'bold',
        color: '#007bff',
        marginBottom: 10,
    },
    jobActions: {
        alignItems: 'flex-end',
    },
    viewApplicantsText: {
        fontSize: 14,
        color: '#007bff',
    //    fontWeight: 'bold',
    },
    noJobsText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginTop: 50,
    },
});

export default EmployerDashboardScreen;