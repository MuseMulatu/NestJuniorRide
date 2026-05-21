export const translation1 = {
  ENG: {
    welcome: "Hi",
    currentLocation: "Your current location",
    informativeTip: "Save up to 80% on trips by sharing rides! In shared rides of 2, 4 or 7 you will be automatically matched with coriders going in the same direction as you, wherever you are! Solo rides are also available.",
    rewards: "Earn rewards on each trip, including cash and tickets into our weekly and monthly draws for exciting prizes like smartphones, smart TVs, and even vehicles. Every trip takes you closer to winning big!",
    button: "Order Ride",
    warning: "You haven't entered a destination. Please enter a destination in the search box or select a destination on the map by tapping on a point on the map.",
    styles: {
      regular: "text-base font-JakartaRegular text-gray-800",
      bold: "text-2xl font-JakartaExtraBold text-[#0F62BA]",
      btnText:"text-xl text-white font-JakartaBold",
      btnClass: "bg-blue-600 rounded-lg mx-4 mt-5 py-2 items-center"
    }
  },
  ORM: {
    welcome: "Ashamaa",
    currentLocation: "Bakka amma jirtan",
    informativeTip: "Yaabannoo qooddachuudhaan imala irratti hanga %80 qusadhaa! Yaabannoo waliinii 2, 4 ykn 7 keessatti imaltoota kallattii tokkoon deeman waliin ofumaan walsimsiifamta, bakka jirtu hundatti! Solo rides jedhamullee ni jira.",
    rewards: "Imala tokkoon tokkoon isaanii irratti badhaasa argadhaa, maallaqaa fi tikkeettii gara carraa torban fi ji’a ji’aan badhaasa gammachiisaa kan akka bilbila ismaartii, TV ismaartii, fi konkolaataa illee argachuuf carraa argachuu dabalatee. Imalli hundi guddaa mo'achuutti si dhiheessa!",
    button: "Raayidii Ajajaa",
    warning: "Bakka itti deemtu hin seenne. Maaloo sanduuqa barbaacha keessatti bakka itti geessu galchi ykn kaartaa irratti qabxii kaartaa irratti tuquun bakka itti geessu filadhu.",
    styles: {
      regular: "text-base font-JakartaRegular text-gray-800",
      bold: "text-2xl font-JakartaExtraBold text-[#0F62BA]",
      btnText:"text-xl text-white font-JakartaBold",
      btnClass: "bg-blue-600 rounded-lg mx-4 mt-5 py-2 items-center"
    }
  },
  AMH: {
    welcome: "ሰላም",
    currentLocation: "ያለበት ቦታ",
    informativeTip: "ጉዞዎችን በማጋራት በጉዞ ላይ እስከ 80% ይቆጥቡ! በ 2፣ 4 ወይም 7 የጋራ ግልቢያዎች የትም ቦታ ሆነው እርስዎ ባሉበት አቅጣጫ ከሚሄዱ ኮሪደሮች ጋር በቀጥታ ይዛመዳሉ! ብቸኛ ግልቢያዎችም ይገኛሉ።",
    rewards: "በእያንዳንዱ ጉዞ ላይ ገንዘብ እና ቲኬቶችን ጨምሮ እንደ ስማርት ፎኖች፣ ስማርት ቲቪዎች እና ተሽከርካሪዎች ያሉ አስደሳች ሽልማቶችን ሳምንታዊ እና ወርሃዊ ስዕሎቻችንን ያግኙ። እያንዳንዱ ጉዞ ትልቅ ወደ አሸናፊነት ቅርብ ያደርገዎታል!",
    button: "ራይድ ይዘዙ",
    warning: "መድረሻ አላስገቡም። እባክዎ በፍለጋ ሳጥኑ ውስጥ መድረሻ ያስገቡ ወይም በካርታው ላይ ያለውን ነጥብ በመንካት በካርታው ላይ መድረሻን ይምረጡ።",
    styles: {
      regular: "text-lg font-AmharicRegular text-gray-800",
      bold: "text-2xl font-AmharicBold text-[#0F62BA]",
      btnText:"text-2xl text-white font-JakartaBold",
      btnClass: "bg-blue-600 rounded-lg mx-4 mt-5 py-2 items-center"
    }
  }
};

