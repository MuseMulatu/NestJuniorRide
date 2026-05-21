// src/components/InAppApplicationFormScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { useRouter, useLocalSearchParams } from "expo-router";

const InAppApplicationFormScreen = ({ route, navigation }) => {
    const API_BASE_URL = 'https://app.share-rides.com';
    const user = auth()?.currentUser;
    const userId = user?.uid;
    const [applicationText, setApplicationText] = useState('');
    const [portfolioLink, setPortfolioLink] = useState('');
    const [resumeLink, setResumeLink] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
const { jobId, jobTitle, experienceYears, expertiseLevel } = useLocalSearchParams();

    const handleSubmitApplication = async () => {
        if (!applicationText) {
            Alert.alert('Missing Field', 'Please write your application text.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                application_text: applicationText,
                portfolio_link: portfolioLink || null,
                resume_link: resumeLink || null,
                // Experience and expertise are already collected in QuickQuestionsModal
                // We could pass them from JobDetailScreen if needed for a combined form,
                // but the current backend design implies they are collected *before* this full form.
                // For this example, we assume QuickQuestionsModal already made the initial /apply call.
                // This screen only provides additional details if the initial call was for external instructions
                // or if it's an 'in_app' type. If it's a separate full application flow after quick questions,
                // then the initial /apply endpoint needs to be able to accept partial data, and then
                // this form would update it.
                // For simplicity: This screen represents the *full* in-app application submission.
                // The previous QuickQuestionsModal was just for *initial* stats capture.
                // We'll update the previous `handleQuestionsSubmit` in `JobDetailScreen` to only call this
                // for 'in_app' type. If `external_instructions`, it just shows the alert.
                // This means this screen *also* needs to send the quick question data.
            };

            // Re-sending quick question data to ensure it's there if this is the primary submission point
            // For now, let's assume the quick questions are submitted in the initial `/apply` call
            // and this form is for additional details *after* that initial step.
            // If this is truly the primary submission:
            // You'd need to modify the `/api/jobs/:id/apply` endpoint to be idempotent or handle
            // updates if an application for that user/job already exists.
            // Or, you could have a separate `PATCH /api/job_applications/:id` endpoint for this screen.

            // Let's assume for simplicity, the `JobDetailScreen`'s `handleQuestionsSubmit` already
            // created the `job_application` entry and we're now *updating* it.
            // This would require passing the `applicationId` from `JobDetailScreen`'s `response.data.applicationId`
            // and using a new PATCH endpoint.

            // Given the current backend `/apply` endpoint, it's designed for a single submission.
            // Let's refine the flow:
            // 1. User clicks "Apply" -> QuickQuestionsModal opens.
            // 2. User submits quick questions -> `POST /api/jobs/:id/apply` is called.
            //    This populates `experience_years` and `expertise_level`.
            // 3. If `how_to_apply_type` is 'in_app', then navigate *here* (InAppApplicationFormScreen)
            //    passing the `applicationId` that was returned from step 2.
            // 4. This screen then makes a `PATCH` request to update the specific application.

            // For now, let's make a simplified assumption: This screen is where the *full*
            // application (including the text, links) is submitted. The quick questions
            // from `JobDetailScreen` might be for *initial* pre-screening stats only.
            // This would mean the `job_applications` table needs to be able to be created with
            // just `experience_years` and `expertise_level` initially, then updated later.
            // For the provided backend, the `/apply` endpoint takes `application_text` etc.
            // So, `JobDetailScreen` should pass `experience_years`, `expertise_level`, and the rest
            // of the form data to this screen, and this screen makes the *single* `/apply` call.

            // REVISED PLAN: `JobDetailScreen` will pass quick questions *and* the job type
            // to this screen IF `how_to_apply_type` is 'in_app'. This screen then collects
            // all info and makes the `/api/jobs/:id/apply` call.

            const response = await axios.post(`${API_BASE_URL}/api/jobs/${jobId}/apply`, {
                application_text: applicationText,
                applicantId: userId,
                portfolio_link: portfolioLink,
                resume_link: resumeLink,
                // Add `experience_years` and `expertise_level` passed from previous screen
                experience_years: experienceYears,
                expertise_level: expertiseLevel,
                custom_question_responses: null // If no custom questions on frontend, send empty obj
            });

            Alert.alert('Success', response.data.message);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(root)/(tabs)/home');
      } // Go back to job detail or application list
        } catch (error) {
            console.error('Application Submission Error:', error.response?.data || error.message);
            Alert.alert('Submission Failed', error.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Submit Your Application</Text>
            <Text style={styles.subHeader}>For Job: {jobTitle}</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Your Application Text *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={applicationText}
                    onChangeText={setApplicationText}
                    placeholder="Tell us why you're a great fit for this role..."
                    multiline
                    numberOfLines={10}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Portfolio Link (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={portfolioLink}
                    onChangeText={setPortfolioLink}
                    placeholder="e.g., https://yourportfolio.com"
                    keyboardType="url"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>CV Link </Text>
                <TextInput
                    style={styles.input}
                    value={resumeLink}
                    onChangeText={setResumeLink}
                    placeholder="e.g., https://yourdrive.com/resume.pdf"
                    keyboardType="url"
                    autoCapitalize="none"
                />
            </View>

            <Text style={styles.hiddenInfo}>Experience: {experienceYears || 'N/A'}</Text>
            <Text style={styles.hiddenInfo}>Expertise: {expertiseLevel || 'N/A'}</Text>


            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitApplication}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitButtonText}>Submit Application</Text>
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
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    subHeader: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        color: '#555',
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
        minHeight: 150,
        textAlignVertical: 'top',
    },
    hiddenInfo: {
        fontSize: 12,
        color: '#aaa', // Make it less prominent
        textAlign: 'right',
        marginBottom: 5,
    },
    submitButton: {
        backgroundColor: '#FF8C00',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default InAppApplicationFormScreen;