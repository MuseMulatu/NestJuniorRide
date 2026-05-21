import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator,  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, Modal, Button, SectionList, Animated, Easing, Dimensions 
} from 'react-native';
import uuid from 'react-native-uuid';
import { useLocalSearchParams } from 'expo-router';
import { useShareUsernameStore, useRateLimitStore, usePioneerStore, useTierStore, useTierLimitsStore, usePhoneNumberStore } from '@/store'; // Assuming store is correctly set up
import AWS from 'aws-sdk';
import { getTotalFetchCount, incrementFetchCount } from '@/lib/localDB'; 
import { dynamoDB } from '@/lib/modals';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import dayjs from 'dayjs';
import firestore from '@react-native-firebase/firestore';
import { Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { handleProcessPayment, RECHARGE_OPTIONS, GIFT_CATEGORIES, Colors } from "@/lib/utils"; // Assuming this is defined
import relativeTime from 'dayjs/plugin/relativeTime';
import { WebView } from 'react-native-webview'; 
dayjs.extend(relativeTime);

const DEFAULT_AVATAR = 'https://www.theatrhall.com/cgf/img/prd/MASQUE_GUY_FAWKES_V_POUR_VENDETTA_ANONYMOUS.gif';
const TABLE_NAME = 'DriverComments';
const generateShortUUID = () => {
  const fullUUID = uuid.v4();
  return fullUUID.split('-').slice(0, 2).join('-'); // Take first two segments
};

const BACKEND_BASE_URL = 'https://app.share-rides.com'; // IMPORTANT: Replace with your actual backend URL!

const PostDetailsPage = () => {
const { 
    votedComments, addVote, addVoteTimestamp, canVote, canComment, addCommentTimestamp
  } = useRateLimitStore();
const [alertModalVisible, setAlertModalVisible] = useState(false);
const [tipModalVisible, setTipModalVisible] = useState(false);
const { phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, gender, bio, seatNumber, setprofileDetails, almaz} =  usePhoneNumberStore() 
  const [modalData, setModalData] = useState({title: "", message: "", imageSource: null,});
  const [isGiftModalVisible, setGiftModalVisible] = useState(false);
  const [isRechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [activeGift, setActiveGift] = useState<any>(null);
  const giftAnimation = useRef(new Animated.Value(0)).current;

  const { tierLimits, setTierLimits } = useTierLimitsStore();
 const bottomSheetRef = useRef(null);
const { tierType, setTierType } = usePioneerStore();
const [loading, setLoading] = useState(false);
  const { shareUsername } = useShareUsernameStore();

  const route = useLocalSearchParams();
 const params = useLocalSearchParams();
console.log("params", params)
   // Convert all post-related variables into state
  const [postAuthor, setPostAuthor] = useState(params.postAuthor || null);
  const [postTitle, setPostTitle] = useState(params.postTitle || null);
  const [postContent, setPostContent] = useState(params.postContent || null);
  const [createdAt, setCreatedAt] = useState(params.createdAt || null);
  const [currentKarma, setCurrentKarma] = useState(params.currentKarma || null);
  const [postDate, setPostDate] = useState(params.postDate || null);
  const [authorAvatar, setAuthorAvatar] = useState(params.authorAvatar || null);
  const [postImage, setPostImage] = useState(params.postimage || null);
  const [postId, setPostId] = useState(params.postId || null);
  const [isPaid, setIsPaid] = useState(params.isPaid || null);
  const [is_anonymous, setIs_anonymous] = useState(params.is_anonymous || null);
  const [neusName, setNeusName] = useState(params.neusName || null);
  const [sneakPeek, setSneakPeek] = useState(params.sneak_peek || null);

const commentsData = useMemo(() => 
  route.commentsData ? JSON.parse(route.commentsData) : [], 
  [route.commentsData] // Only re-parse when raw string changes
);

const postTipsData = useMemo(() =>
    route.postTips ? JSON.parse(route.postTips) : { count: 0, totalAmount: 0, tippers: [] }, // Initialize tippers array
    [route.postTips]
  );

const [comments, setComments] = useState(() =>  []);
const [postTips, setPostTips] = useState(() => postTipsData || { count: 0, totalAmount: 0, tippers: [] });

 const [customTipAmount, setCustomTipAmount] = useState('');
  const [selectedTipPackage, setSelectedTipPackage] = useState(null); // Stores the selected ETB amount from packages

const auth = getAuth();
const user = auth.currentUser;
const currentUserId = user?.uid
  const userId = user?.uid

// Get the screen width for the slider items
const { width: screenWidth } = Dimensions.get('window');
const cardHorizontalPadding = 32; // 16px padding on each side of the card
const mediaWidth = screenWidth - (cardHorizontalPadding * 2);
//console.log("postTips", postTips)
  // Convert createdAt and currentKarma to numbers (if not already)
  const numericCreatedAt = Number(createdAt);
  const numericCurrentKarma = Number(currentKarma);

  //const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [karma, setKarma] = useState(numericCurrentKarma);

   const isYouTubeUrl = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'));
   // Helper to get YouTube video ID from URL
    const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const onShare = async () => {
        try {
            const result = await Share.share({
                // The message will contain the deep link URL
                message: `Check out this post on Hulum Super App: https://Hulum.live/posts/${postId}`,
            });
            // You can add logic here based on the result if needed
        } catch (error) {
          //  Alert.alert(error.message);
        }
    };

useEffect(() => {
  const loadPostData = async () => {
      // --- MARKER: Check if the page was opened via deep link ---
      // If postTitle is missing, it means we came from a deep link.
      if (!postTitle) {
        console.log("Deep link detected, fetching post data for ID:", postId);
        if (postId) {
          try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/posts/${postId}`);
            if (!response.ok) throw new Error("Post not found");
            const data = await response.json();
                              // Update state (triggers re-render)
          setPostAuthor(data.author);
          setPostTitle(data.title);
          setPostContent(data.content);
          setCreatedAt(data.timestamp);
          setCurrentKarma(data.karma);
          setAuthorAvatar(data.author_avatar);
          setPostImage(data.post_image);
          setIsPaid(data.is_paid);
          setNeusName(data.neusName);
          setSneakPeek(data.sneak_peek);
          } catch (error) {
            console.error("Error fetching post:", error);
            Alert.alert("Error", "Could not load the post.");
          }
      } else {
        // Navigated from the feed, use the provided params
        console.log("Navigated from feed, using existing post data.");
        // setPost(params);
      }
      setLoading(false);
    };
  }
    const fetchComments = async () => {
        if (postId) {
            try {
                const response = await fetch(`${BACKEND_BASE_URL}/api/posts/${postId}/comments`);
                const data = await response.json();
                setComments(data);
            } catch (error) {
                console.error("Error fetching comments:", error);
            }
        }
      const response = await fetch(`${BACKEND_BASE_URL}/api/users/${user?.uid}/balance`);
      const data = await response.json();
      const latestBalance = data.balance;
      setCurrentBalance(latestBalance);
    };
    fetchComments();
    loadPostData();
}, [postId]);


  const handleVote = async (pos, type) => {
// const postId = `${postAuthor}_${createdAt}`;    
      if (!canVote()) {
       setModalData({
    title: "Limit Reached",
    message: "You can only vote a few times an hour",
    imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
  });
  setAlertModalVisible(true);
      return;
    }
     const voteKey = `${type}-${postId}`;
    if (votedComments.has(voteKey)) {
        setModalData({
    title: "Notice",
    message: `Already Voted ${type}`,
    imageSource: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnl3ZWVkZHlrNXg4ZnYyd3pxZ2N4N2k0aGh6czV2ZHFiajhnMTNpZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OyLcAQfZwsaKe3y92E/giphy.gif",
  });
  setAlertModalVisible(true);
      return;
    }
 let newKarma = type === "upvote" ? Number(karma) + 1 : Number(karma) - 1;
    setKarma(newKarma);
    setKarma(newKarma);
   addVote(voteKey);
      addVoteTimestamp();
  try {
   const response = await fetch(`/posts/${postId}/vote`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, category: null }),
  });
    console.log(`✅ Karma updated in Firestore: ${newKarma}`);
  } catch (error) {
    console.error("❌ Error updating karma:", error);
  }
};

const handleAddComment = async () => {
  if (!canComment()) {
    Alert.alert('Limit Reached', 'Please wait an hour before attempting to comment again');
    return;
  }

  if (!newComment || !newComment.trim()) {
    Alert.alert('Oops,', 'Comment cannot be empty.');
    return;
  }

  const forbiddenPattern = /[<>$%]/;
  if (forbiddenPattern.test(newComment)) {
    Alert.alert('Uh-oh,', 'Comment contains invalid characters.');
    return;
  }

  if (comments.length >= 50) {
    Alert.alert('Limit Reached', 'This post has reached the max comment limit (50).');
    return;
  }
   const newCommentData = {
        userId: currentUserId,
        username: shareUsername || "Anonymous",
        content: newComment,
    };

    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCommentData),
        });
console.log("response.json()", response.json())
        if (response.ok) {
            const addedComment = await response.json();
            // Optimistically update the UI
            setComments(prevComments => [...prevComments, { ...newCommentData, id: addedComment.id, created_at: new Date().toISOString() }]);
            setNewComment('');
            addCommentTimestamp();
        } else {
         //   Alert.alert("Error", "Failed to add comment.");
        }
    } catch (error) {
        console.error("Error adding comment:", error);
     //   Alert.alert("Error", "Failed to add comment.");
    }
};


  const handleSendGift = async (gift) => { // Type safety
    // Re-fetch balance to ensure it's up-to-date before sending
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/users/${user?.uid}/balance`);
      const data = await response.json();
      const latestBalance = data.balance;
      setCurrentBalance(latestBalance);

      if (latestBalance >= gift.cost) {
        const sender = { id: user?.uid, username: user?.displayName };
  //      socketRef.current.emit('sendGift', { streamId: streamParams.streamId, gift, sender, creatorId: streamParams.creatorId });
        setGiftModalVisible(false);
    console.log("gift", gift)
        setCurrentBalance(prev => prev - gift.cost); // Optimistic update
      console.log("currentBalance", currentBalance, currentBalance - gift.cost )
      } else {
        setGiftModalVisible(false);
        setRechargeModalVisible(true); // Open recharge modal
      }
    } catch (error) {
      console.error("Error sending gift or fetching balance:", error);
      setModalMessage(`Failed to send gift: ${error.message || 'Please try again.'}`);
      setModalVisible(true);
    }
  };

  const showGiftAnimation = (gift) => { // Type safety
    setActiveGift(gift);
    giftAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(giftAnimation, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(giftAnimation, { toValue: 0, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true })
    ]).start(() => setActiveGift(null));
  };

  const giftAnimStyle = {
    opacity: giftAnimation,
    transform: [
      {
        translateY: giftAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0]
        })
      },
      {
        scale: giftAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 1.2, 1]
        })
      }
    ]
  };

  // Function to calculate Almaz from ETB for custom amounts
  const calculateAlmaz = (etb) => {
    // Simple conversion, adjust as per your exact logic if it's not linear
    // For example, if 25 ETB = 1 Almaz, then 1 ETB = 1/25 Almaz
    if (etb && !isNaN(etb) && parseFloat(etb) > 0) {
      return parseFloat(etb) / 25; // Assuming 25 ETB per 1 Almaz
    }
    return 0;
  };

    // --- 1. PARSE THE MEDIA ARRAY SAFELY ---
    const mediaItems = useMemo(() => {
        if (!postImage || typeof postImage !== 'string') {
            return [];
        }
        try {
            const parsed = JSON.parse(postImage);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse post_image JSON:", e);
            return [];
        }
    }, [postImage]);

    // --- 2. RENDER MEDIA (SLIDER, VIDEO, OR IMAGE) ---
    const renderMedia = () => {
  //    console.log("sneak_peek", sneak_peek, "postImage", postImage, "mediaItems", mediaItems, )
        if (sneakPeek || mediaItems.length === 0) {
            return null;
        }
        // If there's only one item, render it directly
        if (mediaItems.length === 1) {
            const mediaUrl = mediaItems[0];
            console.log("mediaUrl", mediaUrl)
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


  const renderRechargeItem = ({ item }: { item: any }) => ( // Type safety
    <TouchableOpacity style={styles.rechargeItem} onPress={() => {
      if (handleProcessPayment) {
        handleProcessPayment(item.amount, phoneNumberStore, shareUsername); // Assuming these are available
        setRechargeModalVisible(false);
      } else {
        setModalMessage("Payment processing is not available.");
        setModalVisible(true);
      }
    }}>
      <Text style={styles.rechargeAmount}>{item.amount} Coins</Text>
      <Text style={styles.rechargeCost}>{item.cost}</Text>
    </TouchableOpacity>
  );

const VoteButton = ({ type, onPress, disabled, isActive }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    className={`p-2 rounded-lg flex-row items-center space-x-2 ${
      isActive ? 'bg-orange-100' : 'bg-gray-100'
    } ${disabled ? 'opacity-50' : ''}`}
  >
    {type === 'up' ? (
      <MaterialIcons 
        name={isActive ? "thumb-up" : "thumb-up-off-alt"} 
        size={20} 
        color={isActive ? "#f97316" : "#6b7280"} 
      />
    ) : (
      <MaterialIcons 
        name={isActive ? "thumb-down" : "thumb-down-off-alt"} 
        size={20} 
        color={isActive ? "#f97316" : "#6b7280"} 
      />
    )}
    <Text className={`font-JakartaMedium ${
      isActive ? 'text-orange-600' : 'text-gray-600'
    }`}>
      {type === 'up' ? "Vote" : "Downvote"}
    </Text>
  </TouchableOpacity>
);

  // While loading, show an activity indicator
  if (loading || !postTitle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

return (
  <View className="flex-1 bg-white pt-7">
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      className="flex-1 bg-gray-50"
    >
      {/* Main Content */}
      <ScrollView 
        className="flex-1 pb-20"
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading ? (
          <View className="flex-1 justify-center py-10">
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : (
          <>
            {/* Post Content (Outside FlatList) */}
            <View className="bg-white mx-4 mt-4 py-6 px-2 rounded-2xl shadow-sm shadow-black/10">
              {/* Author Section */}
            <View  style={{ flexDirection: 'row'}} >
              <View className="flex-row items-center mb-4">
                {!authorAvatar ? (
                  <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
                    <Text className="text-orange-500 font-JakartaBold text-sm">
                      {postAuthor[1]}
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: `${Number(is_anonymous) === 1 ? DEFAULT_AVATAR : authorAvatar  }`}}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                )}
                <View>
                  <Text className="font-JakartaBold text-gray-800">{Number(is_anonymous) === 1 ? "Anonymous" : postAuthor }</Text>
               { createdAt && (
                  <Text className="text-gray-500 text-xs font-JakartaMedium">
                   {dayjs(createdAt).fromNow()} · ({dayjs(createdAt).format('MMM D, YYYY')})
                  </Text>
                )}
                </View>
              </View>
          {neusName && (
            <Text style={styles.neusTag}>Hulum/{neusName}</Text>
        )}
              </View>

              {/* Post Content */}
              <Text className="text-xl font-JakartaBold text-gray-900 mb-3">
                {postTitle}
              </Text>
              <Text style={styles.postContent} className="text-gray-600 font-Jakarta leading-5">
                {postContent}
              </Text>

                  {/* --- RENDER THE MEDIA SECTION --- */}
      {postImage && !sneakPeek && (            
                renderMedia()
      )}
              {/* Voting Controls */}
              <View className="items-center justify-center flex-row mt-6">
                <View className="flex-row items-center space-x-4">
                  <VoteButton
                    type="up"
                    onPress={() => handleVote(postId, 'upvote')}
                    disabled={!canVote() || votedComments.has(`upvote-${postId}`)}
                    isActive={votedComments.has(`upvote-${postId}`)}
                  />
                  
                  <View className="bg-gray-100 px-3 py-1 rounded-full mr-4">
                    <Text className="font-JakartaBold text-gray-800">{currentKarma}</Text>
                  </View>

                  <VoteButton
                    type="down"
                    onPress={() => handleVote(postId, 'downvote')}
                    disabled={!canVote() || votedComments.has(`downvote-${postId}`)}
                    isActive={votedComments.has(`downvote-${postId}`)}
                  />   
                </View>
        <TouchableOpacity onPress={onShare} style={{marginLeft: 10, flexDirection: "row"}}>
          <Ionicons name="share-outline" size={20} color={Colors.textMedium} />
          <Text style={styles.footerButtonText}>share</Text>
        </TouchableOpacity>
              </View>
              
              {/* Tip Button */}
          <View className="mt-6">
            <TouchableOpacity
              onPress={() => setGiftModalVisible(true)} // Open the tip modal
              className="bg-teal-500 px-4 py-2 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="gift" size={20} color="white" />
              <Text className="ml-2 text-white font-JakartaBold">Send a Gift</Text>
            </TouchableOpacity>
          </View>

                    {postTips.tippers && postTips.tippers.length > 0 && (
            <View className="mt-4 border-t border-gray-200 pt-4">
              <Text className="text-lg font-JakartaBold mb-2">Recent Tippers:</Text>
              {postTips.tippers.map((tipper, index) => (
                <View key={index} className="flex-row items-center mb-1">
                  <Ionicons name="person-circle-outline" size={20} color="#4B5563" />
                  <Text className="ml-2 text-gray-700 font-JakartaMedium">
                    {tipper.username} tipped  <Text className="ml-2 text-purple-600 font-JakartaMedium">{tipper.amount} 💎 Almaz </Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
            </View>

            {/* Comments Header */}
            <View className="px-4 mt-6 mb-4">
              <Text className="text-lg font-JakartaBold text-gray-800">
                Comments ({comments?.length || 0})
              </Text>
            </View>

            {/* Comments List */}
            {comments.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="chatbubble-outline" size={40} color="#e5e7eb" />
                <Text className="text-lg font-JakartaMedium text-gray-500 mt-4">
                  No comments yet. Be the first to reply!
                </Text>
              </View>
            ) : (
              <View className="pb-24">
                {comments.map((item) => (
                  <View 
                    key={`${item.created_at}-${item.username}`}
                    className="bg-white mx-4 mb-3 p-4 rounded-xl shadow-sm shadow-black/10"
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="w-6 h-6 bg-teal-200 rounded-full items-center justify-center">
                        <Text className="text-teal-900 text-xs font-JakartaBold">
                          {item?.username[1] || "H"}
                        </Text>
                      </View>
                      <Text className="font-JakartaSemiBold mb-1">
                        {item?.username}
                      </Text>
                    </View>
                    <Text className="text-gray-600 font-Jakarta mb-2">
                      {item?.content}
                    </Text>
                 { createdAt && (
                  <Text className="text-gray-500 text-xs font-JakartaMedium">
                   {dayjs(item?.created_at).fromNow()} 
                  </Text>
                )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Fixed Comment Input */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 pt-3 px-4">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2 mb-4">
          <TextInput
            className="flex-1 font-Jakarta text-gray-800"
            placeholder="Add a comment..."
            placeholderTextColor="#9ca3af"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            onPress={handleAddComment}
            disabled={!canComment()}
            className={`ml-2 px-4 py-2 rounded-lg ${
              canComment() ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <Text className="text-white font-JakartaMedium">
              {canComment() ? "Send" : "Limit Reached"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
         {/* Modals */}
  <Modal visible={isGiftModalVisible} transparent={true} animationType="slide">
    <View style={styles.modalContainer}>
          <View style={styles.giftModalContent}>
            <Text style={styles.modalTitle}>Send a Gift</Text>
            <Text style={styles.balanceText}>Your Balance: {almaz} coins</Text>
            <SectionList
              sections={GIFT_CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.giftItem} onPress={() => handleSendGift(item)}>
                  <Image source={{ uri: item.image }} style={styles.giftImage} />
                  <Text style={styles.giftName}>{item.name}</Text>
                  <Text style={styles.giftCost}>{item.cost}</Text>
                </TouchableOpacity>
              )}
              renderSectionHeader={({ section: { title } }) => (
                <Text style={styles.giftSectionHeader}>{title}</Text>
              )}
              numColumns={4}
              columnWrapperStyle={styles.giftRow}
            />
            <TouchableOpacity style={styles.modalCloseButtonBottom} onPress={() => setGiftModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isRechargeModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.rechargeModalContent}>
            <Text style={styles.modalTitle}>Insufficient Balance</Text>
            <Text style={styles.modalSubtitle}>Please recharge your wallet.</Text>
            <FlatList
              data={RECHARGE_OPTIONS}
              renderItem={renderRechargeItem}
              keyExtractor={(item) => item.amount.toString()}
              numColumns={2} // Two columns for recharge options
              columnWrapperStyle={styles.rechargeOptionsRow}
            />
            <TouchableOpacity style={styles.modalCloseButtonBottom} onPress={() => setRechargeModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

  </View>
);
}

export default PostDetailsPage;

const styles = StyleSheet.create({
 container: {
    paddingBottom: 80 // Space for fixed comment input
  },
  commentInput: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  postContainer: { marginTop:5, marginBottom: 10, padding: 10, paddingBottom:20, backgroundColor: '#ededed', borderRadius: 10 },
  postTitle: { fontSize: 22, marginBottom: 5 },
    postContent: {
        fontSize: 14,
        lineHeight: 22,
        color: Colors.textMedium,
        fontFamily: 'Jakarta-Medium',
    },
  postKarma: { fontSize: 14, color: '#777', marginRight: 10 },
  karmaButtons: { flexDirection: 'row', marginTop: 5, alignItems: 'center' },
  voteButton: {
    marginRight: 10,
    padding: 2,
    paddingRight: 15,
    backgroundColor: '#000',
    borderRadius: 5,
    width: '35%',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
     opacity: 1,
  },
  voteText: { fontSize: 16, color: '#fff' },
  commentsContainer: { flex: 1, backgroundColor: '#ececec' },
  commentsTitle: { fontSize: 20, marginBottom: 5, marginLeft: 15 },
  commentItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  commentContent: { fontSize: 16 },
  commentTimestamp: { fontSize: 12, color: '#777' },
  // inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginLeft: 8, marginRight: 8 },
    listContent: {
    paddingBottom: 80 // Space for input field
  },
  inputRow: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 5 },
  sendButton: { padding: 12, backgroundColor: '#007AFF', borderRadius: 5, marginLeft: 7 },
  sendButtonText: { color: '#fff',},
   disabledButton: {
    opacity: 0.5,
    backgroundColor: '#cccccc',
  },
  limitText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 10,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  packageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  packageButton: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedPackage: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  packageAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  packageDiamonds: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 6,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3B82F6',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    height: '100%',
  },
  diamondPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  diamondCount: {
    color: '#3B82F6',
    fontWeight: '700',
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 16,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
    // Gift Animation
  giftAnimationContainer: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 20, // Ensure it's on top of everything
  },
  activeGiftImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  activeGiftText: {
    color: Colors.backgroundWhite,
    fontSize: 24,
    fontFamily: 'Jakarta-Bold',
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  // Modals (Gift & Recharge)
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end', // Slide up from bottom
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  giftModalContent: {
    backgroundColor: Colors.textDark, // Dark background for gift modal
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%', // Max height for scrollable content
  },
  rechargeModalContent: {
    backgroundColor: Colors.textDark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    color: Colors.backgroundWhite,
    fontSize: 22,
    fontFamily: 'Jakarta-Bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalSubtitle: {
    color: Colors.textLight,
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  balanceText: {
    color: Colors.goldStar, // Gold for balance
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Jakarta-SemiBold',
  },
  giftSectionHeader: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 18,
    marginTop: 10,
    marginBottom: 8,
    width: '100%',
  },
  giftRow: {
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  giftItem: {
    width: '23%', // Adjust for 4 columns with spacing
    alignItems: 'center',
    marginBottom: 15,
    padding: 5,
    borderRadius: 10,
    backgroundColor: Colors.overlayLight, // Light overlay for gift item background
  },
  giftImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  giftName: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Medium',
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  giftCost: {
    color: Colors.goldStar, // Gold for cost
    fontSize: 12,
    fontFamily: 'Jakarta-SemiBold',
  },
  modalCloseButtonBottom: {
    backgroundColor: Colors.textMedium, // Muted gray for close button
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 16,
  },
  rechargeItem: {
    backgroundColor: Colors.overlayLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    marginHorizontal: 5, // Spacing for columns
    width: '45%', // Two columns
  },
  rechargeAmount: {
    color: Colors.backgroundWhite,
    fontSize: 18,
    fontFamily: 'Jakarta-Bold',
  },
  rechargeCost: {
    color: Colors.goldStar,
    fontFamily: 'Jakarta-SemiBold',
    marginTop: 5,
  },
  rechargeOptionsRow: {
    justifyContent: 'space-around',
    marginBottom: 10,
  },
      neusTag: {
        backgroundColor: Colors.secondaryTeal + '1A',
        paddingHorizontal: 10,
        paddingVertical: 15,
        borderRadius: 15,
        fontFamily: 'Jakarta-SemiBold',
        fontSize: 12,
        color: Colors.secondaryTeal,
        marginBottom: 4, // space between neusName and ellipsis
    },
     postImageContainer: {
      position: 'relative',
      marginTop: 12,
      borderRadius: 10,
      overflow: 'hidden',
    },
    postImage: {
        height: 250,
        marginTop: 12,
        borderRadius: 10,
    },
     mediaContainer: {
        height: 250,
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
});