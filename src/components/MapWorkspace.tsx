import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Group, Circle, Line, Text, Arrow } from 'react-konva';
import Konva from 'konva';
import { useTokenStore, MapItem } from '../stores/useTokenStore';
import ZoneDialog from './ZoneDialog';

// Global image cache to prevent redundant loading and decoding
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Custom hook to manage image loading with a global cache.
 * Returns the HTMLImageElement once loaded.
 */
const useCachedImage = (url: string, crossOrigin: 'anonymous' | undefined = 'anonymous') => {
  const [image, setImage] = useState<HTMLImageElement | undefined>(imageCache.get(url));

  useEffect(() => {
    if (!url) {
      setImage(undefined);
      return;
    }

    // Check cache first
    const cached = imageCache.get(url);
    if (cached) {
      setImage(cached);
      return;
    }

    // Start loading if not in cache
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.src = url;
    
    const handleLoad = () => {
      imageCache.set(url, img);
      setImage(img);
    };

    img.addEventListener('load', handleLoad);
    return () => {
      img.removeEventListener('load', handleLoad);
    };
  }, [url, crossOrigin]);

  return [image];
};

// Custom comparison function for React.memo
const areItemPropsEqual = (prevProps: any, nextProps: any) => {
  // Check if component's own simple props changed
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  
  // Define deep comparison for the item object
  const p = prevProps.item;
  const n = nextProps.item;

  return (
    p.id === n.id &&
    p.x === n.x &&
    p.y === n.y &&
    p.scaleX === n.scaleX &&
    p.scaleY === n.scaleY &&
    p.imageUrl === n.imageUrl &&
    p.backImageUrl === n.backImageUrl &&
    p.isFlipped === n.isFlipped &&
    p.isActivated === n.isActivated &&
    p.itemType === n.itemType &&
    p.zIndex === n.zIndex &&
    p.splitBinding === n.splitBinding &&
    p.parentInstanceId === n.parentInstanceId &&
    p.isSubToken === n.isSubToken
  );
};

