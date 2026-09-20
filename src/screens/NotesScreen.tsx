/**
 * Notes Screen for all users.
 * Displays list of notes with search, sorting and filtering.
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { AppScreen, Note, UserRole, AppThemeMode, ActivityModule, ActivityAction } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { Dropdown } from "../components/common/Dropdown";
import { ActionLabel } from "../components/common/ActionLabel";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";

/**
 * Memoized individual note item.
 */
const NoteItem = memo(({
  item,
  index,
  theme,
  styles,
  s,
  canEdit,
  onView,
  onEdit,
  onDelete
}: {
  item: Note;
  index: number;
  theme: any;
  styles: any;
  s: (n: number) => number;
  canEdit: boolean;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}) => {
  const colorScheme = theme.cardColors[index % theme.cardColors.length];

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Pressable
      onPress={() => onView(item)}
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
         {canEdit ? (
           <Pressable
             onPress={(e) => { e.stopPropagation(); onDelete(item.id); }}
             style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
           >
             <Ionicons name="trash-outline" size={s(18)} color={theme.colors.error} />
           </Pressable>
         ) : <View style={{ width: s(26) }} />}

         <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
            <View style={{ backgroundColor: theme.colors.primary + "15", paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(8) }}>
              <Text style={{ fontSize: s(11), fontWeight: '900', color: theme.colors.primary }}>{item.userName.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: s(10), color: theme.colors.textMuted, fontWeight: '700' }}>{formatTimestamp(item.timestamp)}</Text>
         </View>

         {canEdit ? (
           <Pressable
             onPress={(e) => { e.stopPropagation(); onEdit(item); }}
             style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
           >
             <Ionicons name="pencil-outline" size={s(18)} color={theme.colors.primary} />
           </Pressable>
         ) : <View style={{ width: s(26) }} />}
      </View>

      <Text style={{ fontSize: s(16), fontWeight: '800', color: theme.colors.textPrimary, marginBottom: s(8) }}>{item.subject}</Text>

      <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(12), borderRadius: s(12) }}>
        <Text style={{ fontSize: s(14), color: theme.colors.textPrimary, lineHeight: s(20), fontWeight: '500' }} numberOfLines={3}>{item.content}</Text>
      </View>
    </Pressable>
  );
});

export function NotesScreen() {
  const { userRole, userName, handleLogout } = useAuth();
  const { notes, loading, deleteNote, refreshAllData, upsertNote, addActivityLog } = useDatabase();
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

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [noteSubject, setNoteSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    notes.forEach(note => users.add(note.userName));
    return Array.from(users).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes.filter(note => {
      if (selectedUser !== UI_TEXT.all && note.userName !== selectedUser) return false;
      if (searchText && !(note.subject?.toLowerCase().includes(searchText.toLowerCase()) || note.content?.toLowerCase().includes(searchText.toLowerCase()))) return false;
      return true;
    });

    if (isAscending) {
      result = [...result].sort((a, b) => a.timestamp - b.timestamp);
    } else {
      result = [...result].sort((a, b) => b.timestamp - a.timestamp);
    }

    return result.slice(0, limit);
  }, [notes, selectedUser, searchText, limit, isAscending]);

  const handleViewNote = (note: Note) => {
    setEditingNote(note);
    setNoteSubject(note.subject);
    setNoteContent(note.content);
    setIsReadOnly(true);
  };

  const handleAddNote = () => {
    setEditingNote({ id: "", timestamp: 0, userName: userName!, subject: "", content: "" });
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

  const handleDeleteNote = (id: string) => {
    showAlert(UI_TEXT.deleteNoteConfirmTitle, UI_TEXT.deleteNoteConfirmMessage, [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: UI_TEXT.deleteButton,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(id);
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
      await upsertNote({
        ...editingNote!,
        subject: noteSubject.trim(),
        content: noteContent.trim(),
        timestamp: editingNote?.id ? editingNote.timestamp : Date.now(),
        userName: editingNote?.id ? editingNote.userName : userName!,
      });
      setEditingNote(null);
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.noteSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const modalTitle = isReadOnly ? UI_TEXT.viewNote : (editingNote?.id ? UI_TEXT.editNote : UI_TEXT.addNote);

  const renderItem = useCallback(({ item, index }: { item: Note; index: number }) => {
    const canEdit = userRole === UserRole.ADMIN || item.userName === userName;
    return (
      <NoteItem
        item={item}
        index={index}
        theme={theme}
        styles={styles}
        s={s}
        canEdit={canEdit}
        onView={handleViewNote}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
      />
    );
  }, [theme, styles, s, userRole, userName, handleViewNote, handleEditNote, handleDeleteNote]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingBottom: s(20) }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
           <View>
              <Text style={styles.title}>{UI_TEXT.notes}</Text>
           </View>
           <Pressable
             onPress={handleAddNote}
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

      <View style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <View style={[styles.maxWidthWrapper, { paddingVertical: 20, gap: 16 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.searchBox, { flex: 1, marginBottom: 0, height: 52, borderRadius: 14, maxWidth: undefined }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { fontSize: 15 }]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={UI_TEXT.searchActivities}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Pressable
              onPress={() => setIsAscending(!isAscending)}
              style={({ pressed }) => [
                { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name={isAscending ? "arrow-up-outline" : "arrow-down-outline"} size={22} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
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
        onRequestClose={() => setEditingNote(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={[styles.card, { width: '90%', maxHeight: '80%', padding: 20, backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.textPrimary }}>{modalTitle}</Text>
              <Pressable onPress={() => setEditingNote(null)}>
                <Ionicons name="close-outline" size={24} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {editingNote?.id && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(16) }}>
                <View style={{ backgroundColor: theme.colors.primary + "15", paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(8) }}>
                  <Text style={{ fontSize: s(12), fontWeight: '900', color: theme.colors.primary }}>{editingNote.userName.toUpperCase()}</Text>
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
            />

            {!isReadOnly && (
              <Pressable
                onPress={handleSaveNote}
                disabled={isSaving || !noteSubject.trim() || !noteContent.trim()}
                style={[
                  styles.primary,
                  { height: 50, marginTop: 24, borderRadius: 14 },
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
    </View>
  );
}

