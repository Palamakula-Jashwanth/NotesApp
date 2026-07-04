import type { Note } from '../database/database';

export type RootStackParamList = {
  NotesList: undefined;
  NoteEditor: {
    note?: Note;
    folderId?: string | null;
  } | undefined;
};