// Sub-component for individual Map Item (Token or Table)
const MapItemImageComponent: React.FC<{ 
  item: MapItem; 
  isSelected: boolean; 
  onSelect: (id: string) => void; 
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>, id: string) => void;
  onHover: (id: string | null) => void;
}> = ({ item, isSelected, onSelect, onContextMenu, onHover }) => {
  const imageUrl = (item.isFlipped && item.backImageUrl) ? item.backImageUrl : (item.imageUrl || '');
  const [image] = useCachedImage(imageUrl, 'anonymous');
  
  const updateItemPosition = useTokenStore((state) => state.updateItemPosition);
  const updateItemScale = useTokenStore((state) => state.updateItemScale);
  const bringToFront = useTokenStore((state) => state.bringToFront);
  const flipItem = useTokenStore((state) => state.flipItem);
  const moveTokenToZone = useTokenStore((state) => state.moveTokenToZone);
  const deleteToken = useTokenStore((state) => state.deleteToken);
  const cloneToken = useTokenStore((state) => state.cloneToken);
  const splitMapItem = useTokenStore((state) => state.splitMapItem);
  const setItemBackImage = useTokenStore((state) => state.setItemBackImage);
  const globalTokenScale = useTokenStore((state) => state.globalTokenScale);
  const getStackedTokenIds = useTokenStore((state) => state.getStackedTokenIds);
  const updateMarkerSizeInPool = useTokenStore((state) => state.updateMarkerSizeInPool);
  const toggleTokenActivation = useTokenStore((state) => state.toggleTokenActivation);
  const isSetupMode = useTokenStore((state) => state.isSetupMode);
  
  // Use Group Ref (since we wrap everything in group)
  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  
  // Ref to store initial positions of stacked tokens during drag
  const stackedPositionsRef = useRef<Record<string, {x: number, y: number}>>({});
  const initialPointerRef = useRef<{x: number, y: number} | null>(null);

  // Effect to attach transformer to image
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      // Attach nodes
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Determine scale and size
  // Tokens use global scale, EXCEPT markers which use individual scale
  const scaleX = (item.itemType === 'token' && !item.isMarker) ? globalTokenScale : item.scaleX;
  const scaleY = (item.itemType === 'token' && !item.isMarker) ? globalTokenScale : item.scaleY;

  // Render size: Tokens are fixed 100x100 base, Tables are native size
  const width = item.itemType === 'token' ? 100 : (image?.width || 100);
  const height = item.itemType === 'token' ? 100 : (image?.height || 100);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCurrentPos, setDragCurrentPos] = useState({ x: item.x, y: item.y });
  const isActive = item.isActivated;
  const effectiveScaleX = (isHovered || isDragging) ? scaleX * 1.1 : scaleX;
  const effectiveScaleY = (isHovered || isDragging) ? scaleY * 1.1 : scaleY;

  // Calculate start position from center
  const startX = (item.startX ?? item.x) + (width * scaleX) / 2;
  const startY = (item.startY ?? item.y) + (height * scaleY) / 2;
  const currentCenterX = dragCurrentPos.x + (width * scaleX) / 2;
  const currentCenterY = dragCurrentPos.y + (height * scaleY) / 2;

  const hasMoved = !isSetupMode && Math.sqrt(Math.pow(currentCenterX - startX, 2) + Math.pow(currentCenterY - startY, 2)) > 10;

  // Generate a random curvature for this movement session
  const randomCurvatureRef = useRef((Math.random() - 0.5) * 100); 
  
  // Update curvature only when starting a new move (or entering a move state)
  useEffect(() => {
    if (isDragging) {
      // Small random offset for the control point to create organic curvature
      randomCurvatureRef.current = (Math.random() - 0.5) * 80;
    }
  }, [isDragging]);

  // Calculate the interception point at the edge of the token's square boundary
  const getInterceptionPoint = () => {
    const dx = currentCenterX - startX;
    const dy = currentCenterY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx < 5 || absDy < 5) return { x: startX, y: startY };

    // Standard half-size of token (100 * scale / 2)
    const halfSize = (50 * scaleX); 
    
    // Scale based on which side it hits first
    const scale = Math.min(halfSize / absDx, halfSize / absDy);
    
    return {
      x: currentCenterX - dx * scale,
      y: currentCenterY - dy * scale
    };
  };

  const interception = getInterceptionPoint();

  // Create points for a quadratic curve: [start, midpoint+offset, end]
  const curvePoints = useMemo(() => {
    if (!hasMoved) return [startX, startY, startX, startY];
    
    // Midpoint
    const midX = (startX + interception.x) / 2;
    const midY = (startY + interception.y) / 2;

    // Normal vector for offset (perpendicular to direction)
    const dx = interception.x - startX;
    const dy = interception.y - startY;
    const len = Math.sqrt(dx*dx + dy*dy);
    
    // Offset the midpoint by the random curvature amount
    const offsetX = (-dy / len) * randomCurvatureRef.current;
    const offsetY = (dx / len) * randomCurvatureRef.current;

    return [startX, startY, midX + offsetX, midY + offsetY, interception.x, interception.y];
  }, [startX, startY, interception.x, interception.y, hasMoved]);

  useEffect(() => {
    // Keep internal drag pos in sync with item x/y when not dragging
    if (!isDragging) {
      setDragCurrentPos({ x: item.x, y: item.y });
    }
  }, [item.x, item.y, isDragging]);

  useEffect(() => {
    // Sync scale smoothly if not interacting
    if (!isHovered && !isDragging && shapeRef.current) {
        shapeRef.current.to({
            scaleX: scaleX,
            scaleY: scaleY,
            duration: 0.1
        });
    }
  }, [scaleX, scaleY, isHovered, isDragging]);

  return (
    <>
      {/* Movement Arrow Segment - Quadratic Curve to Edge */}
      {!isSetupMode && hasMoved && (
          <Arrow
            points={curvePoints}
            stroke="#ef4444"
            strokeWidth={4}
            opacity={isDragging ? 0.6 : 0.8}
            pointerLength={12}
            pointerWidth={12}
            lineCap="round"
            lineJoin="round"
            dash={[8, 4]} 
            tension={0.5} // Allow smooth curve through mid-point
            shadowColor="black"
            shadowBlur={2}
            shadowOpacity={0.5}
          />
      )}
      {/* Snapshot of movement distance while hovering/dragging */}
      {!isSetupMode && (isHovered || isDragging) && hasMoved && (
          <Group x={currentCenterX} y={currentCenterY - 40}>
            <Circle radius={18} fill="black" opacity={0.6} stroke="white" strokeWidth={1} />
            <Text 
               text={Math.round(Math.sqrt(Math.pow(currentCenterX - startX, 2) + Math.pow(currentCenterY - startY, 2)) / 5).toString()} 
               fontSize={12}
               fill="white"
               fontStyle="bold"
               align="center"
               width={36}
               x={-18}
               y={-6}
            />
          </Group>
      )}

      <Group
        ref={shapeRef}
        x={item.x}
        y={item.y}
        // Use declarative scale based on state to prevent shrinking during drags
        scaleX={effectiveScaleX} 
        scaleY={effectiveScaleY}
        draggable
        onDragStart={(e) => {
          e.cancelBubble = true;
          onSelect(item.id);
          bringToFront(item.id);
          setIsDragging(true);
          setDragCurrentPos({ x: e.target.x(), y: e.target.y() });
          
          // Allow splitting stack with Shift key
          if (e.evt.shiftKey) {
             stackedPositionsRef.current = {};
             initialPointerRef.current = null;
             return;
          }

          const stage = e.target.getStage();
          const layer = stage?.findOne('Layer');
          
          if (!stage || !layer) return;

          // Handle Stacked Tokens
          const stackedIds = getStackedTokenIds(item.id);
          
          if (stackedIds.length > 1) {
              const initialPosMap: Record<string, {x: number, y: number}> = {};
              
              stackedIds.forEach(id => {
                  const node = stage.findOne('#' + id);
                  if (node) {
                     initialPosMap[id] = { x: node.x(), y: node.y() };
                     // Bring visual node to front too
                     node.moveToTop();
                  }
              });
              
              stackedPositionsRef.current = initialPosMap;
              initialPointerRef.current = { x: e.target.x(), y: e.target.y() };
          } else {
             stackedPositionsRef.current = {};
             initialPointerRef.current = null;
          }
        }}
        onDragMove={(e) => {
             e.cancelBubble = true;
             setDragCurrentPos({ x: e.target.x(), y: e.target.y() });
             
             // Sync Move Stack
             if (initialPointerRef.current && Object.keys(stackedPositionsRef.current).length > 1) {
                 const dx = e.target.x() - initialPointerRef.current.x;
                 const dy = e.target.y() - initialPointerRef.current.y;
                 
                 const stage = e.target.getStage();
                 if (stage) {
                     Object.entries(stackedPositionsRef.current).forEach(([id, initialPos]) => {
                         if (id === item.id) return; // Skip leader
                         
                         const node = stage.findOne('#' + id);
                         if (node) {
                             node.x(initialPos.x + dx);
                             node.y(initialPos.y + dy);
                         }
                     });
                 }
             }
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          setDragCurrentPos({ x: e.target.x(), y: e.target.y() });
          
          const stage = e.target.getStage();
          const stackedKeys = Object.keys(stackedPositionsRef.current);
          const isStack = stackedKeys.length > 1;

          if (stage) {
              const { clientX, clientY } = e.evt;
              const elements = document.elementsFromPoint(clientX, clientY);
              const zoneElement = elements.find(el => (el as HTMLElement).dataset?.zoneType);
              
              if (zoneElement) {
                  const type = (zoneElement as HTMLElement).dataset.zoneType as 'graveyard' | 'bag';
                  const zoneId = (zoneElement as HTMLElement).dataset.zoneId;
                  
                  if (type && zoneId) {
                      // Move ALL stacked tokens
                      const idsToMove = isStack ? stackedKeys : [item.id];
                      idsToMove.forEach(id => moveTokenToZone(id, type, zoneId));
                      
                      // Cleanup
                      stackedPositionsRef.current = {};
                      initialPointerRef.current = null;
                      return; 
                  }
              }
          }

          // Update All Positions
          if (isStack) {
              stackedKeys.forEach(id => {
                  const node = stage?.findOne('#' + id);
                  if (node) {
                      updateItemPosition(id, node.x(), node.y());
                  }
              });
          } else {
             updateItemPosition(item.id, e.target.x(), e.target.y());
          }
          
          stackedPositionsRef.current = {};
          initialPointerRef.current = null;
          setIsDragging(false);
        }}
        id={item.id} // Critical for findOne to work
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(item.id);
          bringToFront(item.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(item.id);
          bringToFront(item.id);
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          if (item.itemType === 'token' && item.backImageUrl) {
            flipItem(item.id);
          }
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          e.cancelBubble = true;
          onContextMenu(e, item.id);
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (node) {
            updateItemScale(item.id, node.scaleX(), node.scaleY());
          }
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'pointer';
          
          bringToFront(item.id);
          setIsHovered(true);
          onHover(item.id);
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
          setIsHovered(false);
          onHover(null);
        }}
      >
        <KonvaImage
            image={image}
            width={width}
            height={height}
            // Visual Enhancements
            opacity={isActive ? 0.6 : 1}
            stroke={isActive ? "#4b5563" : ((isHovered || isDragging) ? (hasMoved ? "#ef4444" : "#ffff00") : (hasMoved ? "#ef4444" : "white"))}
            strokeWidth={isActive ? 3 : ((isHovered || isDragging) ? 5 : 3)}
            shadowColor={hasMoved ? "#ef4444" : "black"}
            shadowBlur={(isHovered || isDragging) ? 20 : 10}
            shadowOffset={(isHovered || isDragging) ? { x: 8, y: 8 } : { x: 5, y: 5 }}
            shadowOpacity={hasMoved ? 0.8 : 0.6}
            // imageSmoothingEnabled={false} // Uncomment for pixel art style
        />
        {hasMoved && !isActive && (
            <Text 
                text="MV"
                x={5}
                y={5}
                fontSize={12}
                fontStyle="bold"
                fill="white"
                shadowColor="black"
                shadowBlur={2}
                padding={2}
                fillAfterStrokeEnabled
            />
        )}
        {isActive && (
            <Circle 
                x={width - 8}
                y={height - 8}
                radius={6}
                fill="#f97316" // Orange
                stroke="white"
                strokeWidth={2}
            />
        )}
      </Group>

      {isSelected && item.itemType === 'table' && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

const MapItemImage = React.memo(MapItemImageComponent, areItemPropsEqual);

interface MapWorkspaceProps {
  mapBase64: string | null;
}

const MapWorkspace: React.FC<MapWorkspaceProps> = ({ mapBase64 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Stage state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Dialog state
  const [activeZone, setActiveZone] = useState<{ 
      type: 'graveyard' | 'bag'; 
      id: string; 
      name: string 
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
      visible: boolean;
      x: number;
      y: number;
      tokenId: string | null;
  }>({ visible: false, x: 0, y: 0, tokenId: null });

  const [subTokenSelector, setSubTokenSelector] = useState<{
      visible: boolean;
      tokenId: string | null;
  }>({ visible: false, tokenId: null });

  const [image] = useCachedImage(mapBase64 || '', "anonymous");

  // Store
  const items = useTokenStore((state) => state.items);
  const subTokenPool = useTokenStore((state) => state.subTokenPool);
  const graveyards = useTokenStore((state) => state.graveyards);
  const drawBags = useTokenStore((state) => state.drawBags);
  const loadItems = useTokenStore((state) => state.loadItems);
  const addItem = useTokenStore((state) => state.addItem);
  const deleteToken = useTokenStore((state) => state.deleteToken);
  const cloneToken = useTokenStore((state) => state.cloneToken);
  const splitMapItem = useTokenStore((state) => state.splitMapItem);
  const mergeMapItems = useTokenStore((state) => state.mergeMapItems);
  const bindSubTokenToMapItem = useTokenStore((state) => state.bindSubTokenToMapItem);
  const setItemBackImage = useTokenStore((state) => state.setItemBackImage);
  const toggleTokenActivation = useTokenStore((state) => state.toggleTokenActivation);
  const restoreTokenToMap = useTokenStore((state) => state.restoreTokenToMap);
  const drawRandomToken = useTokenStore((state) => state.drawRandomToken);
  const globalTokenScale = useTokenStore((state) => state.globalTokenScale); 
  const addDrawBag = useTokenStore((state) => state.addDrawBag);
  const removeDrawBag = useTokenStore((state) => state.removeDrawBag);
  const renameDrawBag = useTokenStore((state) => state.renameDrawBag);
  const addTokensToDrawBag = useTokenStore((state) => state.addTokensToDrawBag); 

  // Helpers for dialog
  const activeZoneTokens = useMemo(() => {
      if (!activeZone) return [];
      if (activeZone.type === 'graveyard') {
          return graveyards.find(g => g.id === activeZone.id)?.tokens || [];
      } else {
          return drawBags.find(b => b.id === activeZone.id)?.tokens || [];
      }
  }, [activeZone, graveyards, drawBags]);

  const getMapCenter = () => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const stage = stageRef.current;
    
    // Calculate center of view in stage coordinates
    // Viewport center relative to stage:
    const viewportCenterX = -stage.x() + stage.width() / 2;
    const viewportCenterY = -stage.y() + stage.height() / 2;

    // Convert to unscaled coordinates
    return {
        x: viewportCenterX / stage.scaleX(),
        y: viewportCenterY / stage.scaleY()
    };
  };

  // Sort items by zIndex
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.zIndex - b.zIndex);
  }, [items]);

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredTokenId(id);
  }, []);

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Deselect if clicked on empty stage or explicitly on background image
    const clickedOnStage = e.target === e.target.getStage();
    setSelectedId(null);
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleItemContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent | MouseEvent>, id: string) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Position menu at pointer coordinates relative to top-level window
    // (since our menu is fixed absolute)
    const pos = stage.getPointerPosition();
    if (pos) {
      const containerRect = stage.container().getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: pos.x + containerRect.left,
        y: pos.y + containerRect.top,
        tokenId: id
      });
    }
  }, [contextMenu]);

  // Close menu on click outside
  useEffect(() => {
    const handleGlobalClick = () => {
        if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu.visible]);

  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (hoveredTokenId) {
        // Delete: Delete or Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteToken(hoveredTokenId);
          setHoveredTokenId(null);
        }
        
        // Clone: Ctrl+V or Cmd+V while hovering (treating V as duplicate)
        // Or traditional Ctrl+C/V logic - but here we simplify to "V" while hovering for instant duplication
        if (e.key.toLowerCase() === 'v' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          cloneToken(hoveredTokenId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredTokenId, deleteToken, cloneToken]);

  // Handle resizing of the container
  useLayoutEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update initial scale/position when image loads or dimensions change
  useEffect(() => {
    if (image && size.width > 0 && size.height > 0) {
      const scaleW = size.width / image.width;
      const scaleH = size.height / image.height;
      const newScale = Math.min(scaleW, scaleH) * 0.9; // Margin
      
      setScale(newScale);
      setPosition({
        x: (size.width - image.width * newScale) / 2,
        y: (size.height - image.height * newScale) / 2,
      });
    }
  }, [image, size.width, size.height]);


  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
  };

  const handleUploadToBag = async (bagId: string, tokens: { front: File; back?: File }[]) => {
      const readFile = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
          });
      };

      try {
          const uploadPromises = tokens.map(async (token) => {
              const imageUrl = await readFile(token.front);
              let backImageUrl: string | undefined = undefined;
              if (token.back) {
                  backImageUrl = await readFile(token.back);
              }
              return {
                  imageUrl,
                  backImageUrl
              };
          });

          const newTokens = await Promise.all(uploadPromises);
          addTokensToDrawBag(bagId, newTokens);
      } catch (error) {
          console.error("Failed to upload tokens:", error);
          alert("上传失败，请重试");
      }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Parse the data
    const itemDataCombined = e.dataTransfer.getData('wargame-item');
    // Fallback?
    const legacyUrl = e.dataTransfer.getData('token-image');
    
    if (!itemDataCombined && !legacyUrl) return;

    // Check for standard drop or restore drop
    let imageUrl = '';
    let backImageUrl: string | undefined = undefined;
    let itemType: MapItemType = 'token';
    let action = 'create';
    let restoreTokenId = '';
    let restoreZoneType = '';
    let restoreZoneId = '';
    let initialItemScale = 1;
    let isMarker = false;

    if (itemDataCombined) {
      try {
        const parsed = JSON.parse(itemDataCombined);
        
        if (parsed.action === 'restore') {
            action = 'restore';
            restoreTokenId = parsed.tokenId;
            restoreZoneType = parsed.zoneType;
            restoreZoneId = parsed.zoneId;
            itemType = parsed.itemType || 'token';
            imageUrl = 'restore-placeholder'; // Ensure we enter the 'if' block below
        } else if (parsed.type === 'marker') {
            imageUrl = parsed.src;
            itemType = 'token'; // Markers are handled as small tokens
            initialItemScale = parsed.defaultScale || 0.8; // Use custom scale for markers
            isMarker = true;
        } else {
            imageUrl = parsed.src;
            itemType = parsed.type;
            backImageUrl = parsed.backSrc;
        }
      } catch (e) {
        console.error("Failed to parse drop data");
      }
    } else {
      imageUrl = legacyUrl;
    }

    if (stageRef.current) {
      const stage = stageRef.current;
      const containerRect = stage.container().getBoundingClientRect();
      const pointerX = e.clientX - containerRect.left;
      const pointerY = e.clientY - containerRect.top;

      const x = (pointerX - stage.x()) / stage.scaleX();
      const y = (pointerY - stage.y()) / stage.scaleY();

      // Center offset? 
      // For token/marker: 100x100 -> offset 50.
      const offset = (itemType === 'token') ? 50 : 0; 
      
      const parsedData = itemDataCombined ? JSON.parse(itemDataCombined) : {};
      const fromPool = parsedData.fromPool;
      const poolItemId = parsedData.id;


    // Crucial: Handle restoration from zone
    if (action === 'restore') {
          restoreTokenToMap(restoreTokenId, restoreZoneType as 'graveyard' | 'bag', restoreZoneId, x - offset, y - offset);
          
      } else if (imageUrl) {
         // Create New Item from Pool
         addItem({
            imageUrl,
            backImageUrl,
            itemType,
            x: x - offset,
            y: y - offset,
            scaleX: initialItemScale,
            scaleY: initialItemScale,
            isMarker,
            basePoolId: poolItemId,
            splitBinding: parsedData.splitBinding
         });

         // If it came from the pool, remove it now that it's on the map
         if (fromPool && poolItemId) {
             if (itemType === 'token') {
                useTokenStore.getState().removeTokenFromPool(poolItemId);
             } else if (itemType === 'table') {
                useTokenStore.getState().removeTableFromPool(poolItemId);
             }
         }
      }
      
      stage.setPointersPositions(e);
    }
  };

  return (
    <div 
      className="flex-1 h-full bg-gray-800 relative overflow-hidden flex flex-col" 
      ref={containerRef}
    >
        {/* RIGHT OVERLAY: Graveyards & Draw Bags */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-4 pointer-events-none">
            {/* Graveyards List */}
            <div className="flex flex-col gap-2">
                {graveyards.map((zone, index) => (
                    <div 
                        key={zone.id}
                        data-zone-type="graveyard"
                        data-zone-id={zone.id}
                        onClick={() => setActiveZone({ type: 'graveyard', id: zone.id, name: zone.name })}
                        className={`w-32 h-20 ${index % 2 === 0 ? 'bg-red-900/80 hover:bg-red-800/90 border-red-500/50' : 'bg-blue-900/80 hover:bg-blue-800/90 border-blue-500/50'} border-2 backdrop-blur-sm rounded-lg p-2 pointer-events-auto transition-all flex flex-col items-center justify-center text-white shadow-lg cursor-pointer transform hover:scale-105`}
                    >
                        <span className={`text-xs font-bold ${index % 2 === 0 ? 'text-red-200' : 'text-blue-200'} uppercase tracking-wider mb-1`}>{zone.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">💀</span>
                            <span className="text-xl font-mono">{zone.tokens.length}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Draw Bags List */}
            <div className="flex flex-col gap-2 mt-4">
                 {drawBags.map(zone => (
                    <div 
                        key={zone.id}
                        data-zone-type="bag"
                        data-zone-id={zone.id}
                        onClick={() => setActiveZone({ type: 'bag', id: zone.id, name: zone.name })}
                        className="w-32 h-20 bg-indigo-900/80 hover:bg-indigo-800/90 border-2 border-indigo-500/50 backdrop-blur-sm rounded-lg p-2 pointer-events-auto transition-all flex flex-col items-center justify-center text-white shadow-lg cursor-pointer transform hover:scale-105"
                    >
                        <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">{zone.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🛍️</span>
                            <span className="text-xl font-mono">{zone.tokens.length}</span>
                        </div>
                    </div>
                ))}

                {/* Add Bag Button */}
                <button
                    onClick={() => {
                        const name = prompt('请输入新抽签袋名称:', '新抽签袋');
                        if (name) addDrawBag(name);
                    }}
                    className="w-32 h-10 bg-gray-700/80 hover:bg-gray-600/90 border-2 border-gray-500/50 backdrop-blur-sm rounded-lg pointer-events-auto transition-all flex items-center justify-center text-white shadow-lg cursor-pointer transform hover:scale-105"
                    title="新建抽签袋"
                >
                    <span className="text-2xl font-bold text-green-400">+</span>
                </button>
            </div>
        </div>
        
        {/* Zone Dialog */}
        {activeZone && (
            <ZoneDialog 
                isOpen={!!activeZone}
                onClose={() => setActiveZone(null)}
                zoneType={activeZone.type}
                zoneId={activeZone.id}
                zoneName={
                    activeZone.type === 'graveyard' 
                    ? (graveyards.find(g => g.id === activeZone.id)?.name || activeZone.name)
                    : (drawBags.find(b => b.id === activeZone.id)?.name || activeZone.name)
                }
                tokens={activeZoneTokens}
                onRestore={(tokenId) => {
                    const { x, y } = getMapCenter();
                    const offsetX = (Math.random() - 0.5) * 50;
                    const offsetY = (Math.random() - 0.5) * 50;
                    restoreTokenToMap(tokenId, activeZone.type, activeZone.id, x + offsetX, y + offsetY);
                }}
                onDrawRandom={() => {
                   const { x, y } = getMapCenter();
                   drawRandomToken(activeZone.id, x, y);
                }}
                onRename={renameDrawBag}
                onDelete={(id) => {
                    removeDrawBag(id);
                    setActiveZone(null);
                }}
                onUploadTokens={handleUploadToBag}
            />
        )}

      <div 
        className="flex-1 overflow-hidden relative bg-gray-900/50"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
      >
        {!mapBase64 ? (
          <div className="flex items-center justify-center h-full text-gray-500 select-none">
            <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-xl">
              <p className="text-lg mb-2">地图工作区</p>
              <p className="text-sm opacity-70">在此处绘制/渲染地图</p>
            </div>
          </div>
        ) : (
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            draggable
            onWheel={handleWheel}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            onDragEnd={(e) => {
                // Ensure we only pan if the stage itself was dragged
                if (e.target === e.target.getStage()) {
                    setPosition({ x: e.target.x(), y: e.target.y() });
                }
            }}
            onClick={checkDeselect}
            onTap={checkDeselect}
          >
            <Layer>
              {image && (
                <KonvaImage image={image} listening={false} />
              )}
              {/* Movement History Lines */}
              {items.map((item) => {
                 if (
                    item.isActivated &&
                    item.startX !== undefined &&
                    item.startY !== undefined &&
                    (item.startX !== item.x || item.startY !== item.y)
                  ) {
                    // Calculate center for tokens
                    const isToken = item.itemType === 'token';
                    // For tables, we default to top-left + small offset to avoid being strictly on edge
                    // For tokens, we try to hit center (50,50) * scale
                    const scaleX = isToken ? globalTokenScale : item.scaleX;
                    const scaleY = isToken ? globalTokenScale : item.scaleY;
                    
                    const offsetX = isToken ? 50 * scaleX : 0;
                    const offsetY = isToken ? 50 * scaleY : 0;

                    const startX = (item.startX || 0) + offsetX;
                    const startY = (item.startY || 0) + offsetY;
                    const endX = item.x + offsetX;
                    const endY = item.y + offsetY;
                    
                    return (
                        <Group key={`history-${item.id}`}>
                            <Line
                                points={[startX, startY, endX, endY]}
                                stroke="red" // Conspicuous red
                                strokeWidth={4}
                                dash={[15, 10]}
                                opacity={0.8}
                                listening={false}
                            />
                            {/* Visual indicator of previous position */}
                            <Circle 
                                x={startX}
                                y={startY}
                                radius={6}
                                fill="red"
                                opacity={0.8}
                                listening={false}
                            />
                        </Group>
                    );
                 }
                 return null;
              })}
              {sortedItems.map((item) => (
                <MapItemImage 
                  key={item.id} 
                  item={item} 
                  isSelected={item.id === selectedId}
                  onSelect={handleSelect}
                  onContextMenu={handleItemContextMenu}
                  onHover={handleHover}
                />
              ))}
            </Layer>
          </Stage>
        )}

        {/* Custom Context Menu */}
        {contextMenu.visible && (
            <div 
                className="fixed bg-gray-900 border border-gray-700 shadow-2xl rounded-lg py-1 z-[9999] min-w-[170px] overflow-hidden animate-in fade-in zoom-in duration-100"
                style={{ 
                    top: contextMenu.y, 
                    left: contextMenu.x,
                    pointerEvents: 'auto'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase font-bold tracking-widest border-b border-gray-800 mb-1">
                    算子操作
                </div>
                
                <button 
                    onClick={() => {
                        if (contextMenu.tokenId) cloneToken(contextMenu.tokenId);
                        setContextMenu({ ...contextMenu, visible: false });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 flex items-center gap-2 transition-colors duration-150"
                >
                    <span>👯</span> 克隆该算子
                </button>

                {(() => {
                    const selectedItem = items.find(i => i.id === contextMenu.tokenId);
                    if (!selectedItem || selectedItem.itemType !== 'token') return null;

                    // Check if it's a main token with binding
                    const hasBinding = selectedItem.splitBinding;
                    
                    // Check for merge possibility - Increased range to 100 pixels
                    const nearby = items.filter(i => 
                        i.id !== selectedItem.id && 
                        i.isSubToken && 
                        selectedItem.isSubToken && 
                        // Shared ancestry check (parentInstanceId or at least the same template)
                        (i.parentInstanceId === selectedItem.parentInstanceId || i.basePoolId === selectedItem.basePoolId) &&
                        Math.abs(i.x - selectedItem.x) < 100 &&
                        Math.abs(i.y - selectedItem.y) < 100
                    );

                    return (
                        <>
                            {hasBinding ? (
                                <button 
                                    onClick={() => {
                                        splitMapItem(selectedItem.id);
                                        setContextMenu({ ...contextMenu, visible: false });
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-600 hover:text-white flex items-center gap-2 transition-colors duration-150"
                                >
                                    <span>✂️</span> 拆分为子算子
                                </button>
                            ) : (
                                <button 
                                    onClick={() => {
                                        setSubTokenSelector({ visible: true, tokenId: selectedItem.id });
                                        setContextMenu({ ...contextMenu, visible: false });
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:bg-purple-600 hover:text-white flex items-center gap-2 transition-colors duration-150"
                                >
                                    <span>🔗</span> 绑定拆分算子
                                </button>
                            )}
                            
                            {nearby.length > 0 && (
                                <button 
                                    onClick={() => {
                                        mergeMapItems(selectedItem.id, nearby[0].id);
                                        setContextMenu({ ...contextMenu, visible: false });
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-green-600 hover:text-white flex items-center gap-2 transition-colors duration-150"
                                >
                                    <span>🧩</span> 合并为父算子
                                </button>
                            )}

                            <button 
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (re) => {
                                                const base64 = re.target?.result as string;
                                                setItemBackImage(selectedItem.id, base64);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    };
                                    input.click();
                                    setContextMenu({ ...contextMenu, visible: false });
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 flex items-center gap-2 transition-colors duration-150"
                            >
                                <span>🖼️</span> 设置该算子背面
                            </button>
                        </>
                    );
                })()}

                <button 
                    onClick={() => {
                        if (contextMenu.tokenId) {
                            if (window.confirm('确定要删除这个算子吗？')) {
                                deleteToken(contextMenu.tokenId);
                            }
                        }
                        setContextMenu({ ...contextMenu, visible: false });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors duration-150"
                >
                    <span>🗑️</span> 删除该算子
                </button>
                <div className="h-[1px] bg-gray-700 my-1"></div>
                <button 
                    onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-800 flex items-center gap-2 transition-colors duration-150"
                >
                    <span>❌</span> 取消操作
                </button>
            </div>
        )}

        {/* Sub-token Selector Dialog */}
        {subTokenSelector.visible && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                            <span>🔗</span> 为算子绑定拆分对象
                        </h3>
                        <button 
                            onClick={() => setSubTokenSelector({ visible: false, tokenId: null })}
                            className="text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto">
                        <p className="text-sm text-gray-400 mb-4">请选择一个子算库中的算子。绑定后，该算子可以被拆分为两个所选子算子。</p>
                        
                        <div className="grid grid-cols-4 gap-3">
                            {subTokenPool.map((token) => (
                                <button
                                    key={token.id}
                                    onClick={() => {
                                        if (subTokenSelector.tokenId) {
                                            bindSubTokenToMapItem(subTokenSelector.tokenId, token.id);
                                            setSubTokenSelector({ visible: false, tokenId: null });
                                            alert('绑定成功！现在可以右键拆分该算子了。');
                                        }
                                    }}
                                    className="aspect-square bg-gray-800 rounded border border-gray-600 overflow-hidden hover:border-purple-500 hover:shadow-lg transition-all p-1 group"
                                >
                                    <img 
                                        src={token.imageUrl} 
                                        alt="Sub Token" 
                                        className="w-full h-full object-contain"
                                    />
                                </button>
                            ))}
                            {subTokenPool.length === 0 && (
                                <div className="col-span-4 py-8 text-center text-gray-500 text-sm italic">
                                    子算子库为空，请先在侧边栏上传子算子。
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-gray-700 flex justify-end">
                        <button 
                            onClick={() => setSubTokenSelector({ visible: false, tokenId: null })}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MapWorkspace;
