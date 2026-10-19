export interface UpdateState {
  status:
    | 'disabled'
    | 'idle'
    | 'checking'
    | 'current'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  currentVersion: string;
  manualDownloadUrl?: string;
  version?: string;
  percent?: number;
  message: string;
}
export interface UpdateResponse {
  success: boolean;
  state: UpdateState;
  error?: string;
}
