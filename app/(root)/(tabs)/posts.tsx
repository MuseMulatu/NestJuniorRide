// @/app/(root)/(tabs)/posts.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Text, View, TouchableOpacity, FlatList, ActivityIndicator, Modal, StyleSheet, TextInput, RefreshControl, Switch, Alert, Image } from "react-native";
import { useRouter } from 'expo-router';
import { useShareUsernameStore, usePhoneNumberStore, useLanguageStore } from "@/store"; // Add useLanguageStore
import { Ionicons, AntDesign, MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import auth from '@react-native-firebase/auth';
import { CustomAlertModal, ReportModal, translations } from "@/components/modals";
import PostItem from '@/components/PostItem';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import firestore from '@react-native-firebase/firestore'; // Assuming Firestore is used for reports
import { checkFollowing, followUser } from "@/lib/localDB";
import uuid from 'react-native-uuid';

// --- Define colors and constants here for a professional look ---
const API_BASE_URL = 'https://app.share-rides.com/api';
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';

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

const MemoizedPostItem = React.memo(PostItem);

const PostsPage = ({ embeddedView = false }) => {
  const router = useRouter();
  const user = auth()?.currentUser;
  const userId = user?.uid;

  const { language, setLanguage } = useLanguageStore();
  const { shareUsername } = useShareUsernameStore();
  const { profileImageUrl } = usePhoneNumberStore();

  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: "", message: "", imageSource: null, });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('neus');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Create Post Modal State ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState('');
  const [neusSearchTerm, setNeusSearchTerm] = useState('');
  const [neusSearchResults, setNeusSearchResults] = useState([]);
  const [selectedNeus, setSelectedNeus] = useState(null);
  const [isPaidPost, setIsPaidPost] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
// ADD these new state variables for the media URLs:
const [mediaUrls, setMediaUrls] = useState<string[]>([]);
const [currentUrl, setCurrentUrl] = useState(''); // For the text input
  const [createdPosts, setCreatedPosts] = useState([]); // To track recent posts for rate limiting

const [currentPage, setCurrentPage] = useState(1);
const [canLoadMore, setCanLoadMore] = useState(true);
const SUBSCRIBER_IMAGE = 'https://homehealthfundamentals.com/wp-content/uploads/2011/03/subscribersonly.png'
// --- 1. STATE FOR MENU AND MODALS ---
    const [openMenuId, setOpenMenuId] = useState(null); // Tracks which post menu is open
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingPost, setReportingPost] = useState(null);

  // --- Data Fetching ---
