import { create } from 'zustand';
import localforage from 'localforage';

export type MapItemType = 'token' | 'table';

export interface MapItem {
  id: string;
  itemType: MapItemType;
  imageUrl: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  zIndex: number;
  backImageUrl?: string; 
  isFlipped?: boolean; 
  isActivated?: boolean;
  startX?: number;
  startY?: number;
  isMarker?: boolean;
}

export interface Zone {
    id: string;
    name: string;
    tokens: MapItem[];
}

export interface PoolItem {
  id: string;
  imageUrl: string;
  backImageUrl?: string; 
  defaultScale?: number;
}

export interface DiceRoll {
    sides: number;
    count: number;
    results: number[];
    total: number;
}

export interface SetupSnapshot {
  items: MapItem[];
  graveyards: Zone[];
  drawBags: Zone[];
  globalTokenScale: number;
}

interface ItemState {
  items: MapItem[];
  graveyards: Zone[];
  drawBags: Zone[];
  tokenPool: PoolItem[];
  tablePool: PoolItem[];
  markerPool: PoolItem[];
  globalTokenScale: number;
  // Game State
  turnNumber: number;
  currentRoll: DiceRoll | null;
  initialSetupSnapshot: SetupSnapshot | null;

  addItem: (itemData: Omit<MapItem, 'id' | 'zIndex'>) => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  updateItemScale: (id: string, scaleX: number, scaleY: number) => void;
  flipItem: (id: string) => void; 
  bringToFront: (id: string) => void;
  getStackedTokenIds: (leaderId: string) => string[];
  
  // New Methods
  deleteToken: (id: string) => void;
  cloneToken: (id: string) => void;

  // Turn & Activation
  toggleTokenActivation: (id: string) => void;
  nextTurn: () => void;

  // Setup Management
  saveCurrentAsInitial: () => void;
  resetToInitial: () => void;

  // Dice
  rollDice: (sides: number, count: number) => void;
  clearRoll: () => void;

  // New Methods
  addDrawBag: (name: string) => void;
  removeDrawBag: (id: string, newName: string) => void;
  renameDrawBag: (id: string, newName: string) => void;
  addTokensToDrawBag: (bagId: string, tokens: { imageUrl: string; backImageUrl?: string }[]) => void;
  
  moveTokenToZone: (tokenId: string, zoneType: 'graveyard' | 'bag', zoneId: string) => void;
  restoreTokenToMap: (tokenId: string, zoneType: 'graveyard' | 'bag', zoneId: string, x: number, y: number) => void;
  drawRandomToken: (bagId: string, x: number, y: number) => void;

  setGlobalTokenScale: (scale: number) => void;

  addTokensToPool: (imageUrls: string[]) => void;
  setTokenPoolItemBackImage: (id: string, backImageUrl: string) => void; 
  removeTokenFromPool: (id: string) => void;
  clearTokenPool: () => void;

  addMarkersToPool: (imageUrls: string[]) => void;
  updateMarkerSizeInPool: (id: string, delta: number) => void;
  removeMarkerFromPool: (id: string) => void;
  clearMarkerPool: () => void;

  addTablesToPool: (imageUrls: string[]) => void;
  removeTableFromPool: (id: string) => void;
  clearTablePool: () => void;

  importSetup: (setupData: any) => void;

  loadItems: () => Promise<void>;
}

const saveItemsToLocal = async (items: MapItem[]) => {
  try {
    await localforage.setItem('wargame_items', items);
  } catch (error) {
    console.error('Failed to save items:', error);
  }
};

const saveGraveyardsToLocal = async (graveyards: Zone[]) => {
    try {
        await localforage.setItem('wargame_graveyards', graveyards);
    } catch (error) {
        console.error('Failed to save graveyards:', error);
    }
};

const saveDrawBagsToLocal = async (drawBags: Zone[]) => {
    try {
        await localforage.setItem('wargame_draw_bags', drawBags);
    } catch (error) {
        console.error('Failed to save draw bags:', error);
    }
};

