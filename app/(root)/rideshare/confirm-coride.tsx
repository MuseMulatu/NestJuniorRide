import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, FlatList } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useRouter } from "expo-router";
import { useLocationStore, useStore, useShareUsernameStore, useDriverDetailsStore } from "@/store";
import firestore from '@react-native-firebase/firestore';
import { geohashQueryBounds, geohashForLocation } from 'geofire-common';
import { getDistance } from 'geolib'; // optional for filtering after initial match
import auth from '@react-native-firebase/auth';
import * as Notifications from 'expo-notifications';
import { uploadLocation, findNearbyDrivers, addRideRequest} from "@/firebaseconf"; 
import { useGroupStore, useSharedDriverStore } from '@/store';
import QRCode from 'react-native-qrcode-svg';
import { FontAwesome6, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
const RADIUS_IN_METERS = 5000;

const SharedWaitRoom = ({ origin, destination, rideType, destinationAddress, phoneNumberStore }) => {
  const [loading, setLoading] = useState(true);
  const [sameDirection, setSameDirection] = useState([]);
  const [differentDirection, setDifferentDirection] = useState([]);
  const [joinedRequestId, setJoinedRequestId] = useState(null);
const { expoToken } = useShareUsernameStore(); 
const groupMembers = useGroupStore(state => state.groupMembers);
const driverId = useSharedDriverStore(state => state.driverId);
const router = useRouter();
  const [remainingTime, setRemainingTime] = useState(600); // 10 minutes in seconds
  const [isWaiting, setIsWaiting] = useState(false);
  // const [groupMembers, setGroupMembers] = useState([]);
    const { setDriverDetails, ratingSum, driverprofileImage,   drivername,  driverpnumber,
            drivergender, plateNumber, carModel, driverlat, carColor,
            driverlng,  totalRatings, seatType, rideRequestId } = useDriverDetailsStore();

const user = auth().currentUser;
 const userId = user.uid;


const PassengerQRCode = () => {
  const qrValue = JSON.stringify({ share: "Share", origin: origin.latitude, phoneNumberStore }); // Unique to this passenger

  return (
    <View className="items-center">
      <QRCode value={qrValue} size={200} />
      <Text className="text-center mt-4">Show this QR to your driver</Text>
    </View>
  );
};

useEffect(() => {
  console.log("origin, destination, rideType, destinationAddress,", origin, destination, rideType, destinationAddress )
  const fetchNearbyRequests = async () => {
    try {
      const originCoords = [origin.latitude, origin.longitude];
      const bounds = geohashQueryBounds(originCoords, RADIUS_IN_METERS);
      const promises = bounds.map(b =>
        firestore()
          .collection("queue")
          .where("originHash", ">=", b[0])
          .where("originHash", "<=", b[1])
          .limit(10)
          .get()
      );

      const snapshots = await Promise.all(promises);
      let matching = [];

      snapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log("hound request in queue:", data)
          const distance = getDistance(
            { latitude: originCoords[0], longitude: originCoords[1] },
            { latitude: data.originCoords[0], longitude: data.originCoords[1] }
          );

          if (distance <= RADIUS_IN_METERS) {
            console.log("The request is nearby")
            matching.push({ id: doc.id, ...data });
          }
        });
      });

      if (matching.length > 0) {
        const goingSameWay = [];
        const notSameWay = [];
        matching.forEach(req => {
          const isSameDirection =
            getDistance(
              { latitude: req.destinationCoords[0], longitude: req.destinationCoords[1] },
              { latitude: destination.latitude, longitude: destination.longitude }
            ) < 2500; // within 1.5km considered same direction

          isSameDirection ? goingSameWay.push(req) : notSameWay.push(req);
        });

        setSameDirection(goingSameWay);
        setDifferentDirection(notSameWay);
      } else {
        await createQueueRequest();
      }
    } catch (err) {
      console.error("Error in SharedWaitRoom:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchNearbyRequests();
}, []);


 // PART A: Handle joining requests and notifications
  const handleJoinRequest = async (requestId) => {
    console.log(requestId)
    if (joinedRequestId) {//return
    };
        setIsWaiting(true);
        const originCoords = [origin.latitude, origin.longitude];
    const destinationCoords = [destination.latitude, destination.longitude];

    try {
      const requestRef = firestore().collection("queue").doc(requestId);
      await requestRef.update({
        members: firestore.FieldValue.arrayUnion({
            origin: originCoords,
            name: user?.displayName,
            pnumber: phoneNumberStore,
            expoToken: expoToken,
            dropOff: destinationCoords
                                               }),
        expoTokens: firestore.FieldValue.arrayUnion(expoToken)
                              });
      // Get updated request data
      const doc = await requestRef.get();
      const requestData = doc.data();

 console.log("requestData", requestData, "requestData.expoToken", requestData.expoTokens)     
const messages = requestData.members.map(member => ({
  to: member.expoToken, // this is the actual token string
  sound: 'default',
  title: 'New Member Joined!',
  body: `${user?.displayName} joined your ride to ${requestData.destinationAddress}`,
  data: {
    type: 'new_member',
    origin: originCoords,
    destination: destinationCoords,
    destinationAddress,
    name: user?.displayName,
    pnumber: phoneNumberStore
  },
}));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages), // ✅ send entire array in 1 request
    });

    const responseBody = await response.json();
    console.log("Expo push response:", responseBody);
      setJoinedRequestId(requestId);
      setDriverDetails({rideRequestId: requestId})
     startRequestTimer(requestData.members);
