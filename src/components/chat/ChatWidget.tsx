import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
  PanResponder,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { useUI } from "../../context/UIContext";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { AppScreen, ChatMessage, ChatUser } from "../../types";

function formatTimestamp(ts: number): string {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToday) return timeStr;
  if (isYesterday) return `${UI_TEXT.yesterday} ${timeStr}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${timeStr}`;
}

function formatLastSeen(ts: number): string {
  if (!ts) return UI_TEXT.offline;
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return UI_TEXT.justNow;
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ChatWidget() {
  const { userRole, userAccountName } = useAuth();
  const { screen } = useAppNavigation();
  const { theme } = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const {
    isExpanded,
    toggleChatWindow,
    minimizeChatWindow,
    activeRecipient,
    setActiveRecipient,
    availableUsers,
    messages,
    isRecipientTyping,
    sendMessage,
    sendTypingSignal,
    totalUnreadCount,
    displayMessageCount,
    hasMoreMessages,
    loadMoreMessages,
    isModalOpen,
  } = useChat();

  const { alertConfig } = useUI();

  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sizeXY, setSizeXY] = useState({ width: 310, height: 440 });
  const [hasMoved, setHasMoved] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleMinimize = () => {
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });
    setSizeXY({ width: 310, height: 440 });
    setHasMoved(false);
    minimizeChatWindow();
  };

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        // @ts-ignore
        if (pan.x._value !== 0 || pan.y._value !== 0 || Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2) {
          setHasMoved(true);
        }
      },
    })
  ).current;

  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        setSizeXY((prev) => ({
          width: Math.max(260, Math.min(windowWidth - 20, prev.width + gestureState.dx)),
          height: Math.max(260, Math.min(windowHeight - 140, prev.height + gestureState.dy)),
        }));
      },
    })
  ).current;

  // Track native keyboard height on mobile platforms
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-scroll to bottom on new messages, typing, or expansion
  useEffect(() => {
    if (isExpanded && activeRecipient) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isExpanded, activeRecipient, isRecipientTyping]);

  // Allowed main operational screens for chat display
  const ALLOWED_CHAT_SCREENS = [
    AppScreen.HOME,
    AppScreen.DASHBOARD,
    AppScreen.GUEST_MANAGEMENT,
    AppScreen.SETTINGS,
    AppScreen.REPORT,
    AppScreen.ACTIVITY_LOG,
    AppScreen.NOTES,
    AppScreen.QR,
    AppScreen.DETAILS,
    AppScreen.SUBSCRIPTION_LIST,
    AppScreen.FORM,
    AppScreen.VIEW_MENU,
    AppScreen.MENU,
    AppScreen.CONTACTS,
    AppScreen.FOOD_PACKAGE,
  ];

  const isAllowedScreen = ALLOWED_CHAT_SCREENS.includes(screen);
  const isAlertVisible = alertConfig?.visible === true;

  // STRICT HIDE CONDITION:
  // Hide chat completely if not logged in, on camera/login screen,
  // or if ANY modal, dropdown, or alert window is active!
  if (!userRole || !isAllowedScreen || isModalOpen || isAlertVisible) {
    return null;
  }

  // Filter users by search query
  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return u.displayName.toLowerCase().includes(query) || u.username.toLowerCase().includes(query) || u.role.toLowerCase().includes(query);
  });

  const handleSend = async () => {
    const text = inputMessage.trim();
    if (!text || sending) return;
    setSending(true);
    setInputMessage("");
    try {
      await sendMessage(text);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (val: string) => {
    setInputMessage(val);
    sendTypingSignal(val.length > 0);
  };

  // Display subset of messages for pagination
  const visibleMessages = messages.slice(Math.max(0, messages.length - displayMessageCount));

  // Dynamic window layout sizing & keyboard offset
  const popupWidth = Math.min(windowWidth - 32, 310);
  const headerOffset = 118; // Aligns top of chat window directly below the UserGreeting welcome message
  const bottomOffset = Platform.OS === "web" ? 20 : 54;

  const dynamicBottom = keyboardHeight > 0
    ? keyboardHeight + 10
    : (Platform.OS === "web" ? 38 : 78);

  const popupHeight = keyboardHeight > 0
    ? Math.max(180, windowHeight - keyboardHeight - headerOffset - 15)
    : Math.max(220, windowHeight - headerOffset - bottomOffset);

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          bottom: dynamicBottom,
          transform: pan.getTranslateTransform(),
        },
      ]}
      pointerEvents="box-none"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        pointerEvents="box-none"
      >
        {!isExpanded ? (
          // --- Minimized Floating Pill Button (Bottom-Right, Draggable) ---
          <Animated.View {...panResponder.panHandlers}>
            <Pressable
              style={[
                styles.minimizedPill,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                  shadowColor: theme.colors.shadow,
                },
              ]}
              onPress={toggleChatWindow}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${UI_TEXT.chat} ${totalUnreadCount > 0 ? `, ${totalUnreadCount} ${UI_TEXT.unreadBadgeCount}` : ""}`}
            >
              <View style={[styles.pillIconBg, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="chatbubbles" size={13} color={theme.colors.white} />
              </View>
              <Text style={[styles.pillText, { color: theme.colors.textPrimary }]}>{UI_TEXT.chat}</Text>

              {totalUnreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                  <Text style={styles.badgeText}>{totalUnreadCount > 99 ? "99+" : totalUnreadCount}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          // --- Expanded Popup Floating Window (Draggable & Resizable) ---
          <View
            style={[
              styles.expandedPopup,
              {
                width: sizeXY.width,
                height: sizeXY.height,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
          {/* --- Header (Draggable) --- */}
          <View {...panResponder.panHandlers} style={[styles.header, { backgroundColor: theme.colors.primary }]}>
            {activeRecipient ? (
              <View style={styles.headerTitleRow}>
                <Pressable
                  style={styles.headerIconButton}
                  onPress={() => setActiveRecipient(null)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={UI_TEXT.changeRecipient}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="arrow-back" size={20} color={theme.colors.white} />
                </Pressable>
                <View style={styles.headerTextCol}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {activeRecipient.displayName}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: activeRecipient.online ? theme.colors.success : theme.colors.textMuted },
                      ]}
                    />
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                      {isRecipientTyping
                        ? UI_TEXT.typing
                        : activeRecipient.online
                        ? UI_TEXT.online
                        : UI_TEXT.lastSeen.replace("{time}", formatLastSeen(activeRecipient.lastSeen))}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.headerTitleRow}>
                <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.white} style={{ marginRight: 8 }} />
                <View style={styles.headerTextCol}>
                  <Text style={styles.headerTitle}>{UI_TEXT.chatTitle}</Text>
                  <Text style={styles.headerSubtitle}>{UI_TEXT.selectUserToChat}</Text>
                </View>
              </View>
            )}

            <Pressable
              style={styles.headerIconButton}
              onPress={handleMinimize}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.minimizeChat}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-down" size={24} color={theme.colors.white} />
            </Pressable>
          </View>

          {/* --- Content Area --- */}
          {!activeRecipient ? (
            // --- USER SELECTION LIST VIEW ---
            <View style={styles.bodyContainer}>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.border }]}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                  placeholder={UI_TEXT.searchUsersPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                )}
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
                {filteredUsers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={40} color={theme.colors.textMuted} />
                    <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{UI_TEXT.noOtherUsers}</Text>
                  </View>
                ) : (
                  filteredUsers.map((user) => (
                    <Pressable
                      key={user.username}
                      style={({ pressed }) => [
                        styles.userCard,
                        {
                          backgroundColor: pressed ? theme.colors.surfaceDark : "transparent",
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setActiveRecipient(user)}
                    >
                      <View style={styles.avatarContainer}>
                        <View style={[styles.avatarBg, { backgroundColor: theme.colors.secondary }]}>
                          <Text style={[styles.avatarText, { color: theme.colors.white }]}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.avatarStatusDot,
                            { backgroundColor: user.online ? theme.colors.success : theme.colors.textMuted },
                          ]}
                        />
                      </View>

                      <View style={styles.userInfoCol}>
                        <View style={styles.userNameRow}>
                          <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {user.displayName}
                          </Text>
                          <View style={[styles.roleBadge, { backgroundColor: theme.colors.surfaceDark }]}>
                            <Text style={[styles.roleBadgeText, { color: theme.colors.textSecondary }]}>
                              {user.role}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.lastMsgText, { color: user.unreadCount > 0 ? theme.colors.primary : theme.colors.textMuted }]} numberOfLines={1}>
                          {user.lastMessage ? user.lastMessage.text : user.online ? UI_TEXT.online : formatLastSeen(user.lastSeen)}
                        </Text>
                      </View>

                      {user.unreadCount > 0 && (
                        <View style={[styles.userBadge, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.userBadgeText}>{user.unreadCount}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          ) : (
            // --- CONVERSATION CHAT WINDOW VIEW ---
            <View style={styles.bodyContainer}>
              {/* Messages Area */}
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
                onLayout={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }}
              >
                {hasMoreMessages && (
                  <Pressable
                    style={[styles.loadMoreButton, { backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.border }]}
                    onPress={loadMoreMessages}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>{UI_TEXT.loadEarlierMessages}</Text>
                  </Pressable>
                )}

                {messages.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={[styles.emptyText, { color: theme.colors.textMuted, marginTop: 8 }]}>
                      {UI_TEXT.noMessagesYet}
                    </Text>
                  </View>
                ) : (
                  visibleMessages.map((msg) => {
                    const isMine = msg.sender.toLowerCase() === userAccountName?.toLowerCase();
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.msgRow,
                          isMine ? styles.msgRowMine : styles.msgRowOther,
                        ]}
                      >
                        <View
                          style={[
                            styles.msgBubble,
                            isMine
                              ? { backgroundColor: theme.colors.primary, borderBottomRightRadius: 2 }
                              : { backgroundColor: theme.colors.surfaceDark, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: theme.colors.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.msgText,
                              { color: isMine ? theme.colors.white : theme.colors.textPrimary },
                            ]}
                          >
                            {msg.text}
                          </Text>

                          <View style={styles.msgFooter}>
                            <Text
                              style={[
                                styles.msgTime,
                                { color: isMine ? "rgba(255,255,255,0.8)" : theme.colors.textMuted },
                              ]}
                            >
                              {formatTimestamp(msg.timestamp)}
                            </Text>

                            {isMine && (
                              <View style={{ marginLeft: 4 }}>
                                {msg.status === "read" ? (
                                  <Ionicons name="checkmark-done" size={15} color={theme.colors.secondary} />
                                ) : msg.status === "delivered" ? (
                                  <Ionicons name="checkmark-done" size={15} color="rgba(255,255,255,0.8)" />
                                ) : (
                                  <Ionicons name="checkmark" size={15} color="rgba(255,255,255,0.8)" />
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}

                {isRecipientTyping && (
                  <View style={[styles.msgRow, styles.msgRowOther]}>
                    <View style={[styles.msgBubble, { backgroundColor: theme.colors.surfaceDark, paddingVertical: 8 }]}>
                      <Text style={[styles.msgText, { color: theme.colors.textMuted, italic: true } as any]}>
                        {UI_TEXT.typing}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input Bar */}
              <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                <TextInput
                  style={[
                    styles.messageInput,
                    {
                      backgroundColor: theme.colors.surfaceDark,
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                      maxHeight: 80,
                    },
                  ]}
                  placeholder={UI_TEXT.typeMessagePlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  value={inputMessage}
                  onChangeText={handleTextChange}
                  onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
                  multiline={true}
                  onSubmitEditing={handleSend}
                />

                <Pressable
                  style={[
                    styles.sendButton,
                    { backgroundColor: theme.colors.primary },
                    (!inputMessage.trim() || sending) && { opacity: 0.5 },
                  ]}
                  onPress={handleSend}
                  disabled={!inputMessage.trim() || sending}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={UI_TEXT.sendMessage}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Ionicons name="send" size={18} color={theme.colors.white} />
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Bottom Action Footer (Always Accessible for Minimize & Reset Position) */}
          <View style={[styles.bottomFooterBar, { backgroundColor: theme.colors.surfaceDark, borderTopColor: theme.colors.border }]}>
            <Pressable
              style={styles.bottomFooterBtn}
              onPress={handleMinimize}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.minimizeChat}
            >
              <Ionicons name="chevron-down" size={15} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
              <Text style={[styles.bottomFooterText, { color: theme.colors.textPrimary }]}>{UI_TEXT.minimizeChat}</Text>
            </Pressable>

            <Pressable
              style={styles.bottomFooterBtn}
              onPress={() => {
                pan.setValue({ x: 0, y: 0 });
                pan.setOffset({ x: 0, y: 0 });
                setSizeXY({ width: 310, height: 440 });
                setHasMoved(false);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.resetPosition}
            >
              <Ionicons name="refresh-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.bottomFooterText, { color: theme.colors.textSecondary }]}>{UI_TEXT.resetPosition}</Text>
            </Pressable>
          </View>

          {/* Resize Handle */}
          <View {...resizePanResponder.panHandlers} style={styles.resizeHandle} pointerEvents="auto">
            <Ionicons name="resize-outline" size={13} color={theme.colors.textMuted} />
          </View>
        </View>
      )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    right: 20,
    zIndex: 9999,
  },
  bottomFooterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  bottomFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  bottomFooterText: {
    fontSize: 12,
    fontWeight: "700",
  },
  resizeHandle: {
    position: "absolute",
    bottom: 2,
    right: 4,
    padding: 6,
    zIndex: 20,
  },
  minimizedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  pillIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    marginLeft: 5,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  expandedPopup: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: "hidden",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  headerIconButton: {
    padding: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  bodyContainer: {
    flex: 1,
    flexDirection: "column",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatarBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userInfoCol: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  lastMsgText: {
    fontSize: 13,
    marginTop: 2,
  },
  userBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  userBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  msgRow: {
    marginVertical: 4,
    flexDirection: "row",
  },
  msgRowMine: {
    justifyContent: "flex-end",
  },
  msgRowOther: {
    justifyContent: "flex-start",
  },
  msgBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  msgTime: {
    fontSize: 10,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