const saveTokenPoolToLocal = async (pool: PoolItem[]) => {
  try {
    await localforage.setItem('wargame_token_pool', pool);
  } catch (error) {
    console.error('Failed to save token pool:', error);
  }
};

const saveTablePoolToLocal = async (pool: PoolItem[]) => {
  try {
    await localforage.setItem('wargame_table_pool', pool);
  } catch (error) {
    console.error('Failed to save table pool:', error);
  }
};

const saveMarkerPoolToLocal = async (pool: PoolItem[]) => {
  try {
    await localforage.setItem('wargame_marker_pool', pool);
  } catch (error) {
    console.error('Failed to save marker pool:', error);
  }
};

const saveGlobalScaleToLocal = async (scale: number) => {
  try {
    await localforage.setItem('wargame_global_scale', scale);
  } catch (error) {
    console.error('Failed to save global scale:', error);
  }
};

const saveTurnNumberToLocal = async (turn: number) => {
  try {
    await localforage.setItem('wargame_turn_number', turn);
  } catch (error) {
    console.error('Failed to save turn number:', error);
  }
};

const saveInitialSetupToLocal = async (snapshot: SetupSnapshot) => {
  try {
    await localforage.setItem('wargame_initial_setup', snapshot);
  } catch (error) {
    console.error('Failed to save initial setup:', error);
  }
};

