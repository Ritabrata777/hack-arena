
'use client';
import { getDatabaseData } from '@/backend/services/mongodb';

export const getData = (key) => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return null;
  }
};

export const setData = (key, value) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const item = JSON.stringify(value);
    window.localStorage.setItem(key, item);
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};


export const backupData = async () => {
    if (typeof window === 'undefined') {
        return;
    }
    
    try {
        // Fetch all data from the database for a complete backup
        const backup = await getDatabaseData();

        const dataStr = JSON.stringify(backup, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `medichain-db-backup-${new Date().toISOString()}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        return true;
    } catch(e) {
        console.error("Backup failed", e);
        return false;
    }
}
