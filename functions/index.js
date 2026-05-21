const admin = require("firebase-admin");
const functions = require("firebase-functions/v2");
const axios = require("axios");
const polyline = require("@mapbox/polyline");

admin.initializeApp();
const db = admin.firestore();
const geofire = require("geofire-common");

exports.matchCoRiders = functions.https.onCall(async (data, context) => {
  const { origin, destination, name, pnumber, type, userId, destinationAddress } = data.data;
  const newRequestId = userId;

  console.log("Received parameters:", { origin, destination, name, pnumber, type, userId });

  // Parse and validate the type parameter
  const typeInt = parseInt(type);
  console.log("Parsed typeInt:", typeInt);

  // Define target co-rider counts and driver seat types by request type
  const typeConfig = {
    2: { targetRiders: 2, seatType: 4 },
    4: { targetRiders: 4, seatType: 4, minCountForTimeout: 3, timeoutMs: 5 * 60 * 1000 },
    7: { targetRiders: 7, seatType: 7, minCountForTimeout: 5, timeoutMs: 5 * 60 * 1000 },
  };

  if (!typeConfig[typeInt]) {
    console.error("Invalid type parameter:", typeof(typeInt));
    throw new functions.https.HttpsError("invalid-argument", "Invalid type parameter.");
  }

  const { targetRiders, seatType, minCountForTimeout, timeoutMs } = typeConfig[typeInt];
  console.log("Configuration for type:", { targetRiders, seatType, minCountForTimeout, timeoutMs });

  const queueRef = db.collection("queue");
  const newRequest = { origin, destination, name, pnumber, typeInt, destinationAddress, userId: newRequestId };
  console.log("New request created:", newRequest);

  try {
    const queueSnapshot = await queueRef.where("type", "==", typeInt).get();
    console.log("Queue snapshot size:", queueSnapshot.size);
    
    let matchedGroup = null;
    let matchedGroupId = null;

    for (const groupDoc of queueSnapshot.docs) {
      const group = groupDoc.data();
      console.log("Checking group:", group);

      // Check if the group has been in the queue for more than 10 minutes and delete if so
      const groupAgeMs = Date.now() - group.createdAt.toMillis();
      const maxAgeMs = 10 * 60 * 1000;
      if (groupAgeMs >= maxAgeMs) {
        console.log("Deleting expired group:", groupDoc.id);
        await queueRef.doc(groupDoc.id).delete();
        continue;
      }

      if (group.type !== typeInt) continue;

      if (checkProximity(origin, group.origin)) {
        console.log("Proximity check passed for group:", groupDoc.id);
        
        const newRoute = await getGoogleRoute(origin, destination);
        const groupRoute = await getGoogleRoute(group.origin, group.destination);
        
        const overlapResults = await checkRouteOverlap(newRoute, groupRoute, newRequest);
        if (overlapResults.isOverlap) {
          console.log("Route overlap found with group:", groupDoc.id);
          matchedGroup = group;
          matchedGroupId = groupDoc.id;
          matchedGroup.dropOffPoints.push(overlapResults.dropOffPoint);
          break;
        }
      }
    }

    if (matchedGroup) {
      // matchedGroup.riders.push(newRequest);
      matchedGroup.riderIds.push(newRequestId);
      
      const riderCount = matchedGroup.dropOffPoints.length;
      const isTimeoutMet = Date.now() - matchedGroup.createdAt.toMillis() >= timeoutMs;
      
      console.log("Rider count:", riderCount, "Timeout met:", isTimeoutMet);
      
      if (riderCount >= targetRiders || (isTimeoutMet && riderCount >= minCountForTimeout)) {
        console.log("Finalizing group:", matchedGroupId);
        await finalizeGroup(matchedGroup, seatType);
        await queueRef.doc(matchedGroupId).delete();
      } else {
        console.log("Updating matched group in queue:", matchedGroupId);
        await queueRef.doc(matchedGroupId).set(matchedGroup);
      }
    } else {
      console.log("No matching group found. Creating new group.");
      const newGroup = {
        origin, destination, type: typeInt, riderIds: [newRequestId],
        dropOffPoints: [{ origin, name, pnumber, destinationAddress, dropOff: destination }],
        createdAt: admin.firestore.Timestamp.now()
      };
      await queueRef.add(newGroup);
      console.log("New group added to queue.");
      return { success: true, message: "Waiting for additional co-riders." };
    }

    return { success: true, message:"Success, Co-riders Found! Waiting for driver to accept. Happy Travels!" };
  } catch (error) {
    console.error("Error in matchCoRiders function:", error);
    throw new functions.https.HttpsError("internal", "Matching failed.");
  }
});



const GOOGLE_API_KEY = "AIzaSyDA8XVAaxYSh8A5tLO02T9sEJqhHN6EXkE";