const fetchPosts = async (pageToFetch) => {
    // In a real implementation, you would get this from your local Expo SQLite database.
    // For now, it's an empty array placeholder.
    const followingIdsFromDb = await checkFollowing();
    try {
        const response = await fetch(`${API_BASE_URL}/posts/fetch?page=${pageToFetch}&limit=20`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId, // Make sure userId is available in this scope
            },
            body: JSON.stringify({ following_ids: followingIdsFromDb || [ ] }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch posts: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.posts || []; // Return the array of posts, or an empty array if none
    } catch (error) {
        console.error("Error in fetchPosts:", error);
       // Alert.alert("Error", "Could not fetch the feed. Please try again.");
        return []; // Return empty array on error
    }
};

// Initial data load when the component mounts.
useEffect(() => {
   setLoading(true);
    fetchPosts(1).then(initialPosts => {
        setPosts(initialPosts);
        setCurrentPage(1);
        setCanLoadMore(true); // Reset on initial load
        setLoading(false);
    });
}, []);

// Function for "pull-to-refresh".
const handleRefresh = async () => {
    setIsRefreshing(true);
    const initialPosts = await fetchPosts(1); // Always fetch the first page on refresh
    setPosts(initialPosts);
    setCurrentPage(1);
    setCanLoadMore(true); // Always assume there's more to load after a refresh
    setIsRefreshing(false);
};

// Function for infinite scrolling.
const handleLoadMore = async () => {
    if (isLoadingMore || !canLoadMore) {
        return; // Don't fetch if already loading or if we know there's no more data
    }

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const newPosts = await fetchPosts(nextPage);

    if (newPosts.length > 0) {
        // --- FIX: Prevent duplicate keys by filtering new posts ---
        setPosts(prevPosts => {
            const existingPostIds = new Set(prevPosts.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingPostIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
        });
        setCurrentPage(nextPage);
    } else {
        // If the API returns an empty array, it means we've reached the end.
        setCanLoadMore(false);
    }
    setIsLoadingMore(false);
};


  // --- Search Logic (Simplified) ---
   const handleSearch = async (text) => {
        setSearchQuery(text);
        if (text.length > 1) {
            setIsSearching(true);
            try {
              const endpoint = searchMode === 'neus' ? `/neus/search?term=${text}` : `/users/search/${text}`;
              const response = await fetch(`${API_BASE_URL}${endpoint}`);
                const data = await response.json();
                setSearchResults(data);
            } catch (error) {
                console.error(`Error searching ${searchMode}:`, error);
            }
        } else {
            setIsSearching(false);
            setSearchResults([]);
        }
    };

  // Create a new post
  const handleCreatePost = async () => {
    // Replace with actual locale, `t` translation object
    const t = {
        emptyFieldsError: "Title, and content cannot be empty.",
        lengthExceedsError: "Title cannot exceed 60 characters and content cannot exceed 300 characters.",
    };

    const now = Math.floor(Date.now() / 1000);
    const recentPosts = createdPosts.filter(post => now - post.createdAt < 3600); // Filter posts created in the last hour

    if (!title.trim() || !content.trim() ) {
      Alert.alert("Empty Fields", t.emptyFieldsError);
      return; // Return early, don't close modal here
    }

    if (title.length > 60 || content.length > 300) {
      Alert.alert("Whoops", t.lengthExceedsError);
      return; // Return early, don't close modal here
    }

    const currentUser = auth().currentUser;
    if (!currentUser) {
        Alert.alert("Error", "You must be logged in to create a post.");
        return;
    }
    const newPostId = uuid.v4(); // Generate UUID on frontend
    console.log("newPostId", newPostId)
    const author = shareUsername || currentUser?.displayName || "Anonymous";
    const posterId = currentUser?.uid;
    // Assuming you have userLatitude and userLongitude from a location context
    // For now, using placeholders
    const userLatitude = 0;
    const userLongitude = 0;
    const coordinates = [userLatitude, userLongitude];
    const authorAvatar = profileImageUrl || currentUser?.photoURL || DEFAULT_AVATAR;
// --- KEY CHANGE: Convert the mediaUrls array to a JSON string ---
    const postImagePayload = mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null;
console.log("postImagePayload", postImagePayload, "mediaUrls", mediaUrls)
    const newPost = {
      postId: newPostId, // Include ID here for consistency, though backend will also generate
      title,
      content,
      neus_id: selectedNeus ? selectedNeus.id : null, // Send ID if selected, otherwise null
      author,
      authorAvatar,
      postImage: postImagePayload, // Use the JSON string payload
      karma: 0,
      posterId,
      latitude: userLatitude, // Pass latitude and longitude separately if backend expects them
      longitude: userLongitude,
      is_paid: isPaidPost,
      is_anonymous: isAnonymous,
      // Add company and location if category is 'jobs'
  //    ...(activeTab === 'jobs' && { company: "Your Company", location: "Your Location" }) // Placeholder values
    };

    try {
      // Use API_BASE_URL for the post endpoint
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId, // Ensure user ID is sent for authorization
        },
        body: JSON.stringify(newPost),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const createdPostResponse = await response.json(); // Backend might return the created post or just success message
   //   console.log("Post created response:", createdPostResponse);

      // Re-fetch posts to get the newly created one and update list
      // Or, if backend returns the full post object, prepend it directly
      // Assuming backend returns { message, id, timestamp }
      const actualCreatedPost = {
          ...newPost,
          id: createdPostResponse.id || newPostId, // Use backend's ID if provided
          created_at: createdPostResponse.timestamp || new Date().toISOString(), // Use backend's timestamp if provided
          content: isAnonymous ? "[ANONYMOUS]" : content, // Adjust content if anonymous
      };

      setPosts(prevPosts => [actualCreatedPost, ...prevPosts]);
      setCreatedPosts([...recentPosts, { ...actualCreatedPost, createdAt: now }]); // Track for rate limiting

      // --- Reset all modal states, including the new media states ---
      setTitle("");
      setContent("");
      setSelectedNeus(null);
      setNeusSearchTerm("");
      setNeusSearchResults([]);
      setIsPaidPost(false);
      setIsAnonymous(false);
      setMediaUrls([]); // Reset the media URLs array
      setCurrentUrl(''); // Reset the input field
      setShowCreateModal(false);

      setModalData({
        title: "Success",
        message: "Post created successfully!",
        imageSource: null,
      });
      setAlertModalVisible(true);

    } catch (error) {
      console.error("Error creating post:", error);
      setModalData({
        title: "Whoops",
        message: `Failed to create post. Please try again. Details: ${error.message}`,
        imageSource: null,
      });
      setAlertModalVisible(true);
    }
  };

const renderPostItem = useCallback(({ item }) => (
        <MemoizedPostItem
            item={item}
            currentUserId={userId}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            reportModalVisible={reportModalVisible}
            setReportModalVisible={setReportModalVisible}
            reportingPost={reportingPost}
            setReportingPost={setReportingPost}
            setPosts={setPosts}
            setModalData={setModalData}
            setAlertModalVisible={setAlertModalVisible}
         //   onEdit={handleEditPost}
         //   onDelete={handleDeletePost}
           // onVote={handleVotePost}
         //   onOpenComments={handleOpenComments}
            language={language} // FIX: Pass language as a prop
        />
    ), [userId, openMenuId, reportModalVisible, reportingPost, language]);


  const SearchHeader = () => (
      <View style={styles.searchContainer}>
          <View style={styles.searchModeToggle}>
              <TouchableOpacity onPress={() => setSearchMode('neus')} style={[styles.toggleButton, searchMode === 'neus' && styles.activeToggle]}>
                  <Text style={styles.toggleText}>ንዑስ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSearchMode('users')} style={[styles.toggleButton, searchMode === 'users' && styles.activeToggle]}>
                  <Text style={styles.toggleText}>Users</Text>
              </TouchableOpacity>
          </View>
          <TextInput
              placeholder={`Search for ${searchMode==='neus' ? 'ንዑስ' : 'users'} ...`}
              value={searchQuery}
              onChangeText={handleSearch}
              style={styles.searchInput}
          />
      </View>
  );
      // --- 1. MENU ACTION HANDLERS ---
    const handleReport = async (reason) => {
        console.log(`Reporting post ${reportingPost?.id} for: ${reason}`);
        try {
            // Mock Firestore submission
            await firestore().collection('reports').add({
                postId: reportingPost?.id,
                reportedBy: userId,
                reason: reason,
                timestamp: firestore.FieldValue.serverTimestamp(),
            });
            setReportModalVisible(false);
            setOpenMenuId(null)
            Alert.alert(translations[language].reportSuccessTitle, translations[language].reportSuccessMessage);
        } catch (error) {
            console.error("Error submitting report:", error);
          //  Alert.alert("Error", "Could not submit report.");
        }
    };

    const renderSearchItem = ({ item }) => {
        const isNeus = 'name' in item;
        return (
            <TouchableOpacity
                style={styles.searchItem}
                onPress={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  if (isNeus) {
                      router.push({ pathname: '/(root)/neus-page', params: { neusId: item.id, neusName: item.name } });
                  } else {
                      router.push({ pathname: "/(root)/profile-detail", params: { userId: item.id } });
                  }
                }}
            >
                <Text>{isNeus ? `n/${item.name}` : item.username}</Text>
            </TouchableOpacity>
        );
    };
  if (loading) {
      return (
        <View style={styles.container}>
          <SearchHeader />
          <ActivityIndicator style={{ flex: 1, marginTop: 50 }} size="large" />
        </View>
      );
  }

  return (
      <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <Text style={styles.headerTitle}>Hulum</Text>
                <TouchableOpacity style={styles.createPostButton} onPress={() => setShowCreateModal(true)}>
                    <Ionicons name="add" size={24} color={Colors.backgroundWhite} />
                </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
                <View style={styles.searchModeToggle}>
                    <TouchableOpacity onPress={() => setSearchMode('neus')} style={[styles.toggleButton, searchMode === 'neus' && styles.activeToggle]}>
                        <Text style={[styles.toggleText, searchMode === 'neus' && styles.activeToggleText]}>Neus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSearchMode('users')} style={[styles.toggleButton, searchMode === 'users' && styles.activeToggle]}>
                        <Text style={[styles.toggleText, searchMode === 'users' && styles.activeToggleText]}>Users</Text>
                    </TouchableOpacity>
                </View>
                <TextInput
                    placeholder={`Search for ${searchMode==='neus' ? 'ንዑስ' : 'users'} ...`}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    style={styles.searchInput}
                    placeholderTextColor={Colors.textLight}
                />
            </View>
            {isSearching ? (
                <FlatList
                    data={searchResults}
                    renderItem={renderSearchItem}
                    keyExtractor={(item) => `${searchMode}-${item.id}`}
                    style={styles.searchResultsContainer}
                />
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPostItem}
                    keyExtractor={(item) => item.id} // Ensure key is a stable unique ID
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} /> : null}
                    initialNumToRender={10}
                    windowSize={5}
                    // removed removeClippedSubviews for potentially better initial rendering
                />
            )}
     
     <CustomAlertModal
        visible={alertModalVisible}
        title={modalData.title}
        message={modalData.message}
        imageSource={modalData.imageSource}
        onClose={() => setAlertModalVisible(false)}
      />
{reportModalVisible && (
  <ReportModal
    reportModalVisible={reportModalVisible}
    handleReport={handleReport}
    onClose={() => setReportModalVisible(false)}
    language={language}
  />
)}
  <Modal
                animationType="slide"
                transparent={false}
                visible={showCreateModal}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <SafeAreaView style={createModalStyles.modalContainer}>
                    <View style={createModalStyles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                            <Ionicons name="close" size={30} color={Colors.textMedium} />
                        </TouchableOpacity>
                        <Text style={createModalStyles.modalTitle}>Create New Post</Text>
                        <TouchableOpacity onPress={handleCreatePost} style={createModalStyles.postButton}>
                            <Text style={createModalStyles.postButtonText}>Post</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={createModalStyles.titleInput} maxLength={60} placeholderTextColor={Colors.textLight} />
                    <TextInput placeholder="What's on your mind?" value={content} onChangeText={setContent} multiline style={createModalStyles.contentInput} maxLength={300} placeholderTextColor={Colors.textLight} />
                      {/* --- NEW MEDIA INPUT SECTION --- */}
        <View style={createModalStyles.mediaInputContainer}>
            <TextInput
                placeholder="Add image or YouTube URL"
                value={currentUrl}
                onChangeText={setCurrentUrl}
                style={createModalStyles.input}
                editable={mediaUrls.length === 0 || !mediaUrls[0].includes('youtube')} // Disable if a video is already added
            />
            <TouchableOpacity
                style={createModalStyles.addButton}
                onPress={() => {
                    if (currentUrl.trim()) {
                        // Logic to prevent mixing videos and multiple images
                        if (currentUrl.includes('youtube') && mediaUrls.length > 0) {
                            Alert.alert("Media Error", "You can only add one YouTube video per post.");
                            return;
                        }
                        if (mediaUrls.some(url => url.includes('youtube'))) {
                             Alert.alert("Media Error", "You cannot add images when a video has been added.");
                             return;
                        }
                        setMediaUrls([...mediaUrls, currentUrl.trim()]);
                        setCurrentUrl('');
                    }
                }}
            >
                <Text style={createModalStyles.addButtonText}>Add</Text>
            </TouchableOpacity>
        </View>

        {/* Display for added media URLs */}
        <View>
            {mediaUrls.map((url, index) => (
                <View key={index} style={createModalStyles.mediaUrlItem}>
                    <Text numberOfLines={1} style={{ flex: 1 }}>{url}</Text>
                    <TouchableOpacity onPress={() => {
                        setMediaUrls(mediaUrls.filter((_, i) => i !== index));
                    }}>
                        <Ionicons name="close-circle" size={20} color="red" />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
                   <TextInput placeholder="Search for a Neus Community (e.g., 'vent', 'story-time')" value={neusSearchTerm} onChangeText={async (text) => {
                        setNeusSearchTerm(text);
                        if (text.length > 1) {
                            try {
                                const response = await fetch(`${API_BASE_URL}/neus/search?term=${text}`);
                                const data = await response.json();
                                setNeusSearchResults(data);
                            } catch (error) {
                                console.error("Error searching Neus:", error);
                            }
                        } else {
                            setNeusSearchResults([]);
                        }
                    }} style={createModalStyles.searchInput} placeholderTextColor={Colors.textLight} />
                    {neusSearchResults.length > 0 && (
                        <FlatList
                            data={neusSearchResults}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={createModalStyles.neusSearchResultItem} onPress={() => {
                                    setSelectedNeus(item);
                                    setNeusSearchTerm(item.name);
                                    setNeusSearchResults([]);
                                }}>
                                    <Text style={createModalStyles.neusSearchResultText}>n/{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            style={createModalStyles.neusSearchResultsList}
                        />
                    )}
                    {selectedNeus && (
                        <View style={createModalStyles.selectedNeusContainer}>
                            <Text style={createModalStyles.selectedNeusText}>Selected Neus community: n/{selectedNeus.name}</Text>
                            <TouchableOpacity onPress={() => setSelectedNeus(null)}>
                                <Ionicons name="close-circle" size={20} color={Colors.textLight} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={createModalStyles.optionsContainer}>
                        <TouchableOpacity style={createModalStyles.optionButton} onPress={() => setIsPaidPost(!isPaidPost)}>
                            <Ionicons name={isPaidPost ? "checkbox" : "square-outline"} size={24} color={Colors.secondaryTeal} />
                            <Text style={createModalStyles.optionText}>Paid Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={createModalStyles.optionButton} onPress={() => setIsAnonymous(!isAnonymous)}>
                            <Ionicons name={isAnonymous ? "checkbox" : "square-outline"} size={24} color={Colors.secondaryTeal} />
                            <Text style={createModalStyles.optionText}>Post Anonymously</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLightGray },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundLightGray },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Jakarta-Bold',
        color: Colors.textDark,
    },
    createPostButton: {
        backgroundColor: Colors.primaryOrange,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        padding: 10,
        backgroundColor: Colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        paddingHorizontal: 16,
    },
    searchModeToggle: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: Colors.backgroundLightGray,
        borderRadius: 20,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
    },
    activeToggle: {
        backgroundColor: Colors.secondaryTeal,
    },
    toggleText: {
        fontFamily: 'Jakarta-SemiBold',
        color: Colors.textMedium,
    },
    activeToggleText: {
        color: Colors.backgroundWhite,
    },
    searchInput: {
        backgroundColor: Colors.backgroundLightGray,
        borderRadius: 20,
        padding: 12,
        fontSize: 16,
        fontFamily: 'Jakarta-Medium',
        color: Colors.textDark,
    },
    searchResultsContainer: {
        backgroundColor: Colors.backgroundWhite,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    searchItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    postListContent: {
        paddingHorizontal: 0,
        paddingVertical: 10,
    },
    fab: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1877F2',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});

// Styles for the Create Post Modal
const createModalStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundWhite,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Jakarta-Bold',
        color: Colors.textDark,
    },
    postButton: {
        backgroundColor: Colors.primaryOrange,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    postButtonText: {
        color: Colors.backgroundWhite,
        fontFamily: 'Jakarta-Bold',
    },
    titleInput: {
        fontSize: 24,
        fontFamily: 'Jakarta-Bold',
        color: Colors.textDark,
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },        
    searchInput: {
        fontSize: 14,
        fontFamily: 'Jakarta-Medium',
        color: Colors.textDark,
        marginBottom: 10,
        paddingBottom: 10,
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        borderColor: Colors.borderLight,
    },
    contentInput: {
        fontSize: 16,
        fontFamily: 'Jakarta-Medium',
        color: Colors.textDark,
        minHeight: 150,
        textAlignVertical: 'top',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: 8,
        padding: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        fontFamily: 'Jakarta-Medium',
        color: Colors.borderLight,
    },

    neusSearchResultsList: {
        maxHeight: 150,
        borderColor: Colors.borderLight,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 10,
    },
    neusSearchResultItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    neusSearchResultText: {
        fontSize: 16,
        fontFamily: 'Jakarta-SemiBold',
        color: Colors.textDark,
    },
    selectedNeusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondaryTeal + '1A',
        padding: 8,
        borderRadius: 5,
        marginBottom: 10,
    },
    selectedNeusText: {
        marginRight: 10,
        color: Colors.secondaryTeal,
        fontFamily: 'Jakarta-Bold',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: Colors.backgroundLightGray,
        borderRadius: 8,
    },
    optionText: {
        marginLeft: 8,
        fontSize: 16,
        fontFamily: 'Jakarta-SemiBold',
        color: Colors.textDark,
    },
     mediaInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
    },
    addButton: {
        marginLeft: 10,
        backgroundColor: '#1877F2',
        padding: 10,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    mediaUrlItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderRadius: 5,
        marginBottom: 5,
    }
});

export default PostsPage;