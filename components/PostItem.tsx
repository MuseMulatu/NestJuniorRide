// @/components/PostItem.tsx
import React, { useState, memo, useMemo } from "react";
import { Text, View, TouchableOpacity, Image, Modal, StyleSheet, Alert, TextInput, Share, FlatList, Dimensions } from "react-native";
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { isPaidPost } from "expo-router/build/routing/Route";
import { CustomAlertModal, ReportModal, translations } from "@/components/modals"
import { useLanguageStore } from "@/store";
import relativeTime from 'dayjs/plugin/relativeTime';
import { WebView } from 'react-native-webview'; 
dayjs.extend(relativeTime);

const DEFAULT_AVATAR = 'https://medias.spotern.com/spots/w640/50/50261-1571237116.jpg';
const SUBSCRIBER_IMAGE = 'https://homehealthfundamentals.com/wp-content/uploads/2011/03/subscribersonly.png';
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

const PostItem = ({ item, currentUserId, openMenuId, setOpenMenuId, reportModalVisible ,setReportModalVisible,  reportingPost, setReportingPost, setPosts, setModalData, setAlertModalVisible }) => {
  const router = useRouter();
    const { language, setLanguage } = useLanguageStore();
  console.log("language", language)
  const isOwner = item.poster_id === currentUserId;
  const isSubscribed = true; // In a real app, this would be a real state
  const canViewPaidPost = !item.is_paid || isSubscribed;
 const userId = currentUserId;
  // Local state for editing modal (kept here as it's UI-specific)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPostContent, setEditPostContent] = useState(item.content);

  // Get the screen width for the slider items
const { width: screenWidth } = Dimensions.get('window');
const cardHorizontalPadding = 32; // 16px padding on each side of the card
const mediaWidth = screenWidth - (cardHorizontalPadding * 2);

  const handleEdit = () => {
    setEditPostContent(item.content);
    setEditModalVisible(true);
  };
  const submitEdit = async () => {
      // In a real app, this would call a prop function like onEdit, not a direct fetch
    //  onEdit({ ...item, content: editPostContent });
      setEditModalVisible(false);
  };

  const handleVote = (type: 'upvote' | 'downvote') => {
      onVote(item.id, type);
  };
  const handleOpenComments = () => {
      onOpenComments(item);
  };
  const handleDelete = () => {
      onDelete();
  };

  const handleOpenEditModal = () => {

  };

    // --- 1. PARSE THE MEDIA ARRAY SAFELY ---
    const mediaItems = useMemo(() => {
        if (!item.post_image || typeof item.post_image !== 'string') {
            return [];
        }
        try {
            const parsed = JSON.parse(item.post_image);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse post_image JSON:", e);
            return [];
        }
    }, [item.post_image]);

   const isYouTubeUrl = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'));
   // Helper to get YouTube video ID from URL
    const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    const onReport = () => {
      setReportModalVisible(true)
      setReportingPost(item)
  };

    const onShare = async () => {
        try {
            const result = await Share.share({
                // The message will contain the deep link URL
                message: `Check out this post on Hulum Super App: https://Hulum.live/posts/${item.id}`,
            });
            // You can add logic here based on the result if needed
        } catch (error) {
          //  Alert.alert(error.message);
        }
    };

  // --- Post Action Handlers (Passed as props to PostItem) ---
  const handleEditPost = (post) => {
      // Logic for editing a post
      console.log('Editing post:', post);
      // In a real app, you'd likely open a modal similar to create, pre-filled with post data
  };
  const onDelete = async () => {
      console.log('Deleting post:', item.id);
      try {
          const response = await fetch(`${API_BASE_URL}/posts/${item.id}`, {
              method: 'DELETE',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId: userId }), // Assuming userId is needed for auth on backend
          });

          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to delete post: ${response.status} - ${errorText}`);
          }
          // Remove the post from local state
          setPosts(prevPosts => prevPosts.filter(post => post.id !== item.id));
          setModalData({
              title: "Success",
              message: "Post deleted successfully.",
              imageSource: null,
          });
          setAlertModalVisible(true);
      } catch (error) {
          console.error("Error deleting post:", error);
          setModalData({
              title: "Error",
              message: "Failed to delete post. Please try again.",
              imageSource: null,
          });
          setAlertModalVisible(true);
      }
  };
  const handleVotePost = async (postId, type) => {
    //  console.log(`Voting ${type} on post:`, postId);
      try {
          const response = await fetch(`${API_BASE_URL}/posts/${postId}/vote`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'X-User-Id': userId, // Pass user ID for voting
              },
              body: JSON.stringify({ type: type}), // Pass category if needed by backend for vote logic
          });

          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to vote: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          // Update karma in the local state
          setPosts(prevPosts =>
              prevPosts.map(post =>
                  post.id === postId ? { ...post, karma: data.newKarma } : post
              )
          );
      } catch (error) {
          console.error("Error voting on post:", error);
          setModalData({
              title: "Error",
              message: "Failed to process vote. Please try again.",
              imageSource: null,
          });
          setAlertModalVisible(true);
      }
  };

  const onOpenComments = (post) => {
      console.log('Opening comments for post:', post);
      router.push({
          pathname: "/(root)/post-detail",
          params: {
              postId: post.id,
              postTitle: post.title,
              postContent: post.content,
              postAuthor: post.author,
              createdAt: post.timestamp, 
              currentKarma: post.karma,
              authorAvatar: post.author_avatar,
              postimage: post.post_image,
              isPaid: post.is_paid,
              neusName: post.neusName,
              sneak_peek: post.sneak_peek,
              is_anonymous: post.is_anonymous
          },
      });
  };
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

            Alert.alert(translations[language].reportSuccessTitle, translations[language].reportSuccessMessage);
        } catch (error) {
            console.error("Error submitting report:", error);
          //  Alert.alert("Error", "Could not submit report.");
        }
    };

    const handleBlockCreator = (creatorId) => {
        Alert.alert(
            translations[language].blockConfirmTitle,
            translations[language].blockConfirmMessage,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Block",
                    style: "destructive",
                    onPress: () => {
                        setPosts(prevPosts => prevPosts.filter(p => p.poster_id !== creatorId));
                        setOpenMenuId(null);
                    }
                }
            ]
        );
    };

    const handleSavePost = (postId) => {
        Alert.alert("Info", translations[language].postSaved);
        console.log(`Saving post ${postId}.`);
        setOpenMenuId(null);
    };


    // --- 2. RENDER MEDIA (SLIDER, VIDEO, OR IMAGE) ---
    const renderMedia = () => {
        if (item.sneak_peek || mediaItems.length === 0) {
            return null;
        }

        // If there's only one item, render it directly
        if (mediaItems.length === 1) {
            const mediaUrl = mediaItems[0];
            if (isYouTubeUrl(mediaUrl)) {
                const videoId = getYouTubeId(mediaUrl);
                return (
                    <View style={styles.mediaContainer}>
                        <WebView
                            style={{ flex: 1 }}
                            javaScriptEnabled={true}
                            source={{ uri: `https://www.youtube.com/embed/${videoId}` }}
                        />
                    </View>
                );
            }
            return <Image source={{ uri: mediaUrl }} style={styles.postImage} resizeMode="cover" />;
        }

        // If there are multiple items, render a slider
        return (
            <FlatList
                data={mediaItems}
                renderItem={renderMediaItem}
                keyExtractor={(url, index) => `${url}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.slider}
            />
        );
    };
    
    // Helper to render each item within the FlatList slider
    const renderMediaItem = ({ item: mediaUrl }) => {
        if (isYouTubeUrl(mediaUrl)) {
            const videoId = getYouTubeId(mediaUrl);
            return (
                <View style={[styles.mediaContainer, { width: mediaWidth }]}>
                    <WebView
                        style={{ flex: 1 }}
                        javaScriptEnabled={true}
                        source={{ uri: `https://www.youtube.com/embed/${videoId}` }}
                    />
                </View>
            );
        }
        return <Image source={{ uri: mediaUrl }} style={[styles.postImage, { width: mediaWidth }]} resizeMode="cover" />;
    };



