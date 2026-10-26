/**
 * Notes Screen for all users.
 * Displays list of notes with search, sorting, filtering and decoupled per-user targeted sharing UI.
 */
import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  FlatList,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { AppScreen, Note, UserRole, AppThemeMode, ActivityModule, ActivityAction, NoteShareMode } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { Dropdown } from "../components/common/Dropdown";
import { ActionLabel } from "../components/common/ActionLabel";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useNotes, useActivityLogs } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";
import { createFirebaseRepository } from "../repository";

const repository = createFirebaseRepository();

function getChatId(u1: string, u2: string): string {
  const clean1 = u1.trim().toLowerCase();
  const clean2 = u2.trim().toLowerCase();
  const sorted = [clean1, clean2].sort();
  return `${sorted[0]}__${sorted[1]}`;
}

export function isNoteShared(note: Note): boolean {
  if (!note.sharedWith) return false;
  if (note.sharedWith === "all") return true;
  if (Array.isArray(note.sharedWith)) return note.sharedWith.length > 0;
  if (typeof note.sharedWith === "string") return note.sharedWith.trim().length > 0;
  return false;
}

export function isNoteSharedWithUser(note: Note, targetUser: string | null): boolean {
  if (!targetUser || !note.sharedWith) return false;
  if (note.sharedWith === "all") return true;
  const cleanTarget = targetUser.toLowerCase();
  if (Array.isArray(note.sharedWith)) {
    return note.sharedWith.some(u => u.toLowerCase() === cleanTarget);
  }
  if (typeof note.sharedWith === "string") {
    return note.sharedWith.toLowerCase() === cleanTarget;
  }
  return false;
}

export function getUserShareMode(note: Note, targetUser: string | null): NoteShareMode {
  if (!targetUser || !note.sharedWith) return NoteShareMode.READ_ONLY;
  const cleanTarget = targetUser.toLowerCase();

  if (note.userShareModes) {
    for (const [u, mode] of Object.entries(note.userShareModes)) {
      if (u.toLowerCase() === cleanTarget) {
        return (mode as NoteShareMode) || NoteShareMode.READ_ONLY;
      }
    }
  }

  return (note.shareMode as NoteShareMode) || NoteShareMode.READ_ONLY;
}

export function formatShareLabel(
  sharedWith: string[] | string | undefined,
  shareMode: NoteShareMode | string | undefined,
  userShareModes?: Record<string, NoteShareMode | string>
): string | null {
  if (!sharedWith) return null;
  if (sharedWith === "all") {
    const modeText = shareMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly;
    return UI_TEXT.sharedMarker.replace("{recipient}", UI_TEXT.sharedToAll).replace("{mode}", modeText);
  }
  if (Array.isArray(sharedWith)) {
    if (sharedWith.length === 0) return null;
    if (sharedWith.length === 1) {
      const u = sharedWith[0];
      const uMode = (userShareModes && userShareModes[u]) || shareMode;
      const modeText = uMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly;
      return UI_TEXT.sharedMarker.replace("{recipient}", u).replace("{mode}", modeText);
    }
    const modeText = shareMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly;
    return UI_TEXT.sharedWithCount.replace("{count}", String(sharedWith.length)).replace("{mode}", modeText);
  }
  if (typeof sharedWith === "string" && sharedWith.trim()) {
    const modeText = shareMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly;
    return UI_TEXT.sharedMarker.replace("{recipient}", sharedWith.trim()).replace("{mode}", modeText);
  }
  return null;
}

function parseRecipientsList(sharedWith: string[] | string | undefined, allNonAdminUsers: string[], currentUserName: string | null): string[] {
  if (!sharedWith) return [];
  if (sharedWith === "all") {
    return allNonAdminUsers.filter(u => u.toLowerCase() !== currentUserName?.toLowerCase());
  }
  if (Array.isArray(sharedWith)) {
    return sharedWith.filter(u => u.toLowerCase() !== currentUserName?.toLowerCase());
  }
  if (typeof sharedWith === "string" && sharedWith.trim()) {
    if (sharedWith.trim().toLowerCase() === currentUserName?.toLowerCase()) return [];
    return [sharedWith.trim()];
  }
  return [];
}

