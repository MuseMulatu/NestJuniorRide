import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // Import useSafeAreaInsets
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { router, Stack } from 'expo-router';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons'; // Added Ionicons, MaterialIcons

// Import CustomModal for consistent alerts
import { CustomModal } from '@/components/modals';

// Define consistent color palette (re-defined for clarity in this file)
const Colors = {
  primaryOrange: "#FF8C00", // Inviting Orange
  secondaryTeal: "#0FB1BB", // Vibrant Teal
  textDark: "#1A202C", // Dark Charcoal
  textMedium: "#4A5568", // Medium Gray
  textLight: "#718096", // Light Gray
  backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC",
  borderLight: "#E2E8F0",
  successGreen: "#22C55E",
  warningRed: "#EF4444",
};

const API_BASE_URL = 'https://app.share-rides.com/api';

// --- Interfaces (Keep these) ---
interface Job {
  id: number;
  title: string;
  description: string;
  job_type: 'full_time' | 'part_time' | 'freelance' | 'remote' | 'hybrid';
  location: string | null;
  salary_range: string | null;
  employer_name: string;
  employer_rating: number | null;
  payment_reliability_score: number;
  verified_badge_status: 'none' | 'applicant_premium' | 'verified_payer' | 'verified_freelancer';
  created_at: string;
  category_name: string;
}

interface Category {
  id: number;
  name: string;
}
// --- End Interfaces ---

const JobsScreen = () => {
  const insets = useSafeAreaInsets(); // Get safe area insets
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastId, setLastId] = useState<number | null>(null);
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]); // Type categories
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const user = auth()?.currentUser;
  const userId = user?.uid;
  const hasFetched = useRef(false);

  const [modalVisible, setModalVisible] = useState(false); // For CustomModal
  const [modalMessage, setModalMessage] = useState(''); // For CustomModal

  const lastErrorTime = useRef<number | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs/categories`);
      setCategories(response.data.categories);
    } catch (error) { // Type error
      console.error('Failed to fetch categories:', error);
      setModalMessage(`Failed to load job categories: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
    }
  }, []);

  const fetchJobs = useCallback(async (refresh = false) => {
    const now = Date.now();
    if (lastErrorTime.current && now - lastErrorTime.current < 10000) {
      console.warn('Too many requests — throttling fetchJobs');
      return;
    }

    setLoading(true);
    try {
      const params: any = { limit: 20 }; // Type params

      if (selectedCategory) {
        params.category_id = selectedCategory;
      }
      if (selectedJobType) {
        params.job_type = selectedJobType;
      }
      if (!refresh && lastId && lastCreatedAt) {
        params.last_id = lastId;
        params.last_created_at = lastCreatedAt;
      }

      const response = await axios.get(`${API_BASE_URL}/jobs`, {
        params, // Pass params object directly
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid}` // Ensure auth token is sent
        }
      });

      const newJobs: Job[] = response.data; // Type newJobs
      setJobs(prev => (refresh ? newJobs : [...prev, ...newJobs]));
      setLastId(newJobs.length > 0 ? newJobs[newJobs.length - 1].id : null);
      setLastCreatedAt(newJobs.length > 0 ? newJobs[newJobs.length - 1].created_at : null);
      setHasMore(newJobs.length === params.limit);
    } catch (error) { // Type error
      console.error('Failed to fetch jobs:', error);
      setModalMessage(`Failed to load jobs: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
      lastErrorTime.current = Date.now();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastId, lastCreatedAt, selectedCategory, selectedJobType, user?.uid]); // Add user.uid to dependencies

  useEffect(() => {
    if (!hasFetched.current) {
      fetchCategories();
      fetchJobs(true);
      hasFetched.current = true;
    }
  }, [fetchCategories, fetchJobs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setJobs([]);
    setLastId(null);
    setLastCreatedAt(null);
    setHasMore(true);
    fetchJobs(true);
  }, [fetchJobs]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobs();
    }
  }, [loading, hasMore, fetchJobs]);

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryOrange} />
      </View>
    );
  };

  const jobTypes = [
    { label: 'Full-time', value: 'full_time' },
    { label: 'Part-time', value: 'part_time' },
    { label: 'Freelance', value: 'freelance' },
    { label: 'Remote', value: 'remote' },
    { label: 'Hybrid', value: 'hybrid' },
  ];

  // --- JobCard Component (Redesigned) ---
  const JobCard = ({ job }: { job: Job }) => {
    const isFreelance = job.job_type === 'freelance';
    const isVerifiedPayer = job.verified_badge_status === 'verified_payer';

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => router.push({ pathname: '/jobs/JobDetailScreen', params: { jobId: job.id } })} 
      >
        <View style={styles.jobCardHeader}>
          <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">{job.title}</Text>
          <View style={styles.jobTypeBadge}>
            <Text style={styles.jobTypeBadgeText}>{job.job_type.replace(/_/g, ' ')}</Text>
          </View>
        </View>

