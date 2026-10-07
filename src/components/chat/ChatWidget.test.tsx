import React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AppScreen, UserRole } from "../../domain";
import { ThemeProvider } from "../../theme";

const recipient = {
  username: "vendor",
  displayName: "Kitchen Vendor",
  role: "Vendor",
  online: true,
  lastSeen: Date.now(),
  unreadCount: 2,
  lastMessage: { text: "Lunch is ready" },
};

const sendMessage = jest.fn(async (_text: string) => undefined);
const toggleChatWindow = jest.fn();
const setActiveRecipient = jest.fn();
const sendTypingSignal = jest.fn();
const chatState: Record<string, any> = {};
const uiState = { alertConfig: { visible: false } };

jest.doMock("../../context/ChatContext", () => ({ useChat: () => chatState }));
jest.doMock("../../context/AuthContext", () => ({
  useAuth: () => ({ userRole: UserRole.ADMIN, userAccountName: "admin" }),
}));
jest.doMock("../../context/NavigationContext", () => ({
  useAppNavigation: () => ({ screen: AppScreen.HOME }),
}));
jest.doMock("../../context/UIContext", () => ({ useUI: () => uiState }));

const { ChatWidget } = require("./ChatWidget") as typeof import("./ChatWidget");

const defaultChat = {
  isExpanded: false,
  toggleChatWindow,
  minimizeChatWindow: jest.fn(),
  activeRecipient: null,
  setActiveRecipient,
  availableUsers: [],
  messages: [],
  isRecipientTyping: false,
  sendMessage,
  sendTypingSignal,
  totalUnreadCount: 0,
  displayMessageCount: 20,
  hasMoreMessages: false,
  loadMoreMessages: jest.fn(),
  isModalOpen: false,
};

function renderChat(overrides: Record<string, any> = {}) {
  Object.assign(chatState, defaultChat, overrides);
  uiState.alertConfig.visible = false;
  return render(
    <ThemeProvider>
      <ChatWidget />
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  Object.assign(chatState, defaultChat);
  uiState.alertConfig.visible = false;
});

describe("ChatWidget", () => {
  it("shows an unread badge and opens the chat window", () => {
    renderChat({ totalUnreadCount: 3 });

    fireEvent.press(screen.getByRole("button", { name: /Chat.*3/ }));

    expect(screen.getByText("3")).toBeTruthy();
    expect(toggleChatWindow).toHaveBeenCalledTimes(1);
  });

  it("renders the active conversation, sends messages, and signals typing", async () => {
    renderChat({
      isExpanded: true,
      activeRecipient: recipient,
      messages: [{ id: "m1", sender: "vendor", senderName: "Kitchen Vendor", text: "Lunch is ready", timestamp: Date.now(), status: "delivered" }],
      isRecipientTyping: true,
    });

    expect(screen.getByText("Kitchen Vendor")).toBeTruthy();
    expect(screen.getByText("Lunch is ready")).toBeTruthy();
    expect(screen.getAllByText("typing...")).toHaveLength(2);

    fireEvent.changeText(screen.getByPlaceholderText("Type a message..."), "Opening now");
    expect(sendTypingSignal).toHaveBeenCalledWith(true);
    fireEvent.press(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith("Opening now"));
  });

  it("hides while another modal is active", () => {
    renderChat({ isModalOpen: true });

    expect(screen.queryByRole("button", { name: /Chat/ })).toBeNull();
  });
});