// src/screens/Jobs/JobDetailScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { router, useLocalSearchParams, Stack } from "expo-router";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal, Button, Share } from 'react-native';
import axios from 'axios';
import QuickQuestionsModal from '@/components/QuickQuestionsModal'; // You'll create this
import SubscribeToPremiumModal from '@/components/SubscribeToPremiumModal'; // You'll create this
import { userProfileById } from "@/lib/utils";
import auth from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';

const JobDetailScreen = ({ route, navigation }) => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const user = auth()?.currentUser;
    const userId = user?.uid;
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQuickQuestionsModal, setShowQuickQuestionsModal] = useState(false);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
   // const { authState, fetchUserProfile } = useContext(AuthContext); // Assuming authState has user data

    const onShare = async () => {
        try {
            const result = await Share.share({
                // The message will contain the deep link URL
                message: `Check out this job on Hulum Super App: https://app.share-rides.com/jobs/${jobId}`,
            });
            // You can add logic here based on the result if needed
        } catch (error) {
          //  Alert.alert(error.message);
        }
    };

APPLICANT_PREMIUM_PRICE_BIRR= 99;
const { jobId } = useLocalSearchParams();
    useEffect(() => {
        const fetchJobDetails = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}`);
                setJob(response.data);
            } catch (error) {
                console.error('Error fetching job details:', error);
               // Alert.alert('Error', 'Failed to load job details.');
               // router.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [jobId]);


        const handleApplyPress = async () => {
        // Check if applicant is premium for freelance jobs
        if (job.job_type === 'freelance') {
            // Re-fetch user profile to get latest premium status
            // const userProfile = await userProfileById(userId);
            // if (!userProfile.is_applicant_premium) {
            //     setShowSubscribeModal(true);
            //     return;
            // }
        }

        // Always show quick questions first
        setShowQuickQuestionsModal(true);
    };

 const handleQuestionsSubmit = async (experienceYears, expertiseLevel) => {
        setShowQuickQuestionsModal(false); // Close the modal

        // If 'external_instructions', just show instructions
        if (job.how_to_apply_type === 'external_instructions') {
            // No backend call here, as application is external.
            // However, you might want to log that the user "unlocked" instructions for statistics.
            // For now, simply show the instructions.
            Alert.alert(
                'How to Apply',
                job.external_instructions || 'No specific instructions provided.',
                [{ text: 'OK' }]
            );
        } else if (job.how_to_apply_type === 'in_app') {
            // If 'in_app', navigate to the full application form, passing the collected quick questions
                router.push({
      pathname: `/jobs/InAppApplicationFormScreen`,
      params: { jobId: job.id,
                jobTitle: job.title, 
                experienceYears: experienceYears,
                expertiseLevel: expertiseLevel}, 
    });

        }
    };

    const handleSubscribeSuccess = () => {
        setShowSubscribeModal(false);
        Alert.alert('Subscription Success', 'You are now a premium applicant!');
 //       userProfileById(userId); // Refresh user data after subscription
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!job) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Job not found.</Text>
            </View>
        );
    }

    const isEmployerOfThisJob = userId === job.employer_id ;
    const showApplicantStats = isEmployerOfThisJob && job.is_paid_post;

    return (
        <ScrollView style={styles.container}>
        <Stack.Screen options={{ title: 'Details of the Job' }} />
            <View style={styles.jobHeader}>
                <Text className="font-JakartaBold" style={styles.jobTitle}>{job.title}</Text>
                <Text className="font-JakartaLight" style={styles.employerName}>{job.employer_name}</Text>
                {job.employer_rating && (
                    <Text className="font-Jakarta" style={styles.ratingText}>Employer Rating: {job.employer_rating}/5</Text>
                )}
                {job.payment_reliability_score !== undefined && job.job_type === 'freelance' && (
                    <Text className="font-Jakarta" style={styles.ratingText}>Payment Reliability Score: {job.payment_reliability_score}</Text>
                )}
                 {job.verified_badge_status !== 'none' && (
                    <Text className="font-JakartaBold" style={styles.badgeText}>
                        {job.verified_badge_status === 'applicant_premium' && 'Premium Applicant '}
                        {job.verified_badge_status === 'verified_payer' && 'Verified Payer '}
                        {job.verified_badge_status === 'verified_freelancer' && 'Verified Freelancer '}
                    </Text>
                )}
            </View>

            <View style={styles.section}>
                <Text className="font-JakartaBold" style={styles.sectionTitle}>Details</Text>
                <Text className="font-JakartaSemiBold" style={styles.detailItem}><Text style={styles.detailLabel}>Category:</Text> {job.category_name}</Text>
                <Text className="font-JakartaSemiBold" style={styles.detailItem}><Text style={styles.detailLabel}>Job Type:</Text> {job.job_type.replace('_', ' ').toUpperCase()}</Text>
                {job.location && <Text className="font-Jakarta" style={styles.detailItem}><Text style={styles.detailLabel}>Location:</Text> {job.location}</Text>}
                {job.salary_range && <Text className="font-Jakarta" style={styles.detailItem}><Text style={styles.detailLabel}>Salary:</Text> {job.salary_range}</Text>}
            </View>

            <View style={styles.section}>
                <Text className="font-JakartaSemiBold" style={styles.sectionTitle}>Description</Text>
                <Text className="font-Jakarta" style={styles.descriptionText}>{job.description}</Text>
            </View>

{/*                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Applicant Statistics (For Employer)</Text>
                    <Text style={styles.detailItem}>Total Applicants: {job.applicant_stats.total_applicants}</Text>
                    <Text style={styles.detailItem}>Average Experience: {job.applicant_stats.avg_experience_years} years</Text>
                    <Text style={styles.detailItem}>Expertise Breakdown:</Text>
                    <Text style={styles.subDetailItem}>  - Beginner: {job.applicant_stats.expertise_breakdown.beginner_percent}%</Text>
                    <Text style={styles.subDetailItem}>  - Intermediate: {job.applicant_stats.expertise_breakdown.intermediate_percent}%</Text>
                    <Text style={styles.subDetailItem}>  - Expert: {job.applicant_stats.expertise_breakdown.expert_percent}%</Text>
                </View>*/}

            <TouchableOpacity style={styles.applyButton} onPress={handleApplyPress}>
                <Text className="font-JakartaBold" style={styles.applyButtonText}>
                    {job.how_to_apply_type === 'external_instructions' ? 'Unlock Application Instructions' : 'Apply Now'}
                </Text>
            </TouchableOpacity>

        <TouchableOpacity onPress={onShare} style={styles.footerButton}>
          <Ionicons name="share-outline" size={20} color="#4A5568" />
          <Text style={styles.footerButtonText}>share</Text>
        </TouchableOpacity>

            <QuickQuestionsModal
                visible={showQuickQuestionsModal}
                onClose={() => setShowQuickQuestionsModal(false)}
                onSubmit={handleQuestionsSubmit}
            />

            <SubscribeToPremiumModal
                visible={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
                onSubscribeSuccess={handleSubscribeSuccess}
                santimPayPrice={APPLICANT_PREMIUM_PRICE_BIRR} 
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        padding: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    jobHeader: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    jobTitle: {
        fontSize: 24,
    //    fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    employerName: {
        fontSize: 16,
        color: '#555',
        marginBottom: 5,
    },
    ratingText: {
        fontSize: 14,
        color: '#777',
        marginBottom: 2,
    },
    badgeText: {
        fontSize: 13,
        color: '#007bff',
   //     fontWeight: 'bold',
        marginTop: 5,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
   //     fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    detailItem: {
        fontSize: 15,
        marginBottom: 5,
        color: '#555',
    },
    detailLabel: {
  //      fontWeight: 'bold',
        color: '#333',
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#666',
    },
    applyButton: {
        backgroundColor: '#FF8C00', // Green apply button
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 4,
    },
    footerButtonText: {
        fontSize: 14,
        fontFamily: 'Jakarta-SemiBold',
        color: "#4A5568",
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 18,
   //     fontWeight: 'bold',
    },
    // Styles for modals can be defined in their respective component files
});

export default JobDetailScreen;