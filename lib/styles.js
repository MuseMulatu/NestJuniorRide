import { StyleSheet} from "react-native";

export const modalStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    flexGrow: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  textInputWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  errorContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  createRequestButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createRequestText: {
    color: "#fff",
    fontSize: 16,
  },
  findButton: {
    backgroundColor: "#28a745",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  groupContainer: {
    marginTop: 24,
  },
  groupHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  coRiderCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 12,
  },
  coRiderName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  coRiderRating: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  coRiderComments: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  actionButtonsContainer: {
    marginTop: 16,
  },
  confirmButton: {
    backgroundColor: "#28a745",
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  changeButton: {
    backgroundColor: "#ffc107",
    paddingVertical: 16,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  modalRating: {
    fontSize: 18,
    color: "#666",
    marginBottom: 12,
  },
  modalCommentsHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  modalComment: {
    fontSize: 14,
    color: "#666",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  modalNoComments: {
    fontSize: 14,
    color: "#666",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  modalCloseButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
  },
});
