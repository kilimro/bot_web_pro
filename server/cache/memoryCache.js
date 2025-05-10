class MemoryCache {
  constructor() {
    this.store = new Map();
  }
  get(key) { return this.store.get(key); }
  set(key, value) { this.store.set(key, value); }
  clear() { this.store.clear(); }
  delete(key) { this.store.delete(key); }
  has(key) { return this.store.has(key); }
}
module.exports = new MemoryCache(); 