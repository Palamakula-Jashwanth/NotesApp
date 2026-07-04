// State management with Zustand
import { create } from 'zustand';
import { database, Note, Folder, Tag } from '../database/database';

interface NotesState {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  currentNoteTags: Tag[];
  activeFolderId: string | null;
  activeTagId: string | null;
  loading: boolean;
  
  fetchNotes: (folderId?: string | null, tagId?: string | null) => Promise<void>;
  createNote: (title: string, body: string, folderId?: string | null) => Promise<void>;
  updateNote: (id: string, title: string, body: string, folderId?: string | null) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  
  fetchFolders: () => Promise<void>;
  createFolder: (title: string) => Promise<void>;
  updateFolder: (id: string, title: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  
  fetchTags: () => Promise<void>;
  createTag: (title: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;
  fetchNoteTags: (noteId: string) => Promise<void>;
  
  setActiveFolderId: (id: string | null) => void;
  setActiveTagId: (id: string | null) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  folders: [],
  tags: [],
  currentNoteTags: [],
  activeFolderId: null,
  activeTagId: null,
  loading: false,

  fetchNotes: async (folderId = null, tagId = null) => {
    set({ loading: true });
    const targetFolderId = folderId !== undefined ? folderId : get().activeFolderId;
    const targetTagId = tagId !== undefined ? tagId : get().activeTagId;
    const notes = await database.getAllNotes(targetFolderId, targetTagId);
    set({ notes, loading: false });
  },

  createNote: async (title: string, body: string, folderId = null) => {
    const targetFolderId = folderId !== null ? folderId : get().activeFolderId;
    await database.createNote(title, body, targetFolderId);
    await get().fetchNotes(targetFolderId);
  },

  updateNote: async (id: string, title: string, body: string, folderId = null) => {
    const targetFolderId = folderId !== null ? folderId : get().activeFolderId;
    await database.updateNote(id, title, body, targetFolderId);
    await get().fetchNotes(get().activeFolderId, get().activeTagId);
  },

  deleteNote: async (id: string) => {
    await database.deleteNote(id);
    await get().fetchNotes(get().activeFolderId, get().activeTagId);
  },

  searchNotes: async (query: string) => {
    set({ loading: true });
    const notes = await database.searchNotes(query);
    set({ notes, loading: false });
  },

  fetchFolders: async () => {
    set({ loading: true });
    const folders = await database.getAllFolders();
    set({ folders, loading: false });
  },

  createFolder: async (title: string) => {
    await database.createFolder(title);
    await get().fetchFolders();
  },

  updateFolder: async (id: string, title: string) => {
    await database.updateFolder(id, title);
    await get().fetchFolders();
  },

  deleteFolder: async (id: string) => {
    await database.deleteFolder(id);
    // If the active folder was deleted, clear the selection
    if (get().activeFolderId === id) {
      set({ activeFolderId: null });
    }
    await get().fetchFolders();
    await get().fetchNotes(get().activeFolderId, get().activeTagId);
  },

  fetchTags: async () => {
    set({ loading: true });
    const tags = await database.getAllTags();
    set({ tags, loading: false });
  },

  createTag: async (title: string) => {
    await database.createTag(title);
    await get().fetchTags();
  },

  deleteTag: async (id: string) => {
    await database.deleteTag(id);
    if (get().activeTagId === id) {
      set({ activeTagId: null });
    }
    await get().fetchTags();
    await get().fetchNotes(get().activeFolderId, get().activeTagId);
  },

  addTagToNote: async (noteId: string, tagId: string) => {
    await database.addTagToNote(noteId, tagId);
    await get().fetchNoteTags(noteId);
  },

  removeTagFromNote: async (noteId: string, tagId: string) => {
    await database.removeTagFromNote(noteId, tagId);
    await get().fetchNoteTags(noteId);
  },

  fetchNoteTags: async (noteId: string) => {
    const currentNoteTags = await database.getNoteTags(noteId);
    set({ currentNoteTags });
  },

  setActiveFolderId: (id: string | null) => {
    set({ activeFolderId: id, activeTagId: null });
    get().fetchNotes(id, null);
  },

  setActiveTagId: (id: string | null) => {
    set({ activeTagId: id, activeFolderId: null });
    get().fetchNotes(null, id);
  },
}));
