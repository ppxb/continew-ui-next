// Client-side cookie utilities. The app is a client-only SPA, so cookies are
// always read and written in the browser.

function writeClientCookie(serializedCookie: string) {
  document.cookie = serializedCookie
}

export function setClientCookie(key: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  writeClientCookie(`${key}=${value}; expires=${expires}; path=/`)
}

export function getClientCookie(key: string) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${key}=`))
    ?.split('=')[1]
}

export function deleteClientCookie(key: string) {
  writeClientCookie(`${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`)
}
