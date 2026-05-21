// src/screens/Jobs/MyApplicationsScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { router, useLocalSearchParams, Stack } from "expo-router";

const MyApplicationsScreen = () => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const user = auth()?.currentUser;
    const userId = user?.uid;

    const fetchMyApplications = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/${userId}/applications`);
            setApplications(response.data);
        } catch (error) {
            console.error('Error fetching my applications:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load your applications.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMyApplications();
    }, [fetchMyApplications]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMyApplications();
    }, [fetchMyApplications]);

    const renderApplicationItem = ({ item }) => (
        <View style={styles.applicationCard}>
            <Text style={styles.jobTitle}>{item.job_title}</Text>
            <Text style={styles.employerName}>Posted by: {item.employer_name}</Text>
            <Text style={styles.jobType}>Type: {item.job_type.replace('_', ' ').toUpperCase()}</Text>
            <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusBadge, styles[item.application_status]]}>
                    {item.application_status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.appliedAt}>Applied on: {new Date(item.applied_at).toLocaleDateString()}</Text>
        </View>
    );

    if (loading && applications.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
        <Stack.Screen options={{ title: 'Your Applications' }} />
            <Text style={styles.header}>My Job Applications</Text>
            {applications.length === 0 ? (
                <Text style={styles.noApplicationsText}>You haven't applied for any jobs yet.</Text>
            ) : (
                <FlatList
                    data={applications}
                    renderItem={renderApplicationItem}
                    keyExtractor={item => item.application_id.toString()}
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
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    applicationCard: {
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
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    employerName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    jobType: {
        fontSize: 13,
        color: '#777',
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 5,
        color: '#444',
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
    },
    appliedAt: {
        fontSize: 12,
        color: '#888',
        textAlign: 'right',
        marginTop: 5,
    },
    // Status specific styles
    submitted: { backgroundColor: '#FF8C00' }, // Amber
    viewed: { backgroundColor: '#17A2B8' },    // Info Blue
    shortlisted: { backgroundColor: '#007bff' }, // Primary Blue
    rejected: { backgroundColor: '#DC3545' },   // Red
    hired: { backgroundColor: '#28A745' },      // Green
    noApplicationsText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginTop: 50,
    },
});

export default MyApplicationsScreen;