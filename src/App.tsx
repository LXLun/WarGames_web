import React, { useRef, useState, useEffect } from 'react';
import { useMapStorage } from './hooks/useMapStorage';
import MapWorkspace from './components/MapWorkspace';
import DiceRoller from './components/DiceRoller';
import DiceAnimation from './components/DiceAnimation';
import { useTokenStore } from './stores/useTokenStore';

interface SidebarProps {
  onMapUpload: (file: File) => void;
  onMapClear: () => void;
  hasMap: boolean;
}

// Sidebar component with control buttons
const Sidebar: React.FC<SidebarProps> = ({ onMapUpload, onMapClear, hasMap }) => {
  const mapInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);
  const tokenBackInputRef = useRef<HTMLInputElement>(null);
  const subTokenInputRef = useRef<HTMLInputElement>(null);
  const subTokenBackInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [activeTokenIdForBackImage, setActiveTokenIdForBackImage] = React.useState<string | null>(null);
  const [activeSubTokenIdForBackImage, setActiveSubTokenIdForBackImage] = React.useState<string | null>(null);
  const [bindingModeParentId, setBindingModeParentId] = useState<string | null>(null);
  
  // Use store instead of local state
  const items = useTokenStore((state) => state.items);
  const graveyards = useTokenStore((state) => state.graveyards);
  const drawBags = useTokenStore((state) => state.drawBags);
  const tokenPool = useTokenStore((state) => state.tokenPool);
  const subTokenPool = useTokenStore((state) => state.subTokenPool);
  const tablePool = useTokenStore((state) => state.tablePool);
  const markerPool = useTokenStore((state) => state.markerPool);
  const globalTokenScale = useTokenStore((state) => state.globalTokenScale);
  const setGlobalTokenScale = useTokenStore((state) => state.setGlobalTokenScale);
  const turnNumber = useTokenStore((state) => state.turnNumber);
  const nextTurn = useTokenStore((state) => state.nextTurn);
  const isSetupMode = useTokenStore((state) => state.isSetupMode);
  const startGame = useTokenStore((state) => state.startGame);
  const enterSetupMode = useTokenStore((state) => state.enterSetupMode);
  const saveCurrentAsInitial = useTokenStore((state) => state.saveCurrentAsInitial);
  const resetToInitial = useTokenStore((state) => state.resetToInitial);
  const initialSetupSnapshot = useTokenStore((state) => state.initialSetupSnapshot);
  const importSetup = useTokenStore((state) => state.importSetup);
  
  const { mapBase64, saveMap } = useMapStorage();

  const handleExportSetup = () => {
    const setupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      map: mapBase64,
      items,
      graveyards,
      drawBags,
      tokenPool,
      subTokenPool,
      tablePool,
      markerPool,
      globalTokenScale,
      turnNumber
    };

    const blob = new Blob([JSON.stringify(setupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.href = url;
    link.download = `wargame_setup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSetup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // Basic Validation
        if (!data || typeof data !== 'object') {
          throw new Error('无效的配置文件格式');
        }

        if (window.confirm('导入配置将覆盖当前所有进度，确定继续吗？')) {
          // 1. Update Map first
          if (data.map) {
            // Re-use map upload logic
            const response = await fetch(data.map);
            const blob = await response.blob();
            const mapFile = new File([blob], "imported_map.png", { type: blob.type });
            onMapUpload(mapFile);
          }

          // 2. Update all other storage items
          importSetup(data);
          alert('配置导入成功！');
        }
      } catch (err) {
        console.error('Import failed:', err);
        alert('导入失败: ' + (err instanceof Error ? err.message : '未知错误'));
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const addTokensToPool = useTokenStore((state) => state.addTokensToPool);
  const clearTokenPool = useTokenStore((state) => state.clearTokenPool);
  const setTokenPoolItemBackImage = useTokenStore((state) => state.setTokenPoolItemBackImage);
  const removeTokenFromPool = useTokenStore((state) => state.removeTokenFromPool);
  
  const addSubTokensToPool = useTokenStore((state) => state.addSubTokensToPool);
  const clearSubTokenPool = useTokenStore((state) => state.clearSubTokenPool);
  const setSubTokenPoolItemBackImage = useTokenStore((state) => state.setSubTokenPoolItemBackImage);
  const removeSubTokenFromPool = useTokenStore((state) => state.removeSubTokenFromPool);
  const bindSubTokensToMain = useTokenStore((state) => state.bindSubTokensToMain);

  const addMarkersToPool = useTokenStore((state) => state.addMarkersToPool);
  const updateMarkerSizeInPool = useTokenStore((state) => state.updateMarkerSizeInPool);
  const clearMarkerPool = useTokenStore((state) => state.clearMarkerPool);
  const removeMarkerFromPool = useTokenStore((state) => state.removeMarkerFromPool);
  const addTablesToPool = useTokenStore((state) => state.addTablesToPool);
  const clearTablePool = useTokenStore((state) => state.clearTablePool);
  const removeTableFromPool = useTokenStore((state) => state.removeTableFromPool);

  const handleMapUploadClick = () => {
    mapInputRef.current?.click();
  };

  const handleTokenUploadClick = () => {
    tokenInputRef.current?.click();
  };

  const handleSubTokenUploadClick = () => {
    subTokenInputRef.current?.click();
  };

  const markerInputRef = useRef<HTMLInputElement>(null);
  const handleMarkerUploadClick = () => {
    markerInputRef.current?.click();
  };

  const handleTableUploadClick = () => {
    tableInputRef.current?.click();
  };

  const handleMapFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onMapUpload(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleFileProcessing = async (files: FileList | null, callback: (base64s: string[]) => void) => {
    if (!files || files.length === 0) return;
    
    const base64Promises: Promise<string>[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        base64Promises.push(promise);
      }
      
      try {
        const results = await Promise.all(base64Promises);
        callback(results);
      } catch (error) {
        console.error("Error reading files:", error);
      }
  };

  const handleTokenFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcessing(event.target.files, addTokensToPool);
    if (event.target) event.target.value = '';
  };

  const handleSubTokenFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcessing(event.target.files, addSubTokensToPool);
    if (event.target) event.target.value = '';
  };
  
  const handleMarkerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcessing(event.target.files, addMarkersToPool);
    if (event.target) event.target.value = '';
  };
  
  const handleTokenBackFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && activeTokenIdForBackImage) {
          try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            setTokenPoolItemBackImage(activeTokenIdForBackImage, base64);
          } catch (error) {
              console.error("Error reading back image:", error);
          }
      }
      setActiveTokenIdForBackImage(null);
      if (event.target) event.target.value = '';
  }

  const handleSubTokenBackFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && activeSubTokenIdForBackImage) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
          });
          setSubTokenPoolItemBackImage(activeSubTokenIdForBackImage, base64);
        } catch (error) {
            console.error("Error reading sub-token back image:", error);
        }
    }
    setActiveSubTokenIdForBackImage(null);
    if (event.target) event.target.value = '';
  }

  const handleTableFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcessing(event.target.files, addTablesToPool);
    if (event.target) event.target.value = '';
  };

  const handleDragStart = (e: React.DragEvent<HTMLImageElement>, id: string, src: string, type: 'token' | 'table' | 'sub-token', backSrc?: string, splitBinding?: string | null) => {
    e.dataTransfer.setData('wargame-item', JSON.stringify({ id, type, src, backSrc, splitBinding, fromPool: true }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const toggleBindingMode = (parentId: string) => {
    if (bindingModeParentId === parentId) {
        setBindingModeParentId(null);
    } else {
        setBindingModeParentId(parentId);
    }
  };

  const handleSubTokenClick = (subId: string) => {
    if (!bindingModeParentId) return;

    bindSubTokensToMain(bindingModeParentId, subId);
    setBindingModeParentId(null);
    alert('绑定成功！拆分时将生成两个此子算子。');
  };

  return (
    <aside className="w-64 h-full bg-gray-900 border-r border-gray-700 flex flex-col shadow-lg z-10 shrink-0 overflow-hidden">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        
        {/* Header */}
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <span>⚔️</span> 兵棋推演工具
        </h1>
        
        {/* Map Management */}
        <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">地图管理</h2>
            <input 
            type="file" 
            ref={mapInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleMapFileChange}
            />

            <button 
            onClick={handleMapUploadClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
            <span>🗺️</span> 上传地图
            </button>
            
            {hasMap && (
            <button 
                onClick={onMapClear}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
            >
                <span>🗑️</span> 清除地图
            </button>
            )}

            <div className="flex flex-col gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">当前模式</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isSetupMode ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                        {isSetupMode ? '初设中' : '竞技中'}
                    </span>
                </div>

                {isSetupMode ? (
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => {
                                if (window.confirm('将当前棋局保存为初始设置？')) {
                                    saveCurrentAsInitial();
                                }
                            }}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>📌</span> 保存当前为初设
                        </button>
                        <button 
                            onClick={() => {
                                if (window.confirm('确定要开始游戏吗？系统将锁定初设并开启第一回合。')) {
                                    startGame();
                                }
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center leading-tight"
                        >
                            <span className="text-lg">⚔️ 开始游戏</span>
                            <span className="text-[10px] opacity-80 font-normal">开始第一回合</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-between bg-blue-900/30 p-2 rounded border border-blue-500/30">
                            <span className="text-sm font-bold text-blue-400">TURN {turnNumber}</span>
                            <button 
                                onClick={nextTurn}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1 px-3 rounded shadow-md transition-all active:scale-90 flex items-center gap-1"
                            >
                                下一回合 <span>➡️</span>
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                if (window.confirm('回到初设模式可以重新调整初始布局。确定吗？')) {
                                    enterSetupMode();
                                }
                            }}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 px-4 rounded transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🛠️</span> 返回初设模式
                        </button>
                    </div>
                )}

                <button 
                    onClick={() => {
                        const message = initialSetupSnapshot 
                            ? '确定要还原到初始设置吗？当前进度将丢失。' 
                            : '当前未保存初设，确定要清空所有算子、区域数据并重置吗？';
                        if (window.confirm(message)) {
                            resetToInitial();
                        }
                    }}
                    className="w-full bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/30 font-bold py-2 px-4 rounded text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>🔄</span> {initialSetupSnapshot ? '重置到初设' : '清空数据'}
                </button>
            </div>

            <button 
                onClick={handleExportSetup}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded border border-gray-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                title="导出当前所有数据为 JSON"
            >
                <span>💾</span> 导出初设 (.json)
            </button>

            <input 
                type="file" 
                ref={importInputRef}
                className="hidden" 
                accept=".json"
                onChange={handleImportSetup}
            />
            <button 
                onClick={() => importInputRef.current?.click()}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2 px-4 rounded border border-gray-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                title="导入 JSON 配置文件"
            >
                <span>📂</span> 导入配置 (.json)
            </button>
        </div>

        {/* Global Settings */}
        <div className="border-t border-gray-700 pt-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">全局设置</h2>
            <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-300 flex justify-between">
                <span>算子缩放</span>
                <span>{globalTokenScale.toFixed(1)}x</span>
            </label>
            <input 
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={globalTokenScale}
                onChange={(e) => setGlobalTokenScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            </div>
        </div>

        {/* Dice Roller */}

        {/* Token Pool */}
        <div className="border-t border-gray-700 pt-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">算子库</h2>
            
            <input 
            type="file" 
            ref={tokenInputRef}
            className="hidden" 
            multiple
            accept="image/*"
            onChange={handleTokenFileChange}
            />
            <input 
                type="file"
                ref={tokenBackInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleTokenBackFileChange}
            />
            
            <div className="flex gap-2">
                <button 
                onClick={handleTokenUploadClick}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
                >
                <span>🧩</span> 上传算子
                </button>
                {tokenPool.length > 0 && (
                    <button 
                    onClick={() => {
                        if (window.confirm('确定要清空算子库吗？')) {
                            clearTokenPool();
                        }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 rounded transition-colors duration-200"
                    title="清空算子库"
                    >
                    <span>🗑️</span>
                    </button>
                )}
            </div>

            {/* Token Grid Container - Fixed Max Height */}
            <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                <div className="grid grid-cols-4 gap-2">
                {tokenPool.map((token) => (
                    <div 
                    key={token.id} 
                    className="aspect-square bg-gray-900 rounded border border-gray-600 overflow-hidden cursor-grab hover:border-green-500 hover:shadow-md transition-all group relative"
                    >
                    <img 
                        src={token.imageUrl}
                        alt={`Token ${token.id}`}
                        className="w-full h-full object-contain p-0.5"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, token.id, token.imageUrl, 'token', token.backImageUrl, token.splitBinding)}
                    />
                    <button 
                        onClick={() => {
                                setActiveTokenIdForBackImage(token.id);
                                tokenBackInputRef.current?.click();
                        }}
                        className={`absolute bottom-0 right-0 text-[8px] w-4 h-4 flex items-center justify-center transition-colors rounded-tl ${token.backImageUrl ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        title={token.backImageUrl ? "已绑定背面" : "绑定背面"}
                    >
                        {token.backImageUrl ? 'R' : '+'}
                    </button>

                    <button
                        onClick={() => toggleBindingMode(token.id)}
                        className={`absolute bottom-0 left-0 text-[8px] w-4 h-4 flex items-center justify-center transition-colors rounded-tr ${bindingModeParentId === token.id ? 'bg-yellow-500 text-black animate-pulse' : (token.splitBinding ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600')}`}
                        title={token.splitBinding ? "已绑定子算子" : "绑定子算子"}
                    >
                        🔗
                    </button>

                    <button
                        onClick={() => removeTokenFromPool(token.id)}
                        className="absolute top-0 right-0 bg-red-600 text-white text-[8px] w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                        title="删除"
                    >
                        ×
                    </button>
                    </div>
                ))}
                {tokenPool.length === 0 && (
                    <div className="col-span-4 text-center py-8 text-gray-500 text-[10px]">
                    暂无算子
                    </div>
                )}
                </div>
            </div>
        </div>

        {/* Sub-Token Pool */}
        <div className="border-t border-gray-700 pt-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">子算子库</h2>
            
            <input 
            type="file" 
            ref={subTokenInputRef}
            className="hidden" 
            multiple
            accept="image/*"
            onChange={handleSubTokenFileChange}
            />
            <input 
                type="file"
                ref={subTokenBackInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleSubTokenBackFileChange}
            />
            
            <div className="flex gap-2">
                <button 
                onClick={handleSubTokenUploadClick}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-xs"
                >
                <span>🖇️</span> 上传子算子
                </button>
                {subTokenPool.length > 0 && (
                    <button 
                    onClick={() => {
                        if (window.confirm('确定要清空子算子库吗？')) {
                            clearSubTokenPool();
                        }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 rounded transition-colors duration-200"
                    title="清空子算子库"
                    >
                    <span>🗑️</span>
                    </button>
                )}
            </div>

            {bindingModeParentId && (
                <div className="bg-yellow-900/30 border border-yellow-700 p-2 rounded text-[10px] text-yellow-200 animate-pulse">
                    正在为算子选择子算子模版...
                </div>
            )}

            <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                <div className="grid grid-cols-4 gap-2">
                {subTokenPool.map((token) => (
                    <div 
                    key={token.id} 
                    className={`aspect-square bg-gray-900 rounded border overflow-hidden cursor-grab transition-all group relative ${bindingModeParentId ? 'hover:border-yellow-400 border-dashed' : 'border-gray-600 hover:border-teal-500'}`}
                    onClick={() => handleSubTokenClick(token.id)}
                    >
                    <img 
                        src={token.imageUrl}
                        alt={`Sub-Token ${token.id}`}
                        className="w-full h-full object-contain p-0.5"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, token.id, token.imageUrl, 'sub-token', token.backImageUrl)}
                    />
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveSubTokenIdForBackImage(token.id);
                            subTokenBackInputRef.current?.click();
                        }}
                        className={`absolute bottom-0 right-0 text-[8px] w-4 h-4 flex items-center justify-center transition-colors rounded-tl ${token.backImageUrl ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        title={token.backImageUrl ? "已绑定背面" : "绑定背面"}
                    >
                        {token.backImageUrl ? 'R' : '+'}
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            removeSubTokenFromPool(token.id);
                        }}
                        className="absolute top-0 right-0 bg-red-600 text-white text-[8px] w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                        title="删除"
                    >
                        ×
                    </button>
                    </div>
                ))}
                {subTokenPool.length === 0 && (
                    <div className="col-span-4 text-center py-4 text-gray-500 text-[10px]">
                    暂无子算子
                    </div>
                )}
                </div>
            </div>
        </div>

        {/* Marker Pool */}
        <div className="border-t border-gray-700 pt-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">状态标记区 (Markers)</h2>
            
            <input 
                type="file" 
                ref={markerInputRef}
                className="hidden" 
                multiple
                accept="image/*"
                onChange={handleMarkerFileChange}
            />
            
            <div className="flex gap-2">
                <button 
                    onClick={handleMarkerUploadClick}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <span>⚠️</span> 上传标记
                </button>
                {markerPool.length > 0 && (
                    <button 
                        onClick={() => {
                            if (window.confirm('确定要清空标记库吗？')) {
                                clearMarkerPool();
                            }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 rounded transition-colors duration-200"
                        title="清空标记库"
                    >
                        <span>🗑️</span>
                    </button>
                )}
            </div>

            <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                <div className="grid grid-cols-4 gap-2">
                {markerPool.map((marker) => (
                    <div 
                        key={marker.id} 
                        className="aspect-square bg-gray-900 rounded border border-gray-600 overflow-hidden cursor-grab hover:border-yellow-500 hover:shadow-md transition-all group relative"
                    >
                        <img 
                            src={marker.imageUrl}
                            alt={`Marker ${marker.id}`}
                            className="w-full h-full object-contain p-0.5"
                            draggable={true}
                            onDragStart={(e) => {
                                // Infinite usage: no 'id' sent, only type and src
                                e.dataTransfer.setData('wargame-item', JSON.stringify({ 
                                    type: 'marker', 
                                    src: marker.imageUrl,
                                    defaultScale: marker.defaultScale || 0.8
                                }));
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        />
                        <div className="absolute top-0 right-0 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-bl">
                            <button
                                onClick={() => removeMarkerFromPool(marker.id)}
                                className="bg-red-600/80 hover:bg-red-600 text-white text-[8px] w-4 h-4 flex items-center justify-center"
                                title="删除"
                            >
                                ×
                            </button>
                            <button
                                onClick={() => updateMarkerSizeInPool(marker.id, 0.1)}
                                className="text-white text-[10px] w-4 h-4 flex items-center justify-center hover:bg-white/20"
                                title="变大"
                            >
                                +
                            </button>
                            <button
                                onClick={() => updateMarkerSizeInPool(marker.id, -0.1)}
                                className="text-white text-[10px] w-4 h-4 flex items-center justify-center hover:bg-white/20"
                                title="变小"
                            >
                                -
                            </button>
                            <div className="text-[6px] text-white text-center leading-tight py-0.5 border-t border-white/20">
                                {((marker.defaultScale || 0.8) * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>
                ))}
                {markerPool.length === 0 && (
                    <div className="col-span-4 text-center py-4 text-gray-500 text-[10px]">
                    暂无标记
                    </div>
                )}
                </div>
            </div>
        </div>

        {/* Table Pool */}
        <div className="border-t border-gray-700 pt-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">图表/记录表</h2>
            
            <input 
                type="file" 
                ref={tableInputRef}
                className="hidden" 
                multiple
                accept="image/*"
                onChange={handleTableFileChange}
            />
            
            <div className="flex gap-2">
                <button 
                    onClick={handleTableUploadClick}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <span>📊</span> 上传图表
                </button>
                {tablePool.length > 0 && (
                    <button 
                        onClick={() => {
                            if (window.confirm('确定要清空图表库吗？')) {
                                clearTablePool();
                            }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 rounded transition-colors duration-200"
                        title="清空图表库"
                    >
                        <span>🗑️</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {tablePool.map((table) => (
                    <div 
                    key={table.id} 
                    className="aspect-video bg-gray-800 rounded border border-gray-600 overflow-hidden cursor-grab hover:border-indigo-500 hover:shadow-md transition-all group relative"
                    >
                    <img 
                        src={table.imageUrl}
                        alt={`Table ${table.id}`}
                        className="w-full h-full object-contain p-1"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, table.id, table.imageUrl, 'table')}
                    />
                    <button
                        onClick={() => removeTableFromPool(table.id)}
                        className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                        title="删除"
                    >
                        ×
                    </button>
                    </div>
                ))}
                {tablePool.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                    暂无图表
                    </div>
                )}
                </div>
        </div>

      </div>

    </aside>
  );
};

const App: React.FC = () => {
  const { mapBase64, saveMap, clearMap } = useMapStorage();
  const isSetupMode = useTokenStore((state) => state.isSetupMode);

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden relative">
      <Sidebar onMapUpload={saveMap} onMapClear={clearMap} hasMap={!!mapBase64} />
      
      {/* Container for Map and Overlays */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
         {/* Top Banner for Setup Mode */}
         {isSetupMode && (
            <div className="w-full bg-yellow-500/10 border-b border-yellow-500/30 py-1 px-4 flex items-center justify-between text-yellow-500 animate-in fade-in slide-in-from-top-1 duration-500">
               <div className="flex items-center gap-2">
                  <span className="animate-pulse">🛠️</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase">初设模式中 - 请摆放算子并点击“保存初设”</span>
               </div>
               <div className="text-[10px] opacity-70 italic font-mono">
                  Initial Setup Phase
               </div>
            </div>
         )}

         <div className="flex-1 relative overflow-hidden">
            <MapWorkspace mapBase64={mapBase64} />
            
            {/* Top-left Overlay for Dice Roller */}
            <div className="absolute top-4 left-4 z-20">
               <DiceRoller />
            </div>
         </div>
      </div>

      <DiceAnimation />
    </div>
  );
};

export default App;
