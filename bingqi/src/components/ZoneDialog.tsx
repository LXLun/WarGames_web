import React, { useState, useEffect } from 'react';
import { MapItem } from '../stores/useTokenStore';

interface ZoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  zoneType: 'graveyard' | 'bag';
  zoneId: string;
  zoneName: string;
  tokens: MapItem[];
  onRestore: (tokenId: string) => void;
  onDrawRandom: () => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onUploadTokens?: (id: string, tokens: { front: File; back?: File }[]) => void;
}

const ZoneDialog: React.FC<ZoneDialogProps> = ({
  isOpen,
  onClose,
  zoneType,
  zoneId,
  zoneName,
  tokens,
  onRestore,
  onDrawRandom,
  onRename,
  onDelete,
  onUploadTokens
}) => {
  const [showBagContent, setShowBagContent] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(zoneName);
  
  // Upload State
  const [showUploadUI, setShowUploadUI] = useState(false);
  const [pendingTokens, setPendingTokens] = useState<{ id: string; front: File; back?: File; frontPreview: string; backPreview?: string }[]>([]);

  // Reset editing state when dialog opens or zone changes
  useEffect(() => {
    setEditingName(zoneName);
    setIsEditingName(false);
    setShowUploadUI(false);
    setPendingTokens([]);
  }, [isOpen, zoneId, zoneName]);


  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent<HTMLImageElement> | React.DragEvent<HTMLDivElement>, token: MapItem) => {
    e.dataTransfer.setData('wargame-item', JSON.stringify({
      action: 'restore',
      tokenId: token.id,
      zoneType,
      zoneId,
      src: token.imageUrl, // For preview if needed
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleConfirmUpload = () => {
    if (pendingTokens.length > 0 && onUploadTokens) {
        onUploadTokens(zoneId, pendingTokens.map(t => ({ front: t.front, back: t.back })));
        setShowUploadUI(false);
        setPendingTokens([]);
    }
  };

  const handleSelectFrontFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newPending = await Promise.all(Array.from(files).map(async (file) => {
          const preview = await readFile(file);
          return {
              id: Math.random().toString(36),
              front: file,
              frontPreview: preview,
              back: undefined,
              backPreview: undefined
          };
      }));

      setPendingTokens(prev => [...prev, ...newPending]);
  };

  const handleSelectBackFile = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const preview = await readFile(file);
      setPendingTokens(prev => prev.map((item, i) => {
          if (i === index) {
              return { ...item, back: file, backPreview: preview };
          }
          return item;
      }));
  };
  
  const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
      });
  };

  const handleRenameSubmit = () => {
    setIsEditingName(false);
    if (editingName.trim() !== zoneName && onRename) {
        onRename(zoneId, editingName.trim());
    }
  };

  return (
    // Changed: Removed fixed full-screen overlay, made it a floating absolute panel
    // Using fixed positioning for simplicity to center it, but without background block
    <div className="fixed top-20 left-[20%] z-[100] w-[600px] pointer-events-none">
      <div className="bg-gray-800 border-2 border-gray-600 rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
        
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b border-gray-700 ${zoneType === 'graveyard' ? 'bg-red-900/50' : 'bg-indigo-900/50'}`}>
          <div className="flex items-center gap-2 flex-1">
             <span className="text-xl">{zoneType === 'graveyard' ? '💀' : '🛍️'}</span>
             
             {zoneType === 'bag' && isEditingName ? (
                 <input 
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit();
                    }}
                    autoFocus
                    className="bg-gray-900 text-white px-2 py-1 rounded border border-gray-600 outline-none w-40"
                 />
             ) : (
                <h2 
                    className={`text-lg font-bold text-white flex items-center gap-2 ${zoneType === 'bag' ? 'cursor-text hover:text-blue-300' : ''}`}
                    onClick={() => {
                        if (zoneType === 'bag') {
                            setEditingName(zoneName);
                            setIsEditingName(true);
                        }
                    }}
                    title={zoneType === 'bag' ? "点击修改名称" : ""}
                >
                    {zoneName}
                    {zoneType === 'bag' && <span className="text-xs text-gray-400 font-normal">(点击修改)</span>}
                </h2>
             )}
          </div>
          
          <div className="flex items-center gap-2">
            {zoneType === 'bag' && onDelete && (
                <button
                    onClick={() => {
                        if (window.confirm('确定要删除这个抽签袋吗？里面的算子将会丢失。')) {
                            onDelete(zoneId);
                            onClose();
                        }
                    }}
                    className="text-red-400 hover:text-red-200 text-xs px-2 py-1 hover:bg-red-900/50 rounded transition-colors"
                >
                    删除
                </button>
            )}
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700"
            >
                ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto p-4 bg-gray-900/90">
          
          {zoneType === 'bag' && (
            <div className="mb-6 flex flex-col items-center justify-center space-y-4 py-4 border-b border-gray-700">
               <div className="text-center space-y-1">
                 <div className="text-4xl mb-1">🎲</div>
                 <p className="text-sm text-gray-300">袋中共有 {tokens.length} 个算子</p>
               </div>
               
               <div className="flex flex-col gap-2 w-full max-w-md">
                   {/* Normal Mode: Buttons */}
                   {!showUploadUI && (
                     <div className="flex gap-2 justify-center">
                       {onUploadTokens && (
                           <button 
                               onClick={() => setShowUploadUI(true)}
                               className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded cursor-pointer transition-colors shadow flex items-center gap-2"
                           >
                               <span>⬆️</span> 上传算子入袋
                           </button>
                       )}
                       <button
                            onClick={() => {
                                onDrawRandom();
                                onClose();
                            }}
                            disabled={tokens.length === 0}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded shadow transition-all"
                        >
                            ✨ 随机抽取
                        </button>
                     </div>
                   )}

                   {/* Upload Mode: Form */}
                   {showUploadUI && (
                       <div className="bg-gray-800 p-3 rounded border border-gray-600 flex flex-col gap-3">
                           <h3 className="text-white text-sm font-bold border-b border-gray-700 pb-1 flex justify-between">
                               <span>批量导入设置</span>
                               <button onClick={() => {
                                   setShowUploadUI(false);
                                   setPendingTokens([]);
                               }} className="text-gray-400 hover:text-white">✕</button>
                           </h3>
                           
                           {/* Step 1: Add Files */}
                           <div>
                               <label className="block text-gray-400 text-xs mb-1">1. 添加算子正面图片 (可多选)*</label>
                               <input 
                                    type="file" 
                                    multiple
                                    accept="image/*"
                                    className="text-white text-xs w-full cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                                    onChange={(e) => {
                                        const files = e.target.files;
                                        if (files) {
                                            Array.from(files).forEach(file => {
                                                const reader = new FileReader();
                                                reader.onload = (re) => {
                                                    setPendingTokens(prev => [...prev, {
                                                        id: Math.random().toString(36),
                                                        front: file,
                                                        frontPreview: re.target?.result as string
                                                    }]);
                                                };
                                                reader.readAsDataURL(file);
                                            });
                                        }
                                        e.target.value = '';
                                    }}
                               />
                           </div>

                           {/* Step 2: Configure Backs */}
                           {pendingTokens.length > 0 && (
                               <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                                   <label className="block text-gray-400 text-xs sticky top-0 bg-gray-800 py-1 z-10">2. 为每个算子单独设置背面 (可选)</label>
                                   {pendingTokens.map((token, index) => (
                                       <div key={token.id} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded border border-gray-600">
                                            {/* Front Preview */}
                                            <div className="w-10 h-10 bg-black/50 rounded flex items-center justify-center overflow-hidden shrink-0 border border-gray-500" title="正面">
                                                <img src={token.frontPreview} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            
                                            <div className="text-gray-400 text-lg">→</div>

                                            {/* Back Config */}
                                            <div className="flex-1 min-w-0">
                                                {token.backPreview ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 bg-black/50 rounded flex items-center justify-center overflow-hidden shrink-0 border border-yellow-600/50" title="背面">
                                                            <img src={token.backPreview} className="w-full h-full object-contain" alt="" />
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setPendingTokens(prev => prev.map((t, i) => i === index ? { ...t, back: undefined, backPreview: undefined } : t));
                                                            }}
                                                            className="text-xs text-red-400 hover:text-red-300 underline"
                                                        >
                                                            移除背面
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-dashed border-gray-500 rounded px-2 py-1 hover:border-gray-300 transition-colors">
                                                        <span>➕ Set Back</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (re) => {
                                                                        setPendingTokens(prev => prev.map((t, i) => i === index ? { ...t, back: file, backPreview: re.target?.result as string } : t));
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                            </div>

                                            {/* Remove Token */}
                                            <button 
                                                onClick={() => setPendingTokens(prev => prev.filter((_, i) => i !== index))}
                                                className="text-gray-500 hover:text-red-400 text-lg px-2"
                                                title="移除此算子"
                                            >
                                                ×
                                            </button>
                                       </div>
                                   ))}
                               </div>
                           )}

                           <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-gray-700">
                               <button 
                                   onClick={() => {
                                       setShowUploadUI(false);
                                       setPendingTokens([]);
                                   }}
                                   className="px-3 py-1 text-xs text-gray-400 hover:text-white border border-transparent hover:border-gray-500 rounded"
                               >
                                   取消
                               </button>
                               <button 
                                   onClick={handleConfirmUpload}
                                   disabled={pendingTokens.length === 0}
                                   className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded shadow"
                               >
                                   确认导入 ({pendingTokens.length})
                               </button>
                           </div>
                       </div>
                   )}
               </div>


               <div className="pt-2">
                 <button 
                   onClick={() => setShowBagContent(!showBagContent)}
                   className="text-xs text-gray-500 hover:text-gray-300 underline"
                 >
                   {showBagContent ? '隐藏袋中内容' : '查看袋中内容 (裁判/作弊模式)'}
                 </button>
               </div>
            </div>
          )}

          {/* Grid View */}
          {(zoneType === 'graveyard' || (zoneType === 'bag' && showBagContent)) && (
            <div>
                {tokens.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 italic text-sm">
                    {zoneType === 'bag' ? '袋子空了' : '暂无阵亡算子'}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {tokens.map((token) => (
                      <div 
                        key={token.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, token)}
                        className="group relative aspect-square bg-gray-700 rounded border border-gray-600 hover:border-blue-500 hover:shadow-md transition-all cursor-grab active:cursor-grabbing overflow-hidden p-1 flex items-center justify-center"
                        title="拖拽回地图"
                      >
                         <img 
                           src={token.imageUrl} 
                           alt="token" 
                           draggable={false} // Handle drag on container
                           className="w-full h-full object-contain pointer-events-none"
                         />
                         {token.isFlipped && token.backImageUrl && (
                             <div className="absolute top-0 right-0 text-[8px] bg-yellow-600 text-white px-1 rounded-bl">翻</div>
                         )}
                         {/* Hover Hint */}
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-white font-bold bg-black/60 px-1 rounded backdrop-blur-sm">
                              拖拽复活
                            </span>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoneDialog;
