import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createFirebaseRepository } from "../repository";
import { useAuth } from "./AuthContext";
import { ChatMessage, ChatUser, UserPresence } from "../types";

const repository = createFirebaseRepository();

export function getChatId(u1: string, u2: string): string {
  const clean1 = u1.trim().toLowerCase();
  const clean2 = u2.trim().toLowerCase();
  const sorted = [clean1, clean2].sort();
  return `${sorted[0]}__${sorted[1]}`;
}

interface ChatContextType {
  // Window Visibility & State
  isExpanded: boolean;
  toggleChatWindow: () => void;
  minimizeChatWindow: () => void;
  expandChatWindow: () => void;

  // Active Chat Session
  activeRecipient: ChatUser | null;
  setActiveRecipient: (user: ChatUser | null) => void;

  // Users List & Presence
  availableUsers: ChatUser[];
  presenceMap: Record<string, UserPresence>;
  refreshUsers: () => Promise<void>;

  // Chat Messages & Typing
  messages: ChatMessage[];
  isRecipientTyping: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendTypingSignal: (isTyping: boolean) => void;

  // Unread Count Badge
  totalUnreadCount: number;

  // Pagination for Messages
  displayMessageCount: number;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;

  // Modal Exclusion Control
  isModalOpen: boolean;
  registerModalOpen: (modalId: string) => void;
  unregisterModalOpen: (modalId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { userAccountName, userName, userRole } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRecipient, setActiveRecipient] = useState<ChatUser | null>(null);

  // System users & Presence
  const [systemUsers, setSystemUsers] = useState<Array<{ username: string; name?: string; role?: string }>>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [lastMsgMap, setLastMsgMap] = useState<Record<string, ChatMessage>>({});

  // Active Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination State
  const [displayMessageCount, setDisplayMessageCount] = useState(20);

  // Modal Tracking State
  const [activeModals, setActiveModals] = useState<Set<string>>(new Set());

  const registerModalOpen = useCallback((modalId: string) => {
    setActiveModals((prev) => {
      const next = new Set(prev);
      next.add(modalId);
      return next;
    });
  }, []);

  const unregisterModalOpen = useCallback((modalId: string) => {
    setActiveModals((prev) => {
      const next = new Set(prev);
      next.delete(modalId);
      return next;
    });
  }, []);

  const isModalOpen = useMemo(() => activeModals.size > 0, [activeModals]);

  // Load auth users list
  const refreshUsers = useCallback(async () => {
    try {
      const authConfig = await repository.getAuthConfig();
      if (authConfig && Array.isArray(authConfig.users)) {
        setSystemUsers(authConfig.users);
      }
    } catch (err) {
      console.error("Error fetching auth users for chat:", err);
    }
  }, []);

  useEffect(() => {
    if (userRole) {
      refreshUsers();
    } else {
      setSystemUsers([]);
      setActiveRecipient(null);
      setIsExpanded(false);
    }
  }, [userRole, refreshUsers]);

  // Sync user presence when authenticated
  useEffect(() => {
    if (!userAccountName || !userRole) return;
    let cleanupPresence: (() => void) | null = null;

    repository.updateUserPresence(userAccountName, userName || userAccountName, userRole)
      .then((cleanup) => {
        cleanupPresence = cleanup;
      })
      .catch((err) => console.error("Failed to register presence:", err));

    return () => {
      if (cleanupPresence) cleanupPresence();
    };
  }, [userAccountName, userName, userRole]);

  // Listen to all users presence in real-time
  useEffect(() => {
    if (!userRole) return;
    const unsub = repository.onAllPresenceChange((presences) => {
      setPresenceMap(presences || {});
    });
    return () => unsub();
  }, [userRole]);

  // Listen to unread counts and last messages across all chats for current user
  useEffect(() => {
    if (!userAccountName) return;
    const unsub = repository.onAllChatsSummaryChange(userAccountName, (unread, lastMsgs) => {
      setUnreadMap(unread || {});
      setLastMsgMap(lastMsgs || {});
    });
    return () => unsub();
  }, [userAccountName]);

