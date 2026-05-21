import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,BottomSheetFlatList 
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, { useRef } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Map from "@/components/Map";
import { icons } from "@/constants";

//import { BottomSheetFlatList } from '@gorhom/bottom-sheet'; // Import FlatList if not already

const RideLayout = ({
  title,
  snapPoints,
  children,
  index,
}: {
  title: string;
  snapPoints?: string[];

}) => {


  return (
    <GestureHandlerRootView className="flex-1" >
      <View className="flex-1 bg-fuchisa" style={{width: '100%' }}>
        <View className="flex flex-col h-screen bg-fuchisa-500">
          <View className="flex flex-row absolute z-10 top-16 items-center justify-start px-5">
            <TouchableOpacity onPress={() => router.back()}>
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
                <Image
                  source={icons.backArrow}
                  resizeMode="contain"
                  className="w-6 h-6"
                />
              </View>
            </TouchableOpacity>
            <Text className="text-xl font-JakartaSemiBold ml-5">
              {title || "Go Back"}
            </Text>
          </View>

          <Map />
        </View>

        <BottomSheet
        keyboardShouldPersistTaps='handled'
        keepResultsAfterBlur={true}
        listViewDisplayed={false}
          keyboardbehavior="interactive"
          snapPoints={snapPoints || ["15%","53%", "60%"]}
          index={index || 0}
        >
            <BottomSheetView 

        keyboardShouldPersistTaps='handled'
        keepResultsAfterBlur={true}
        listViewDisplayed={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
       >
              {children}
            </BottomSheetView>

        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

export default RideLayout;
