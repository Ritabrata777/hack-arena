
'use client';
import { useState, useEffect, useCallback } from 'react';

// Custom hook to read and write to localStorage, and sync across tabs and components.
// This is a simplified version but robust for this application's needs.

// Helper to get value from localStorage
function getStorageValue(key, defaultValue) {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error("Error parsing localStorage key:", key, error);
    return defaultValue;
  }
}

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  // The main setter function that updates state, localStorage, and notifies other tabs/windows.
  const setStoredValue = useCallback((newValue) => {
    // Check if the new value is a function (like in setState)
    const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
    
    // 1. Update the component's state
    setValue(valueToStore);

    // 2. Update localStorage
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(valueToStore));
        // 3. Dispatch a storage event to notify other open tabs
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.error("Error setting localStorage key:", key, error);
    }
  }, [key, value]);

  useEffect(() => {
    // This function handles the 'storage' event
    const handleStorageChange = (e) => {
      // We only care about events for the key this hook is managing
      if (e.key === key) {
        setValue(getStorageValue(key, defaultValue));
      }
    };

    if (typeof window !== "undefined") {
      // Add the event listener when the component mounts
      window.addEventListener('storage', handleStorageChange);
    }

    // Remove the event listener when the component unmounts
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [key, defaultValue]);

  return [value, setStoredValue];
};