useGroupStore.getState().setGroupMembers(requestData.members);
   console.log(requestData.members.length >= calculateType(requestData.rideType), "data.members.length", requestData.members.length, "calculateType(requestData.rideType)", calculateType(requestData.rideType) )       
          if (requestData.members.length >= calculateType(requestData.rideType)) {
            await finalizeGroup(requestData, requestId);
          }
    } catch (error) {
      console.error("Error joining request:", error);
    }
  };

const calculateType = (type) => {
  switch(type) {
    case 'Shared - 4 People': return 4;
    case 'Shared - 2 People': return 2;
    case 'Shared - Minivan': return 5;
    default: return 3;
  }
};

  // PART B: Create new request with timer
  const createQueueRequest = async () => {
    setIsWaiting(true);
    const originCoords = [origin.latitude, origin.longitude];
    const destinationCoords = [destination.latitude, destination.longitude];
    const newRequest = {
      originCoords,
      destinationCoords,
      destinationAddress,
      rideType,
      originHash: geohashForLocation([origin.latitude, origin.longitude]),
      members: [{
         origin: originCoords,
            name: user?.displayName,
            pnumber: phoneNumberStore,
            expoToken: expoToken,
            dropOff: destinationCoords}],
      expoTokens: [expoToken],
      createdAt: firestore.FieldValue.serverTimestamp(),
      expiresAt: firestore.Timestamp.fromDate(new Date(Date.now() + 600000)),
    };
    const docRef = await firestore().collection("queue").add(newRequest);
    setJoinedRequestId(docRef.id);
    setDriverDetails({rideRequestId: docRef.id})
    startRequestTimer([{
         origin: originCoords,
            name: user?.displayName,
            pnumber: phoneNumberStore,
            expoToken: expoToken,
            dropOff: destinationCoords}]);
  };

  const startRequestTimer = (members) => {
    const timerInterval = setInterval(async () => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleTimeout(requestId);
          return 0;
        }
        return prev - 1;
      });

          useGroupStore.getState().setGroupMembers(members);       
          if (groupMembers.length >= calculateType(rideType)) {
            clearInterval(timerInterval);
           // await finalizeGroup(data, docRef.id);
          // router.replace("/(root)/rideshare/wait-screen")
          }
    }, 1000);
  };

