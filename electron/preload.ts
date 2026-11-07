import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openDirectoryDialog: () => Promise<string | null>;
  platform: string;
}

const api: ElectronAPI = {
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

