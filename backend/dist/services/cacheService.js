const localMemoryCache = new Map();
export function getCache(key) {
    const item = localMemoryCache.get(key);
    if (!item)
        return null;
    if (Date.now() > item.expiry) {
        localMemoryCache.delete(key);
        return null;
    }
    return item.value;
}
export function setCache(key, value, ttlSeconds = 60) {
    const expiry = Date.now() + ttlSeconds * 1000;
    localMemoryCache.set(key, { value, expiry });
}
export function clearCache(keyPrefix) {
    for (const key of localMemoryCache.keys()) {
        if (key.startsWith(keyPrefix)) {
            localMemoryCache.delete(key);
        }
    }
}
export function clearAllCache() {
    localMemoryCache.clear();
}
