import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  testDbConnection: (config) => ipcRenderer.invoke('test-db-connection', config),
  createDirectory: (relativePath: string) => ipcRenderer.invoke('create-directory', relativePath),
  getLastSyncedId: (config) => ipcRenderer.invoke('get-last-synced-id', config),
  syncToDatabase: (config, data: any[]) => ipcRenderer.invoke('sync-batch', { config, data })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