export const postsTranslation = {
  ENG: {
    communityPosts: "Share Social",
    upvote: "Upvote",
    downvote: "Downvote",
    showComments: "show comments",
    createPost: "Create a Post",
    alreadyVoted: (type) => `You have already ${type}d this post.`,
    voteLimitReached: "You can only vote 10 times per hour.",
    emptyFieldsError: "Title and content cannot be empty.",
    lengthExceedsError: "Title or content exceeds the allowed length.",
  },
  AMH: {
    communityPosts: "ሼር የማህበረሰብ ድህረ-ገጽ",
    upvote: "ወደ ላይ ድምጽ",
    downvote: "ወደ ታች ድምጽ",
    showComments: "አስተያየቶችን አሳይ",
    createPost: "ልጥፍ ፍጠር",
    alreadyVoted: (type) => `እርስዎ ቀደም ሲል ይህን ፖስት ${type === 'upvote' ? 'ወደ ላይ' : 'ወደ ታች'} ድምጽ ሰጥተዋል። ስለዚህ ድጋሚ መስጠት አይችሉም።`,
    voteLimitReached: "በአንድ ሰዓት ውስጥ 10 ጊዜ ብቻ ድምጽ መስጠት ይችላሉ።",
    emptyFieldsError: "ርዕስ እና ይዘት ባዶ ሊሆን አይችልም።",
    lengthExceedsError: "ርዕስ ወይም ይዘት የተፈቀደውን ርዝመት አልፏል።",
  },
  ORM: {
    communityPosts: "Miidiyaa Hawaasaa Sheer",
    upvote: "Sagalee Ol Keenii",
    downvote: "Gadi Keenii",
    showComments: "Yaada Agarsiisi",
    createPost: "Poosti Uumii",
    alreadyVoted: (type) => `Kana duuraa sagalee ${type === 'upvote' ? 'ol' : 'gadii'} keenitee jiirta. kanaaf ammas sagalee kana kennuu hin dandeessan.`,
    voteLimitReached: "Sa'aatii tokko keessatti sagalee 10 qofa kenuu dandeessu.",
    emptyFieldsError: "Mata duree fi qabiyyee duuwaa gochuun hin danda'amu.",
    lengthExceedsError: "Mata duree ykn qabiyyeen baayee dheeraa ta'eerra.",
  },
};

export const registerTranslations = {
  ENG: {
    // Alerts
    nameRequired: "Name is required.",
    invalidPhoneNumber: "Please enter a valid phone number.",
    // Texts
    signInToShare: "Sign In to Hulum",
    namePlaceholder: "Name",
    phoneNumberPlaceholder: "Phone Number (e.g., 0911202020)",
    enterPhoneNumber: "Phone Number",
    enterCode: "Enter your code",
    pressToSignIn: "press to sign in",
    continueWithGoogle: "Continue with google",
    confirmCode: "Confirm your code",
  },
  AMH: {
    // Alerts
    nameRequired: "ስም ያስፈልጋል።",
    invalidPhoneNumber: "እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።",
    // Texts
    signInToShare: "ወደ Hulum ይግቡ",
    namePlaceholder: "ስም",
    phoneNumberPlaceholder: "ስልክ ቁጥርዎን እዚህ (ለምሳሌ፣ 0911202020)",
    enterPhoneNumber: "ስልክ ቁጥር",
    enterCode: "ኮድዎን ያስገቡ",
    pressToSignIn: "ለመግባት ይጫኑ",
    continueWithGoogle: "በጉግል ይቀጥሉ",
    confirmCode: "ኮድዎን ያረጋግጡ",
  },
  ORM: {
    // Alerts
    nameRequired: "Maqaan barbaachisaa dha.",
    invalidPhoneNumber: "Maaloo lakkoofsa bilbilaa sirrii ta'e galchi.",
    signInToShare: "Hulum keessa seenaa",
    namePlaceholder: "Maqaa",
    phoneNumberPlaceholder: "Lakkoofsa Bilbilaa keessan(fkf, 0911202020)",
    enterPhoneNumber: "Lakkoofsa bilbilaa",
    enterCode: "Koodii keessan galchi",
    pressToSignIn: "Seenuuuf cuqaasi",
    continueWithGoogle: "Google waliin itti fufi",
    confirmCode: "Koodii keessan mirkaneessi",
  },
};