// Note Editor Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Portal,
  Dialog,
  List,
  Button,
  Divider,
  TextInput as PaperTextInput,
  Chip,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotesStore } from '../store/notesStore';
import { Note, Folder, Tag } from '../database/database';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NoteEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { note, folderId } = route.params || {};

  const {
    createNote,
    updateNote,
    deleteNote,
    folders,
    tags,
    currentNoteTags,
    fetchFolders,
    fetchTags,
    createTag,
    addTagToNote,
    removeTagFromNote,
    fetchNoteTags,
  } = useNotesStore();

  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    note?.folder_id || folderId || null
  );
  const [isModified, setIsModified] = useState(false);

  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showAddTagInput, setShowAddTagInput] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchTags();
    if (note?.id) {
      fetchNoteTags(note.id);
    }
  }, [note?.id]);

  const handleSave = async () => {
    try {
      if (note) {
        await updateNote(note.id, title || 'Untitled Note', body, selectedFolderId);
      } else {
        await createNote(title || 'Untitled Note', body, selectedFolderId);
      }
      setIsModified(false);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };

  const handleBack = () => {
    if (isModified) {
      Alert.alert('Unsaved Changes', 'Do you want to save before going back?', [
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        { text: 'Save', onPress: handleSave },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Note', 'Are you sure you want to permanently delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (note) {
            await deleteNote(note.id);
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const handleToggleTag = async (tag: Tag) => {
    if (!note?.id) {
      Alert.alert('Save Note First', 'Please save this note before managing tags.');
      return;
    }
    const isAttached = currentNoteTags.some(t => t.id === tag.id);
    if (isAttached) {
      await removeTagFromNote(note.id, tag.id);
    } else {
      await addTagToNote(note.id, tag.id);
    }
  };

  const handleCreateTag = async () => {
    if (newTagName.trim()) {
      await createTag(newTagName.trim());
      setNewTagName('');
      setShowAddTagInput(false);
    }
  };

  const currentFolder = folders.find(f => f.id === selectedFolderId);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {note ? 'Edit Note' : 'New Note'}
          </Text>

          <View style={styles.headerActions}>
            {note && (
              <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color="#D32F2F" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, !isModified && styles.saveBtnDisabled]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meta Row: Notebook + Tags */}
        <View style={styles.metaRow}>
          <TouchableOpacity
            style={styles.folderChip}
            onPress={() => setShowFolderDialog(true)}
          >
            <Ionicons name="folder-outline" size={14} color="#1E88E5" />
            <Text style={styles.folderChipText}>
              {currentFolder ? currentFolder.title : 'No Notebook'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#1E88E5" />
          </TouchableOpacity>

          {note && (
            <TouchableOpacity
              style={styles.tagChipBtn}
              onPress={() => setShowTagDialog(true)}
            >
              <Ionicons name="pricetag-outline" size={14} color="#E91E63" />
              <Text style={styles.tagChipBtnText}>
                {currentNoteTags.length > 0 ? `${currentNoteTags.length} tag(s)` : 'Add Tags'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attached Tags Row */}
        {note && currentNoteTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsScrollContent}
          >
            {currentNoteTags.map(tag => (
              <View key={tag.id} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{tag.title}</Text>
                <TouchableOpacity onPress={() => note && removeTagFromNote(note.id, tag.id)}>
                  <Ionicons name="close-circle" size={14} color="#E91E63" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Editor */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            placeholder="Note title..."
            value={title}
            onChangeText={t => { setTitle(t); setIsModified(true); }}
            placeholderTextColor="#C0C0C0"
            multiline={false}
            returnKeyType="next"
          />
          <View style={styles.dividerLine} />
          <TextInput
            style={styles.bodyInput}
            placeholder="Start writing... (Markdown supported)"
            value={body}
            onChangeText={t => { setBody(t); setIsModified(true); }}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#C0C0C0"
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Footer stats */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{wordCount} words · {charCount} characters</Text>
          {note && (
            <Text style={styles.footerText}>
              Updated {new Date(note.updated_at).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Notebook Selector Dialog */}
        <Portal>
          <Dialog
            visible={showFolderDialog}
            onDismiss={() => setShowFolderDialog(false)}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Select Notebook</Dialog.Title>
            <Dialog.Content>
              <List.Item
                title="No Notebook"
                titleStyle={selectedFolderId === null ? styles.activeListTitle : undefined}
                left={() => (
                  <View style={styles.listIconWrap}>
                    <Ionicons name="close-circle-outline" size={22} color="#9E9E9E" />
                  </View>
                )}
                onPress={() => {
                  setSelectedFolderId(null);
                  setShowFolderDialog(false);
                  setIsModified(true);
                }}
                style={selectedFolderId === null ? styles.activeItem : undefined}
              />
              <Divider />
              <FlatList
                data={folders}
                keyExtractor={(item: Folder) => item.id}
                renderItem={({ item }: { item: Folder }) => (
                  <List.Item
                    title={item.title}
                    titleStyle={selectedFolderId === item.id ? styles.activeListTitle : undefined}
                    left={() => (
                      <View style={styles.listIconWrap}>
                        <Ionicons name="folder" size={22} color="#2196F3" />
                      </View>
                    )}
                    onPress={() => {
                      setSelectedFolderId(item.id);
                      setShowFolderDialog(false);
                      setIsModified(true);
                    }}
                    style={selectedFolderId === item.id ? styles.activeItem : undefined}
                  />
                )}
                ItemSeparatorComponent={() => <Divider />}
                style={styles.dialogList}
                ListEmptyComponent={
                  <Text style={styles.emptyDialogText}>No notebooks yet. Create one from the main screen.</Text>
                }
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowFolderDialog(false)}>Cancel</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Tag Selector Dialog */}
        <Portal>
          <Dialog
            visible={showTagDialog}
            onDismiss={() => {
              setShowTagDialog(false);
              setShowAddTagInput(false);
            }}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Manage Tags</Dialog.Title>
            <Dialog.Content>
              <FlatList
                data={tags}
                keyExtractor={(item: Tag) => item.id}
                renderItem={({ item }: { item: Tag }) => {
                  const isAttached = currentNoteTags.some(t => t.id === item.id);
                  return (
                    <List.Item
                      title={item.title}
                      left={() => (
                        <View style={styles.listIconWrap}>
                          <Ionicons name="pricetag" size={20} color="#E91E63" />
                        </View>
                      )}
                      right={() => (
                        <TouchableOpacity
                          style={styles.tagToggle}
                          onPress={() => handleToggleTag(item)}
                        >
                          <Ionicons
                            name={isAttached ? 'checkmark-circle' : 'add-circle-outline'}
                            size={24}
                            color={isAttached ? '#4CAF50' : '#9E9E9E'}
                          />
                        </TouchableOpacity>
                      )}
                      onPress={() => handleToggleTag(item)}
                    />
                  );
                }}
                ItemSeparatorComponent={() => <Divider />}
                style={styles.dialogList}
                ListEmptyComponent={
                  !showAddTagInput ? (
                    <Text style={styles.emptyDialogText}>No tags yet. Create one below.</Text>
                  ) : null
                }
              />

              {showAddTagInput ? (
                <View style={styles.addTagContainer}>
                  <PaperTextInput
                    label="Tag Name"
                    value={newTagName}
                    onChangeText={setNewTagName}
                    mode="outlined"
                    style={styles.addTagInput}
                    dense
                    autoFocus
                    onSubmitEditing={handleCreateTag}
                  />
                  <View style={styles.addTagActions}>
                    <Button onPress={() => setShowAddTagInput(false)}>Cancel</Button>
                    <Button mode="contained" onPress={handleCreateTag} buttonColor="#E91E63">
                      Create Tag
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  icon={() => <Ionicons name="add" size={16} color="#E91E63" />}
                  mode="outlined"
                  onPress={() => setShowAddTagInput(true)}
                  style={styles.addTagBtn}
                  textColor="#E91E63"
                >
                  New Tag
                </Button>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => {
                  setShowTagDialog(false);
                  setShowAddTagInput(false);
                }}
              >
                Done
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  saveBtnDisabled: { backgroundColor: '#90CAF9' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
    flexWrap: 'wrap',
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  folderChipText: { fontSize: 12, color: '#1E88E5', fontWeight: '600' },
  tagChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  tagChipBtnText: { fontSize: 12, color: '#E91E63', fontWeight: '600' },

  // Tags row
  tagsScroll: { backgroundColor: '#FAFAFA' },
  tagsScrollContent: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4, gap: 6 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  tagBadgeText: { fontSize: 12, color: '#E91E63', fontWeight: '600' },

  // Editor
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  titleInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    paddingVertical: 8,
    letterSpacing: -0.5,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 26,
    color: '#3D3D4E',
    minHeight: 400,
    paddingBottom: 40,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerText: { fontSize: 11, color: '#BDBDBD' },

  // Dialogs
  dialog: { backgroundColor: '#fff', borderRadius: 20 },
  dialogTitle: { textAlign: 'center', fontWeight: '800', fontSize: 18, color: '#1A1A2E' },
  dialogList: { maxHeight: 220 },
  activeItem: { backgroundColor: '#E3F2FD', borderRadius: 10 },
  activeListTitle: { fontWeight: '700', color: '#2196F3' },
  listIconWrap: { justifyContent: 'center', paddingHorizontal: 8 },
  emptyDialogText: { textAlign: 'center', color: '#9E9E9E', paddingVertical: 16, fontSize: 13 },
  tagToggle: { justifyContent: 'center', paddingHorizontal: 8 },

  // Add Tag
  addTagContainer: { marginTop: 16 },
  addTagInput: { marginBottom: 12 },
  addTagActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  addTagBtn: { marginTop: 12, borderColor: '#E91E63', borderRadius: 10 },
});
