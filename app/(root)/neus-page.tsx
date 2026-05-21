import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PostItem from '@/components/PostItem';
import auth from '@react-native-firebase/auth';
import { CustomAlertModal, ReportModal, translations } from "@/components/modals"
import { useLanguageStore } from "@/store";
const API_BASE_URL = 'https://app.share-rides.com/api';

const NeusPage = () => {
    const { neusId, neusName } = useLocalSearchParams();
    const router = useRouter();
    const user = auth()?.currentUser;
    const currentUserId = user?.uid;
  const { language, setLanguage } = useLanguageStore();
    const [neusDetails, setNeusDetails] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [openMenuId, setOpenMenuId] = useState(null); // Tracks which post menu is open
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportingPost, setReportingPost] = useState(null);

 // Modal state
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newNeusName, setNewNeusName] = useState('');
    const [newNeusDesc, setNewNeusDesc] = useState('');
  const [modalData, setModalData] = useState({ title: "", message: "", imageSource: null, });
    const [alertModalVisible, setAlertModalVisible] = useState(false);

    const fetchNeusData = useCallback(async () => {
        try {
            const detailsRes = await fetch(`${API_BASE_URL}/neus/${neusId}`);
            const detailsData = await detailsRes.json();
            setNeusDetails(detailsData);
     
        const postsRes = await fetch(`${API_BASE_URL}/posts/fetch?neusId=${neusId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUserId, // Make sure userId is available in this scope
            },
        });
            const postsData = await postsRes.json();
            setPosts(postsData.posts);
        } catch (error) {
            console.error("Error fetching neus data:", error);
          //  Alert.alert('Error', 'Could not load the neus.');
        }
    }, [neusId]);

    useEffect(() => {
        setLoading(true);
        fetchNeusData().finally(() => setLoading(false));
    }, [fetchNeusData]);

    const handleDelete = (postId) => {
        Alert.alert('Delete Post', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete', onPress: async () => {
                    await fetch(`${API_BASE_URL}/posts/${postId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId })
                    });
                    fetchNeusData();
                }, style: 'destructive'
            }
        ]);
    };

    const submitNewNeus = async () => {
        if (!newNeusName.trim() || newNeusName.includes(' ')) {
            Alert.alert('Validation Error', 'Name cannot be empty or contain spaces.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/neus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newNeusName.trim(),
                    description: newNeusDesc,
                    creator_id: currentUserId
                })
            });

            if (res.status === 409) {
                Alert.alert('Duplicate', 'A neus with that name already exists.');
            } else if (!res.ok) {
                throw new Error('Create failed');
            } else {
                setCreateModalVisible(false);
                setNewNeusName('');
                setNewNeusDesc('');
                Alert.alert('Success', 'Neus created!');
            }
        } catch (error) {
            console.error('Neus creation failed:', error);
            Alert.alert('Error', 'Could not create neus.');
        }
    };

  const handleEditPost = (post) => {
      // Logic for editing a post
      console.log('Editing post:', post);
      // In a real app, you'd likely open a modal similar to create, pre-filled with post data
  };
  const handleDeletePost = async (postId) => {
      console.log('Deleting post:', postId);
      try {
          const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
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
          setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
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

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

    const isModerator = neusDetails?.creator_id === currentUserId;

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={posts}
                renderItem={({ item }) => (
                    <PostItem 
                        item={item} 
                        currentUserId={currentUserId}
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
                ListHeaderComponent={
                    <View style={styles.headerContainer}>
                        <View style={styles.headerTopRow}>
                            <Text style={styles.headerTitle}>n/{neusDetails?.name}</Text>
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={() => setCreateModalVisible(true)}
                            >
                                <Text style={styles.createButtonText}>+ Create Neus</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.headerDescription}>{neusDetails?.description}</Text>
                        {isModerator && (
                            <View style={styles.modContainer}>
                                <TouchableOpacity style={styles.modButton}>
                                    <Text style={styles.modButtonText}>Ban User</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                }
            />
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
            {/* Modal for Creating Neus */}
            <Modal visible={createModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text>Create New Neus</Text>
                        <TextInput
                            placeholder="Neus Name (no spaces)"
                            value={newNeusName}
                            onChangeText={setNewNeusName}
                            style={styles.textInput}
                        />
                        <TextInput
                            placeholder="Description"
                            value={newNeusDesc}
                            onChangeText={setNewNeusDesc}
                            style={[styles.textInput, { height: 80 }]}
                            multiline
                        />
                        <TouchableOpacity onPress={submitNewNeus} style={styles.submitButton}>
                            <Text style={styles.submitButtonText}>Create</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                            <Text style={{ color: 'red', marginTop: 10 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    headerDescription: { fontSize: 16, color: 'gray', marginTop: 8 },
    modContainer: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, paddingTop: 10, borderColor: '#eee' },
    modButton: { backgroundColor: 'red', padding: 8, borderRadius: 5 },
    modButtonText: { color: 'white' },
    createButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4
    },
    createButtonText: {
        color: 'white',
        fontSize: 14
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 8,
        width: '85%'
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginTop: 10
    },
    submitButton: {
        backgroundColor: 'green',
        padding: 12,
        marginTop: 15,
        borderRadius: 5
    },
    submitButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold'
    }
});

export default NeusPage;