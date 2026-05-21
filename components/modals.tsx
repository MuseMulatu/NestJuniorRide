import React from 'react';import { Modal, View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView} from 'react-native';
import { Picker } from "@react-native-picker/picker";
import AntDesign from '@expo/vector-icons/AntDesign';
import { Linking } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';

export const translations = {
    ENG: {
        searchNeus: "Search for neus...",
        searchUsers: "Search for users...",
        report: "Report",
        blockCreator: "Block Creator",
        savePost: "Save Post",
        reportPostTitle: "Report Post",
        reportReason: "Please select a reason:",
        spam: "Spam",
        harassment: "Harassment",
        hateSpeech: "Hate Speech",
        reportSuccessTitle: "Report Submitted",
        reportSuccessMessage: "Thank you. We are reviewing your report.",
        violence: "Violence or promoting violence",
        explicit: "Explicit content",
        blockConfirmTitle: "Block Creator?",
        blockConfirmMessage: "You will no longer see posts from this creator. This action can be undone in settings.",
        postSaved: "Post saved."
    },
    AMH: {
        searchNeus: "ንዑስ ፈልግ...",
        searchUsers: "ተጠቃሚዎችን ፈልግ...",
        report: "ሪፖርት አድርግ",
        blockCreator: "ፈጣሪን አግድ",
        savePost: "ልጥፍ አስቀምጥ",
        reportPostTitle: "ልጥፍ ሪፖርት አድርግ",
        reportReason: "እባክዎ ምክንያት ይምረጡ:",
        spam: "አይፈለጌ",
        harassment: "ትንኮሳ",
        hateSpeech: "የጥላቻ ንግግር",
        reportSuccessTitle: "ሪፖርት ገብቷል",
        reportSuccessMessage: "እናመሰግናለን። ሪፖርትዎን እየገመገምን ነው።",
        violence: "ሁከት ወይም ብጥብጥ ማስተዋወቅ",
        explicit: "ልቅ ይዘት",
        blockConfirmTitle: "ፈጣሪን ማገድ ይፈልጋሉ?",
        blockConfirmMessage: "ከዚህ ፈጣሪ የሚመጡ ልጥፎችን ዳግመኛ አያዩም። ይህንን በቅንብሮች ውስጥ መቀልበስ ይችላሉ።",
        postSaved: "ልጥፍ ተቀምጧል።"
    },
    ORM: {
        searchNeus: "Neus barbaadi...",
        searchUsers: "Fayyadamtoota barbaadi...",
        report: "Gabaasa",
        blockCreator: "Uumaa Cufi",
        savePost: "Maxxansa Olkaa'i",
        reportPostTitle: "Maxxansa Gabaasi",
        reportReason: "Maaloo sababa filadhu:",
        spam: "Ispamii",
        harassment: "Dhiibbaa",
        hateSpeech: "Dubbii Jibbiinsaa",
        reportSuccessTitle: "Gabaasni Galmaa'eera",
        reportSuccessMessage: "Galatoomaa. Gabaasa keessan ilaalaa jirra.",
        violence: "Jeequmsa ykn jeequmsa guddisuu",
        explicit: "qabiyyee ifa ta’e",
        blockConfirmTitle: "Uumaa cufuu barbaaddaa?",
        blockConfirmMessage: "Kana booda maxxansa uumaa kanarraa hin argitu. Tarsimoota keessatti deebisuun ni danda'ama.",
        postSaved: "Maxxansi olkaa'ameera."
    }
};

const CustomModal = ({ visible, message, onClose }) => {
  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>{message}</Text>
          <Button style={styles.modal} title="OK" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const CustomAlert = ({ visible, setVisible }) => {
  return (
    <Modal visible={visible} transparent>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={{ padding: 20, backgroundColor: "white", borderRadius: 10 }}>
          <Text>Driver Selection</Text>
          <Text>Would you like to choose the driver yourself?</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Text style={{ color: "blue" }}>Find Automatically</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Text style={{ color: "green" }}>Choose Driver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
export const ReportModal = ({ reportModalVisible, handleReport, onClose, language }) => {
  console.log("reportModalVisible, handleReport, onClose, language", reportModalVisible, handleReport, onClose, language)
  return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={reportModalVisible}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalCenteredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{translations[language].reportPostTitle}</Text>
                        <Text style={styles.modalSubTitle}>{translations[language].reportReason}</Text>
                        <TouchableOpacity style={styles.reportOption} onPress={() => handleReport('Spam')}>
                            <Text>{translations[language].spam}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reportOption} onPress={() => handleReport('Harassment')}>
                            <Text>{translations[language].harassment}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reportOption} onPress={() => handleReport('Hate Speech')}>
                            <Text>{translations[language].hateSpeech}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reportOption} onPress={() => handleReport('Hate Speech')}>
                            <Text>{translations[language].violence}</Text>
                        </TouchableOpacity>
                       <TouchableOpacity style={styles.reportOption} onPress={() => handleReport('Hate Speech')}>
                            <Text>{translations[language].explicit}</Text>
                        </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
  );
};

export const CustomAlertModal = ({ visible, title, message, imageSource, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 w-4/5 items-center shadow-lg">
          {/* Close Button */}
          <TouchableOpacity
            // variant="ghost"
            className="absolute top-2 right-2"
            onPress={onClose}
          >
            <AntDesign name="closesquare" size={24} color="black" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-xl font-JakartaBold text-gray-800 mb-4 text-center">
            {title}
          </Text>

          {/* Image/GIF */}
          {imageSource && (
            <Image
              source={{ uri: imageSource }} // Ensure it's wrapped in an object
              className="w-40 h-32 mb-4"
              resizeMode="contain"
            />
          )}

          {/* Message */}
          <Text className="font-JakartaMedium text-gray-600 mb-4">{message}</Text>

          {/* Dismiss Button */}
          <TouchableOpacity className="w-full" onPress={onClose}>
         <Text className="font-JakartaBold text-center ">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBtn: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'grey',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'mon-sb'
  },
    modalCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    modalSubTitle: { fontSize: 16, marginBottom: 20 },
    reportOption: {
        width: '100%',
        padding: 15,
        borderTopWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
    },
    cancelButton: { marginTop: 10 },
    cancelButtonText: { color: 'red' },
        container: { flex: 1, backgroundColor: '#F0F2F5' },
});

export {CustomModal, CustomAlert};
