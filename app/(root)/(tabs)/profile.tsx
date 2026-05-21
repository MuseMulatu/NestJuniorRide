import { View, Text, Button, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import auth from '@react-native-firebase/auth';
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import storage from '@react-native-firebase/storage';
import React, { useEffect, useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import InputField from "@/components/InputField";
import firestore from '@react-native-firebase/firestore';
import { updateUser, updateByUsername, createUser, userProfile, userProfileById } from "@/lib/utils";
import { usePhoneNumberStore, useShareUsernameStore } from "@/store";

// --- NEW: Custom Modal Component for Alerts ---
import { CustomModal } from '@/components/modals';

// --- NEW: API URLs for withdrawal request ---
const API_BASE_URL = 'https://app.share-rides.com/api';
const DEFAULT_AVATAR = 'https://static.vecteezy.com/system/resources/thumbnails/002/387/693/small_2x/user-profile-icon-free-vector.jpg';

const CLOUD_NAME = "dpccavqia";       // from Cloudinary dashboard
const UPLOAD_PRESET = "expo_profile_images"; // create in Cloudinary settings

// --- Define consistent color palette ---
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

const Profile = () => {
  const router = useRouter();
  const user = auth().currentUser;
  const [userDB, setUserDB] = useState(null);
  const { shareUsername, setShareUsername, socialCount, setSocialCount, expoToken, setExpoToken } = useShareUsernameStore();
  const { phoneNumberStore, setPhoneNumberStore, setProfileImageUrl, profileImageUrl, gender, bio, seatNumber, setprofileDetails, almaz } = usePhoneNumberStore();
  const [profileImage, setProfileImage] = useState(null);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [isSignedIn, setIsSignedIn] = useState('');

  const [recommendedCount, setRecommendedCount] = useState(0);
  const [affiliateBalance, setAffiliateBalance] = useState(0); // This is the withdrawable amount
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: State for withdrawal modal ---
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalAccount, setWithdrawalAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

    const fetchDriverData = async () => {
      try {
        const user = auth().currentUser; // Get current user here
        if (!user) return; // Exit if no user

        const driverData = await userProfileById(user.uid); // Assuming userProfileById is defined
        setShareUsername(driverData?.username || null);
        setSocialCount(driverData?.follower_count || 0);
             setPhoneNumberStore(driverData?.phone_number || null);
          setProfileImageUrl(driverData.avatar_url)
          setprofileDetails({ gender: driverData?.gender, almaz: driverData?.balance });
          setExpoToken(driverData?.expo_token || null);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      setIsSignedIn(true);
      setName(currentUser.displayName);
      fetchUserData(currentUser.uid);
      if(!shareUsername && !profileImageUrl){
        fetchDriverData()
      }
      fetchDriverData();
    } else {
      Alert.alert("Please sign in first!"); // Should be a CustomModal
      router.replace('/(auth)/welcome');
      setIsSignedIn(false);
    }
  }, []);

  const fetchUserData = async (uid) => {
          const currentUser = auth().currentUser;
const userId = currentUser.uid;
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/balance`);
      const data = await response.json();
      console.log("data", data)
      if (data.balance) {
       setprofileDetails({ almaz: data.balance }); // Set the balance from the API response
      }

      const userProfileData = await userProfileById(userId); // Use the provided utility
      setRecommendedCount(userProfileData.recommended_count || 0);
      setAffiliateBalance(userProfileData.affiliate_balance || 0);
      setProfileImage(userProfileData.profile_image || DEFAULT_AVATAR);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setModalMessage("Error fetching profile data. Please check your connection.");
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogOut = async () => {
    try {
      await auth().signOut();
      setModalMessage("Successfully signed out!");
      setModalVisible(true);
      setIsSignedIn(false);
      router.replace('/(auth)/welcome');
    } catch (error) {
      console.error('Error signing out:', error);
      setModalMessage("Error signing out. Please try again.");
      setModalVisible(true);
    }
  };

  const updateProfileData = async () => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
  //      await currentUser.updateProfile({ displayName: name });
    //    await updateUser(currentUser.uid, { name });
        setModalMessage("Profile updated successfully!");
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setModalMessage("Error updating profile. Please try again.");
      setModalVisible(true);
    }
  };

 const handleImagePicker = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const source = result.assets[0].uri;
      setProfileImage(source);
      const uploadedUrl = await uploadImageToCloudinary(source);
      if (uploadedUrl) {
        setProfileImage(uploadedUrl); // show the hosted image
        Alert.alert("Success", "Profile picture updated!");
      }
    }
  };

const uploadImageToCloudinary = async (imageUri: string): Promise<string | null> => {
    try {
      const data = new FormData();
      data.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "profile.jpg",
      } as any);
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (json.secure_url) {
        console.log("Uploaded to Cloudinary:", json.secure_url);
        await updateUser(user?.uid, {avatar_url: json.secure_url})
        setProfileImageUrl(json.secure_url)
        return json.secure_url;
      } else {
        console.error("Cloudinary upload error:", json);
        return null;
      }
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  // --- NEW: Withdrawal Request Logic ---
  const handleWithdrawRequest = async () => {
    if (((Number(affiliateBalance) || 0) + (Number(almaz) || 0)) < 300) {
      setModalMessage("You can withdraw once your balance is over 300 ETB.");
      setModalVisible(true);
      return;
    }
    // All validation and processing is done in the backend after the request
    try {
      const response = await fetch(`${API_BASE_URL}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid}`,
        },
        body: JSON.stringify({
          userId: user?.uid,
          amount: withdrawalAmount, // Requesting full balance
          bank_name: bankName,
          account_number: withdrawalAccount,
          account_holder_name: accountHolder,
          username: shareUsername
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setModalMessage("Withdrawal request submitted successfully!");
        setModalVisible(true);
        setShowWithdrawalModal(false);
        // Optimistically set balance to 0 (or trigger re-fetch)
        setAffiliateBalance(0);
      } else {
        setModalMessage(result.message || "Withdrawal failed.");
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      setModalMessage("Could not contact server. Please try again.");
      setModalVisible(true);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondaryTeal} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.mainTitle}>My Profile</Text>
          <TouchableOpacity onPress={handleLogOut}>
            <MaterialIcons name="logout" size={24} color={Colors.warningRed} />
          </TouchableOpacity>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleImagePicker}>
            <Image
              source={{ uri: profileImageUrl || profileImage || DEFAULT_AVATAR }}
              style={styles.profileAvatar}
            />
          </TouchableOpacity>

          <View style={styles.profileNameContainer}>
            {edit ? (
              <View style={styles.editRow}>
                <TextInput
                  placeholder="Your Name"
                  value={name}
                  onChangeText={setName}
                  style={styles.nameInput}
                />
                <TouchableOpacity onPress={updateProfileData}>
                  <Ionicons name="checkmark-outline" size={24} color={Colors.secondaryTeal} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.editRow}>
                <Text style={styles.profileNameText}>{name}</Text>
                <TouchableOpacity onPress={() => setEdit(true)}>
                  <Ionicons name="create-outline" size={24} color={Colors.textMedium} />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.profileUsernameText}>
             {shareUsername || "username"}
            </Text>
          </View>
        </View>

        {/* Stats & Enqu Balance */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{socialCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.enquBalanceRow}>
              <Ionicons name="diamond" size={20} color={Colors.secondaryTeal} />
              <Text style={styles.statNumber}>{almaz || 0}</Text>
            </View>
            <Text style={styles.statLabel}>Enqu</Text>
          </View>
        </View>


        {/* Contact Info Section */}
        <View style={styles.contactInfoSection}>
          <Text style={styles.contactInfoTitle}>Contact Information</Text>
          <InputField
            label="Email"
            placeholder={user?.email || "You haven't set an email"}
            containerStyle="w-full"
            inputStyle="p-3.5"
            editable={false}
          />
          <InputField
            label="Phone"
            placeholder={phoneNumberStore || "You haven't set a phone number"}
            containerStyle="w-full"
            inputStyle="p-3.5"
            editable={false}
          />
        </View>


        {/* My Rewards Section (Rebranded Affiliate Marketing) */}
        <View style={styles.rewardsSection}>
          <View style={styles.rewardsHeader}>
            <MaterialIcons name="redeem" size={24} color={Colors.primaryOrange} />
            <Text style={styles.rewardsTitle}>My Rewards</Text>
          </View>

          <View style={styles.rewardsDetailsContainer}>
            <View style={styles.rewardsDetailItem}>
              <Text style={styles.rewardsLabel}>Referrals:</Text>
              <Text style={styles.rewardsValue}>{recommendedCount || 0}</Text>
            </View>
            <View style={styles.rewardsDetailItem}>
              <Text style={styles.rewardsLabel}> Balance:</Text>
<Text style={styles.rewardsValue}>
  {((Number(affiliateBalance) || 0) + (Number(almaz) || 0))} ETB
</Text>
            </View>
          </View>
<TouchableOpacity
  style={[
    styles.withdrawButton, 
    (Number(affiliateBalance) + Number(almaz) < 300) && styles.withdrawButtonDisabled
  ]}
  onPress={() => setShowWithdrawalModal(true)}
  disabled={(Number(affiliateBalance) + Number(almaz)) < 300}
>
  <Text style={styles.withdrawButtonText}>Request Payout</Text>
</TouchableOpacity>

{(Number(affiliateBalance) + Number(almaz)) < 300 && (
  <Text className="text-red-400" style={styles.minWithdrawalText}>
    Minimum balance of 300 ETB required for payout.
  </Text>
)}
        </View>

      </ScrollView>

      {/* --- NEW: Withdrawal Request Modal --- */}
      <Modal
        visible={showWithdrawalModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.withdrawalModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <TouchableOpacity onPress={() => setShowWithdrawalModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMedium} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstructionText}>
              Enter your bank account details. We will process the transfer to the account you provide within 7 BUSINESS days.
            </Text>
            <Text style={styles.modalBalanceText}>
              Current Balance: <Text style={{ color: Colors.secondaryTeal, fontWeight: 'bold' }}>149,000 ETB</Text>
            </Text>

            <TextInput
              placeholder="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              style={styles.withdrawalInput}
            />
            <TextInput
              placeholder="Account Number"
              value={withdrawalAccount}
              onChangeText={setWithdrawalAccount}
              style={styles.withdrawalInput}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Amount"
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
              style={styles.withdrawalInput}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Account Holder's Name"
              value={accountHolder}
              onChangeText={setAccountHolder}
              style={styles.withdrawalInput}
            />
            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.submitWithdrawalButton}
              onPress={handleWithdrawRequest}
              disabled={!bankName || !withdrawalAmount || !withdrawalAccount }
            >
              <Text style={styles.submitWithdrawalButtonText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Global Custom Modal for Alerts --- */}
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
    backgroundColor: Colors.backgroundLightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLightGray,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textMedium,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  mainTitle: {
    fontSize: 26,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  profileCard: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.backgroundLightGray,
    backgroundColor: Colors.borderLight, // Placeholder
  },
  profileNameContainer: {
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  nameInput: {
    fontSize: 22,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: 5,
  },
  profileNameText: {
    fontSize: 22,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  profileUsernameText: {
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    columnGap: 10,
  },
  statCard: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textMedium,
    marginTop: 5,
  },
  enquBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  rewardsSection: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 20,
  },
  rewardsTitle: {
    fontSize: 20,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  rewardsDetailsContainer: {
    marginBottom: 20,
  },
  rewardsDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardsLabel: {
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
  },
  rewardsValue: {
    fontSize: 16,
    fontFamily: 'Jakarta-SemiBold',
    color: Colors.textDark,
  },
  withdrawButton: {
    backgroundColor: Colors.secondaryTeal,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.secondaryTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  withdrawButtonDisabled: {
    backgroundColor: Colors.textLight,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  withdrawButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 16,
  },
  minWithdrawalText: {
    fontSize: 12,
    fontFamily: 'Jakarta-SemiBold',
    marginTop: 8,
    textAlign: 'center',
  },
  contactInfoSection: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  contactInfoTitle: {
    fontSize: 20,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Jakarta-Bold',
    color: Colors.textDark,
  },
  withdrawalModalContent: {
    backgroundColor: Colors.backgroundWhite,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 15,
  },
  modalInstructionText: {
    fontSize: 15,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBalanceText: {
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  withdrawalInput: {
    backgroundColor: Colors.backgroundLightGray,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Jakarta-Medium',
    color: Colors.textDark,
    marginBottom: 12,
  },
  submitWithdrawalButton: {
    backgroundColor: Colors.secondaryTeal,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.secondaryTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    marginTop: 20,
  },
  submitWithdrawalButtonText: {
    color: Colors.backgroundWhite,
    fontFamily: 'Jakarta-Bold',
    fontSize: 18,
  },
});
export default Profile;