  // Calculate total unread messages count across all conversations
  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadMap).reduce((acc, val) => acc + (val || 0), 0);
  }, [unreadMap]);

  // Build combined availableUsers list
  const availableUsers = useMemo<ChatUser[]>(() => {
    if (!userAccountName) return [];
    const currentClean = userAccountName.toLowerCase();

    // Map system users from auth_config
    const usersMap = new Map<string, ChatUser>();

    systemUsers.forEach((u) => {
      const cleanU = u.username.toLowerCase();
      if (cleanU === currentClean) return;

      const p = presenceMap[cleanU];
      const isOnline = p ? p.online : false;
      const lastSeen = p ? p.lastSeen : 0;
      const unread = unreadMap[cleanU] || 0;
      const lastMsg = lastMsgMap[cleanU];

      usersMap.set(cleanU, {
        username: u.username,
        displayName: u.name || u.username,
        role: u.role || "User",
        online: isOnline,
        lastSeen: lastSeen,
        unreadCount: unread,
        lastMessage: lastMsg,
      });
    });

    // Also include any users in presenceMap who might not be in authConfig explicitly
    Object.entries(presenceMap).forEach(([cleanU, p]) => {
      if (cleanU === currentClean || usersMap.has(cleanU)) return;

      const unread = unreadMap[cleanU] || 0;
      const lastMsg = lastMsgMap[cleanU];

      usersMap.set(cleanU, {
        username: p.username || cleanU,
        displayName: p.displayName || p.username || cleanU,
        role: p.role || "User",
        online: p.online,
        lastSeen: p.lastSeen,
        unreadCount: unread,
        lastMessage: lastMsg,
      });
    });

    return Array.from(usersMap.values()).sort((a, b) => {
      // Sort online first, then by last message time, then name
      if (a.online !== b.online) return a.online ? -1 : 1;
      const timeA = a.lastMessage?.timestamp || 0;
      const timeB = b.lastMessage?.timestamp || 0;
      if (timeA !== timeB) return timeB - timeA;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [userAccountName, systemUsers, presenceMap, unreadMap, lastMsgMap]);

  // Sync active recipient details dynamically (online status, last seen, unread)
  useEffect(() => {
    if (!activeRecipient) return;
    const cleanU = activeRecipient.username.toLowerCase();
    const liveUser = availableUsers.find((u) => u.username.toLowerCase() === cleanU);
    if (liveUser) {
      setActiveRecipient((prev) => {
        if (!prev) return liveUser;
        if (
          prev.online !== liveUser.online ||
          prev.lastSeen !== liveUser.lastSeen ||
          prev.displayName !== liveUser.displayName
        ) {
          return { ...prev, ...liveUser };
        }
        return prev;
      });
    }
  }, [availableUsers, activeRecipient]);

  // Active ChatId
  const activeChatId = useMemo(() => {
    if (!userAccountName || !activeRecipient) return null;
    return getChatId(userAccountName, activeRecipient.username);
  }, [userAccountName, activeRecipient]);

  // Listen to messages for active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const unsub = repository.onChatMessagesChange(activeChatId, (msgList) => {
      setMessages(msgList);
    });

    return () => unsub();
  }, [activeChatId]);

  // Listen to typing status for active chat
  useEffect(() => {
    if (!activeChatId) {
      setTypingMap({});
      return;
    }

    const unsub = repository.onTypingStatusChange(activeChatId, (tMap) => {
      setTypingMap(tMap || {});
    });

    return () => unsub();
  }, [activeChatId]);

  // Is recipient typing?
  const isRecipientTyping = useMemo(() => {
    if (!activeRecipient) return false;
    const cleanRecip = activeRecipient.username.toLowerCase();
    return !!typingMap[cleanRecip];
  }, [activeRecipient, typingMap]);

  // Mark messages as read when chat is expanded and active
  useEffect(() => {
    if (isExpanded && activeChatId && userAccountName) {
      repository.markChatMessagesAsRead(activeChatId, userAccountName).catch((err) => {
        console.error("Error marking chat messages read:", err);
      });
    }
  }, [isExpanded, activeChatId, userAccountName, messages]);

  // Reset display message count on chat recipient change
  useEffect(() => {
    setDisplayMessageCount(20);
  }, [activeRecipient?.username]);

  // Send Message
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !activeChatId || !userAccountName || !activeRecipient) return;

      // Clear typing indicator immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      repository.setTypingStatus(activeChatId, userAccountName, false).catch(() => {});

      await repository.sendChatMessage(activeChatId, {
        chatId: activeChatId,
        sender: userAccountName,
        senderName: userName || userAccountName,
        recipient: activeRecipient.username,
        text: trimmed,
      });
    },
    [activeChatId, userAccountName, userName, activeRecipient]
  );

  // Send Typing Signal
  const sendTypingSignal = useCallback(
    (isTyping: boolean) => {
      if (!activeChatId || !userAccountName) return;

      if (isTyping) {
        repository.setTypingStatus(activeChatId, userAccountName, true).catch(() => {});
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
          repository.setTypingStatus(activeChatId, userAccountName, false).catch(() => {});
        }, 2500);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        repository.setTypingStatus(activeChatId, userAccountName, false).catch(() => {});
      }
    },
    [activeChatId, userAccountName]
  );

  // Window toggle methods
  const toggleChatWindow = useCallback(() => setIsExpanded((prev) => !prev), []);
  const minimizeChatWindow = useCallback(() => setIsExpanded(false), []);
  const expandChatWindow = useCallback(() => setIsExpanded(true), []);

  const hasMoreMessages = useMemo(() => messages.length > displayMessageCount, [messages.length, displayMessageCount]);

  const loadMoreMessages = useCallback(() => {
    setDisplayMessageCount((prev) => prev + 20);
  }, []);

  const value = useMemo(
    () => ({
      isExpanded,
      toggleChatWindow,
      minimizeChatWindow,
      expandChatWindow,
      activeRecipient,
      setActiveRecipient,
      availableUsers,
      presenceMap,
      refreshUsers,
      messages,
      isRecipientTyping,
      sendMessage,
      sendTypingSignal,
      totalUnreadCount,
      displayMessageCount,
      hasMoreMessages,
      loadMoreMessages,
      isModalOpen,
      registerModalOpen,
      unregisterModalOpen,
    }),
    [
      isExpanded,
      toggleChatWindow,
      minimizeChatWindow,
      expandChatWindow,
      activeRecipient,
      availableUsers,
      presenceMap,
      refreshUsers,
      messages,
      isRecipientTyping,
      sendMessage,
      sendTypingSignal,
      totalUnreadCount,
      displayMessageCount,
      hasMoreMessages,
      loadMoreMessages,
      isModalOpen,
      registerModalOpen,
      unregisterModalOpen,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
