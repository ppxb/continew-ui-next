import { setClientCookie } from '../cookie'
import { setLocalStorageValue } from '../local-storage'
import {
  getPreferencePersistence,
  type PreferenceKey,
  type PreferencePersistence,
  type PreferenceValueMap
} from './preferences-config'

async function persistByMode(mode: PreferencePersistence, key: string, value: string): Promise<void> {
  switch (mode) {
    case 'none':
      return

    case 'client-cookie':
    case 'server-cookie':
      // There is no server runtime, so every cookie preference is written in the browser.
      setClientCookie(key, value)
      return

    case 'localStorage':
      setLocalStorageValue(key, value)
      return
  }
}

export function persistPreference<K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]): Promise<void> {
  return persistByMode(getPreferencePersistence(key), key, value)
}
