import firestore from '@react-native-firebase/firestore';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Button, TextInput, Alert, ActivityIndicator, TouchableOpacity, Text, ScrollView, Modal } from 'react-native';
import { defaultStyles } from '@/constants/Styles';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { CustomModal } from '@/components/modals';
import Colors from '@/constants/Colors';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Notifications from 'expo-notifications';
import { registerTranslations } from "@/lib/translations"
import Constants from "expo-constants"
import { useLanguageStore} from "@/store";
import { updateUser, updateByUsername, createUser, createUser2 } from "@/lib/utils";
import * as Linking from 'expo-linking';

const Page = () => {
const { language, setLanguage } = useLanguageStore();  
const t = registerTranslations[language];
const [expoToken1, setExpoToken1] = useState(null);
const [expoTok, setExpoTok] = useState('');

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const [generatedUsername, setGeneratedUsername] = useState(''); // To hold the initial generated username
  const [hasEditedUsername, setHasEditedUsername] = useState(false); // Track if user has changed it
  const [recommenderUsername, setRecommenderUsername] = useState('');

 // --- NEW: State for loading modal ---
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);
  const [loadingModalMessage, setLoadingModalMessage] = useState('');

async function retryWithBackoff(fn, retries = 5, delay = 300) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      const wait = delay * Math.pow(2, attempt); // exponential backoff
      console.warn(`Retry attempt ${attempt + 1} failed. Retrying in ${wait}ms...`, error);
      await new Promise(res => setTimeout(res, wait));
      attempt++;
    }
  }
  throw new Error('Operation failed after maximum retries');
}

  useEffect(() => {
    const randomDigits = Math.floor(Math.random() * 9000) + 1000;
    const cleanString = (str) => str ? str.replace(/\s+/g, '') : '';
    const defaultUsername = `${cleanString(name || 'share-user')}${randomDigits}`;
    // Generate a default username on component mount
  //  const defaultUsername = name ? author : 
    setGeneratedUsername(defaultUsername);
    setUsername(defaultUsername);
    console.log("username:", username)
  }, [name]);

const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
const projectId = (Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId);

console.log(projectId, "projectId") 
  const tokenData =  (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
  return tokenData
};

const useExpoPushToken = () => {
  let expoPushToken="";

    registerForPushNotifications().then((token) => {
    //  console.log("token:", token)
      if (token) expoPushToken = token;
    });


  return expoPushToken;
};

const expoToken = useExpoPushToken();
  const router = useRouter();