{/*        <View style={styles.employerInfo}>
          <Text style={styles.employerName}>{job.employer_name}</Text>
          {isVerifiedPayer && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.successGreen} />
              <Text style={styles.verifiedBadgeText}>Verified Payer</Text>
            </View>
          )}
          {job.employer_rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={Colors.primaryOrange} />
              <Text style={styles.ratingText}>{job.employer_rating.toFixed(1)}</Text>
            </View>
          )}
        </View>*/}

       {/*Fake job rating */}
        <View style={styles.employerInfo}>
          <Text style={styles.employerName}>{job.employer_name}</Text>
    
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.successGreen} />
              <Text style={styles.verifiedBadgeText}>Verified Payer</Text>
            </View>

            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={Colors.primaryOrange} />
              <Text style={styles.ratingText}> 4.9 </Text>
            </View>
        </View>

        <Text style={styles.jobCategory}>{job.category_name}</Text>

        <View style={styles.jobDetailsRow}>
          <View style={styles.jobDetailItem}>
            <Ionicons name="location-outline" size={16} color={Colors.textMedium} />
            <Text style={styles.jobDetailText}>{job.location || 'AA'}</Text>
          </View>
          <View style={styles.jobDetailItem}>
            <Ionicons name="cash-outline" size={16} color={Colors.textMedium} />
            <Text style={styles.jobDetailText}>{job.salary_range || 'Negotiable'}</Text>
          </View>
        </View>

        <View style={styles.jobCardFooter}>
          <Text style={styles.postDate}>Posted {new Date(job.created_at).toLocaleDateString()}</Text>
          {isFreelance && (
            <View style={styles.freelanceTag}>
              <Text style={styles.freelanceTagText}>Freelance</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  // --- End JobCard Component ---

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} /> 
      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        <Text style={styles.mainScreenTitle}>Jobs</Text>
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/jobs/PostJobScreen')}
          >
            <AntDesign name="plus" size={20} color={Colors.backgroundWhite} />
            <Text style={styles.headerButtonText}>Post a Job</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/jobs/EmployerDashboardScreen')}
          >
            <AntDesign name="dashboard" size={20} color={Colors.backgroundWhite} />
            <Text style={styles.headerButtonText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/jobs/MyApplicationsScreen')}
          >
            <AntDesign name="profile" size={20} color={Colors.backgroundWhite} />
            <Text style={styles.headerButtonText}>My Applications</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Section */}
      <View style={styles.filtersContainer}>
{/*        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <TouchableOpacity
            style={[styles.filterButton, selectedCategory === null && styles.filterButtonActive]}
            onPress={() => { setSelectedCategory(null); onRefresh(); }}
          >
            <Text style={[styles.filterButtonText, selectedCategory === null && styles.filterButtonTextActive]}>All Categories</Text>
          </TouchableOpacity>
          {categories.length > 0 ? categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterButton, selectedCategory === cat.id && styles.filterButtonActive]}
              onPress={() => { setSelectedCategory(cat.id); onRefresh(); }}
            >
              <Text style={[styles.filterButtonText, selectedCategory === cat.id && styles.filterButtonTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          )) : (
            <Text style={styles.noCategoriesText}>Loading categories...</Text>
          )}
        </ScrollView>*/}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <TouchableOpacity
            style={[styles.filterButton, selectedJobType === null && styles.filterButtonActive]}
            onPress={() => { setSelectedJobType(null); onRefresh(); }}
          >
            <Text style={[styles.filterButtonText, selectedJobType === null && styles.filterButtonTextActive]}>All Types</Text>
          </TouchableOpacity>
          {jobTypes.map(type => (
            <TouchableOpacity
              key={type.value}
              style={[styles.filterButton, selectedJobType === type.value && styles.filterButtonActive]}
              onPress={() => { setSelectedJobType(type.value); onRefresh(); }}
            >
              <Text style={[styles.filterButtonText, selectedJobType === type.value && styles.filterButtonTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Job Listings */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.jobListContentContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.secondaryTeal]} tintColor={Colors.secondaryTeal} />
        }
        ListEmptyComponent={
          !loading && jobs.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <MaterialIcons name="search-off" size={60} color={Colors.textLight} />
              <Text style={styles.emptyListText}>No jobs found. Try adjusting filters.</Text>
            </View>
          ) : null
        }
      />

      {/* Custom Modal for Alerts */}
      <CustomModal
        visible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLightGray, // Light gray background for the screen
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  mainScreenTitle: {
    fontSize: 26,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    columnGap: 10, // Space between buttons
  },
  headerButton: {
    backgroundColor: Colors.secondaryTeal, // Teal for action buttons
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.secondaryTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  headerButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 12,
    marginLeft: 5,
  },
  filtersContainer: {
    backgroundColor: Colors.backgroundWhite,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 10, // Space between filters and job list
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    columnGap: 8, // Space between filter buttons
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLightGray,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: Colors.primaryOrange, // Orange for active filter
    borderColor: Colors.primaryOrange,
  },
  filterButtonText: {
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textMedium,
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: Colors.backgroundWhite,
  },
  noCategoriesText: {
    fontFamily: 'Jakarta-Medium',
    color: Colors.textLight,
    fontSize: 14,
    marginLeft: 10,
  },
  jobListContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20, // Ensure space at the bottom
  },
  jobCard: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    flex: 1, // Allow title to take space
    marginRight: 10,
  },
  jobTypeBadge: {
    backgroundColor: Colors.secondaryTeal + '1A', // Light teal background
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  jobTypeBadgeText: {
    color: Colors.secondaryTeal,
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 11,
  },
  employerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    columnGap: 8,
  },
  employerName: {
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textMedium,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successGreen + '1A', // Light green background
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    color: Colors.successGreen,
    fontFamily: 'Jakarta-Medium',
    fontSize: 11,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.primaryOrange,
    marginLeft: 4,
  },
  jobCategory: {
    fontSize: 13,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textLight,
    marginBottom: 12,
  },
  jobDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow items to wrap
    columnGap: 15,
    rowGap: 8,
    marginBottom: 12,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },
  jobDetailText: {
    fontSize: 13,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textDark,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  postDate: {
    fontSize: 12,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textLight,
  },
  freelanceTag: {
    backgroundColor: Colors.primaryOrange + '1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  freelanceTagText: {
    color: Colors.primaryOrange,
    fontFamily: 'Jakarta-SemiBold',
    fontSize: 11,
  },
  footerLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyListText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    textAlign: 'center',
  },
});

export default JobsScreen;