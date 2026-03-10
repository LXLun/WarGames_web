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
  // Split/Merge tracking
  basePoolId?: string; // Original template ID
  parentInstanceId?: string; // If this is a sub-token, who was the parent?
  isSubToken?: boolean;
  linkedSubTokenId?: string; // The ID of the sub-token template to use (will create 2)
  splitBinding?: string | null; // ID of the SINGLE sub-token template to use (creates 2)
  parentBasePoolId?: string; // Cache the original parent template ID for easier merging
  parentImageUrl?: string; // Backup of parent image
  parentBackImageUrl?: string; // Backup of parent back image
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
  // Sub-token binding (only for main tokens)
  splitBinding?: string | null; // ID of the SINGLE sub-token template to use (creates 2)
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
  subTokenPool: PoolItem[]; // New pool for child tokens
  tablePool: PoolItem[];
  markerPool: PoolItem[];
  globalTokenScale: number;
  // Game State
  isSetupMode: boolean;
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

  // Turn & Game Control
  toggleTokenActivation: (id: string) => void;
  nextTurn: () => void;
  startGame: () => void;
  enterSetupMode: () => void;

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

  // Sub-pool methods
  addSubTokensToPool: (imageUrls: string[]) => void;
  setSubTokenPoolItemBackImage: (id: string, backImageUrl: string) => void;
  removeSubTokenFromPool: (id: string) => void;
  clearSubTokenPool: () => void;

  // Binding
  bindSubTokensToMain: (mainPoolId: string, subId: string) => void;
  bindSubTokenToMapItem: (itemId: string, subId: string) => void;

  // Map Actions
  splitMapItem: (id: string) => void;
  mergeMapItems: (idA: string, idB: string) => void;
  setItemBackImage: (id: string, backImageUrl: string) => void;

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

