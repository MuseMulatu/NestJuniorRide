import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome, MaterialIcons, } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";

const SubscriptionOrder = () => {
  const [morningPickup, setMorningPickup] = useState("");
  const [eveningPickup, setEveningPickup] = useState("");
  const [estimate, setEstimate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [subscriptionType, setSubscriptionType] = useState(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState({ morning: false, evening: false });

  const [times, setTimes] = useState({ 
    morning: new Date().setHours(7,0), 
    evening: new Date().setHours(17,0) 
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("creditCard");
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const [showTimePickerMo, setShowTimePickerMo] = useState(false);
  const [showTimePickerEv, setShowTimePickerEv] = useState(false);
    const [moTime, setMoTime] = useState(new Date());
      const [evTime, setEvTime] = useState(new Date());

  // Pricing configuration
  const pricing = {
    normal: { roundTrip: 100, oneWay: 60 },
    student: { roundTrip: 80, oneWay: 50 },
    corporate: { roundTrip: 120, oneWay: 70 }
  };

    const calculatePrice = (duration) => {
    const base = isRoundTrip 
      ? pricing[subscriptionType].roundTrip 
      : pricing[subscriptionType].oneWay;
    
    const multipliers = {
      monthly: 1,
      threeMonths: 3 * 0.95,
      sixMonths: 6 * 0.90,
      yearly: 12 * 0.85
    };

    return base * multipliers[duration];
  };

  const handleOrderConfirmation = () => {
    // Here you would typically integrate with a payment gateway
    setOrderConfirmed(true);
    setTimeout(() => setOrderConfirmed(false), 5000); // Hide confirmation after 5sec
  };

  const calculateEstimate = () => {
    let baseCost = 0;

    if (subscriptionType === "normal") {
      baseCost = isRoundTrip ? 100 : 60;
    } else if (subscriptionType === "student") {
      baseCost = isRoundTrip ? 80 : 50;
    } else if (subscriptionType === "corporate") {
      baseCost = isRoundTrip ? 120 : 70;
    }

    const monthly = baseCost * 30;
    const threeMonths = monthly * 3 * 0.95; // 5% discount
    const sixMonths = monthly * 6 * 0.9; // 10% discount
    const yearly = monthly * 12 * 0.85; // 15% discount

    setEstimate({
      monthly,
      threeMonths,
      sixMonths,
      yearly,
    });
    setModalVisible(true);
  };

  const handleMoTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || moTime;
    setShowTimePickerMo(false);

    // Adjust time to UTC+3
    const adjustedTime = new Date(currentTime);
    adjustedTime.setHours(adjustedTime.getHours());

    setMoTime(adjustedTime);
    console.log("Selected Time (UTC+3):", adjustedTime);
  };

  const handleEvTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || evTime;
    setShowTimePickerEv(false);

    // Adjust time to UTC+3
    const adjustedTime = new Date(currentTime);
    adjustedTime.setHours(adjustedTime.getHours());

    setEvTime(adjustedTime);
    console.log("Selected Time (UTC+3):", adjustedTime);
  };

  return (
  <SafeAreaView className="flex-1 p-4 bg-gray-50">
    <ScrollView contentContainerStyle={{paddingBottom: 100}}>
      {/* Header */}
      <View className="mb-8">
        <Text className="text-3xl font-JakartaBold text-gray-900">Daily Commute Plan</Text>
        <Text className="text-gray-500 mt-2">Get reliable daily rides with exclusive discounts</Text>
      </View>

      {/* Subscription Type Cards */}
      <View className="space-y-4 mb-8">
        <TouchableOpacity 
          className={`p-6 rounded-xl border-2 ${subscriptionType === 'normal' ? 'border-teal-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
          onPress={() => setSubscriptionType('normal')}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-JakartaSemiBold text-gray-900">Standard Plan</Text>
              <Text className="text-gray-500 font-Jakarta mt-1">For regular commuters</Text>
            </View>
            <MaterialIcons name="commute" size={24} color="teal" />
          </View>
        </TouchableOpacity>

        {/* Repeat similar blocks for student and corporate */}
      </View>

      {/* Trip Type Toggle */}
      <View className="bg-white p-4 rounded-xl border border-gray-200 mb-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-700 font-JakartaMedium">Trip Type</Text>
          <View className="flex-row bg-gray-100 rounded-full p-1">
            <TouchableOpacity 
              className={`px-6 py-2 rounded-full ${isRoundTrip ? 'bg-teal-500' : ''}`}
              onPress={() => setIsRoundTrip(true)}
            >
              <Text className={`font-JakartaMedium ${isRoundTrip ? 'text-white' : 'text-gray-600'}`}>
                Round Trip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`px-6 py-2 rounded-full ${!isRoundTrip ? 'bg-teal-600' : ''}`}
              onPress={() => setIsRoundTrip(false)}
            >
              <Text className={`font-JakartaMedium ${!isRoundTrip ? 'text-white' : 'text-gray-600'}`}>
                One Way
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Time Pickers */}
      <View className="space-y-4 mb-8">
        <TouchableOpacity 
          className="bg-white p-4 rounded-xl border border-gray-200"
          onPress={() => setShowTimePicker({ ...showTimePicker, morning: true })}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <FontAwesome name="sun-o" size={20} color="#f59e0b" />
              <Text className="text-gray-700 font-JakartaMedium">Morning Pickup</Text>
            </View>
            <Text className="text-gray-500">
              {new Date(times.morning).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </TouchableOpacity>

        {isRoundTrip && (
          <TouchableOpacity 
            className="bg-white p-4 rounded-xl border border-gray-200"
            onPress={() => setShowTimePicker({ ...showTimePicker, evening: true })}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3">
                <FontAwesome name="moon-o" size={20} color="#4b5563" />
                <Text className="text-gray-700 font-JakartaMedium">Evening Return</Text>
              </View>
              <Text className="text-gray-500">
                {new Date(times.evening).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Plan Selection */}
      {subscriptionType && (
        <View className="mb-8">
          <Text className="text-lg font-JakartaSemiBold text-gray-900 mb-4">Select Duration</Text>
          <View style={{alignSelf: "center"}} className="flex-row justify-center flex-wrap gap-4">
            {['monthly', 'threeMonths', 'sixMonths', 'yearly'].map((plan) => (
              <TouchableOpacity 
                key={plan}
                className={`p-4 rounded-xl border-2 w-[48%] ${selectedPlan === plan ? 'border-teal-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                onPress={() => setSelectedPlan(plan)}
              >
                <Text className="font-JakartaMedium text-gray-900 capitalize">{plan}</Text>
                <Text className="text-teal-600 font-JakartaBold mt-2">
                  ETB {calculatePrice(plan).toFixed(2)}
                </Text>
                {plan.includes('Months') || plan === 'yearly' ? (
                  <Text className="font-Jakarta text-green-600 text-xs mt-1">
                    Save {plan === 'threeMonths' ? '5%' : plan === 'sixMonths' ? '10%' : '15%'}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Order Button */}
      <TouchableOpacity 
        className="bg-teal-600 p-4 rounded-xl items-center justify-center"
        disabled={!selectedPlan}
        onPress={handleOrderConfirmation}
      >
        <Text className="text-white font-JakartaSemiBold text-lg">
          {selectedPlan ? 'Confirm Subscription' : 'Select Plan'}
        </Text>
      </TouchableOpacity>

      {/* Order Confirmation Modal */}
      <Modal visible={orderConfirmed} transparent>
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-2xl p-8 m-4 items-center">
            <View className="bg-green-100 p-4 rounded-full mb-4">
              <MaterialIcons name="check-circle" size={40} color="#16a34a" />
            </View>
            <Text className="text-xl font-JakartaBold text-gray-900 mb-2">Order Confirmed!</Text>
            <Text className="text-gray-600 text-center">
              Your {selectedPlan} subscription is now active. 
              Schedule details have been sent to your email.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  </SafeAreaView>
  );
};

export default SubscriptionOrder;