/**
 * Memoized individual note item with ownership and sharing markers.
 */
const NoteItem = memo(({
  item,
  index,
  theme,
  styles,
  s,
  currentUsername,
  ownerUsername,
  isAdmin,
  onView,
  onEdit,
  onShare,
  onDelete
}: {
  item: Note;
  index: number;
  theme: any;
  styles: any;
  s: (n: number) => number;
  currentUsername: string;
  ownerUsername: string;
  isAdmin: boolean;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onShare: (note: Note) => void;
  onDelete: (note: Note) => void;
}) => {
  const colorScheme = theme.cardColors[index % theme.cardColors.length];
  const isOwner = ownerUsername.toLowerCase() === currentUsername.toLowerCase();
  const shared = isNoteShared(item);
  const canDelete = isAdmin || (isOwner && !shared);
  const userMode = getUserShareMode(item, currentUsername);
  const canEdit = isAdmin || isOwner || (shared && userMode === NoteShareMode.READ_WRITE);
  const canShare = isAdmin || isOwner;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const shareStatusBadge = formatShareLabel(item.sharedWith, item.shareMode, item.userShareModes);

  return (
    <Pressable
      onPress={() => onView(item)}
      accessibilityRole="button"
      accessibilityLabel={`Note: ${item.subject}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colorScheme.bg,
          borderColor: colorScheme.border,
          marginBottom: s(12),
          padding: s(16),
          borderLeftWidth: 4,
          borderLeftColor: colorScheme.accent,
        },
        pressed && { opacity: 0.8 }
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s(12) }}>
         {canDelete ? (
           <Pressable
             onPress={(e) => { e.stopPropagation(); onDelete(item); }}
             accessible={true}
             accessibilityRole="button"
             accessibilityLabel={UI_TEXT.deleteNote}
             style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
           >
             <Ionicons name="trash-outline" size={s(18)} color={theme.colors.error} />
           </Pressable>
         ) : <View style={{ width: s(26) }} />}

         <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), flexWrap: 'wrap', flex: 1, justifyContent: 'center', marginHorizontal: s(4) }}>
            {!isOwner && (
              <View style={{ backgroundColor: theme.colors.warning + "20", paddingHorizontal: s(8), paddingVertical: s(2), borderRadius: s(6) }}>
                <Text style={{ fontSize: s(10), fontWeight: '900', color: theme.colors.warning }}>
                  {UI_TEXT.ownedBy.replace("{user}", ownerUsername)}
                </Text>
              </View>
            )}
            {(isOwner || isAdmin) && Boolean(shareStatusBadge) && (
              <View style={{ backgroundColor: theme.colors.primary + "20", paddingHorizontal: s(8), paddingVertical: s(2), borderRadius: s(6) }}>
                <Text style={{ fontSize: s(10), fontWeight: '900', color: theme.colors.primary }}>
                  {shareStatusBadge}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: s(10), color: theme.colors.textMuted, fontWeight: '700' }}>{formatTimestamp(item.timestamp)}</Text>
         </View>

         <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
           {canShare && (
             <Pressable
               onPress={(e) => { e.stopPropagation(); onShare(item); }}
               accessible={true}
               accessibilityRole="button"
               accessibilityLabel={UI_TEXT.shareNote}
               style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
             >
               <Ionicons name="share-social-outline" size={s(18)} color={theme.colors.primary} />
             </Pressable>
           )}

           {canEdit ? (
             <Pressable
               onPress={(e) => { e.stopPropagation(); onEdit(item); }}
               accessible={true}
               accessibilityRole="button"
               accessibilityLabel={UI_TEXT.editNote}
               style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
             >
               <Ionicons name="pencil-outline" size={s(18)} color={theme.colors.primary} />
             </Pressable>
           ) : null}
         </View>
      </View>

      <Text style={{ fontSize: s(16), fontWeight: '800', color: theme.colors.textPrimary, marginBottom: s(8) }}>{item.subject}</Text>

      <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(12), borderRadius: s(12) }}>
        <Text style={{ fontSize: s(14), color: theme.colors.textPrimary, lineHeight: s(20), fontWeight: '500' }} numberOfLines={3}>{item.content}</Text>
      </View>
    </Pressable>
  );
});

export function NotesScreen() {
  const { userRole, userName, userAccountName, handleLogout } = useAuth();
  const { loading, refreshAllData, getAuthConfig } = useCoreDatabase();
  const { notes, deleteNote, upsertNote } = useNotes();
  const { addActivityLog } = useActivityLogs();
  const { navigate, goBack } = useAppNavigation();
  const { showAlert } = useUI();

  const styles = useStyles();
  const { s, v } = useScaling();
  const { theme, themeType } = useAppTheme();

  const [limit, setLimit] = useState(20);
  const [searchText, setSearchText] = useState("");
  const [isAscending, setIsAscending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState(UI_TEXT.all);

  // Edit / View Modal State
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [noteSubject, setNoteSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Decoupled Share Modal State
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [isShareAll, setIsShareAll] = useState<boolean>(false);
  const [selectedUserRecipients, setSelectedUserRecipients] = useState<string[]>([]);
  const [userShareModesMap, setUserShareModesMap] = useState<Record<string, NoteShareMode>>({});
  const [shareModalMode, setShareModalMode] = useState<NoteShareMode>(NoteShareMode.READ_ONLY);
  const [isSharingSaving, setIsSharingSaving] = useState(false);

  const [nonAdminUsers, setNonAdminUsers] = useState<string[]>([]);
  const [systemUsers, setSystemUsers] = useState<Array<{ username: string; name?: string; role?: string }>>([]);

  const isAdmin = userRole === UserRole.ADMIN;
  const currentUsername = (userAccountName || userName || "").toLowerCase();

  useEffect(() => {
    getAuthConfig().then((cfg) => {
      if (cfg && Array.isArray(cfg.users)) {
        setSystemUsers(cfg.users);
        const list = cfg.users
          .filter((u: any) => u.role?.toLowerCase() !== UserRole.ADMIN && u.username.toLowerCase() !== currentUsername)
          .map((u: any) => u.username);
        setNonAdminUsers(list);
      }
    }).catch(err => console.error("Error loading auth users for note sharing:", err));
  }, [getAuthConfig, currentUsername]);

  const getDisplayUsername = useCallback((rawName: string) => {
    if (!rawName) return "";
    const parenMatch = rawName.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) return parenMatch[1].trim();

    const clean = rawName.trim().toLowerCase();
    const matchedUser = systemUsers.find(
      (u) => (u.username && u.username.toLowerCase() === clean) || (u.name && u.name.toLowerCase() === clean)
    );
    if (matchedUser?.username) return matchedUser.username;

    return rawName.trim();
  }, [systemUsers]);

  useEffect(() => {
    if (isReadOnly && editingNote) {
      addActivityLog({
        module: ActivityModule.NOTE,
        action: ActivityAction.VIEW,
        description: UI_TEXT.logViewNote.replace("{subject}", editingNote.subject)
      });
    }
  }, [isReadOnly, editingNote, addActivityLog]);

  const userOptions = useMemo(() => {
    const users = new Set<string>();
    users.add(UI_TEXT.all);
    notes.forEach(note => {
      const owner = getDisplayUsername(note.userName);
      if (isAdmin || owner.toLowerCase() === currentUsername || isNoteSharedWithUser(note, currentUsername) || isNoteSharedWithUser(note, userName)) {
        users.add(owner);
      }
    });
    return Array.from(users).sort();
  }, [notes, isAdmin, currentUsername, userName, getDisplayUsername]);

  const filteredNotes = useMemo(() => {
    let result = notes.filter(note => {
      const ownerUsername = getDisplayUsername(note.userName);
      const isOwner = ownerUsername.toLowerCase() === currentUsername;
      const isSharedWithMe = isNoteSharedWithUser(note, currentUsername) || isNoteSharedWithUser(note, userName);
      if (!isAdmin && !isOwner && !isSharedWithMe) return false;
      if (selectedUser !== UI_TEXT.all && ownerUsername.toLowerCase() !== selectedUser.toLowerCase() && note.userName !== selectedUser) return false;
      if (searchText && !(note.subject?.toLowerCase().includes(searchText.toLowerCase()) || note.content?.toLowerCase().includes(searchText.toLowerCase()))) return false;
      return true;
    });

    if (isAscending) {
      result = [...result].sort((a, b) => a.timestamp - b.timestamp);
    } else {
      result = [...result].sort((a, b) => b.timestamp - a.timestamp);
    }

    return result.slice(0, limit);
  }, [notes, selectedUser, searchText, limit, isAscending, isAdmin, currentUsername, userName, getDisplayUsername]);

  const handleViewNote = (note: Note) => {
    setEditingNote(note);
    setNoteSubject(note.subject);
    setNoteContent(note.content);
    const ownerUsername = getDisplayUsername(note.userName);
    const isOwner = ownerUsername.toLowerCase() === currentUsername;
    const userMode = getUserShareMode(note, currentUsername);
    const canWrite = isAdmin || isOwner || ((isNoteSharedWithUser(note, currentUsername) || isNoteSharedWithUser(note, userName)) && userMode === NoteShareMode.READ_WRITE);
    setIsReadOnly(!canWrite);
  };

  const handleAddNote = () => {
    setEditingNote({ id: "", timestamp: 0, userName: userAccountName || userName!, subject: "", content: "" });
    setNoteSubject("");
    setNoteContent("");
    setIsReadOnly(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteSubject(note.subject);
    setNoteContent(note.content);
    setIsReadOnly(false);
  };

  const handleOpenShareModal = (note: Note) => {
    setSharingNote(note);
    const initialModes: Record<string, NoteShareMode> = {};

    if (note.userShareModes) {
      Object.entries(note.userShareModes).forEach(([u, m]) => {
        initialModes[u] = (m as NoteShareMode) || NoteShareMode.READ_ONLY;
      });
    }

    if (note.sharedWith === "all") {
      setIsShareAll(true);
      setSelectedUserRecipients([]);
    } else if (Array.isArray(note.sharedWith)) {
      setIsShareAll(false);
      setSelectedUserRecipients([...note.sharedWith]);
      note.sharedWith.forEach(u => {
        if (!initialModes[u]) {
          initialModes[u] = (note.shareMode as NoteShareMode) || NoteShareMode.READ_ONLY;
        }
      });
    } else if (typeof note.sharedWith === "string" && note.sharedWith.trim()) {
      const u = note.sharedWith.trim();
      setIsShareAll(false);
      setSelectedUserRecipients([u]);
      if (!initialModes[u]) {
        initialModes[u] = (note.shareMode as NoteShareMode) || NoteShareMode.READ_ONLY;
      }
    } else {
      setIsShareAll(false);
      setSelectedUserRecipients([]);
    }

    setUserShareModesMap(initialModes);
    setShareModalMode((note.shareMode as NoteShareMode) || NoteShareMode.READ_ONLY);
  };

  const handleDeleteNote = (note: Note) => {
    const shared = isNoteShared(note);
    if (!isAdmin && shared) {
      showAlert(UI_TEXT.error, UI_TEXT.deleteSharedNoteForbidden);
      return;
    }
    showAlert(UI_TEXT.deleteNoteConfirmTitle, UI_TEXT.deleteNoteConfirmMessage, [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: UI_TEXT.deleteNote,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(note.id);
          } catch (err) {
            showAlert(UI_TEXT.error, UI_TEXT.noteDeleteError);
          }
        }
      }
    ]);
  };

  const handleSaveNote = async () => {
    if (!noteSubject.trim() || !noteContent.trim()) return;
    setIsSaving(true);
    try {
      const activeUser = userAccountName || userName!;
      const noteToSave: Note = {
        ...editingNote!,
        subject: noteSubject.trim(),
        content: noteContent.trim(),
        timestamp: editingNote?.id && editingNote.timestamp ? editingNote.timestamp : Date.now(),
        userName: editingNote?.id ? editingNote.userName : activeUser,
      };

      await upsertNote(noteToSave);
      setEditingNote(null);
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.noteSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplySharing = async () => {
    if (!sharingNote) return;
    setIsSharingSaving(true);
    try {
      let finalSharedWith: string[] | "all" | undefined;
      let finalShareMode: NoteShareMode | undefined;
      let finalUserShareModes: Record<string, NoteShareMode> | undefined;

      if (isShareAll) {
        finalSharedWith = "all";
        finalShareMode = shareModalMode;
      } else if (selectedUserRecipients.length > 0) {
        finalSharedWith = selectedUserRecipients;
        finalUserShareModes = {};
        selectedUserRecipients.forEach(u => {
          finalUserShareModes![u] = userShareModesMap[u] || NoteShareMode.READ_ONLY;
        });
        finalShareMode = shareModalMode;
      } else {
        finalSharedWith = undefined;
      }

      const updatedNote: Note = {
        ...sharingNote,
        sharedWith: finalSharedWith,
        shareMode: finalShareMode,
        userShareModes: finalUserShareModes,
      };

      await upsertNote(updatedNote);

      const senderUsername = (userAccountName || userName || "").trim().toLowerCase();
      const senderDisplayName = userName && userAccountName && userName.toLowerCase() !== userAccountName.toLowerCase()
        ? `${userName} (${userAccountName})`
        : (userAccountName || userName || "");

      // Send 1-on-1 chat message with per-user mode information
      if (finalSharedWith) {
        const recipientsToMessage = finalSharedWith === "all"
          ? nonAdminUsers.filter(u => u.trim().toLowerCase() !== senderUsername)
          : selectedUserRecipients.filter(u => u.trim().toLowerCase() !== senderUsername);

        for (const recipientUser of recipientsToMessage) {
          const cleanRecipient = recipientUser.trim().toLowerCase();
          if (cleanRecipient && cleanRecipient !== senderUsername) {
            const uMode = (finalUserShareModes && finalUserShareModes[recipientUser]) || finalShareMode || NoteShareMode.READ_ONLY;
            const modeLabel = uMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly;
            const shareMsgText = UI_TEXT.noteShareMessage
              .replace("{sender}", senderDisplayName)
              .replace("{mode}", modeLabel)
              .replace("{subject}", updatedNote.subject);

            const chatId = getChatId(senderUsername, cleanRecipient);
            await repository.sendChatMessage(chatId, {
              chatId,
              sender: senderUsername,
              senderName: senderDisplayName,
              recipient: cleanRecipient,
              text: shareMsgText,
            });
          }
        }

        const recipientSummary = finalSharedWith === "all"
          ? UI_TEXT.sharedToAll
          : selectedUserRecipients.join(", ");

        addActivityLog({
          module: ActivityModule.NOTE,
          action: ActivityAction.SHARE,
          targetId: updatedNote.subject,
          description: UI_TEXT.logShareNote.replace("{subject}", updatedNote.subject).replace("{recipient}", recipientSummary),
          newData: { subject: updatedNote.subject, sharedWith: finalSharedWith, shareMode: finalShareMode, userShareModes: finalUserShareModes }
        });

        showAlert(UI_TEXT.ok, UI_TEXT.noteUnsharedTargetSuccess);
      } else {
        addActivityLog({
          module: ActivityModule.NOTE,
          action: ActivityAction.UPDATE,
          targetId: updatedNote.subject,
          description: UI_TEXT.logUnshareNote.replace("{subject}", updatedNote.subject),
          newData: { subject: updatedNote.subject, unshared: true }
        });
        showAlert(UI_TEXT.ok, UI_TEXT.noteUnsharedSuccess);
      }

      setSharingNote(null);
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.noteShareError);
    } finally {
      setIsSharingSaving(false);
    }
  };

  const toggleUserRecipient = (username: string) => {
    setIsShareAll(false);
    setSelectedUserRecipients(prev => {
      if (prev.includes(username)) {
        return prev.filter(u => u !== username);
      } else {
        if (!userShareModesMap[username]) {
          setUserShareModesMap(m => ({ ...m, [username]: NoteShareMode.READ_ONLY }));
        }
        return [...prev, username];
      }
    });
  };

  const setUserSpecificMode = (username: string, mode: NoteShareMode) => {
    setUserShareModesMap(prev => ({ ...prev, [username]: mode }));
  };

  const toggleShareAll = () => {
    if (isShareAll) {
      setIsShareAll(false);
    } else {
      setIsShareAll(true);
      setSelectedUserRecipients([]);
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const modalTitle = isReadOnly ? UI_TEXT.viewNote : (editingNote?.id ? UI_TEXT.editNote : UI_TEXT.addNote);

  const shareModeOptions = useMemo(() => {
    return [UI_TEXT.readOnly, UI_TEXT.readWrite];
  }, []);

  const renderItem = useCallback(({ item, index }: { item: Note; index: number }) => {
    const ownerUsername = getDisplayUsername(item.userName);
    return (
      <NoteItem
        item={item}
        index={index}
        theme={theme}
        styles={styles}
        s={s}
        currentUsername={currentUsername}
        ownerUsername={ownerUsername}
        isAdmin={isAdmin}
        onView={handleViewNote}
        onEdit={handleEditNote}
        onShare={handleOpenShareModal}
        onDelete={handleDeleteNote}
      />
    );
  }, [theme, styles, s, currentUsername, getDisplayUsername, isAdmin, handleViewNote, handleEditNote, handleOpenShareModal, handleDeleteNote]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingBottom: s(20) }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
           <View>
              <Text style={styles.title}>{UI_TEXT.notes}</Text>
           </View>
           <Pressable
             onPress={handleAddNote}
             accessible={true}
             accessibilityRole="button"
             accessibilityLabel={UI_TEXT.addNote}
             style={({ pressed }) => [
               styles.compactSecondary,
               {
                 backgroundColor: theme.colors.success,
                 borderColor: theme.colors.success,
                 minWidth: s(100),
                 height: v(s(64)),
                 flexGrow: 0
               },
               pressed && { opacity: 0.8 }
             ]}
           >
             <ActionLabel icon="add-circle-outline" label={UI_TEXT.addNote} color={theme.colors.white} size={s(18)} vertical />
           </Pressable>
        </View>
      </View>

      <View style={[styles.maxWidthWrapper, { paddingVertical: 12 }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), marginBottom: 0, gap: 16 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.searchBox, { flex: 1, marginBottom: 0, height: 52, borderRadius: 14, maxWidth: undefined }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { fontSize: 15 }]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={UI_TEXT.searchActivities}
                placeholderTextColor={theme.colors.textMuted}
                accessible={true}
                accessibilityLabel={UI_TEXT.searchActivities}
              />
            </View>
            <Pressable
              onPress={() => setIsAscending(!isAscending)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.activityLog}
              style={({ pressed }) => [
                { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name={isAscending ? "arrow-up-outline" : "arrow-down-outline"} size={22} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.reportFilters}
              style={({ pressed }) => [
                { width: 52, height: 52, borderRadius: 14, backgroundColor: showFilters ? theme.colors.primary : theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="options-outline" size={22} color={showFilters ? theme.colors.white : theme.colors.textPrimary} />
            </Pressable>
          </View>

          {showFilters && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>{UI_TEXT.filterByUser}</Text>
              <Dropdown value={selectedUser} options={userOptions} onChange={setSelectedUser} />
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.content, { paddingTop: 20 }]}
          refreshing={loading}
          onRefresh={refreshAllData}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 20, borderRadius: 30, marginBottom: 16 }}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.border} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary }}>{UI_TEXT.noNotes}</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ gap: 20 }}>
              {notes.length >= limit && (
                <Pressable
                  onPress={() => setLimit(prev => prev + 20)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={UI_TEXT.loadMore}
                  style={({ pressed }) => [
                    styles.secondary,
                    { borderStyle: 'dashed', marginTop: 10, height: 50, borderRadius: 12 },
                    pressed && { backgroundColor: theme.colors.surfaceDark }
                  ]}
                >
                   <Text style={styles.secondaryText}>{UI_TEXT.loadMore}</Text>
                </Pressable>
              )}
              <View style={styles.footer}>
                 <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
              </View>
            </View>
          }
        />
      )}

      {/* Add/Edit/View Note Modal */}
      <Modal
        visible={!!editingNote}
        animationType="slide"
        transparent={true}
        accessibilityViewIsModal={true}
        onRequestClose={() => setEditingNote(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={[styles.card, { width: '90%', maxHeight: '85%', padding: 20, backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.textPrimary }}>{modalTitle}</Text>
              <Pressable
                onPress={() => setEditingNote(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.ok}
              >
                <Ionicons name="close-outline" size={24} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {!!editingNote?.id && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(12) }}>
                <View style={{ backgroundColor: theme.colors.primary + "15", paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(8) }}>
                  <Text style={{ fontSize: s(12), fontWeight: '900', color: theme.colors.primary }}>{getDisplayUsername(editingNote.userName).toUpperCase()}</Text>
                </View>
                <Text style={{ fontSize: s(11), color: theme.colors.textMuted, fontWeight: '700' }}>{formatTimestamp(editingNote.timestamp)}</Text>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 0 }]}>{UI_TEXT.subject}</Text>
            <TextInput
              style={[styles.input, isReadOnly && { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }]}
              value={noteSubject}
              onChangeText={setNoteSubject}
              placeholder={UI_TEXT.noteSubjectPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              editable={!isReadOnly}
              accessible={true}
              accessibilityLabel={UI_TEXT.subject}
            />

            <Text style={styles.label}>{UI_TEXT.noteContent}</Text>
            <TextInput
              style={[
                styles.input,
                { height: s(120), textAlignVertical: 'top' },
                isReadOnly && { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }
              ]}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder={UI_TEXT.noteContentPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              editable={!isReadOnly}
              accessible={true}
              accessibilityLabel={UI_TEXT.noteContent}
            />

            {!isReadOnly && (
              <Pressable
                onPress={handleSaveNote}
                disabled={isSaving || !noteSubject.trim() || !noteContent.trim()}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.saveNote}
                style={[
                  styles.primary,
                  { height: 50, marginTop: 16, borderRadius: 14 },
                  (isSaving || !noteSubject.trim() || !noteContent.trim()) && { opacity: 0.5 }
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <ActionLabel icon="save-outline" label={UI_TEXT.saveNote.toUpperCase()} color={theme.colors.white} />
                )}
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dedicated Decoupled Share Note Modal */}
      <Modal
        visible={!!sharingNote}
        animationType="fade"
        transparent={true}
        accessibilityViewIsModal={true}
        onRequestClose={() => setSharingNote(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={[styles.card, { width: '92%', maxHeight: '85%', padding: 20, backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="share-social-outline" size={22} color={theme.colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary }}>{UI_TEXT.shareNote}</Text>
              </View>
              <Pressable
                onPress={() => setSharingNote(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.ok}
              >
                <Ionicons name="close-outline" size={24} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {!!sharingNote && (
              <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 12, borderRadius: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>{sharingNote.subject}</Text>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 0, marginBottom: 8 }]}>{UI_TEXT.selectRecipients}</Text>

            <ScrollView style={{ maxHeight: 220, marginBottom: 16 }} contentContainerStyle={{ gap: 10 }}>
              {/* Option to share to All Non-Admins */}
              <View style={{ borderRadius: 12, backgroundColor: isShareAll ? theme.colors.primary + "15" : theme.colors.surfaceDark, borderWidth: 1, borderColor: isShareAll ? theme.colors.primary : theme.colors.border, padding: 12 }}>
                <Pressable
                  onPress={toggleShareAll}
                  accessible={true}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isShareAll }}
                  accessibilityLabel={UI_TEXT.sharedToAll}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons
                      name={isShareAll ? "checkbox" : "square-outline"}
                      size={20}
                      color={isShareAll ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isShareAll ? theme.colors.primary : theme.colors.textPrimary }}>
                      {UI_TEXT.sharedToAll}
                    </Text>
                  </View>
                  <Ionicons name="people-outline" size={18} color={theme.colors.textMuted} />
                </Pressable>

                {isShareAll && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border + "40" }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6 }}>{UI_TEXT.shareMode}</Text>
                    <Dropdown
                      value={shareModalMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly}
                      options={shareModeOptions}
                      onChange={(val) => setShareModalMode(val === UI_TEXT.readWrite ? NoteShareMode.READ_WRITE : NoteShareMode.READ_ONLY)}
                    />
                  </View>
                )}
              </View>

              {/* Individual user choices with per-user mode selection */}
              {nonAdminUsers.map((u) => {
                const isSelected = !isShareAll && selectedUserRecipients.includes(u);
                const userMode = userShareModesMap[u] || NoteShareMode.READ_ONLY;
                return (
                  <View
                    key={u}
                    style={{
                      borderRadius: 12,
                      backgroundColor: isSelected ? theme.colors.primary + "15" : theme.colors.surfaceDark,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      padding: 12,
                    }}
                  >
                    <Pressable
                      onPress={() => toggleUserRecipient(u)}
                      accessible={true}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={u}
                      style={({ pressed }) => [
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                        pressed && { opacity: 0.8 }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={20}
                          color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                        />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? theme.colors.primary : theme.colors.textPrimary }}>
                          {u}
                        </Text>
                      </View>
                      <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />
                    </Pressable>

                    {isSelected && (
                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border + "40" }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 6 }}>{UI_TEXT.shareMode}</Text>
                        <Dropdown
                          value={userMode === NoteShareMode.READ_WRITE ? UI_TEXT.readWrite : UI_TEXT.readOnly}
                          options={shareModeOptions}
                          onChange={(val) => setUserSpecificMode(u, val === UI_TEXT.readWrite ? NoteShareMode.READ_WRITE : NoteShareMode.READ_ONLY)}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={handleApplySharing}
              disabled={isSharingSaving}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.shareNote}
              style={[
                styles.primary,
                {
                  height: 50,
                  marginTop: 10,
                  borderRadius: 14,
                  backgroundColor: (isShareAll || selectedUserRecipients.length > 0) ? theme.colors.primary : theme.colors.error,
                },
                isSharingSaving && { opacity: 0.5 }
              ]}
            >
              {isSharingSaving ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <ActionLabel
                  icon={(isShareAll || selectedUserRecipients.length > 0) ? "share-social-outline" : "close-circle-outline"}
                  label={(isShareAll || selectedUserRecipients.length > 0) ? UI_TEXT.shareNote.toUpperCase() : UI_TEXT.unshareNote.toUpperCase()}
                  color={theme.colors.white}
                />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