const saveSubTokenPoolToLocal = async (pool: PoolItem[]) => {
  try {
    await localforage.setItem('wargame_sub_token_pool', pool);
  } catch (error) {
    console.error('Failed to save sub-token pool:', error);
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

const saveSetupModeToLocal = async (isSetup: boolean) => {
  try {
    await localforage.setItem('wargame_setup_mode', isSetup);
  } catch (error) {
    console.error('Failed to save setup mode:', error);
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
  subTokenPool: [],
  tablePool: [],
  markerPool: [],
  globalTokenScale: 1,
  
  isSetupMode: true,
  turnNumber: 1, 
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
      // Propagate splitBinding from base template if it exists
      splitBinding: itemData.splitBinding || (itemData.basePoolId ? get().tokenPool.find(p => p.id === itemData.basePoolId)?.splitBinding : null)
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

  startGame: () => {
    set({ isSetupMode: false, turnNumber: 1 });
    saveSetupModeToLocal(false);
    saveTurnNumberToLocal(1);
    alert('游戏正式开始！第一回合');
  },

  enterSetupMode: () => {
    set({ isSetupMode: true });
    saveSetupModeToLocal(true);
    alert('已进入初设模式');
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
    alert('初设状态已保存');
  },

  resetToInitial: () => {
    const { initialSetupSnapshot } = get();
    
    if (!initialSetupSnapshot) {
      alert('没有找到保存的初设状态');
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
    alert('已重置到初设状态');
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
            startX: x, // Reset start position to new drop location
            startY: y, // Reset start position to new drop location
            zIndex: maxZIndex + 1,
            isActivated: false // Reset activation state
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
          startX: x, // Reset start position
          startY: y, // Reset start position
          zIndex: maxZIndex + 1,
          isActivated: false // Reset activation state
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

  addSubTokensToPool: (imageUrls) => {
    const { subTokenPool } = get();
    const newItems = imageUrls.map(url => ({
        id: `pool-sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: url
    }));
    const newPool = [...subTokenPool, ...newItems];
    set({ subTokenPool: newPool });
    saveSubTokenPoolToLocal(newPool);
  },

  setSubTokenPoolItemBackImage: (id, backImageUrl) => {
      const { subTokenPool } = get();
      const newPool = subTokenPool.map(t => 
        t.id === id ? { ...t, backImageUrl } : t
      );
      set({ subTokenPool: newPool });
      saveSubTokenPoolToLocal(newPool);
  },

  removeSubTokenFromPool: (id) => {
    const { subTokenPool } = get();
    const newPool = subTokenPool.filter((t) => t.id !== id);
    set({ subTokenPool: newPool });
    saveSubTokenPoolToLocal(newPool);
  },

  clearSubTokenPool: () => {
    set({ subTokenPool: [] });
    saveSubTokenPoolToLocal([]);
  },

  bindSubTokensToMain: (mainPoolId, subId) => {
      const { tokenPool } = get();
      const newPool = tokenPool.map(t => {
          if (t.id === mainPoolId) {
              return { ...t, splitBinding: subId };
          }
          return t;
      });
      set({ tokenPool: newPool });
      saveTokenPoolToLocal(newPool);
  },

  bindSubTokenToMapItem: (itemId, subId) => {
      const { items } = get();
      const newItems = items.map(t => {
          if (t.id === itemId) {
              return { ...t, splitBinding: subId };
          }
          return t;
      });
      set({ items: newItems });
      saveItemsToLocal(newItems);
  },

  // Map Actions

  splitMapItem: (id) => {
      const { items, tokenPool, subTokenPool } = get();
      const item = items.find(t => t.id === id);
      console.log('Split DEBUG - Instance item:', item);
      
      if (!item) {
          console.log('Split FAILED - Item not found');
          return;
      }

      // If we already have the splitBinding ID on the item, use it to find the template
      let subTemplate = null;
      if (item.splitBinding) {
          console.log('Split DEBUG - Using splitBinding from item:', item.splitBinding);
          subTemplate = subTokenPool.find(s => s.id === item.splitBinding);
      }

      // Fallback: If no template found yet, try finding via basePoolId (original logic)
      if (!subTemplate && item.basePoolId) {
          console.log('Split DEBUG - Falling back to basePoolId lookup:', item.basePoolId);
          const baseItem = tokenPool.find(p => p.id === item.basePoolId);
          if (baseItem && baseItem.splitBinding) {
              subTemplate = subTokenPool.find(s => s.id === baseItem.splitBinding);
          }
      }

      if (!subTemplate) {
          console.log('Split FAILED - Could not find sub-token template in subTokenPool. Template ID might be missing or pool was cleared.');
          return;
      }

      console.log('Split SUCCESS - Found template:', subTemplate.id);
      // Remove parent
      const newItemsFilter = items.filter(t => t.id !== id);
      
      const maxZ = items.reduce((max, t) => Math.max(max, t.zIndex), 0);
      
      const sub1Instance: MapItem = {
          id: `item-sub-1-${Date.now()}`,
          imageUrl: subTemplate.imageUrl,
          backImageUrl: subTemplate.backImageUrl,
          x: item.x - 5,
          y: item.y - 5,
          scaleX: item.scaleX,
          scaleY: item.scaleY,
          zIndex: maxZ + 1,
          itemType: 'token',
          isSubToken: true,
          parentInstanceId: id,
          basePoolId: subTemplate.id,
          parentBasePoolId: item.basePoolId, // Keep record of who the original parent template was
          parentImageUrl: item.imageUrl, // Store parent image for standalone merge
          parentBackImageUrl: item.backImageUrl // Store parent back image for standalone merge
      };

      const sub2Instance: MapItem = {
          id: `item-sub-2-${Date.now()}`,
          imageUrl: subTemplate.imageUrl,
          backImageUrl: subTemplate.backImageUrl,
          x: item.x + 5,
          y: item.y + 5,
          scaleX: item.scaleX,
          scaleY: item.scaleY,
          zIndex: maxZ + 2,
          itemType: 'token',
          isSubToken: true,
          parentInstanceId: id,
          basePoolId: subTemplate.id,
          parentBasePoolId: item.basePoolId, // Keep record of who the original parent template was
          parentImageUrl: item.imageUrl, // Store parent image for standalone merge
          parentBackImageUrl: item.backImageUrl // Store parent back image for standalone merge
      };

      const finalItems = [...newItemsFilter, sub1Instance, sub2Instance];
      set({ items: finalItems });
      saveItemsToLocal(finalItems);
  },

  mergeMapItems: (idA, idB) => {
      const { items, tokenPool } = get();
      const itemA = items.find(t => t.id === idA);
      const itemB = items.find(t => t.id === idB);

      console.log('Merge DEBUG - Items:', { itemA, itemB });

      if (!itemA || !itemB || !itemA.isSubToken || !itemB.isSubToken) {
          console.log('Merge FAILED - Not sub-tokens or items not found');
          return;
      }
      
      // Allow merge if they have the same parentInstanceId OR if they share the same base template
      // This makes it more robust if parentInstanceId is lost or inconsistent
      const isSameParent = itemA.parentInstanceId === itemB.parentInstanceId;
      const isSameTemplate = itemA.basePoolId === itemB.basePoolId;
      
      if (!isSameTemplate) {
          console.log('Merge FAILED - Items are not the same sub-token type (basePoolId mismatch)');
          return;
      }

      // Find original parent pool item
      // We look for a main token template that has this sub-token as its splitBinding
      // OR if the item was restored before and has a basePoolId record
      const mainPoolItem = tokenPool.find(p => p.splitBinding === itemA.basePoolId || (itemA.parentBasePoolId && p.id === itemA.parentBasePoolId));
      console.log('Merge DEBUG - Parent Template found from pool:', mainPoolItem);

      // Determine images to use: Prefer live pool item, fallback to cached images on sub-token
      const imageUrl = mainPoolItem ? mainPoolItem.imageUrl : itemA.parentImageUrl;
      const backImageUrl = mainPoolItem ? mainPoolItem.backImageUrl : itemA.parentBackImageUrl;

      if (!imageUrl) {
          console.log('Merge FAILED - No parent image available (pool item deleted and no cached image)');
          return;
      }

      // Remove sub-tokens
      const newItemsFilter = items.filter(t => t.id !== idA && t.id !== idB);
      
      const maxZ = items.reduce((max, t) => Math.max(max, t.zIndex), 0);
      
      const restoredItem: MapItem = {
          id: itemA.parentInstanceId || `item-restored-${Date.now()}`,
          imageUrl: imageUrl,
          backImageUrl: backImageUrl,
          x: (itemA.x + itemB.x) / 2,
          y: (itemA.y + itemB.y) / 2,
          scaleX: itemA.scaleX,
          scaleY: itemA.scaleY,
          zIndex: maxZ + 1,
          itemType: 'token',
          basePoolId: mainPoolItem ? mainPoolItem.id : itemA.parentBasePoolId,
          splitBinding: itemA.basePoolId // Re-inject the binding
      };

      console.log('Merge SUCCESS - Restoring parent:', restoredItem.id);
      const finalItems = [...newItemsFilter, restoredItem];
      set({ items: finalItems });
      saveItemsToLocal(finalItems);
  },

  setItemBackImage: (id, backImageUrl) => {
    const { items } = get();
    const newItems = items.map(t => 
        t.id === id ? { ...t, backImageUrl } : t
    );
    set({ items: newItems });
    saveItemsToLocal(newItems);
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

      const storedSubTokenPool = await localforage.getItem<PoolItem[]>('wargame_sub_token_pool');
      if (storedSubTokenPool && Array.isArray(storedSubTokenPool)) {
        set({ subTokenPool: storedSubTokenPool });
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

      const storedSetupMode = await localforage.getItem<boolean>('wargame_setup_mode');
      if (typeof storedSetupMode === 'boolean') {
        set({ isSetupMode: storedSetupMode });
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