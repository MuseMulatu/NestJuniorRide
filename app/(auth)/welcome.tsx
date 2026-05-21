import { router } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Image, Text, TouchableOpacity, View, Dimensions } from "react-native";
import Swiper from "react-native-swiper";
import { SafeAreaView } from "react-native-safe-area-context";

// Import reanimated
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  withSequence,
} from 'react-native-reanimated';

import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/app';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const Home = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // --- NEW: State for alternating descriptions ---
  const [descriptionIndex, setDescriptionIndex] = useState(0);
  const descriptionOpacity = useSharedValue(1);

  // Initialize Firebase only if it hasn't been initialized already
  if (!firebase.apps.length) {
    firebase.initializeApp();
  }
  //console.log(auth, "auth()");

  const isLastSlide = activeIndex === onboarding.length - 1;

  // --- Animations for Content Card Glow ---
  const glowOpacity = useSharedValue(0.2);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, // Repeat indefinitely
      true // Reverse animation
    );
    glowScale.value = withRepeat(
      withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
      transform: [{ scale: glowScale.value }],
    };
  });

  // --- Animations for specific slide elements ---
  // Slide 1: Flying Car
  const carTranslateX = useSharedValue(-screenWidth * 0.1);
  const carOpacity = useSharedValue(0);
  const animatedCarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: carTranslateX.value }],
      opacity: carOpacity.value,
    };
  });

  // Slide 2: Floating Bubbles/Nodes
  const bubble1TranslateY = useSharedValue(0);
  const bubble2TranslateY = useSharedValue(0);
  const animatedBubble1Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: bubble1TranslateY.value }],
    };
  });
  const animatedBubble2Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: bubble2TranslateY.value }],
    };
  });

  // Slide 3: Sparkles/Particles (Upward motion)
  const sparkleTranslateY = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);
  const animatedSparkleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sparkleTranslateY.value }],
      opacity: sparkleOpacity.value,
    };
  });
  
  // --- NEW: Animated style for description text ---
  const animatedDescriptionStyle = useAnimatedStyle(() => {
    return {
      opacity: descriptionOpacity.value,
    };
  });


  // Effect to trigger animations when slide changes
  useEffect(() => {
    // Reset and start animations based on activeIndex
    if (activeIndex === 0) {
      carTranslateX.value = withSequence(
        withTiming(-screenWidth * 0.15, { duration: 0 }),
        withTiming(screenWidth * 0.3, { duration: 10000, easing: Easing.linear })
      );
      carOpacity.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 500 }),
        withRepeat(withTiming(2, { duration: 7500, easing: Easing.linear }), -1, false)
      );
    } else {
      carOpacity.value = withTiming(0, { duration: 300 });
    }

    if (activeIndex === 1) {
      bubble1TranslateY.value = withRepeat(
        withTiming(-20, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      bubble2TranslateY.value = withRepeat(
        withTiming(20, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      bubble1TranslateY.value = withTiming(0, { duration: 300 });
      bubble2TranslateY.value = withTiming(0, { duration: 300 });
    }

    if (activeIndex === 2) {
      sparkleTranslateY.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(-screenHeight * 0.1, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 })
        ),
        -1, false
      );
      sparkleOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1, false
      );
    } else {
      sparkleOpacity.value = withTiming(0, { duration: 300 });
    }

    // --- NEW: Reset description index when swiper changes ---
    setDescriptionIndex(0);
  }, [activeIndex]);


  // --- NEW: Effect to cycle through descriptions ---
  useEffect(() => {
    const currentDescriptions = onboarding[activeIndex].description;
    const interval = setInterval(() => {
      descriptionOpacity.value = withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 600 })
      );
      setDescriptionIndex(prevIndex => (prevIndex + 1) % currentDescriptions.length);
    }, 5000); // Change description every 5 seconds

    return () => clearInterval(interval);
  }, [activeIndex, onboarding]);


  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Skip Button - Positioned at the top right */}
      <TouchableOpacity
        onPress={() => {
          router.replace("/(auth)/register");
        }}
        className="absolute top-0 right-0 z-20 p-5"
      >
        <Text className="text-gray-200 text-base font-JakartaBold">Skip</Text>
      </TouchableOpacity>

      <Swiper
        ref={swiperRef}
        loop={false}
        dot={
          <View className="w-[32px] h-[4px] mx-1 bg-gray-100 rounded-full" />
        }
        activeDot={
          <View className="w-[32px] h-[15px] mx-1 bg-gray-700 rounded-full" />
        }
        onIndexChanged={(index) => setActiveIndex(index)}
        paginationStyle={{ bottom: screenHeight * 0.315 }}
      >
        {onboarding.map((item) => (
          <View key={item.id} className="flex-1 items-center justify-start">
            {/* Full-screen Image */}
            <Image
              source={item.image}
              className="w-full"
              style={{ height: screenHeight * 0.75 }}
              resizeMode="cover"
            />

            {/* Animated Overlays based on slide */}
            {activeIndex === 0 && (
              <Animated.Image
                source={{ uri: 'https://freepngimg.com/thumb/car/2-2-car-transparent.png' }}
                style={[
                  { position: 'absolute', top: screenHeight * 0.6, width: 80, height: 40, zIndex: 10 },
                  animatedCarStyle
                ]}
                resizeMode="contain"
              />
            )}

            {activeIndex === 1 && (
              <>
                <Animated.View style={[
                  { position: 'absolute', top: screenHeight * 0.3, left: screenWidth * 0.1, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,255,255,0.3)', zIndex: 10 },
                  animatedBubble1Style
                ]} />
                <Animated.View style={[
                  { position: 'absolute', top: screenHeight * 0.45, right: screenWidth * 0.15, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,0,255,0.3)', zIndex: 10 },
                  animatedBubble2Style
                ]} />
              </>
            )}

            {activeIndex === 2 && (
              <Animated.View style={[
                { position: 'absolute', bottom: screenHeight * 0.35, width: 10, height: 10, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
                animatedSparkleStyle
              ]}>
                <Text style={{ fontSize: 60, color: 'gold', textShadowColor: 'rgba(255,255,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }}>❄️</Text>
              </Animated.View>
            )}


            {/* Content Overlay/Card at the bottom */}
            <Animated.View
              className="absolute bottom-0 w-full rounded-t-3xl py-8 px-6 shadow-xl items-center"
              style={[{ height: screenHeight * 0.35, elevation: 10 }, animatedGlowStyle]}
            >
              <View className="flex-1 items-center justify-center">
                {/* Title */}
                <Text
                  style={{ fontFamily: "mon-b" }}
                  className="font-JakartaBold text-white text-3xl text-center"
                >
                  {item.title}
                </Text>
                {/* Description (Now Animated and Alternating) */}
                <Animated.View className="mb-2" style={animatedDescriptionStyle}>
                  <Text className="text-lg font-JakartaSemiBold text-center text-orange-400 px-4">
                    {item.description[descriptionIndex]}
                  </Text>
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        ))}
      </Swiper>

      {/* Custom Button - Positioned at the very bottom */}
      <CustomButton
        title={isLastSlide ? "Get Started" : "Next"}
        onPress={() =>
          isLastSlide
            ? router.replace("/(auth)/register")
            : swiperRef.current?.scrollBy(1)
        }
        className="absolute bottom-5 w-11/12 self-center z-20"
      />
    </SafeAreaView>
  );
};

export default Home;