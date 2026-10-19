// Cross-process FS types. Kept separate from the catch-all `types.ts` so
// the surface stays scoped — consumers may import from either path.

export type FsEncoding = 'utf8' | 'base64';

// fs:read
export interface FsReadRequest {
  path: string;
  encoding?: FsEncoding;
}

export type FsReadResponse =
  | { success: true; content: string; encoding: FsEncoding; size: number }
  | { success: false; error: string; code?: 'too-large' | 'forbidden' | 'not-found' | 'not-a-file' | 'unknown' };

// fs:write
export interface FsWriteRequest {
  path: string;
  content: string;
  encoding?: FsEncoding;
  /** When true, refuses to overwrite an existing file. Default false. */
  exclusive?: boolean;
}

export type FsWriteResponse =
  | { success: true; bytesWritten: number }
  | { success: false; error: string; code?: 'too-large' | 'forbidden' | 'exists' | 'unknown' };

// fs:list
export interface FsListRequest {
  path: string;
}

export interface FsListEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
}

export type FsListResponse =
  | { success: true; entries: FsListEntry[] }
  | { success: false; error: string; code?: 'forbidden' | 'not-found' | 'not-a-directory' | 'unknown' };

// fs:stat
export interface FsStatRequest {
  path: string;
}

export type FsStatResponse =
  | {
      success: true;
      exists: boolean;
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtimeMs: number;
    }
  | { success: false; error: string; code?: 'forbidden' | 'unknown' };
