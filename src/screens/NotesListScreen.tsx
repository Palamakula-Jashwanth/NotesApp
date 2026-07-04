import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, LogBox } from 'react-native';
import {
  FAB,
  Searchbar,
  Portal,
  Dialog,
  Button,
  TextInput,
  List,
  Divider,
  IconButton,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNotesStore } from '../store/notesStore';
import { Note, Tag } from '../database/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

// Silence known third-party deprecation warnings that are out of our control
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

export default function NotesListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    notes,
    folders,
    tags,
    activeFolderId,
    activeTagId,
    loading,
    fetchNotes,
    fetchFolders,
    fetchTags,
    createFolder,
    deleteFolder,
    deleteTag,
    setActiveFolderId,
    setActiveTagId,
  } = useNotesStore();

  const [search, setSearch] = useState('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchTags();
    fetchNotes(activeFolderId, activeTagId);
  }, [activeFolderId, activeTagId]);

  const handleSearch = (query: string) => {
    setSearch(query);
    if (query.trim()) {
      useNotesStore.getState().searchNotes(query);
    } else {
      fetchNotes(activeFolderId, activeTagId);
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolder(false);
    }
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const activeTag = tags.find(tag => tag.id === activeTagId);
  const headerTitle = activeTag ? `#${activeTag.title}` : activeFolder ? activeFolder.title : 'All Notes';

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => navigation.navigate('NoteEditor', { note: item })}
      activeOpacity={0.7}
    >
      <Text style={styles.noteTitle} numberOfLines={1}>{item.title || 'Untitled Note'}</Text>
      <Text style={styles.noteBody} numberOfLines={2}>
        {item.body || 'No content...'}
      </Text>
      <View style={styles.noteFooter}>
        <Text style={styles.noteDate}>
          {new Date(item.updated_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        {folders.find(f => f.id === item.folder_id) && (
          <View style={styles.notebookBadge}>
            <Ionicons name="folder-outline" size={10} color="#1E88E5" style={{ marginRight: 4 }} />
            <Text style={styles.notebookBadgeText}>
              {folders.find(f => f.id === item.folder_id)?.title}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Custom Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.folderBtn}
            onPress={() => setShowFolderDialog(true)}
          >
            <Ionicons name="folder-outline" size={22} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tagBtn}
            onPress={() => setShowTagDialog(true)}
          >
            <Ionicons name="pricetag-outline" size={21} color="#E91E63" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder="Search notes..."
          value={search}
          onChangeText={handleSearch}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          icon={() => <Ionicons name="search-outline" size={18} color="#999" />}
          clearIcon={() => search ? <Ionicons name="close-circle" size={18} color="#999" /> : null}
        />

        {/* Content */}
        {loading && notes.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to create your first note</Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            renderItem={renderNote}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={() => fetchNotes(activeFolderId, activeTagId)}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <FAB
          icon={() => <Ionicons name="add" size={24} color="#fff" />}
          style={styles.fab}
          onPress={() => navigation.navigate('NoteEditor', { folderId: activeFolderId })}
        />

        {/* Folder Dialog */}
        <Portal>
          <Dialog
            visible={showFolderDialog}
            onDismiss={() => {
              setShowFolderDialog(false);
              setShowAddFolder(false);
            }}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Notebooks</Dialog.Title>
            <Dialog.Content style={styles.dialogContent}>
              <FlatList
                data={[{ id: null, title: 'All Notes' }, ...folders] as any[]}
                keyExtractor={(item) => item.id || 'all'}
                renderItem={({ item }) => (
                  <List.Item
                    title={item.title}
                    titleStyle={activeFolderId === item.id ? styles.activeListTitle : undefined}
                    left={props => (
                      <View style={styles.listIconWrap}>
                        <Ionicons
                          name={item.id ? 'folder' : 'albums'}
                          size={22}
                          color={item.id ? '#2196F3' : '#757575'}
                        />
                      </View>
                    )}
                    right={props =>
                      item.id ? (
                        <IconButton
                          icon={() => <Ionicons name="trash-outline" size={18} color="#D32F2F" />}
                          size={20}
                          onPress={async () => {
                            await deleteFolder(item.id);
                          }}
                        />
                      ) : null
                    }
                    onPress={() => {
                      setActiveFolderId(item.id);
                      setShowFolderDialog(false);
                    }}
                    style={[
                      styles.folderListItem,
                      activeFolderId === item.id && styles.activeFolderItem,
                    ]}
                  />
                )}
                ItemSeparatorComponent={() => <Divider />}
                style={styles.folderList}
              />

              {showAddFolder ? (
                <View style={styles.addFolderContainer}>
                  <TextInput
                    label="Notebook Name"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    mode="outlined"
                    style={styles.addFolderInput}
                    dense
                    autoFocus
                    onSubmitEditing={handleCreateFolder}
                  />
                  <View style={styles.addFolderActions}>
                    <Button onPress={() => setShowAddFolder(false)}>Cancel</Button>
                    <Button mode="contained" onPress={handleCreateFolder} buttonColor="#2196F3">
                      Create
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  icon={() => <Ionicons name="add" size={16} color="#2196F3" />}
                  mode="outlined"
                  onPress={() => setShowAddFolder(true)}
                  style={styles.addFolderBtn}
                  textColor="#2196F3"
                >
                  New Notebook
                </Button>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => {
                  setShowFolderDialog(false);
                  setShowAddFolder(false);
                }}
              >
                Close
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Tag Dialog */}
        <Portal>
          <Dialog
            visible={showTagDialog}
            onDismiss={() => setShowTagDialog(false)}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Tags</Dialog.Title>
            <Dialog.Content style={styles.dialogContent}>
              <FlatList
                data={[{ id: null, title: 'All Tags' }, ...tags] as (Tag | { id: null; title: string })[]}
                keyExtractor={(item) => item.id || 'all-tags'}
                renderItem={({ item }) => (
                  <List.Item
                    title={item.title}
                    titleStyle={activeTagId === item.id ? styles.activeTagTitle : undefined}
                    left={() => (
                      <View style={styles.listIconWrap}>
                        <Ionicons
                          name={item.id ? 'pricetag' : 'albums-outline'}
                          size={21}
                          color={item.id ? '#E91E63' : '#757575'}
                        />
                      </View>
                    )}
                    right={() =>
                      item.id ? (
                        <IconButton
                          icon={() => <Ionicons name="trash-outline" size={18} color="#D32F2F" />}
                          size={20}
                          onPress={async () => {
                            await deleteTag(item.id);
                          }}
                        />
                      ) : null
                    }
                    onPress={() => {
                      setActiveTagId(item.id);
                      setShowTagDialog(false);
                    }}
                    style={[
                      styles.folderListItem,
                      activeTagId === item.id && styles.activeTagItem,
                    ]}
                  />
                )}
                ItemSeparatorComponent={() => <Divider />}
                style={styles.folderList}
                ListEmptyComponent={
                  <Text style={styles.emptySubtext}>Tags appear here after you add them to notes.</Text>
                }
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowTagDialog(false)}>Close</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#9E9E9E', marginTop: 2 },
  folderBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  tagBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FCE4EC',
    marginLeft: 8,
  },

  // Search
  searchbar: {
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 0,
    backgroundColor: '#EFEFEF',
    borderRadius: 14,
  },
  searchInput: { fontSize: 14 },

  // Note List
  list: { padding: 16, paddingBottom: 100 },
  noteItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  noteTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  noteBody: { fontSize: 14, color: '#6B6B7B', marginBottom: 12, lineHeight: 20 },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: { fontSize: 12, color: '#BDBDBD', fontWeight: '500' },
  notebookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notebookBadgeText: { fontSize: 11, color: '#1E88E5', fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#2196F3',
    borderRadius: 18,
  },

  // Empty
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#BDBDBD', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#BDBDBD', marginTop: 6, textAlign: 'center' },

  // Dialog
  dialog: { backgroundColor: '#fff', borderRadius: 20 },
  dialogTitle: { textAlign: 'center', fontWeight: '800', fontSize: 20, color: '#1A1A2E' },
  dialogContent: { paddingHorizontal: 8 },
  folderList: { maxHeight: 300 },
  folderListItem: { paddingVertical: 2 },
  activeFolderItem: { backgroundColor: '#E3F2FD', borderRadius: 10 },
  activeTagItem: { backgroundColor: '#FCE4EC', borderRadius: 10 },
  activeListTitle: { fontWeight: '700', color: '#2196F3' },
  activeTagTitle: { fontWeight: '700', color: '#E91E63' },
  listIconWrap: { justifyContent: 'center', paddingHorizontal: 8 },

  // Add Folder
  addFolderContainer: { marginTop: 16 },
  addFolderInput: { marginBottom: 12 },
  addFolderActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  addFolderBtn: { marginTop: 16, borderColor: '#2196F3', borderRadius: 10 },
});
