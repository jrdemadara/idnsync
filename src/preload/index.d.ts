import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      testDbConnection: (config: SyncConfig) => Promise<{ success: boolean; message?: string }>
      createDirectory: (
        fullPath: string
      ) => Promise<{ success: boolean; message?: string; path?: string }>
      getLastSyncedId: (config: SyncConfig) => Promise<{ success: boolean; lastId?: number }>
      syncToDatabase: (
        config: SyncConfig,
        data: any[]
      ) => Promise<{ success: boolean; message?: string }>
    }
  }

  type SyncConfig = {
    host: string
    port: number
    user: string
    password: string
    database: string
    photoDirectory: string
    signatureDirectory: string
    fileWriteTrottle: number
  }
}