const registerOrUpdateRider = async (passedToken) => {
  const user = auth().currentUser;
  if (!user) return;
 setLoadingModalVisible(true);
  setLoadingModalMessage('Securing your account...');
const formattedPhoneNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : null;
const randomDigits = Math.floor(Math.random() * 9000) + 1000;
    const cleanString = (str) => str ? str.replace(/\s+/g, '') : '';
    const author = `@${cleanString(user?.displayName || 'Anonymous')}${randomDigits}`;

  if (user) {
    const riderRef = firestore().collection('riders').doc(user.uid);
    const riderDoc = await riderRef.get();

    if (riderDoc.exists) {
      try {
              await createUser2({
            id: user.uid,
            phone_number: phoneNumber,
            avatar_url: user?.photoURL,
            age: 18,
            gender: "Male",
 name: name || user.displayName, 
    email: user.email,
    expo_token: passedToken || expoToken1 || "bs",
    username: `@${username}`
        });
      setLoadingModalMessage(`Welcome back, ${user?.displayName}. Logging you back in...!`);
      } catch (err) {
console.log(" user exists ", err)
}
const thepassedToken = passedToken || expoToken1 || "bs"
      console.log("const expoToken = ", passedToken)
      // Update only the sign-time field for returning users
      await riderRef.update({
      newSignInTime: user.metadata.lastSignInTime,
      expoToken: thepassedToken,
      });
const result = await updateUser(user.uid, { expo_token: thepassedToken });
      console.log("User updated:", result);
      console.log('Updated sign-time for returning rider');
    router.replace('/(root)/(tabs)/home');  
    } else {
      console.log(name, "name")
      console.log(expoToken, "expoToken")
    setLoadingModalMessage(`Hey, ${user?.displayName}, we're creating your account. Please wait a moment!`);
      // Create a new document for new users
     const riderRef = firestore().collection('riders').doc(user.uid);
     const initialData = {
    name: user.displayName || name, // Assuming `name` is set elsewhere
    pnumber: phoneNumber,
    favoriteDrivers: [],
    recommenderUsername: recommenderUsername, 
    creationAt: user.metadata.lastSignInTime,
    expoToken: passedToken || expoToken1 || "bs",
    completedRides: {}, // Initially empty
    rideSummary: {
      cashback: 0,
    profileImage: user?.photoURL,
    },
  };  
        try {
              await createUser2({
            id: user.uid,
            phone_number: phoneNumber,
            avatar_url: user?.photoURL,
            age: 18,
            gender: "Male",
 name: name || user.displayName, 
    email: user.email,
    expo_token: passedToken || expoToken1 || "bs",
    username: `@${username}`,
    recommenderUsername: recommenderUsername, 
        });
      } catch (err) {
console.log(" user exists ", err)
}
await riderRef.set(initialData);
      console.log('Rider document created for new user');
router.replace('/(root)/(tabs)/home');  
    }
  }
   setLoadingModalVisible(false);
};

  GoogleSignin.configure({
    webClientId: '421773572020-8vec80jsioinp00t22kmoesactnrhhn1.apps.googleusercontent.com', // Add your web client ID here
  });

  
  const formatPhoneNumber = (number) => {
  if (number.startsWith('0')) {
    return '+251' + number.slice(1); // Remove '0' and replace with '+251'
  }
  return number; // Return as is if already formatted
};


