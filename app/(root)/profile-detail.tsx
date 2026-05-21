import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import dayjs from 'dayjs';
import firestore from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {checkFollowingStatus, followUser, unfollowUser, } from '@/lib/localDB'; 
import { updateUser, updateByUsername, createUser, userProfileBytheirId } from "@/lib/utils";
import PostItem from '@/components/PostItem';
import { CustomAlertModal, ReportModal, translations } from "@/components/modals"
import { useLanguageStore } from "@/store";

const ProfileScreen = ({ route }) => {
    const { language, setLanguage } = useLanguageStore();
  const { userId, is_anonymous } = useLocalSearchParams();
    const router = useRouter();
  const [profileData, setProfileData] = useState(null);
    const [name, setName] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [kibir, setKibir] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';
const SUBSCRIBER_IMAGE = 'https://homehealthfundamentals.com/wp-content/uploads/2011/03/subscribersonly.png'
    const [isLive, setIsLive] = useState(false);
    const [streamDetails, setStreamDetails] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
// In profile-detail.tsx, replace the existing useEffect hooks with this one.
  const [modalData, setModalData] = useState({ title: "", message: "", imageSource: null, });
    const [openMenuId, setOpenMenuId] = useState(null); // Tracks which post menu is open
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingPost, setReportingPost] = useState(null);
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    
useEffect(() => {
    console.log("userId", userId)
    const fetchProfileAndPosts = async () => {
        setLoading(true);
        try {
          console.log("userId", userId)
            const response = await fetch(`https://app.share-rides.com/api/users/${userId}/profile`);
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            const data = await response.json();
console.log("data", data)
       const totalKarma = data.posts.reduce(
        (sum, post) => sum + (post.karma || 0),
        0
      );
       console.log("totalKarma", totalKarma)
      setKibir(totalKarma);
            setProfileData(data.user);
            setPosts(data.posts);
            setFollowersCount(data.user.follower_count || 0);
            setLoading(false)
              // Fetch live status
                const liveStatusResponse = await fetch(`https://app.share-rides.com/api/users/${userId}/live-status`);
                if (!liveStatusResponse.ok) throw new Error('Failed to fetch live status');
                const liveStatus = await liveStatusResponse.json();
                setIsLive(liveStatus.is_live);
                if (liveStatus.is_live) {
                    setStreamDetails(liveStatus.stream_details);
                }

            // You can also check the following status here if you have an endpoint for it
    const followingStatus = await checkFollowingStatus(userId);
    setIsFollowing(followingStatus);

        } catch (error) {
            console.error('Error fetching profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (userId && !is_anonymous) {
        fetchProfileAndPosts();
    }
}, [userId]);
    const handleProfilePress = () => {
        if (isLive && streamDetails) {
            router.push({
                pathname: '/game-rooms/SpectatorViewScreen',
                params: {
                    streamId: streamDetails.channel_name,
                    channelName: streamDetails.hms_room_id,
                    creatorId: streamDetails.host_id,
                    role: 'viewer-realtime',
                },
            });
        } else {
            setShowImageModal(true);
        }
    };
  const handleFollow = async () => {
    try {
    let followingStatus = await checkFollowingStatus(userId);
    setIsFollowing(followingStatus);
      if (isFollowing) {
        await unfollowUser(userId, profileData?.username);
    setFollowersCount(prev => prev - 1);
     const driverData = await userProfileBytheirId(userId)
        const followers = driverData.follower_count
      await updateByUsername(userId, {follower_count: parseInt(followers) - 1})
      } else {
    //     console.log("followUser b4")
        await followUser(userId, profileData?.username);
      //  console.log("followUser exec")
                    setFollowersCount(prev => prev + 1);
        const driverData = await userProfileBytheirId(userId)
      //  console.log("driverData", driverData)
        const followers = driverData.follower_count
      await updateByUsername(userId, {follower_count: parseInt(followers) + 1})
      }
    followingStatus = await checkFollowingStatus(userId);
    console.log("followingStatus", followingStatus)
    setIsFollowing(followingStatus);
    } catch (error) {
    const followingStatus = await checkFollowingStatus(userId);
    setIsFollowing(followingStatus);
      console.error('Error updating follow status:', error);
    }
  };

  const handleOpenComments = (post) => {
      console.log('Opening comments for post:', post);
      router.push({
          pathname: "/(root)/post-detail",
          params: {
              postId: post.id,
              postTitle: post.title,
              postContent: post.content,
              postAuthor: post.author,
              createdAt: post.created_at, // Use created_at from item
              currentKarma: post.karma,
              authorAvatar: post.author_avatar,
              postimage: post.post_image,
              isPaid: post.is_paid,
              // Other relevant post data to pass
          },
      });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

if (is_anonymous){
    return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, isLive && styles.liveBorder]}>
            <Image
            source={{ uri: profileData.avatar_url || DEFAULT_AVATAR }}
            style={styles.avatar}
            />
      </View>
      <Text style={styles.username}>Anonymous User</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}> 0</Text>
            <Text style={styles.statLabel}>Moges</Text>
          </View>
        </View>
      </View>

        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>Whoops. This is an anonymous account</Text>
        </View>
    </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
              <TouchableOpacity onPress={handleProfilePress}>
                    {/* The main change is here */}
                    <View style={[styles.avatarContainer, isLive && styles.liveBorder]}>
                        {profileData?.avatar_url ? (
                            <Image
                                source={{ uri: profileData.avatar_url || DEFAULT_AVATAR }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profileData?.username?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                        {isLive && (
                            <View style={styles.liveOverlay}>
                                <Text style={styles.liveText}>LIVE NOW</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
        
        <Text style={styles.username}>{profileData?.username || 'User'}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{kibir || 0}</Text>
            <Text style={styles.statLabel}>Kibir</Text>
          </View>
        </View>
  
        <TouchableOpacity 
          style={[
            styles.followButton,
            isFollowing ? styles.unfollowButton : styles.followButtonActive
          ]}
          onPress={handleFollow}
        >
          <Text style={styles.followButtonText}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Bio Section */}
      {profileData?.bio && (
        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>{profileData.bio}</Text>
        </View>
      )}
      
      {/* Posts Section */}
      <Text style={styles.sectionTitle}>Recent Posts</Text>
      {posts.length > 0 ? (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
                    <PostItem 
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
                    />
                )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.postsContainer}
        />
      ) : (
        <View style={styles.noPostsContainer}>
          <Text style={styles.noPostsText}>No posts yet</Text>
        </View>
      )}
{reportModalVisible && (
  <ReportModal
    reportModalVisible={reportModalVisible}
    handleReport={handleReport}
    onClose={() => setReportModalVisible(false)}
    language={language}
  />
)}
           <Modal
                visible={showImageModal}
                transparent={true}
                onRequestClose={() => setShowImageModal(false)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setShowImageModal(false)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: profileData?.avatar_url }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
                 <CustomAlertModal
        visible={alertModalVisible}
        title={modalData.title}
        message={modalData.message}
        imageSource={modalData.imageSource}
        onClose={() => setAlertModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 30,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
  },
  followButtonActive: {
    backgroundColor: '#3b82f6',
  },
  unfollowButton: {
    backgroundColor: '#b5b7bb',
  },
  followButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  bioContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginVertical: 10,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#4b5563',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    paddingBottom: 5,
    color: '#1f2937',
  },
  postsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#1f2937',
  },
  postDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  postContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    marginLeft: 6,
    color: '#6b7280',
  },
  noPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPostsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
   avatarContainer: {
        width: 124, // A bit larger to accommodate the border
        height: 124,
        borderRadius: 52, // Perfectly circular
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        marginTop: 15,
        position: 'relative', // Needed for the overlay
    },
    liveBorder: {
        borderWidth: 3,
        borderColor: 'red',
        padding: 2, // Optional: creates a small gap between the border and the image
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveOverlay: {
        position: 'absolute',
        bottom: -9, // Position it slightly below the center
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 5,
    },
    liveText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10,
    },
        headerRight: { flexDirection: 'row', alignItems: 'center' },
    neusTag: { color: '#1877F2', fontWeight: 'bold', marginRight: 10 },
});

export default ProfileScreen;