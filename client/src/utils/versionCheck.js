/**
 * Automatic cache-busting and version checking utility
 *
 * This utility ensures users always have the latest version of the app
 * by checking the server version and clearing cache when updates are detected.
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const STORAGE_KEYS = {
  BUILD_HASH: 'fofenk_build_hash',
  LAST_CHECK: 'fofenk_last_version_check'
};

/**
 * Clear all application caches
 */
export const clearAllCaches = async () => {
  console.log('[VersionCheck] Clearing all caches...');

  // Clear Cache Storage (Service Worker caches)
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[VersionCheck] Cache Storage cleared');
    } catch (error) {
      console.error('[VersionCheck] Error clearing Cache Storage:', error);
    }
  }

  // Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('[VersionCheck] Service workers unregistered');
    } catch (error) {
      console.error('[VersionCheck] Error unregistering service workers:', error);
    }
  }
};

/**
 * Generate a hash from index.html content to detect changes
 */
const generateHash = async (content) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

/**
 * Fetch current build hash from server
 */
const fetchCurrentBuildHash = async () => {
  try {
    // Fetch index.html with cache-busting
    const response = await fetch(`/index.html?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract script src hashes (these change with each build)
    const scriptMatches = html.match(/\/static\/js\/[^"]+/g) || [];
    const cssMatches = html.match(/\/static\/css\/[^"]+/g) || [];
    const allFiles = [...scriptMatches, ...cssMatches].join('|');

    // Generate hash from file names
    return await generateHash(allFiles);
  } catch (error) {
    console.error('[VersionCheck] Error fetching build hash:', error);
    return null;
  }
};

/**
 * Check if the app needs to be updated
 */
export const checkForUpdates = async () => {
  const lastCheck = localStorage.getItem(STORAGE_KEYS.LAST_CHECK);

  // Skip if checked recently
  if (lastCheck && Date.now() - parseInt(lastCheck) < VERSION_CHECK_INTERVAL) {
    return false;
  }

  console.log('[VersionCheck] Checking for updates...');

  const storedHash = localStorage.getItem(STORAGE_KEYS.BUILD_HASH);
  const currentHash = await fetchCurrentBuildHash();

  if (!currentHash) {
    console.log('[VersionCheck] Could not fetch current build hash');
    return false;
  }

  // Update last check time
  localStorage.setItem(STORAGE_KEYS.LAST_CHECK, Date.now().toString());

  // If hash changed, we need to update
  if (storedHash && storedHash !== currentHash) {
    console.log('[VersionCheck] Build hash changed!', { old: storedHash, new: currentHash });
    return true;
  }

  // Store current hash
  localStorage.setItem(STORAGE_KEYS.BUILD_HASH, currentHash);
  return false;
};

/**
 * Force reload the application from server
 */
export const forceReload = () => {
  console.log('[VersionCheck] Force reloading...');
  // Hard reload - bypass browser cache
  window.location.reload(true);
};

/**
 * Initialize version checking on app start
 */
export const initVersionCheck = async () => {
  console.log('[VersionCheck] Initializing...');

  // Get current build hash
  const currentHash = await fetchCurrentBuildHash();
  const storedHash = localStorage.getItem(STORAGE_KEYS.BUILD_HASH);

  if (currentHash) {
    // If there was a previous hash and it's different, clear caches
    if (storedHash && storedHash !== currentHash) {
      console.log('[VersionCheck] New version detected on init, clearing caches...');
      await clearAllCaches();
      localStorage.setItem(STORAGE_KEYS.BUILD_HASH, currentHash);
      // Don't force reload here - let the user continue with fresh resources
    } else if (!storedHash) {
      // First visit, just store the hash
      localStorage.setItem(STORAGE_KEYS.BUILD_HASH, currentHash);
    }
  }

  localStorage.setItem(STORAGE_KEYS.LAST_CHECK, Date.now().toString());

  // Set up periodic checks (for long-running sessions)
  setInterval(async () => {
    const needsUpdate = await checkForUpdates();
    if (needsUpdate) {
      console.log('[VersionCheck] New version detected, clearing cache and reloading...');
      await clearAllCaches();
      forceReload();
    }
  }, VERSION_CHECK_INTERVAL);
};

/**
 * Manual cache clear and reload (for error recovery)
 */
export const clearCacheAndReload = async () => {
  await clearAllCaches();
  localStorage.removeItem(STORAGE_KEYS.BUILD_HASH);
  localStorage.removeItem(STORAGE_KEYS.LAST_CHECK);
  forceReload();
};

export default {
  initVersionCheck,
  checkForUpdates,
  clearAllCaches,
  forceReload,
  clearCacheAndReload
};
