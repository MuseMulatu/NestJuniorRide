import marker from "@/assets/icons/marker.png";
import onboarding1 from "@/assets/images/onboarding1.png"; // Placeholder for Ride-Hailing image
import onboarding2 from "@/assets/images/onboarding2.png"; // Placeholder for Live Stream/Social image
import onboarding3 from "@/assets/images/onboarding3.png"; // Placeholder for Jobs/Games image

export const images = {
  onboarding1,
  onboarding2,
  onboarding3,
};

export const icons = {
  marker,
};

export const onboarding = [
  {
    id: 1,
    title: "ጉዞዎ በእጅዎ! ምቾትና ቁጠባ በአንድ ላይ።", // Your Ride, In Your Hand! Comfort & Savings Together.
    description:
      [
       "No more surprises—choose your driver and price upfront.",
       "Ride with others to save up to 65% on every trip.",
       "Your journey, your price. The best ride, tailored for you.",
       "The smart way to move. Get comfy, and save more!",
       "Conveniently search for nearby passengers going in your direction!"
       ], // With Share/Yegara Rides, choose your price, know your driver, and save up to 80%. No more surprising rides!
    image: images.onboarding1, // This image should depict a modern, clean car interior with a happy passenger, perhaps seeing route/price options on a phone.
  },
  {
    id: 2,
    title: "ቀጥታ ስርጭት! አድማጭዎን ያግኙ።", // Live Stream & Social Connection! Find Your Audience.
    description:
      ["ከደጋፊዎችዎ ጋር ይገናኙ። ተከታዮችዎን ያሳድጉ",
       "Go live & get supported by your community.",
       "Receive gifts from local fans with Telebirr, M-PESA, etc.",
      "The stage is yours! Share your talent, build your empire!",
       "Engaging features that turn followers into fans.",
       "Create subscriber-only posts to build an exclusive fan community!"
      ], // Earn easily, connect with your fans, and grow your audience on our social media.
    image: images.onboarding2, // This image should show a dynamic live stream scene (e.g., two hosts battling or a creator engaging with chat), with social media elements integrated.
  },
  {
    id: 3,
    title: "ጉዞ ወደ ስኬት! ይዝናኑ ያሸንፉ።", // Work & Play at Your Fingertips! Build Your Future Here.
    description:
      ["Find your next great hire or land your dream job in one tap.",
       "Apply to freelance projects with guaranteed payment.",
       "Challenge friends to multiplayer games and win.",
       "Your career and fun, all in one place."       
      ], // Find your dream job, win projects, and play quick games for prizes.
    image: images.onboarding3, // This image should visually combine elements of job searching/applying (e.g., a person looking at job listings) and gaming (e.g., a stylized game icon or a person winning a game).
  },
];

export const data = {
  onboarding,
};