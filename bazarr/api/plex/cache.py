"""Cache utilities for Plex OAuth flow."""
import time
from typing import Dict, Optional
from threading import Lock

class PinCache:
    """Thread-safe cache for OAuth PINs."""
    
    def __init__(self):
        self._cache = {}
        self._lock = Lock()
    
    def set(self, pin_id: str, data: Dict, ttl: int = 600):
        """Store PIN data with time-to-live (default 10 minutes)."""
        with self._lock:
            self._cache[pin_id] = {
                'data': data,
                'expires_at': time.time() + ttl
            }
    
    def get(self, pin_id: str) -> Optional[Dict]:
        """Get PIN data if not expired."""
        with self._lock:
            if pin_id not in self._cache:
                return None
            
            entry = self._cache[pin_id]
            if time.time() > entry['expires_at']:
                del self._cache[pin_id]
                return None
            
            return entry['data']
    
    def delete(self, pin_id: str):
        """Delete PIN from cache."""
        with self._lock:
            if pin_id in self._cache:
                del self._cache[pin_id]
    
    def cleanup(self):
        """Remove expired entries."""
        with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, entry in self._cache.items()
                if current_time > entry['expires_at']
            ]
            for key in expired_keys:
                del self._cache[key]

# Global PIN cache instance
pin_cache = PinCache()

# Helper functions for backward compatibility
def cache_pin(pin_id: str, data: Dict, ttl: int = 600):
    """Store PIN in cache."""
    pin_cache.set(pin_id, data, ttl)

def get_cached_pin(pin_id: str) -> Optional[Dict]:
    """Get PIN from cache."""
    return pin_cache.get(pin_id)

def delete_cached_pin(pin_id: str):
    """Delete PIN from cache."""
    pin_cache.delete(pin_id)

# Optional: Add periodic cleanup
import threading

def start_cache_cleanup(interval: int = 300):
    """Start periodic cache cleanup (default every 5 minutes)."""
    def cleanup_task():
        while True:
            time.sleep(interval)
            pin_cache.cleanup()
    
    cleanup_thread = threading.Thread(target=cleanup_task, daemon=True)
    cleanup_thread.start()