return (
  <View style={styles.postCard}>
          {item.neusName && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(root)/neus-page',
                params: { neusId: item.neus_id, neusName: item.neusName },
              })
            }
          >
            <Text style={styles.neusTag}>Hulum/{item.neusName}</Text>
          </TouchableOpacity>
        )}
    {/* Post header */}
    <View style={styles.postHeader}>
      {/* LEFT: Author info */}
      <TouchableOpacity
        style={styles.authorInfo}
        disabled={Number(item.is_anonymous) === 1 || item.poster_id === "G0OxSrFbgPViIk90xsV4UPffOX33" }
        onPress={() =>
          !Number(item.is_anonymous) &&
          router.push({
            pathname: '/(root)/profile-detail',
            params: { userId: item.poster_id },
          })
        }
      >
        <Image
          source={
            Number(item.is_anonymous)
              ? { uri: DEFAULT_AVATAR }
              : { uri: item.author_avatar || DEFAULT_AVATAR }
          }
          style={styles.avatar}
        />
        <View>
          <Text style={styles.authorName}>
            {Number(item.is_anonymous) ? 'Anonymous' : item.author}
          </Text>
        <Text style={styles.postTimestamp}>
          {dayjs(item.timestamp).fromNow()}
        </Text>
        </View>
      </TouchableOpacity>
      {/* RIGHT: neusName above, ellipsis below */}
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() =>
            setOpenMenuId(openMenuId === item.id ? null : item.id)
          }
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={Colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </View>

    {/* Dropdown menu */}
    {openMenuId === item.id && (
      <View style={styles.menu}>
        {isOwner ? (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={handleOpenEditModal}>
              <Text style={styles.menuItemText}>Edit Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => onDelete(item.id)}>
              <Text style={[styles.menuItemText, { color: Colors.warningRed }]}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={onReport}>
              <Text style={styles.menuItemText}>{translations[language]?.report}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleBlockCreator(item.poster_id)}>
              <Text style={styles.menuItemText}>{translations[language]?.blockCreator}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleSavePost(item.id)}>
              <Text style={styles.menuItemText}>Save Post</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    )}

    {/* Post content */}
    <TouchableOpacity onPress={() => onOpenComments(item)} disabled={item.sneak_peek} style={styles.postContentContainer}>
      <Text style={styles.postTitle}>
        {!item.sneak_peek ? item.title : `${item.title.substring(0, 30)}...`}
      </Text>
      <Text style={styles.postContent}>
        {!item.sneak_peek ? `${item.content.substring(0, 230)}...` : item.sneak_peek}
      </Text>
    </TouchableOpacity>
    {/* --- RENDER THE MEDIA SECTION --- */}
      {item.post_image && !item.sneak_peek && (            
                renderMedia()
      )}
        {item.sneak_peek && (
            <View style={styles.paidPostOverlay}>
              <Ionicons name="lock-closed" size={32} color={Colors.backgroundWhite} />
              <Text style={styles.paidPostText}>Unlock with Subscription</Text>
            </View>
          )}

    {/* Footer */}
    <View style={styles.footerContainer}>
      <View style={styles.footerButtonsLeft}>
        <TouchableOpacity onPress={() => handleVotePost(item.id, 'upvote')} style={styles.footerButton}>
          <Ionicons name="heart-outline" size={20} color={Colors.textMedium} />
          <Text style={styles.footerButtonText}>{item.karma || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onOpenComments(item)} style={styles.footerButton}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.textMedium} />
          <Text style={styles.footerButtonText}>comments</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerButtonsRight}>
        <TouchableOpacity onPress={onShare} style={styles.footerButton}>
          <Ionicons name="share-outline" size={20} color={Colors.textMedium} />
          <Text style={styles.footerButtonText}>share</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleSavePost(item.id)} style={styles.footerButton}>
          <Ionicons name="bookmark-outline" size={20} color={Colors.textMedium} />
        </TouchableOpacity>
      </View>
    </View>
                <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Edit Post</Text>
                        <TextInput
                            value={editPostContent}
                            onChangeText={setEditPostContent}
                            multiline
                            style={styles.textInput}
                        />
                        <TouchableOpacity onPress={submitEdit} style={styles.submitButton}>
                            <Text style={styles.submitButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
  </View>
);

};

