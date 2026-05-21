import { Tabs } from "expo-router";
import { Image, ImageSourcePropType, View, Text, Animated } from "react-native";
import rewardsIcon from '@/assets/icons/rewards2.png'; // Assuming this icon is still used or can be replaced
import { useLanguageStore } from "@/store";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { icons } from "@/constants"; // Assuming icons are used elsewhere
import { useEffect, useState, useRef } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Define the consistent color palette
const Colors = {
  primaryOrange: "#FF8C00", // Inviting Orange
  secondaryTeal: "#0FB1BB", // Vibrant Teal
  textDark: "#1A202C", // Dark Charcoal
  textMedium: "#4A5568", // Medium Gray
  textLight: "#718096", // Light Gray
  backgroundWhite: "#FFFFFF",
  backgroundLightGray: "#F7FAFC",
  borderLight: "#E2E8F0",
};

export const translation1 = {
    ENG: {
    Home: "Home",
    History: "History",
    Posts: "Social",
    Subscription: "Subscription",
    Profile: "Profile",
    Live: "Live",
    Jobs: "Jobs" 
  },
  ORM: {
    Home: "Mana",
    History: "Seenaa",
    Posts: "Hawaasaa",
    Subscription: "Ji'a ji'aan",
    Profile: "Isin",
    Live: "Laayivii",
    Jobs: "Hojii"
  },
  AMH: {
    Home: "ዋና",
    History: "ታሪክ",
    Posts: "ማህበራዊ",
    Subscription: "ወርሃዊ",
    Profile: "እርሶ",
    Live: "ቀጥታ",
    Jobs: "ስራዎች"
  },
}

const TabIcon = ({ focused, routeName }: { focused: boolean; routeName: string }) => {
  const iconColor = focused ? Colors.secondaryTeal : Colors.textLight; // Active Teal, Inactive Light Gray
  const iconSize = 24; // Slightly smaller for better balance

  const getIconName = () => {
    switch (routeName) {
      case 'home':
        return focused ? 'home' : 'home-outline';
      case 'live':
        return focused ? 'camera' : 'camera-outline';
      case 'posts':
        return focused ? 'people-sharp' : 'people-outline'; // Changed to people icon for "Social"
      case 'jobs':
        return focused ? 'briefcase' : 'briefcase-outline';
      case 'profile':
        return focused ? 'person' : 'person-outline';
      default:
        return 'help-circle';
    }
  };

  return (
    <View className="items-center justify-center pt-2">
      <View className={`p-2 rounded-full ${focused ? 'bg-opacity-10' : ''}`} // Subtle background for active icon
        style={focused ? { backgroundColor: Colors.secondaryTeal + '1A' } : {}} // Add a light tint to active icon background
      >
        <Ionicons
          name={getIconName()}
          size={iconSize}
          color={iconColor}
        />
      </View>
    </View>
  );
};

const SpecialTabIcon = ({ focused }: { focused: boolean }) => (
  <View className="items-center justify-center -mt-6">
    <View className={`
      p-3 rounded-full 
      ${focused ? 
        'shadow-lg' : // Stronger shadow for active
        'shadow-md' // Lighter shadow for inactive
      }`}
      style={{
        backgroundColor: Colors.primaryOrange, // Use primary orange for the special icon
        shadowColor: Colors.primaryOrange, // Match shadow color
        shadowOpacity: focused ? 0.4 : 0.2,
        shadowRadius: focused ? 10 : 5,
        elevation: focused ? 10 : 5, // Android elevation
      }}
    >
      <MaterialIcons
        name="emoji-people" // This icon is good for "Social"
        size={32}
        color={Colors.backgroundWhite} // White icon color
        style={{
          transform: [{ scale: focused ? 1 : 0.95 }],
          opacity: focused ? 1 : 0.8
        }}
      />
    </View>
  </View>
);

export default function Layout() {
  const { language } = useLanguageStore();
  const { Home, Live, Posts, Jobs, Profile } = translation1[language];

  return (
    <Tabs
      initialRouteName="home" // Changed initial route to home
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors.secondaryTeal, // Active Teal
        tabBarInactiveTintColor: Colors.textLight, // Inactive Light Gray
        tabBarLabelStyle: {
          fontFamily: "Jakarta-SemiBold",
          fontSize: 12,
          marginTop: 4,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: Colors.backgroundWhite, // White background
          borderTopWidth: 0,
          height: 80, // Slightly taller for modern look
          paddingHorizontal: 16,
          // Modern shadow for floating effect
          shadowColor: Colors.textDark, // Darker shadow color
          shadowOffset: { width: 0, height: -4 }, // Shadow upwards
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 15, // Android elevation
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0, // Keep sharp bottom edges
        },
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: Home,
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} routeName="home" />
          ),
        }}
      />

      <Tabs.Screen
        name="live"
        options={{
          tabBarLabel: Live,
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} routeName="live" />
          ),
        }}
      />

      <Tabs.Screen
        name="posts" // Assuming 'posts' is your social media tab
        options={{
          tabBarLabel: Posts, // "Social"
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <SpecialTabIcon focused={focused} /> // Special icon for the central "Social" tab
          ),
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          tabBarLabel: Jobs,
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} routeName="jobs" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: Profile,
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} routeName="profile" />
          ),
        }}
      />
    </Tabs>
  );
}