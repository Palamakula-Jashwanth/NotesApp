// Database setup with SQLite
import * as SQLite from 'expo-sqlite';

const DATABASE_VERSION = 2;

export interface Note {
  id: string;
  title: string;
  body: string;
  folder_id: string | null;
  is_deleted: number;
  is_favorite: number;
  last_synced_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Folder {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Tag {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

class Database {
  private db!: SQLite.SQLiteDatabase;

  async init() {
    this.db = await SQLite.openDatabaseAsync('notes.db');

    await this.db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

    try {
      const info: any[] = await this.db.getAllAsync("PRAGMA table_info(notes)");
      const idCol = info.find((col: any) => col.name === 'id');
      if (idCol && idCol.type === 'INTEGER') {
        await this.db.execAsync('DROP TABLE IF EXISTS notes;');
      }
    } catch (e) {
      // Missing table is expected on first launch.
    }

    await this.migrate();
  }

  private async migrate() {
    const row = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let currentVersion = row?.user_version ?? 0;

    if (currentVersion === 0) {
      await this.createBaseSchema();
      currentVersion = 1;
    }

    if (currentVersion === 1) {
      const noteColumns = await this.db.getAllAsync<{ name: string }>('PRAGMA table_info(notes)');
      const columnNames = new Set(noteColumns.map(column => column.name));

      if (!columnNames.has('is_deleted')) {
        await this.db.execAsync('ALTER TABLE notes ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;');
      }
      if (!columnNames.has('is_favorite')) {
        await this.db.execAsync('ALTER TABLE notes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;');
      }
      if (!columnNames.has('last_synced_at')) {
        await this.db.execAsync('ALTER TABLE notes ADD COLUMN last_synced_at INTEGER;');
      }

      currentVersion = 2;
    }

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_notes_folder_updated ON notes(folder_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_title_unique ON folders(title COLLATE NOCASE);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_title_unique ON tags(title COLLATE NOCASE);
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
  }

  private async createBaseSchema() {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        folder_id TEXT,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        last_synced_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS note_tags (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
        UNIQUE(note_id, tag_id)
      );
    `);
  }

  // --- Note Operations ---
  async getAllNotes(folderId: string | null = null, tagId: string | null = null): Promise<Note[]> {
    if (tagId) {
      const result = await this.db.getAllAsync(
        `SELECT n.* FROM notes n
         JOIN note_tags nt ON n.id = nt.note_id
         WHERE nt.tag_id = ? AND n.is_deleted = 0
         ORDER BY n.updated_at DESC`,
        [tagId]
      );
      return result as Note[];
    }

    if (folderId) {
      const result = await this.db.getAllAsync(
        'SELECT * FROM notes WHERE folder_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
        [folderId]
      );
      return result as Note[];
    } else {
      const result = await this.db.getAllAsync('SELECT * FROM notes WHERE is_deleted = 0 ORDER BY updated_at DESC');
      return result as Note[];
    }
  }

  async createNote(title: string, body: string, folderId: string | null = null): Promise<Note> {
    const now = Date.now();
    const id = now.toString(36) + Math.random().toString(36).substring(2, 9);
    await this.db.runAsync(
      'INSERT INTO notes (id, title, body, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, body, folderId, now, now]
    );
    
    return {
      id,
      title,
      body,
      folder_id: folderId,
      is_deleted: 0,
      is_favorite: 0,
      last_synced_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  async updateNote(id: string, title: string, body: string, folderId: string | null = null): Promise<void> {
    await this.db.runAsync(
      'UPDATE notes SET title = ?, body = ?, folder_id = ?, updated_at = ? WHERE id = ?',
      [title, body, folderId, Date.now(), id]
    );
  }

  async deleteNote(id: string): Promise<void> {
    await this.db.runAsync('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?', [Date.now(), id]);
  }

  async searchNotes(query: string): Promise<Note[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM notes WHERE is_deleted = 0 AND (title LIKE ? OR body LIKE ?) ORDER BY updated_at DESC',
      [`%${query}%`, `%${query}%`]
    );
    return result as Note[];
  }

  // --- Folder Operations ---
  async getAllFolders(): Promise<Folder[]> {
    const result = await this.db.getAllAsync('SELECT * FROM folders ORDER BY title ASC');
    return result as Folder[];
  }

  async createFolder(title: string): Promise<Folder> {
    const now = Date.now();
    const id = now.toString(36) + Math.random().toString(36).substring(2, 9);
    await this.db.runAsync(
      'INSERT INTO folders (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, title, now, now]
    );
    return {
      id,
      title,
      created_at: now,
      updated_at: now,
    };
  }

  async deleteFolder(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
  }

  async updateFolder(id: string, title: string): Promise<void> {
    await this.db.runAsync('UPDATE folders SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
  }

  // --- Tag Operations ---
  async getAllTags(): Promise<Tag[]> {
    const result = await this.db.getAllAsync('SELECT * FROM tags ORDER BY title ASC');
    return result as Tag[];
  }

  async createTag(title: string): Promise<Tag> {
    const now = Date.now();
    const id = now.toString(36) + Math.random().toString(36).substring(2, 9);
    await this.db.runAsync(
      'INSERT OR IGNORE INTO tags (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, title, now, now]
    );
    return {
      id,
      title,
      created_at: now,
      updated_at: now,
    };
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    const now = Date.now();
    const id = now.toString(36) + Math.random().toString(36).substring(2, 9);
    await this.db.runAsync(
      'INSERT OR IGNORE INTO note_tags (id, note_id, tag_id) VALUES (?, ?, ?)',
      [id, noteId, tagId]
    );
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
      [noteId, tagId]
    );
  }

  async getNoteTags(noteId: string): Promise<Tag[]> {
    const result = await this.db.getAllAsync(
      `SELECT t.* FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ?
       ORDER BY t.title ASC`,
      [noteId]
    );
    return result as Tag[];
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
  }
}

export const database = new Database();