async function getGoogleRoute(origin, destination) {
  try {
    const originStr = `${origin[0]},${origin[1]}`;  // Convert origin to 'lat,lng' string
    const destinationStr = `${destination[0]},${destination[1]}`;  // Convert destination to 'lat,lng' string
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_API_KEY}`;
    
    const response = await axios.get(url);
    const route = response.data.routes[0];  // Get the first route from the response

    if (!route) {
      throw new Error('No route found');
    }

    return route;

  } catch (error) {
    console.error("Error fetching Google route:", error);
    throw error;
  }
}

// Modified checkRouteOverlap function to return the closest point
async function checkRouteOverlap(newRoute, groupRoute, newRequest) {
  try {
    const newPolylinePoints = polyline.decode(newRoute.overview_polyline.points);
    const groupPolylinePoints = polyline.decode(groupRoute.overview_polyline.points);

    const isNewRouteShorter = newPolylinePoints.length <= groupPolylinePoints.length;
    const shorterRoute = isNewRouteShorter ? newPolylinePoints : groupPolylinePoints;
    const longerRoute = isNewRouteShorter ? groupPolylinePoints : newPolylinePoints;

    const destinationPoint = shorterRoute[shorterRoute.length - 1];

    let closestPoint = null;
    let closestDistance = Infinity;

    for (const point of longerRoute) {
      const distance = haversineDistance(destinationPoint, point);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    }

    if (closestDistance <= 10000) {
      console.log("Closest point found:", closestPoint, "Distance:", closestDistance);

      // Return both the overlap status and the drop-off point
      return {
        isOverlap: true,
        dropOffPoint: {
          origin: newRequest.origin,
          name: newRequest.name,
          destinationAddress: newRequest.destinationAddress,
          pnumber: newRequest.pnumber,
          dropOff: closestPoint
        }
      };
    }

    console.log("No overlapping points found within 1000 meters.");
    return { isOverlap: false, dropOffPoint: null };

  } catch (error) {
    console.error("Error in checkRouteOverlap:", error);
    return { isOverlap: false, dropOffPoint: null };
  }
}

function checkProximity(riderLocation, otherRiderLocation, radiusInMeters = 10000) {
  try {
    const distance = haversineDistance(riderLocation, otherRiderLocation);
    const isWithinProximity = distance <= radiusInMeters;
    console.log(`Proximity check result: ${isWithinProximity}, Distance: ${distance} meters`);
    return isWithinProximity;
  } catch (error) {
    console.error("Error in checkProximity:", error);
    return false;
  }
}

async function findNearbyDrivers(riderLocation, radiusInMeters, seatType) {
  try {
    console.log("riderLocation, radiusInMeters, seatType:", riderLocation, radiusInMeters, seatType)
    const [riderLat, riderLng] = riderLocation;

 console.log("[riderLat, riderLng], radiusInMeters, seatType:", [riderLat, riderLng], radiusInMeters, seatType)

    // Generate geohash bounds for the rider location and the radius
    const bounds = geofire.geohashQueryBounds([riderLat, riderLng], radiusInMeters);
    const promises = [];

    for (const b of bounds) {
      const q = db.collection("drivers")
        .where('seatType', '==', seatType)
        .orderBy("geohash")
        .startAt(b[0])
        .endAt(b[1]);

      promises.push(q.get()); // Use q.get() for getting documents
    }

    // Collect all the query results together into a single list
    const snapshots = await Promise.all(promises);

    const matchingDrivers = [];
    for (const snap of snapshots) {
      snap.forEach(doc => {
        const lat = doc.get("lat");
        const lng = doc.get("lng");

        // We have to filter out false positives due to GeoHash accuracy, so we check distance
        const distanceInKm = geofire.distanceBetween([lat, lng], [riderLat, riderLng]);
        const distanceInMeters = distanceInKm * 1000; // Correct the multiplier to 1000
        console.log("Distance between group and drivers is:", distanceInMeters, "meters");
        
        if (distanceInMeters <= radiusInMeters) {
          matchingDrivers.push(doc); // Push the entire document reference
        }
      });
    }

    console.log("Nearby drivers found:", matchingDrivers.length);
    return matchingDrivers;

  } catch (error) {
    console.error("Error in findNearbyDrivers:", error);
    throw error;
  }
}

// Function to finalize the group with driver assignment
const finalizeGroup = async (group, seatType) => {
  try {
    const nearbyDrivers = await findNearbyDrivers(group.origin, 8000, seatType);
    if (nearbyDrivers.length > 0) {
      const driverIds = nearbyDrivers.map(driver => driver.id);

      const requestRef = db.collection("requests").doc();
      await requestRef.set({
        riderIds: group.riderIds,
        // group: group.riders,
        drivers: driverIds,
        dropOffPoints: group.dropOffPoints, // Add the dropOffPoints array to the request
        status: "looking-for-driver",
        type: "corider",
        estimates: [120, 125, 140, 150],
        createdAt: admin.firestore.Timestamp.now()
      });
      return { success: true, message: "Co-riders and driver found. Group finalized." };
      console.log("Group finalized with drivers:", group);
    } else {
      return { success: false, message: "Co-riders found but no nearby drivers." };
      console.log("No drivers found nearby for group:", group);
    }
  } catch (error) {
    console.error("Error in finalizeGroup:", error);
    throw error;
  }
};

// Function to calculate haversine distance
function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