useEffect(() => {
  console.log("driverId", driverId)
 if( driverId ) { 
  console.log(joinedRequestId, "joinedRequestId", "rideRequestId", rideRequestId)
 router.replace({
        pathname: "/(root)/rideshare/wait-screen",
        params: {
        driverId,
        rideRequestId: joinedRequestId
        },
      });
  }
}, [driverId]);

  // PART C: Handle timeout
  const handleTimeout = async (requestId) => {
    Alert.alert(
      "Time Expired",
      "The waiting period has ended. Would you like to:",
      [
        {
          text: "Wait Longer",
          onPress: () => setRemainingTime(600),
        },
        {
          text: "Book Solo",
          onPress: () => finalizeSoloRequest(requestId),
        }
      ]
    );
  };

  // Finalize group when conditions met
  const finalizeGroup = async (group, requestId) => {
    try {
      console.log("finalizeGroup called:")
      const nearbyDrivers = await findNearbyDrivers(group.originCoords, 25000, 4);
      if (nearbyDrivers.length > 0) {
    console.log("nearbyDrivers", nearbyDrivers.length > 0 )
      try {
      await firestore().collection('queue').doc(requestId).delete();//
      console.log(`Document with requestId ${requestId} deleted from 'queue' collection`);
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
        // Update Firestore
        const docRef = firestore().collection('requests').doc(requestId); 
        await docRef.set({
          status: "looking-for-driver",
          type: "corider",
          dropOffPoints: group.members.map(member => ({
            origin: member.origin,
            name: member.name,
            pnumber: member.pnumber,
            expoToken: member.expoToken,
            dropOff: member.dropOff
          })),
          estimates: [120, 125, 140, 150],
          message: `Going to ${destinationAddress}`,
          createdAt: firestore.Timestamp.now()
        });

         const expoTokens = nearbyDrivers.map(driver => driver.expoToken);  
        // Prepare notification payload
        const notificationData = {
          type: "ride_request",
          rideType: "corider",
          requestId: requestId,
          dropOffPoints: group.members.map(member => ({
            origin: member.origin,
            name: member.name,
            pnumber: member.pnumber,
            expoToken: member.expoToken,
            dropOff: member.dropOff
          })),
          estimates: [120, 125, 140, 150],
          message: `Going to ${destinationAddress}`,
          createdAt: firestore.Timestamp.now()
        };
      console.log("notificationData", notificationData )
        // Send to drivers
      const messages = nearbyDrivers.map((driver) => {
                return {
             to: driver.expoToken,
            title: "New Ride Request",
            body: `${group.members.length} passengers to ${destinationAddress}`,
            channelId: 'ride_notifications',
            data: notificationData
          }
      });
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      }
    } catch (error) {
      console.error("Error finalizing group:", error);
    }
  };



  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-2 font-JakartaBold">Looking for nearby shared rides...</Text>
      </View>
    );
  }

  // Visual feedback when group is complete
  const renderGroupComplete = () => (
    <View style={{alignSelf: "center"}} className="animate-fadeIn absolute inset-0 z-50 items-center justify-center bg-green-50/95 px-4 pyy-8">
      <View className="items-center rounded-2xl bg-white p-8 shadow-xl">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-green-500">
          <Ionicons name="checkmark" size={32} color="white" />
        </View>
        <Text className="text-center text-2xl font-JakartaBold text-gray-900">
          Group Complete! 🎉
        </Text>
        <Text className="mt-2 text-center font-Jakarta text-gray-600">
          {groupMembers.length} passengers ready for pickup
        </Text>
      </View>
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-1">
          <View className="flex-row items-center space-x-2">
            <Ionicons 
              name="people" 
              size={20} 
              color={joinedRequestId === item.id ? "#3B82F6" : "#6B7280"} 
            />
            <Text className="text-sm font-JakartaSemiBold text-gray-900">
              {item.rideType}
            </Text>
          </View>
          
          <Text className="mt-1 text-sm font-Jakarta text-gray-600">
            To: {item.destinationAddress?.substring(0, 40) + " ..."}
          </Text>
          
          <View className="mt-2 flex-row items-center space-x-2">
            <View className="flex-1 h-2 rounded-full bg-gray-200">
              <View 
                className="h-full rounded-full bg-orange-500" 
                style={{ 
                  width: `${(item.members.length / calculateType(item.rideType)) * 100}%` 
                }}
              />
            </View>
            <Text className="text-sm font-JakartaMedium text-orange-600">
              {item.members.length}/{calculateType(item.rideType)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className={`ml-4 rounded-lg px-5 py-2 ${
            joinedRequestId === item.id 
              ? "bg-orange-100" 
              : "bg-orange-500"
          }`}
          onPress={() => handleJoinRequest(item.id)}
        >
          <Text 
            className={`text-sm font-JakartaSemiBold ${
              joinedRequestId === item.id ? "text-orange-600" : "text-white"
            }`}
          >
            {joinedRequestId === item.id ? "Joined" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="p-6 mb-14 flex-1 bg-gray-50">
      {/* Status Header */}
      <View className="bg-white px-4 pb-4 shadow-sm">
        {isWaiting && (
          <View className="rounded-xl bg-white p-4 shadow">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-JakartaBold text-gray-900">
                Your Shared Ride
              </Text>
              <Text className="font-JakartaMedium text-orange-600">
                {Math.floor(remainingTime / 60)}:
                {(remainingTime % 60).toString().padStart(2, '0')}
              </Text>
            </View>

            <View className="mt-4 space-y-2">
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color="#3B82F6" />
                <Text className="ml-2 flex-1 font-Jakarta text-gray-600">
                  {destinationAddress?.substring(0, 36) + " ..."}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2">
                  <Ionicons name="people" size={16} color="#3B82F6" />
                  <Text className="text-sm font-JakartaMedium text-gray-600">
                    {groupMembers.length}/{calculateType(rideType)} seats filled
                  </Text>
                </View>
                {groupMembers.length >= calculateType(rideType) && (
                  <View className="flex-row items-center rounded-full bg-green-100 px-2 py-1">
                    <Ionicons name="checkmark" size={12} color="#059669" />
                    <Text className="ml-1 text-xs font-JakartaMedium text-green-800">
                      Ready to go!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Main Content */}
      <FlatList
        contentContainerClassName="p-4"
        data={sameDirection}
        ListHeaderComponent={
          <>
            {isWaiting && (
              <View className="mb-8 items-center rounded-2xl bg-white p-6 shadow">
                <Text className="mb-4 text-center text-lg font-JakartaBold text-gray-900">
                  Your Ride QR Code
                </Text>
                <PassengerQRCode />
                <Text className="mt-4 text-center text-sm text-gray-500">
                  Show this code to your driver when boarding your vehicle
                </Text>
              </View>
            )}

            <Text className="mb-2 text-sm font-JakartaSemiBold text-gray-500">
              Nearby requests going in your direction ({sameDirection.length})
            </Text>
          </>
        }
        renderItem={renderRequestItem}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Ionicons name="car-outline" size={40} color="#E5E7EB" />
            <Text className="mt-4 text-center font-JakartaMedium text-gray-500">
              No matching nearby requests in your direction 
            </Text>
          </View>
        }
        ListFooterComponent={
          differentDirection.length > 0 && (
            <>
              <Text className="mb-2 mt-6 text-sm font-JakartaSemiBold text-gray-500">
                Other nearby requests ({differentDirection.length})
              </Text>
              <FlatList
                data={differentDirection}
                renderItem={renderRequestItem}
                scrollEnabled={false}
              />
            </>
          )
        }
      />

      {/* Create New Group CTA */}
      {!isWaiting && (
        <View className="safe-area-pb bg-white px-4 pt-4 shadow-xl">
          <TouchableOpacity
            className="items-center rounded-xl bg-orange-500 px-6 py-4"
            onPress={createQueueRequest}
          >
            <Text className="text-lg font-JakartaSemiBold text-white">
              Start New Group
            </Text>
            <Text className="mt-1 text-sm text-orange-100">
              Wait time: ~5-8 minutes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {groupMembers.length >= calculateType(rideType) && renderGroupComplete()}
    </View>
  );
};

export default SharedWaitRoom;