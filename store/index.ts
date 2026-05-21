import { create } from "zustand";

import { DriverStore, LocationStore, MarkerData } from "@/types/type";

export const useRideStore = create((set) => ({
  rideRequestIdZus: null,
  setRideRequestIdZus: (id) => set({ rideRequestId: id }),
  clearRideRequestIdZus: () => set({ rideRequestId: null }),
}));

export const useStore = create((set) => ({
  groupArr: [],
  setGroupArr: (newGroup) => set({ groupArr: newGroup }),
}));

export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    }));

    // if driver is selected and now new location is set, clear the selected driver
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },

  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    console.log("Setting destination location: ", latitude, longitude, ); // Log the values being set
    set(() => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    }));

    // if driver is selected and now new location is set, clear the selected driver
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },
}));

export const useUserIdStore = create((set) => ({
  user: null,
  setUserId: (userId) => set({ userId }),
}));


export const useDriverStore = create<DriverStore>((set) => ({
  drivers: [] as MarkerData[],
  selectedDriver: null,
  setSelectedDriver: (driverId: number) =>
    set(() => ({ selectedDriver: driverId })),
  setDrivers: (drivers: MarkerData[]) => set(() => ({ drivers })),
  clearSelectedDriver: () => set(() => ({ selectedDriver: null })),
}));

export const useLanguageStore = create((set) => ({
  language: 'ENG',
  setLanguage: (lang) => set({ language: lang }),
}));


export const usePhoneNumberStore = create((set) => ({
  phoneNumberStore: null,
  profileImageUrl: null,
  gender: "Male",
  userType: "Normal",
  seatNumber: 4,
  almaz: 0,
  setprofileDetails: (updatedFields) =>
  set((state) => ({ ...state, ...updatedFields })),
  setPhoneNumberStore: (status) => set({ phoneNumberStore: status }),
  setProfileImageUrl: (status) => set({ profileImageUrl: status }),
}));

export const usePioneerStore = create((set) => ({
  isPioneer: null,
  tierType: null,
  setIsPioneer: (status) => set({ isPioneer: status }),
  setTierType: (status) => set({ tierType: status }),
}));

  export const useDriverDetailsStore = create((set) => ({
  drivername: null,
  driverpnumber: null,
  drivergender: null,
  plateNumber: null,
  carModel: null,
  carColor: null,
  driverlat: null,
  driverlng: null,
  ratingSum: null,
  totalRatings: null,
  driverprofileImage: null,
  seatType: null,
  rideRequestId: null,
  setDriverDetails: (updatedFields) =>
  set((state) => ({ ...state, ...updatedFields })),
}));

export const useCreditStore = create((set) => ({
  adminCreditAmount: null,
  adminAlertText: null,
  adminCbeAccount: null,
  adminTelebirr: null,
  PROMO_END_DATE: null,
creditRechargeModalContent: null,
  // Batch update function for efficiency
  setCreditStore: (updates) => set((state) => ({ ...state, ...updates })),
}));

export const useAdminNumsStore = create((set) => ({
  baseFare: 130,
  distanceRate: 19,
  nightRate: 21,
  timeRate: 1.8,
  VAT: 0,

  // Function to update all admin settings at once
  setAdminSettings: (updates) => set((state) => ({ ...state, ...updates }))
}));

export const useDriverStatusStore = create((set) => ({
  isSuspended: false,
  isOutdated: false,

  setIsSuspended: (status) => set({ isSuspended: status,}),
  setIsOutdated: (status) => set({ isOutdated: status }),
}));

export const useShareUsernameStore = create((set) => ({
  shareUsername: null,
  socialCount: 0,
  expoToken: null,
  setShareUsername: (status) => set({ shareUsername: status }),
  setSocialCount: (status) => set({ socialCount: status }),
  setExpoToken: (status) => set({ expoToken: status }),
}));
//
export const useRateLimitStore = create((set, get) => ({
  // Track voted comments (postId + commentId as key)
  votedComments: new Set(),

  // Track global voting timestamps
  voteTimestamps: [],

  // Track comment submission timestamps
  commentTimestamps: [],

  // Add a vote for a specific post/comment
  addVote: (key) => {
    set((state) => ({
      votedComments: new Set([...state.votedComments, key]),
    }));
  },

  // Add a vote timestamp
  addVoteTimestamp: () => {
    set((state) => ({
      voteTimestamps: [...state.voteTimestamps, Date.now()],
    }));
  },

  // Add a comment timestamp
  addCommentTimestamp: () => {
    set((state) => ({
      commentTimestamps: [...state.commentTimestamps, Date.now()],
    }));
  },

  // Check if the user can vote (10 votes/hour limit)
  canVote: () => {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in milliseconds
    const recentVotes = get().voteTimestamps.filter((ts) => ts > hourAgo);
    return recentVotes.length < 10;
  },

  // Check if the user can comment (4 comments/hour limit)
  canComment: () => {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in milliseconds
    const recentComments = get().commentTimestamps.filter((ts) => ts > hourAgo);
    return recentComments.length < 4;
  },
}));

export const useTierLimitsStore = create((set) => ({
  tierLimits: null, // Store for tier limits data
  setTierLimits: (status) => set({ tierLimits: status }),
}))

export const usePriceLogStore = create((set) => ({
  priceUpdateLog: [],
  setPriceUpdateLog: (log) => set({ priceUpdateLog: log }),
}));


export const useGroupStore = create(set => ({
  groupMembers: [],
  setGroupMembers: (members) => set({ groupMembers: members }),
  addGroupMember: (member) =>
    set(state => ({
      groupMembers: [...state.groupMembers, member]
    })),
  // In useGroupStore
updateGroupMember: (pnumber, updatedFields) =>
  set((state) => ({
    groupMembers: state.groupMembers.map((member) =>
      member.pnumber === pnumber
        ? { ...member, ...updatedFields }
        : member
    ),
  })),
  resetGroupMembers: () => set({ groupMembers: [] }),
}));

export const useSharedDriverStore = create(set => ({
    driverId: null,
  setDriverId: (status) => set({ driverId: status,}),
}));