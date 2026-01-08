import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const webStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

const storage = isWeb ? webStorage : AsyncStorage;

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
      lock: isWeb ? undefined : processLock,
    },
  }
);

export { isWeb };

export interface StorageImage {
  id: string;
  user_id: string;
  image_uri: string;
  name: string | null;
  order_index: number;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface LocationMarker {
  id: string;
  storage_image_id: string;
  x_position: number;
  y_position: number;
  name: string | null;
  created_at: string;
}

export interface Tool {
  id: string;
  location_marker_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  file_size: number;
  created_at: string;
}