export const useTokenStore = create<ItemState>((set, get) => ({
  items: [],
  graveyards: [
      { id: 'g1', name: '阵亡区 A', tokens: [] },
      { id: 'g2', name: '阵亡区 B', tokens: [] }
  ],
  drawBags: [
      { id: 'b1', name: '抽签袋 1', tokens: [] }
  ],
  tokenPool: [],
  tablePool: [],
  markerPool: [],
  globalTokenScale: 1,
  
  turnNumber: 1, // Default turn
  currentRoll: null,
  initialSetupSnapshot: null,

  addItem: (itemData) => {
    const { items } = get();
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const maxZIndex = items.reduce((max, t) => Math.max(max, t.zIndex), 0);
    const newZIndex = maxZIndex + 1;

    const newItem: MapItem = {
      id,
      zIndex: newZIndex,
      startX: itemData.x,
      startY: itemData.y,
      ...itemData,
    };

    const newItems = [...items, newItem];
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  updateItemPosition: (id, x, y) => {
    const { items } = get();
    const newItems = items.map((t) => 
      t.id === id ? { ...t, x, y } : t
    );
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  updateItemScale: (id, scaleX, scaleY) => {
    const { items } = get();
    const newItems = items.map((t) => 
      t.id === id ? { ...t, scaleX, scaleY } : t
    );
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  flipItem: (id) => {
    const { items } = get();
    const newItems = items.map((t) => {
        if(t.id === id) {
            return { ...t, isFlipped: !t.isFlipped };
        }
        return t;
    });
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  bringToFront: (id) => {
    const { items } = get();
    const item = items.find((t) => t.id === id);
    if (!item) return;

    const maxZIndex = items.reduce((max, t) => Math.max(max, t.zIndex), 0);
    if (item.zIndex === maxZIndex) return;

    const newItems = items.map((t) => 
      t.id === id ? { ...t, zIndex: maxZIndex + 1 } : t
    );
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  getStackedTokenIds: (leaderId) => {
      const { items } = get();
      const leader = items.find(t => t.id === leaderId);
      if (!leader) return [];

      // Find tokens close to the leader (e.g. within 30 pixels to balance accuracy and usability)
      // This includes the leader itself
      return items.filter(t => 
          Math.abs(t.x - leader.x) < 30 && 
          Math.abs(t.y - leader.y) < 30
      ).map(t => t.id);
  },

  deleteToken: (id) => {
    const { items } = get();
    const newItems = items.filter(t => t.id !== id);
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  cloneToken: (id) => {
    const { items } = get();
    const target = items.find(t => t.id === id);
    if (!target) return;

    const newId = `item-clone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const maxZ = items.reduce((m, t) => Math.max(m, t.zIndex), 0);

    const clone: MapItem = {
      ...target,
      id: newId,
      x: target.x + 15,
      y: target.y + 15,
      startX: target.x + 15,
      startY: target.y + 15,
      zIndex: maxZ + 1,
      isActivated: false
    };

    const newItems = [...items, clone];
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  toggleTokenActivation: (id) => {
    const { items } = get();
    // Use map to create a new array with the modified item
    const newItems = items.map(t => 
        t.id === id ? { ...t, isActivated: !t.isActivated } : t
    );
    // If we're updating a stacked item, should we only update that one or the leader? 
    // The requirement is "specified token", so single token is fine.
    
    set({ items: newItems });
    saveItemsToLocal(newItems);
  },

  nextTurn: () => {
    const { items, turnNumber } = get();
    // Increment Turn
    const newTurn = turnNumber + 1;
    // Reset all activations, and set startX/Y to current x/y
    const newItems = items.map(t => ({ 
        ...t, 
        isActivated: false,
        startX: t.x,
        startY: t.y
    }));
    
    set({ 
        items: newItems,
        turnNumber: newTurn
    });
    
    saveItemsToLocal(newItems);
    saveTurnNumberToLocal(newTurn);
  },

  saveCurrentAsInitial: () => {
    const { items, graveyards, drawBags, globalTokenScale } = get();
    // Use JSON stringify/parse for deep copy
    const snapshot: SetupSnapshot = JSON.parse(JSON.stringify({
      items,
      graveyards,
      drawBags,
      globalTokenScale
    }));
    
    set({ initialSetupSnapshot: snapshot });
    saveInitialSetupToLocal(snapshot);
  },

  resetToInitial: () => {
    const { initialSetupSnapshot } = get();
    
    if (!initialSetupSnapshot) {
      // 如果没有保存过初设，执行“彻底清空”操作
      const emptyItems: MapItem[] = [];
      const emptyGraveyards: Zone[] = [
        { id: 'g1', name: '阵亡区 A', tokens: [] },
        { id: 'g2', name: '阵亡区 B', tokens: [] }
      ];
      const emptyDrawBags: Zone[] = [
        { id: 'b1', name: '抽签袋 1', tokens: [] }
      ];
      
      set({ 
        items: emptyItems,
        graveyards: emptyGraveyards,
        drawBags: emptyDrawBags,
        turnNumber: 0
      });

      saveItemsToLocal(emptyItems);
      saveGraveyardsToLocal(emptyGraveyards);
      saveDrawBagsToLocal(emptyDrawBags);
      saveTurnNumberToLocal(0);
      return;
    }

    // 如果有初设，则恢复到初设状态
    const snapshot: SetupSnapshot = JSON.parse(JSON.stringify(initialSetupSnapshot));
    
    set({ 
      items: snapshot.items,
      graveyards: snapshot.graveyards,
      drawBags: snapshot.drawBags,
      globalTokenScale: snapshot.globalTokenScale,
      turnNumber: 1
    });

    // Save current states to localforage
    saveItemsToLocal(snapshot.items);
    saveGraveyardsToLocal(snapshot.graveyards);
    saveDrawBagsToLocal(snapshot.drawBags);
    saveGlobalScaleToLocal(snapshot.globalTokenScale);
    saveTurnNumberToLocal(1);
  },

  rollDice: (sides, count) => {
      const results: number[] = [];
      let total = 0;
      for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          results.push(roll);
          total += roll;
      }
      set({ 
          currentRoll: {
              sides,
              count,
              results,
              total
          }
      });
  },

  clearRoll: () => {
    set({ currentRoll: null });
  },

  addDrawBag: (name) => {
      const { drawBags } = get();
      const newBag: Zone = {
          id: `bag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          tokens: []
      };
      const newBags = [...drawBags, newBag];
      set({ drawBags: newBags });
      saveDrawBagsToLocal(newBags);
  },
  
  removeDrawBag: (id) => {
      const { drawBags } = get();
      const newBags = drawBags.filter(bag => bag.id !== id);
      set({ drawBags: newBags });
      saveDrawBagsToLocal(newBags);
  },

  renameDrawBag: (id, newName) => {
      const { drawBags } = get();
      const newBags = drawBags.map(bag => 
        bag.id === id ? { ...bag, name: newName } : bag
      );
      set({ drawBags: newBags });
      saveDrawBagsToLocal(newBags);
  },

  addTokensToDrawBag: (bagId, newTokensData) => {
      const { drawBags } = get();
      const newTokens: MapItem[] = newTokensData.map(tokenData => ({
        id: `bag-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        zIndex: 0, // In bag, zIndex doesn't matter
        imageUrl: tokenData.imageUrl,
        backImageUrl: tokenData.backImageUrl,
        isFlipped: false,
        itemType: 'token' as MapItemType,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1
      }));
      
      const newBags = drawBags.map(bag => {
        if (bag.id === bagId) {
            return { ...bag, tokens: [...bag.tokens, ...newTokens] };
        }
        return bag;
      });
      set({ drawBags: newBags });
      saveDrawBagsToLocal(newBags);
  },

  moveTokenToZone: (tokenId, zoneType, zoneId) => {
      const { items, graveyards, drawBags } = get();
      const token = items.find(t => t.id === tokenId);
      if (!token) return;

      // Remove from map
      const newItems = items.filter(t => t.id !== tokenId);
      set({ items: newItems });
      saveItemsToLocal(newItems);

      // Add to zone
      if (zoneType === 'graveyard') {
          const newGraveyards = graveyards.map(zone => {
              if (zone.id === zoneId) {
                  return { ...zone, tokens: [...zone.tokens, token] };
              }
              return zone;
          });
          set({ graveyards: newGraveyards });
          saveGraveyardsToLocal(newGraveyards);
      } else {
          const newDrawBags = drawBags.map(zone => {
              if (zone.id === zoneId) {
                  return { ...zone, tokens: [...zone.tokens, token] };
              }
              return zone;
          });
          set({ drawBags: newDrawBags });
          saveDrawBagsToLocal(newDrawBags);
      }
  },

  restoreTokenToMap: (tokenId, zoneType, zoneId, x, y) => {
      const { items, graveyards, drawBags } = get();
      let token: MapItem | undefined;

      // Remove from zone
      if (zoneType === 'graveyard') {
          const zone = graveyards.find(z => z.id === zoneId);
          if (!zone) return;
          token = zone.tokens.find(t => t.id === tokenId);
          if (!token) return;

          const newGraveyards = graveyards.map(z => {
              if (z.id === zoneId) {
                  return { ...z, tokens: z.tokens.filter(t => t.id !== tokenId) };
              }
              return z;
          });
          set({ graveyards: newGraveyards });
          saveGraveyardsToLocal(newGraveyards);
      } else {
          const zone = drawBags.find(z => z.id === zoneId);
          if (!zone) return;
          token = zone.tokens.find(t => t.id === tokenId);
          if (!token) return;

          const newDrawBags = drawBags.map(z => {
              if (z.id === zoneId) {
                  return { ...z, tokens: z.tokens.filter(t => t.id !== tokenId) };
              }
              return z;
          });
          set({ drawBags: newDrawBags });
          saveDrawBagsToLocal(newDrawBags);
      }

      // Add to map
      if (token) {
        const maxZIndex = items.reduce((max, t) => Math.max(max, t.zIndex), 0);
        const mapItem: MapItem = {
            ...token,
            x,
            y,
            zIndex: maxZIndex + 1
        };
        const newItems = [...items, mapItem];
        set({ items: newItems });
        saveItemsToLocal(newItems);
      }
  },

  drawRandomToken: (bagId, x, y) => {
      const { drawBags, items } = get();
      const bag = drawBags.find(b => b.id === bagId);
      if (!bag || bag.tokens.length === 0) return;

      const randomIndex = Math.floor(Math.random() * bag.tokens.length);
      const token = bag.tokens[randomIndex];

      // Remove from bag
      const newDrawBags = drawBags.map(b => {
          if (b.id === bagId) {
              const newTokens = [...b.tokens];
              newTokens.splice(randomIndex, 1);
              return { ...b, tokens: newTokens };
          }
          return b;
      });
      set({ drawBags: newDrawBags });
      saveDrawBagsToLocal(newDrawBags);

      // Add to map
      const maxZIndex = items.reduce((max, t) => Math.max(max, t.zIndex), 0);
      const mapItem: MapItem = {
          ...token,
          x,
          y,
          zIndex: maxZIndex + 1
      };
      const newItems = [...items, mapItem];
      set({ items: newItems });
      saveItemsToLocal(newItems);
  },

  setGlobalTokenScale: (scale) => {
    set({ globalTokenScale: scale });
    saveGlobalScaleToLocal(scale);
  },

  addTokensToPool: (imageUrls) => {
    const { tokenPool } = get();
    // Batch create items
    const newItems = imageUrls.map(url => ({
        id: `pool-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: url
    }));
    const newPool = [...tokenPool, ...newItems];
    set({ tokenPool: newPool });
    saveTokenPoolToLocal(newPool);
  },

  setTokenPoolItemBackImage: (id, backImageUrl) => {
      const { tokenPool } = get();
      const newPool = tokenPool.map(t => 
        t.id === id ? { ...t, backImageUrl } : t
      );
      set({ tokenPool: newPool });
      saveTokenPoolToLocal(newPool);
  },

  removeTokenFromPool: (id) => {
    const { tokenPool } = get();
    const newPool = tokenPool.filter((t) => t.id !== id);
    set({ tokenPool: newPool });
    saveTokenPoolToLocal(newPool);
  },

  clearTokenPool: () => {
    set({ tokenPool: [] });
    saveTokenPoolToLocal([]);
  },

  addTablesToPool: (imageUrls) => {
    const { tablePool } = get();
     const newItems = imageUrls.map(url => ({
        id: `pool-table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: url
    }));
    const newPool = [...tablePool, ...newItems];
    set({ tablePool: newPool });
    saveTablePoolToLocal(newPool);
  },

  removeTableFromPool: (id) => {
    const { tablePool } = get();
    const newPool = tablePool.filter((t) => t.id !== id);
    set({ tablePool: newPool });
    saveTablePoolToLocal(newPool);
  },

  clearTablePool: () => {
    set({ tablePool: [] });
    saveTablePoolToLocal([]);
  },

  addMarkersToPool: (imageUrls) => {
    const { markerPool } = get();
    const newItems = imageUrls.map(url => ({
        id: `pool-marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: url,
        defaultScale: 0.8
    }));
    const newPool = [...markerPool, ...newItems];
    set({ markerPool: newPool });
    saveMarkerPoolToLocal(newPool);
  },

  updateMarkerSizeInPool: (id, delta) => {
    const { markerPool } = get();
    const newPool = markerPool.map(m => {
        if (m.id === id) {
            const current = m.defaultScale || 0.8;
            return { ...m, defaultScale: Math.max(0.2, Math.min(2.0, current + delta)) };
        }
        return m;
    });
    set({ markerPool: newPool });
    saveMarkerPoolToLocal(newPool);
  },

  removeMarkerFromPool: (id) => {
    const { markerPool } = get();
    const newPool = markerPool.filter((t) => t.id !== id);
    set({ markerPool: newPool });
    saveMarkerPoolToLocal(newPool);
  },

  clearMarkerPool: () => {
    set({ markerPool: [] });
    saveMarkerPoolToLocal([]);
  },

  importSetup: (data) => {
    if (!data || typeof data !== 'object') return;

    // We can assume validate structure beforehand or here
    const updates: any = {};
    if (Array.isArray(data.items)) updates.items = data.items;
    if (Array.isArray(data.graveyards)) updates.graveyards = data.graveyards;
    if (Array.isArray(data.drawBags)) updates.drawBags = data.drawBags;
    if (Array.isArray(data.tokenPool)) updates.tokenPool = data.tokenPool;
    if (Array.isArray(data.tablePool)) updates.tablePool = data.tablePool;
    if (Array.isArray(data.markerPool)) updates.markerPool = data.markerPool;
    if (typeof data.globalTokenScale === 'number') updates.globalTokenScale = data.globalTokenScale;
    if (typeof data.turnNumber === 'number') updates.turnNumber = data.turnNumber;

    set(updates);

    // Persist all
    if (updates.items) saveItemsToLocal(updates.items);
    if (updates.graveyards) saveGraveyardsToLocal(updates.graveyards);
    if (updates.drawBags) saveDrawBagsToLocal(updates.drawBags);
    if (updates.tokenPool) saveTokenPoolToLocal(updates.tokenPool);
    if (updates.tablePool) saveTablePoolToLocal(updates.tablePool);
    if (updates.markerPool) saveMarkerPoolToLocal(updates.markerPool);
    if (updates.globalTokenScale) saveGlobalScaleToLocal(updates.globalTokenScale);
    if (updates.turnNumber) saveTurnNumberToLocal(updates.turnNumber);
  },

  loadItems: async () => {
    try {
      const storedItems = await localforage.getItem<MapItem[]>('wargame_items');
      if (storedItems && Array.isArray(storedItems)) {
        set({ items: storedItems });
      } else {
        const oldTokens = await localforage.getItem<any[]>('wargame_tokens');
        if (oldTokens && Array.isArray(oldTokens)) {
           const migrated = oldTokens.map(t => ({
             id: t.id,
             imageUrl: t.imageUrl,
             x: t.x || 0,
             y: t.y || 0,
             zIndex: t.zIndex || 0,
             itemType: 'token' as MapItemType,
             scaleX: 1,
             scaleY: 1
           }));
           set({ items: migrated });
           saveItemsToLocal(migrated);
        }
      }

      const storedGraveyards = await localforage.getItem<Zone[]>('wargame_graveyards');
      if (storedGraveyards && Array.isArray(storedGraveyards)) {
          set({ graveyards: storedGraveyards });
      }

      const storedDrawBags = await localforage.getItem<Zone[]>('wargame_draw_bags');
      if (storedDrawBags && Array.isArray(storedDrawBags)) {
        set({ drawBags: storedDrawBags });
      }
      
      const storedTokenPool = await localforage.getItem<PoolItem[]>('wargame_token_pool');
      if (storedTokenPool && Array.isArray(storedTokenPool)) {
        set({ tokenPool: storedTokenPool });
      }

      const storedTablePool = await localforage.getItem<PoolItem[]>('wargame_table_pool');
      if (storedTablePool && Array.isArray(storedTablePool)) {
        set({ tablePool: storedTablePool });
      }

      const storedMarkerPool = await localforage.getItem<PoolItem[]>('wargame_marker_pool');
      if (storedMarkerPool && Array.isArray(storedMarkerPool)) {
        set({ markerPool: storedMarkerPool });
      }
      
      const storedGlobalScale = await localforage.getItem<number>('wargame_global_scale');
      if (typeof storedGlobalScale === 'number') {
        set({ globalTokenScale: storedGlobalScale });
      }
      
      const storedTurn = await localforage.getItem<number>('wargame_turn_number');
      if (typeof storedTurn === 'number') {
        set({ turnNumber: storedTurn });
      }

      const storedInitialSetup = await localforage.getItem<SetupSnapshot>('wargame_initial_setup');
      if (storedInitialSetup) {
        set({ initialSetupSnapshot: storedInitialSetup });
      }
    } catch (error) {
      console.error('Failed to load items from local storage:', error);
    }
  },
}));