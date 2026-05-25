import { Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from "@/store"; // Re-added the language store

// Retained consistent color palette
const Colors = {
  primaryOrange: "#FF8C00", 
  secondaryTeal: "#0FB1BB", 
  textDark: "#1A202C", 
  textMedium: "#4A5568", 
  textLight: "#718096", 
  backgroundWhite: "#FFFFFF",
};

// Updated Translation Dictionary for Nest Junior Tabs
export const translation1 = {
  ENG: {
    Map: "Map",
    MyKids: "My Kids",
    LiveFeed: "Live Feed",
    Alerts: "Alerts",
    Profile: "Profile"
  },
  ORM: {
    Map: "Kaartaa",
    MyKids: "Ijoollee koo",
    LiveFeed: "Kallattii",
    Alerts: "Akeekkachiisa",
    Profile: "Isin"
  },
  AMH: {
    Map: "ካርታ",
    MyKids: "ልጆቼ",
    LiveFeed: "ቀጥታ",
    Alerts: "ማሳወቂያዎች",
    Profile: "እርሶ"
  },
};

const TabIcon = ({ focused, name }: { focused: boolean; name: any }) => {
  return (
    <View className="items-center justify-center pt-2">
      <View 
        className={`p-2 rounded-full ${focused ? 'bg-opacity-10' : ''}`}
        style={focused ? { backgroundColor: Colors.secondaryTeal + '1A' } : {}}
      >
        <Ionicons
          name={name}
          size={24}
          color={focused ? Colors.secondaryTeal : Colors.textLight}
        />
      </View>
    </View>
  );
};

export default function Layout() {
  // Grab the current language from the store
  const { language } = useLanguageStore();
  
  // Extract the translated labels safely
  const { Map, MyKids, LiveFeed, Alerts, Profile } = translation1[language] || translation1.ENG;

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: Colors.secondaryTeal,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: {
          fontFamily: "Jakarta-SemiBold",
          fontSize: 12,
          marginTop: 4,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: Colors.backgroundWhite,
          borderTopWidth: 0,
          height: 80,
          paddingHorizontal: 16,
          shadowColor: Colors.textDark,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 15,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        },
        headerShown: false,
      }}
    >
      {/* Tab 1: Map -> Maps to home.tsx */}
      <Tabs.Screen
        name="home"
        options={{
          title: Map, // Dynamically translated
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'map' : 'map-outline'} />
          ),
        }}
      />

{/* Tab 2: My Kids -> Now a native tab screen */}
      <Tabs.Screen
        name="manage-children"
        options={{
          title: MyKids, 
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'people' : 'people-outline'} />
          ),
        }}
      />

      {/* Tab 3: Live Feed */}
      <Tabs.Screen
        name="live"
        options={{
          title: LiveFeed,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'videocam' : 'videocam-outline'} />
          ),
        }}
      />

      {/* Tab 4: Alerts -> Now a native tab screen */}
      <Tabs.Screen
        name="history"
        options={{
          title: Alerts, 
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'notifications' : 'notifications-outline'} />
          ),
        }}
      />

      {/* Tab 5: Profile -> Maps to profile.tsx */}
      <Tabs.Screen
        name="profile"
        options={{
          title: Profile, // Dynamically translated
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} />
          ),
        }}
      />

      {/* --- HIDDEN TABS (Maintained for non-destructive architecture) --- */}
      <Tabs.Screen
        name="posts"
        options={{ href: null }} 
      />
      <Tabs.Screen
        name="jobs"
        options={{ href: null }} 
      />
    </Tabs>
  );
}