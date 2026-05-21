// import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import { useGroupStore, useSharedDriverStore } from '@/store';
import * as Notifications from "expo-notifications";

export const handleNotification = async (remoteMessage: any) => {
  try {
 let { title, body, data } = remoteMessage.request.content;
    let type = data?.type;  
  } catch (err) {
    console.warn("❗ Error parsing remoteMessage.data.body", err);
  }
  // Declare these variables for reuse
  let parsed, name, origin, dropOff, pnumber, driverId, pickupTime, pickupLat, pickupLng;

  switch (type) {
    case 'general':
      Alert.alert("General Notification", body);
      break;
    case 'new_member':
   //   Alert.alert("New Member", `${name} joined the ride.`);
      useGroupStore.getState().addGroupMember({
        name: data.name,
        origin: data.origin,
        dropOff: data.dropOff,
        pnumber: data.pnumber,
      });
      break;

    case 'pickup_notification':
      useGroupStore.getState().updateGroupMember(data.pnumber, {
        pickedUp: true,
        pickupTime: data.pickupTime,
        pickupLocation: {
          latitude: parseFloat(data.pickupLat),
          longitude: parseFloat(data.pickupLng),
        },
      });
      Alert.alert("Passenger Picked Up", `${name} has been picked up.`);
      break;

    case 'ride_ready':
      Alert.alert("Ride Ready", `Your ride is ready! ${body}`);
      break;

    case 'location_based':
      Alert.alert("Nearby Rides", body);
      break;

    case 'shared_driver_accepted':
      console.log("driverId notification", driverId)
      Alert.alert("Driver Accepted", `Driver ${data.driverId} is on the way.`);
      useSharedDriverStore.getState().setDriverId({ driverId: data.driverId });
      break;

    default:
      console.log("Unhandled remoteMessage:", remoteMessage);
  }
};

export const registerNotificationListeners = () => {
  checkInitialNotification();
};

// 🔹 Function to handle notifications when app is opened manually
const checkInitialNotification = async () => {
  const lastNotification = await Notifications.getLastNotificationResponseAsync();
  if (lastNotification) {

    handleNotification(lastNotification.notification);
  }
};

