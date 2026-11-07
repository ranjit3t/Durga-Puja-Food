import { ChatMessage } from "../domain";
import { decryptChatMessage } from "./chatEncryption";

type ChatData = {
  messages?: Record<string, ChatMessage>;
  clearedAt?: Record<string, number>;
};

export function getChatSummaries(
  chats: Record<string, ChatData>,
  currentUsername: string,
): {
  unreadMap: Record<string, number>;
  lastMsgMap: Record<string, ChatMessage>;
} {
  const cleanUser = currentUsername.trim().toLowerCase();
  const unreadMap: Record<string, number> = {};
  const lastMsgMap: Record<string, ChatMessage> = {};

  Object.entries(chats).forEach(([chatId, chat]) => {
    const participants = chatId.split("__").map((username) => username.toLowerCase());
    if (participants.length !== 2 || !participants.includes(cleanUser) || !chat.messages) {
      return;
    }

    const otherUser = participants.find((username) => username !== cleanUser);
    if (!otherUser) return;

    const userClearedAt = chat.clearedAt?.[cleanUser] || 0;
    const getMessageTime = (message: ChatMessage) =>
      typeof message.timestamp === "number" && message.timestamp > 0
        ? message.timestamp
        : message.localTimestamp || 0;
    const messages = Object.values(chat.messages)
      .filter((message) => getMessageTime(message) > userClearedAt)
      .map((message) => ({
        ...message,
        text: decryptChatMessage(message.text, message.sender, message.recipient),
      }))
      .sort((a, b) => {
        const timeDifference = getMessageTime(a) - getMessageTime(b);
        return timeDifference || (a.id || "").localeCompare(b.id || "");
      });

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    lastMsgMap[otherUser] = lastMessage;
    unreadMap[otherUser] = messages.filter(
      (message) =>
        message.recipient.trim().toLowerCase() === cleanUser &&
        message.status !== "read",
    ).length;
  });

  return { unreadMap, lastMsgMap };
}