// Function to validate the phone number
const validatePhoneNumber = (number) => {
  const regex = /^(09|07)[0-9]{8}$/; // Starts with 09 or 07, followed by 8 digits
  return regex.test(number);
};

  // Function to validate required fields
  const validateFields = () => {
    if (!name.trim()) {
      Alert.alert("Whoops,", "Name is required. ስም ያስፈልጎታል");
      return false;
    }

    if (!username.trim() || username < 4) {
      Alert.alert("Whoops,", "Username is required. ስም ያስፈልጎታል");
      return false;
    }

  if (!validatePhoneNumber(phoneNumber)) {
    Alert.alert("Whoops,", 'Please enter a valid phone number with no spaces or " - "');
    return false;
  }
  console.log(phoneNumber, validatePhoneNumber(phoneNumber))
    return true;
  };

  async function onGoogleButtonPress() {
    try {
      GoogleSignin.signOut()
      setLoading(true);
    GoogleSignin.configure({
      webClientId: '421773572020-8vec80jsioinp00t22kmoesactnrhhn1.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
await GoogleSignin.hasPlayServices();

    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo.data;
console.log(userInfo, "idToken")
    if (!idToken) {
      setLoading(false); 
      console.error("No idToken received from Google Sign-In");
      return;
    }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
     const user = auth().currentUser;     
            if (user) {
        let retries = 0;
      let token = null;
      
      // Retry logic
      while (!token && retries < 10) {
        token = await registerForPushNotifications();
        if (token) {
          setExpoToken1(token); // Set state once token is retrieved
        }
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 1 second
        retries++;
      }

      console.log("expoToken inside confirmCode is", token);
      await retryWithBackoff(() => registerOrUpdateRider(token));
    }

      // await registerOrUpdateRider(expoTok);
      // router.replace('/(root)/(tabs)/home'); // Navigate to home

      console.log("Signed in with Google");
    } catch (error) {
      if(error=="Error: NETWORK_ERROR" || error=="Error: [auth/network-request-failed")
        Alert.alert("Whoops", "Please check your internet connection and try again.")
      setLoading(false);
      console.error("Google sign-in error", error);
      console.error("Google sign-in error", error.error);
    }
  }


  async function signInWithPhoneNumber(phoneNumber) {
    setLoading(true);
    const formattedPhoneNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : null;
    console.log(formattedPhoneNumber, "formattedPhoneNumber")
    try {
      const confirmation = await auth().signInWithPhoneNumber(formattedPhoneNumber); // Send SMS
      setConfirm(confirmation);
      console.log(confirmation, "confirmation")
    } catch (error) {
      console.error('signInWithPhoneNumber error', error);
      setModalMessage("Failed to send verification code. Please try again.");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  }

async function confirmCode() {
  if (!confirm) {
    setModalMessage("Please request a verification code first.");
    setModalVisible(true);
    return;
  }

  console.log("confirmCode expoToken:", expoTok);
  setLoading(true);

  try {
    await confirm.confirm(code); // Confirm code
    const user = auth().currentUser;

    if (user) {
      console.log("Trying to registerOrUpdateRider with expoToken:", expoTok);

      // Retry entire function if anything fails inside it
      await retryWithBackoff(() => registerOrUpdateRider(expoTok));

      router.replace('/(root)/(tabs)/home'); // Navigate to home only if successful
    }
  } catch (error) {
    console.error('Sign-in failed:', error);
    setModalMessage("Sign-in failed. Please try again.");
    setModalVisible(true);
  } finally {
    setLoading(false);
  }
}

const handlePrivacyPolicy = () => {
  Linking.openURL('https://share-rides.com/hulum-privacy-policy');
};

const handleTermsAndConditions = () => {
  Linking.openURL('https://share-rides.com/terms-and-conditions/');
};

  const handleSignUpOption = async (option) => {
    if (!validateFields()) return;

    if (option === 'phone') {
      await signInWithPhoneNumber(phoneNumber); // Trigger phone number verification
    } else if (option === 'google') {
      await onGoogleButtonPress();
    } else if (option === 'facebook') {
      await onFacebookButtonPress();
    }
  };
 // Main Render
  return (
  <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {/* Language Selector */}
      <View style={styles.languageContainer}>
        {['ENG', 'AMH', 'ORM'].map((lang) => (
          <TouchableOpacity
            key={lang}
            onPress={() => setLanguage(lang)}
            style={[
              styles.languageButton,
              language === lang && styles.activeLanguage
            ]}
          >
            <Text style={[
              styles.languageText,
              language === lang && styles.activeLanguageText
            ]}>
              {lang}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Title */}
      <Text style={styles.mainTitle}>{t.signInToShare}</Text>

      {/* Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.namePlaceholder}</Text>
        <TextInput
          autoCapitalize="words" // Capitalize first letter of each word
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
      </View>

      {/* Phone Number / SMS Code Input */}
      {!confirm ? (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.enterPhoneNumber}</Text>
          <TextInput
            autoCapitalize="none"
            value={phoneNumber}
            placeholder={t.phoneNumberPlaceholder}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.verificationCodeLabel}</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={code}
            placeholder={t.enterCode}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Username Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <View className="flex-row">
        <Text style={styles.input}>@</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (text !== generatedUsername && !hasEditedUsername) {
              setHasEditedUsername(true);
            }
          }}
          placeholder="Choose your unique username"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
        </View>
        <Text style={styles.noticeText}>
          Please choose carefully. Your username can only be set once.
        </Text>
      </View>

      {/* --- NEW: T&C and Privacy Policy Section --- */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing up, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => handleTermsAndConditions()}>Terms of Service</Text>
          {' and our '}
          <Text style={styles.termsLink} onPress={() => handlePrivacyPolicy()}>Privacy Policy</Text>.
        </Text>
      </View>
      {/* --- END NEW SECTION --- */}

      {loading && <ActivityIndicator size="large" color={Colors.primaryOrange} style={styles.loadingIndicator} />}

      {/* Sign-up Options / Confirm Code Button */}
      {!confirm ? (
        <>
{/*          <View style={styles.separatorView}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>*/}

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleSignUpOption('google')}
            disabled={loading}
          >
            <FontAwesome name="google" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>{t.continueWithGoogle}</Text>
          </TouchableOpacity>

      {/* Recommender Username Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Recommender Username (Optional)</Text>
        <TextInput
          style={styles.input}
          value={recommenderUsername}
          onChangeText={setRecommenderUsername}
          placeholder="Enter username of who recommended you"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
      </View>

{/*          <TouchableOpacity
            style={styles.phoneButton} // New button for phone number sign-in
            onPress={() => handleSignUpOption('phone')}
            disabled={loading}
          >
            <Ionicons name="phone-portrait-outline" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>{t.continueWithPhone}</Text>
          </TouchableOpacity>*/}

          {/* Removed Facebook option for now as it's not implemented */}
        </>
      ) : (
        <TouchableOpacity
          style={styles.confirmCodeButton}
          onPress={confirmCode}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Confirm your code</Text>
        </TouchableOpacity>
      )}
 {/* --- NEW: Loading Modal --- */}
      <Modal
        visible={loadingModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color={Colors.primaryOrange} />
            <Text style={styles.loadingModalText}>{loadingModalMessage}</Text>
          </View>
        </View>
      </Modal>
      {/* --- END NEW SECTION --- */}
      <CustomModal
        visible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
  </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', // Pure white background
    paddingHorizontal: 24, // Consistent padding
    paddingTop: 60, // Give space from top
  },
    scrollContainer: { // <-- New style for the ScrollView content
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40, // More space below language selector
  },
  languageButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25, // More rounded for modern look
    borderWidth: 1,
    borderColor: '#E2E8F0', // Light gray border
    marginHorizontal: 4, // Spacing between buttons
  },
  activeLanguage: {
    backgroundColor: '#FF8C00', // Inviting Orange
    borderColor: '#FF8C00',
  },
  languageText: {
    fontFamily: 'Jakarta-SemiBold', // Ensure font is loaded
    color: '#64748B', // Muted gray for inactive
    fontSize: 14,
  },
  activeLanguageText: {
    color: 'white', // White text for active
  },
  mainTitle: {
    fontFamily: 'mon-b', // Assuming 'mon-b' is your bold font
    fontSize: 32, // Larger, more impactful title
    color: '#1A202C', // Dark charcoal text
    textAlign: 'center',
    marginBottom: 40, // Space below title
  },
  inputGroup: {
    marginBottom: 24, // Consistent spacing between input groups
  },
  label: {
    fontSize: 15,
    fontFamily: 'Jakarta-SemiBold', // Semi-bold for labels
    color: '#4A5568', // Darker gray for labels
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC', // Light off-white background for input
    borderWidth: 1,
    borderColor: '#E2E8F0', // Light gray border
    borderRadius: 12, // More rounded corners
    paddingVertical: 16,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#1A202C', // Dark text input
    fontFamily: 'Jakarta-SemiBold',
  },
  noticeText: {
    fontSize: 12,
    color: '#718096', // Muted gray
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: 'Jakarta-Regular', // Assuming a regular font for this
  },
  separatorView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20, // Space around separator
  },
  separatorLine: {
    flex: 1,
    borderBottomColor: '#E2E8F0', // Light gray line
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  separatorText: {
    fontFamily: 'Jakarta-SemiBold',
    color: '#A0AEC0', // Muted gray for 'OR'
    fontSize: 14,
    marginHorizontal: 10,
  },
  googleButton: {
    backgroundColor: '#FF8C00', // Inviting Orange
    height: 56, // Taller buttons
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20, // Space below button
    shadowColor: '#FF8C00', // Orange shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8, // Android shadow
  },
  phoneButton: { // New button for phone number sign-in
    backgroundColor: '#334155', // Darker color for secondary option
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  confirmCodeButton: { // Style for confirm code button
    backgroundColor: '#FF8C00', // Inviting Orange
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10, // Space above button
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Jakarta-Bold', // Bold text for CTAs
    marginBottom: 4
  },
  loadingIndicator: {
    marginTop: 20,
    marginBottom: 20,
  },
  termsContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  termsText: {
    fontSize: 13,
    color: '#4A5568',
    fontFamily: 'Jakarta-Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#0FB1BB', // Use a link color
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  loadingModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingModalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  loadingModalText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'Jakarta-Bold',
    color: '#4A5568',
    textAlign: 'center',
  },
});

export default Page;