const styles = StyleSheet.create({
    postCard: {
        backgroundColor: Colors.backgroundWhite,
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        shadowColor: Colors.textDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
  alignItems: 'flex-start', // important: aligns right column to the top
        marginBottom: 12,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: Colors.backgroundLightGray,
    },
    authorName: {
        fontFamily: 'Jakarta-Bold',
        fontSize: 16,
        color: Colors.textDark,
    },
    postTimestamp: {
        color: Colors.textLight,
        fontSize: 12,
        fontFamily: 'Jakarta-Medium',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
  alignItems: 'flex-end',   // keeps both neusName + icon aligned right
    //    columnGap: 10,
    },
    neusTag: {
        backgroundColor: Colors.secondaryTeal + '1A',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        fontFamily: 'Jakarta-SemiBold',
        fontSize: 12,
        color: Colors.secondaryTeal,
        marginBottom: 4, // space between neusName and ellipsis
        width: "50%"
    },
    menu: {
        position: 'absolute',
        top: 40,
        right: 10,
        backgroundColor: Colors.backgroundWhite,
        borderRadius: 8,
        padding: 10,
        shadowColor: Colors.textDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 6,
        zIndex: 1000,
    },
    menuItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    menuItemText: {
        fontFamily: 'Jakarta-SemiBold',
        color: Colors.textDark,
        fontSize: 15,
    },
    postContentContainer: {
        marginBottom: 12,
    },
    postTitle: {
        fontSize: 18,
        fontFamily: 'Jakarta-Bold',
        color: Colors.textDark,
        marginBottom: 8,
        lineHeight: 24,
    },
    postContent: {
        fontSize: 14,
        lineHeight: 22,
        color: Colors.textMedium,
        fontFamily: 'Jakarta-Medium',
    },
    postImageContainer: {
      position: 'relative',
      marginTop: 12,
      borderRadius: 10,
      overflow: 'hidden',
    },
    postImage: {
        height: 450,
        marginTop: 12,
        borderRadius: 10,
    },
     mediaContainer: {
        height: 350,
        marginTop: 12,
        borderRadius: 10,
        overflow: 'hidden', // Important for WebView borderRadius
        backgroundColor: '#000',
    },
    slider: {
        marginTop: 12,
    },
    paidPostOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12, // Match the media container margin
        borderRadius: 10,
    },
    paidPostText: {
        color: Colors.backgroundWhite,
        fontFamily: 'Jakarta-SemiBold',
        marginTop: 8,
        fontSize: 16,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingTop: 12,
        marginTop: 12,
    },
    footerButtonsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 24,
    },
    footerButtonsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 24,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 4,
    },
    footerButtonText: {
        fontSize: 14,
        fontFamily: 'Jakarta-SemiBold',
        color: Colors.textMedium,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: Colors.backgroundWhite,
        borderRadius: 15,
        padding: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: 'Jakarta-Bold',
        color: Colors.textDark,
        marginBottom: 10,
    },
    textInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        minHeight: 120,
        fontFamily: 'Jakarta-Medium',
        textAlignVertical: 'top',
        color: Colors.textDark,
    },
    submitButton: {
        backgroundColor: Colors.secondaryTeal,
        padding: 14,
        borderRadius: 12,
        marginTop: 15,
        alignItems: 'center',
    },
    submitButtonText: {
        color: Colors.backgroundWhite,
        fontFamily: 'Jakarta-Bold',
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: Colors.warningRed,
        fontFamily: 'Jakarta-SemiBold',
        fontSize: 14,
    },
});

export default memo(PostItem);