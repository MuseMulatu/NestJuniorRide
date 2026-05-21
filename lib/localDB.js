import * as SQLite from "expo-sqlite";
import firestore from '@react-native-firebase/firestore';
//import * as Application from 'expo-application';

// ✅ Initialize Database
let db;

const initLocalDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync("localDB.db");
    console.log("Database opened:", db);
    // await db.execAsync(`DROP TABLE IF EXISTS socialfollowing ;`);
    // await db.execAsync(`DROP TABLE IF EXISTS driver_stats;`);
     // await db.execAsync(`DROP TABLE IF EXISTS ride_history;`);

await db.runAsync(`
CREATE TABLE IF NOT EXISTS driver_stats (
  userId TEXT PRIMARY KEY,
  almaz REAL DEFAULT 0,
  gender TEXT DEFAULT 'male',
  pnumber INTEGER DEFAULT 0
);
`);
await db.runAsync(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY,
    latitude REAL,
    longitude REAL,
     title TEXT,
    details TEXT,
    date INTEGER
  )
`);
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS socialfollowing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        posterId TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT anon
      );
    `);
await db.runAsync(`
CREATE TABLE IF NOT EXISTS favorite_drivers (
  driverId TEXT PRIMARY KEY,
  expoToken TEXT
);
`);

await db.runAsync(`
      CREATE TABLE IF NOT EXISTS ride_history (
        id TEXT PRIMARY KEY,
        driverId TEXT,
        type TEXT,
        originAddress TEXT,
        destinationAddress TEXT,
        userLocation TEXT,
        destinationLocation TEXT,
        farePrice REAL,
        timeTaken TEXT,
        createdAt TEXT,
        driverPhone INTEGER
      );
    `);

await db.runAsync(`
  CREATE TABLE IF NOT EXISTS active_ride (
    driverId TEXT PRIMARY KEY,
    rideId TEXT ,
    originLat REAL,
    originLng REAL,
    destLat REAL, 
    destLng REAL,
    timestamp INTEGER DEFAULT 1742380154,
    status TEXT DEFAULT 0
  );
`);

    console.log("Tables initialized successfully.");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

const getLimits = async () => {
  try {
     const tierDoc = await firestore().collection("admin").doc("tierData").get();

        const tierData = tierDoc.data();
        const { tierLimits } = tierData;
           console.log("tier limits ✅✅✅✅✅✅✅✅✅ in etLimis is: ", tierLimits, "tierLimits", tierData, "tierData")
      return tierLimits;
  } catch (error) {
    console.error("❌ Error fetching tier limits:", error);
    return null;
  }
};

const saveRideToLocalHistory = async (rideDetails) => {
  try {
    console.log("rideDetails in localDB saveRideToLocalHistory", rideDetails)
    await db.runAsync(
      `INSERT INTO ride_history 
       (id, driverId, type, originAddress, destinationAddress, userLocation, destinationLocation, farePrice, timeTaken, createdAt, driverPhone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        rideDetails.id,
        rideDetails.driverId,
        rideDetails.type,
        rideDetails.originAddress,
        rideDetails.destinationAddress,
        JSON.stringify(rideDetails.userLocation), 
        JSON.stringify(rideDetails.destinationLocation),
        rideDetails.farePrice,
        rideDetails.timeTaken,
        rideDetails.createdAt,
        rideDetails.driverPhone
      ]
    );
    console.log("Ride history saved successfully.");
  } catch (error) {
    console.error("Error saving ride history:", error);
  }
};

const checkFollowingStatus = async (posterId) => {
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM socialfollowing WHERE posterId = ?`,
      [posterId]
    );
    return rows.length > 0; // True if user is following, False otherwise
  } catch (error) {
console.error("checkFollowingStatus error", error)
    return false;
  }
};

const checkFollowing = async () => {
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM socialfollowing`
    );

    const ids = rows.map(row => row.posterId);
    console.log("ids", ids);

    return ids; // Array of posterId strings
  } catch (error) {
    console.error(error);
    return [error];
  }
};

// Function to add a follow record
const followUser = async (posterId, name) => {
  console.log("posterId, name", posterId, name)
  try {
    await db.runAsync(
      `INSERT INTO socialfollowing (posterId, name) VALUES (?, ?)`,
      [posterId, name]
    );
  } catch (error) {
console.error("followUser error",error)
  }
};

// Function to remove a follow record
const unfollowUser = async (posterId) => {
  try {
    await db.runAsync(
      `DELETE FROM socialfollowing WHERE posterId = ?`,
      [posterId]
    );
  } catch (error) {
console.error("unfollowUser error",error)
  }
};

const fetchAdminData = async () => {
  try {
 //     const adminCreditDoc = await firestore().collection("admin").doc("credit").get();
      const admData = "hmm" || adminCreditDoc.data() 
      const adminPassengerDoc = await firestore().collection("admin").doc("passenger").get();
      const admPassenger = "hmm2" || adminCreditDoc.data() 

        // const currentAppVersion = Application.nativeApplicationVersion;
        // const acceptableVersion = admData.acceptableAppVersion;
        // const isOutdated1 = (acceptableVersion && isVersionOutdated(currentAppVersion, acceptableVersion) ? true : false);
        // setIsOutdated(isOutdated1);
    return {admData , admPassenger}|| null; // Ensure a valid return value
  } catch (error) {
    console.error("Error fetching local admin data:", error);
  }
};

export { db, initLocalDB, fetchAdminData, getLimits, saveRideToLocalHistory, checkFollowingStatus, followUser, unfollowUser, checkFollowing }