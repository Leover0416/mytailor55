
import React, { useState, useRef } from 'react';
import { Order } from '../types';
import { Search, Trash2, Calendar, Loader2, Image as ImageIcon, CheckCircle2, XCircle, Clock, Flame, MapPin, Globe, Layers, Share2, Download, X, Pencil, Camera, Upload, Save } from 'lucide-react';
import { deleteOrder, generateWatermarkedImage, updateOrder, compressImage } from '../services/db';
import { ImageDisplay } from './ImageDisplay';

interface Props {
  orders: Order[];
  onRefresh: () => void;
}

const QUICK_TAGS = ['改裤脚', '换拉链', '收腰', '修补破洞', '换松紧', '钉扣子', '改袖长', '大改小'];

export const OrderList: React.FC<Props> = ({ orders, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [editDateStr, setEditDateStr] = useState(''); // For datetime-local input
  const editCameraRef = useRef<HTMLInputElement>(null);
  const editGalleryRef = useRef<HTMLInputElement>(null);

  // Preview Modal State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      await deleteOrder(id);
      if(selectedOrder?.id === id) setSelectedOrder(null);
      onRefresh();
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedOrder) return;
    const newStatus = selectedOrder.status === 'pending' ? 'completed' : 'pending';
    const updatedOrder: Order = {
        ...selectedOrder,
        status: newStatus,
        completedAt: newStatus === 'completed' ? Date.now() : undefined
    };
    await updateOrder(updatedOrder);
    setSelectedOrder(null); 
    onRefresh();
  };

  const handleGeneratePreview = async (order: Order) => {
    setProcessingId(order.id);
    try {
        const dataUrl = await generateWatermarkedImage(order);
        setPreviewImage(dataUrl);
        setPreviewOrder(order);
    } catch (e) {
        alert('生成图片失败');
        console.error(e);
    } finally {
        setProcessingId(null);
    }
  };

  const handleDownloadFile = () => {
      if (!previewImage || !previewOrder) return;
      const a = document.createElement('a');
      a.href = previewImage;
      const dateStr = new Date(previewOrder.createdAt).toISOString().slice(0,10).replace(/-/g, '');
      const cleanName = (previewOrder.customerName || 'NoName').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
      a.download = `小刘裁缝铺_${cleanName}_${dateStr}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleShare = async () => {
      if (!previewImage || !previewOrder) return;
      
      try {
          // Convert Base64 to Blob
          const res = await fetch(previewImage);
          const blob = await res.blob();
          
          if (navigator.share) {
             const cleanName = (previewOrder.customerName || 'NoName');
             const file = new File([blob], `小刘裁缝铺_${cleanName}.jpg`, { type: 'image/jpeg' });
             
             await navigator.share({
                 title: '小刘裁缝铺订单',
                 text: `${cleanName} 的订单详情`,
                 files: [file]
             });
          } else {
             handleDownloadFile();
          }
      } catch (e) {
          console.error("Share failed", e);
      }
  };

  const getUrgencyLevel = (createdAt: number) => {
      const diffDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      if (diffDays > 10) return 'critical'; 
      if (diffDays > 7) return 'serious';   
      if (diffDays > 5) return 'warning';   
      return 'normal';
  };

  // --- Edit Mode Logic ---

  const startEditing = () => {
    if (!selectedOrder) return;
    setIsEditing(true);
    setEditForm({ ...selectedOrder });
    // Convert timestamp to YYYY-MM-DDTHH:mm for input
    const d = new Date(selectedOrder.createdAt);
    // Adjust to local timezone string
    const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setEditDateStr(localIso);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveEditing = async () => {
    if (!selectedOrder || !editForm) return;
    
    // Validate
    if (!editForm.customerName?.trim()) {
        alert('顾客姓名不能为空');
        return;
    }

    const updatedCreatedAt = editDateStr ? new Date(editDateStr).getTime() : selectedOrder.createdAt;

    const updatedOrder: Order = {
        ...selectedOrder,
        ...editForm,
        createdAt: updatedCreatedAt,
        price: Number(editForm.price) || 0
    };

    try {
        await updateOrder(updatedOrder);
        setSelectedOrder(updatedOrder); // Update local view
        setIsEditing(false);
        onRefresh(); // Refresh parent list
    } catch (e) {
        alert('保存失败');
    }
  };

  const handleEditImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        try {
            const newImages: string[] = [];
            for (let i = 0; i < e.target.files.length; i++) {
                const compressed = await compressImage(e.target.files[i]);
                newImages.push(compressed);
            }
            setEditForm(prev => ({
                ...prev,
                images: [...(prev.images || []), ...newImages]
            }));
        } catch (err) {
            alert('图片处理失败');
        } finally {
            if(e.target) e.target.value = '';
        }
      }
  };

  const handleEditImageRemove = (idx: number) => {
      setEditForm(prev => ({
          ...prev,
          images: (prev.images || []).filter((_, i) => i !== idx)
      }));
  };

  const toggleEditTag = (tag: string) => {
      setEditForm(prev => {
          const currentTags = prev.tags || [];
          const newTags = currentTags.includes(tag) 
             ? currentTags.filter(t => t !== tag)
             : [...currentTags, tag];
          return { ...prev, tags: newTags };
      });
  };

  const filteredOrders = orders
    .filter(o => o.status === activeTab)
    .filter(order => 
      (order.note || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm pt-2 pb-2 z-10 space-y-3">
        <h2 className="text-2xl font-bold text-gray-900 font-serif px-1">记录列表</h2>
        
        <div className="relative shadow-sm">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="搜索姓名、单号..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm text-gray-700"
            />
        </div>

        <div className="flex bg-gray-200 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
                待发货
            </button>
            <button 
                onClick={() => setActiveTab('completed')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
                已完成
            </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4 mt-2">
        {filteredOrders.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl grayscale">🧵</span>
                </div>
                <p className="text-gray-400 font-medium">
                    {activeTab === 'pending' ? '没有待处理的单子，太棒了！' : '还没开张呢'}
                </p>
            </div>
        ) : (
            filteredOrders.map(order => {
                const urgency = activeTab === 'pending' ? getUrgencyLevel(order.createdAt) : 'normal';
                let borderClass = 'border-gray-100';
                let bgClass = 'bg-white';
                let badge = null;

                if (urgency === 'critical') {
                    borderClass = 'border-red-300 ring-1 ring-red-100';
                    bgClass = 'bg-red-50';
                    badge = <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm z-10 animate-pulse"><Flame size={10} className="mr-1"/> 超期10天</span>
                } else if (urgency === 'serious') {
                    borderClass = 'border-orange-300';
                    bgClass = 'bg-orange-50';
                    badge = <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm z-10">超期7天</span>
                } else if (urgency === 'warning') {
                    borderClass = 'border-yellow-300';
                    bgClass = 'bg-yellow-50';
                    badge = <span className="absolute top-2 right-2 bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm z-10">积压</span>
                }

                const coverImage = order.images && order.images.length > 0 ? order.images[0] : (order as any).imageBase64;
                const imageCount = order.images ? order.images.length : 1;

                return (
                    <div 
                        key={order.id} 
                        onClick={() => { setSelectedOrder(order); setIsEditing(false); }}
                        className={`relative rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border ${borderClass} ${bgClass} overflow-hidden flex flex-col transition-all active:scale-[0.98] cursor-pointer`}
                    >
                        {badge}
                        <div className="flex p-4 gap-4">
                            <div className="w-24 h-24 flex-shrink-0 bg-gray-200 rounded-xl overflow-hidden shadow-inner relative group">
                                <ImageDisplay src={coverImage} alt="Order" className="w-full h-full object-cover" />
                                <div className={`absolute bottom-0 left-0 right-0 text-[10px] text-center font-bold text-white py-0.5 ${order.source === 'offline' ? 'bg-blue-500/80' : 'bg-purple-500/80'}`}>
                                    {order.source === 'offline' ? '线下' : '线上'}
                                </div>
                                {imageCount > 1 && (
                                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded-md flex items-center backdrop-blur-sm">
                                        <Layers size={10} className="mr-0.5"/>
                                        {imageCount}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-900 text-lg truncate pr-2">
                                        {order.customerName || '未填写'}
                                    </span>
                                    <span className="text-lg font-bold text-brand-600 tabular-nums">¥{order.price}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                                    <Calendar size={12} />
                                    <span>{new Date(order.createdAt).toLocaleDateString('zh-CN')}</span>
                                    {urgency !== 'normal' && (
                                        <span className="text-red-500 font-bold">
                                            {Math.floor((Date.now() - order.createdAt)/(1000*60*60*24))}天未发
                                        </span>
                                    )}
                                </div>

                                {/* Tags display */}
                                {order.tags && order.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {order.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                        {order.tags.length > 3 && <span className="text-[10px] text-gray-400">...</span>}
                                    </div>
                                )}

                                <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed bg-white/50 p-1.5 rounded-lg">
                                    {order.note || '暂无备注'}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            })
        )}
      </div>

      {/* Detail & Edit Modal */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
              <div className="bg-white rounded-3xl w-full max-w-lg h-[85vh] overflow-hidden relative z-10 shadow-2xl flex flex-col">
                  
                  {/* Top Bar Actions */}
                  <div className="absolute top-4 right-4 z-20 flex space-x-2">
                      {!isEditing && (
                          <button 
                            onClick={startEditing}
                            className="bg-white/80 text-gray-800 p-2 rounded-full backdrop-blur-md hover:bg-white shadow-sm"
                          >
                            <Pencil size={20} />
                          </button>
                      )}
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/70"
                      >
                          <XCircle size={20} />
                      </button>
                  </div>

                  <div className="overflow-y-auto flex-1 bg-gray-50">
                      
                      {/* --- Image Section (View vs Edit) --- */}
                      {isEditing ? (
                          <div className="bg-gray-100 p-4 min-h-[200px]">
                              <div className="flex flex-wrap gap-2">
                                  {(editForm.images || []).map((img, idx) => (
                                      <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-300">
                                          <ImageDisplay src={img} className="w-full h-full object-cover" />
                                          <button 
                                            onClick={() => handleEditImageRemove(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                          >
                                              <X size={12}/>
                                          </button>
                                      </div>
                                  ))}
                                  {/* Add Image Buttons */}
                                  <div className="w-24 h-24 flex flex-col gap-1">
                                      <button onClick={() => editCameraRef.current?.click()} className="flex-1 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center text-blue-500">
                                          <Camera size={16}/>
                                      </button>
                                      <button onClick={() => editGalleryRef.current?.click()} className="flex-1 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center text-purple-500">
                                          <Upload size={16}/>
                                      </button>
                                  </div>
                                  <input type="file" ref={editCameraRef} accept="image/*" capture="environment" onChange={handleEditImageAdd} className="hidden" />
                                  <input type="file" ref={editGalleryRef} accept="image/*" multiple onChange={handleEditImageAdd} className="hidden" />
                              </div>
                          </div>
                      ) : (
                        <div className="bg-gray-100 flex flex-col space-y-1 pb-1">
                            {(selectedOrder.images && selectedOrder.images.length > 0 ? selectedOrder.images : [(selectedOrder as any).imageBase64]).map((img: string, idx: number) => (
                                <div key={idx} className="relative w-full">
                                    <ImageDisplay src={img} className="w-full h-auto object-cover" alt={`Detail ${idx+1}`} />
                                    <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-lg text-xs backdrop-blur-md">
                                        {idx + 1} / {(selectedOrder.images || []).length || 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                      )}

                      {/* --- Content Section --- */}
                      <div className="p-6 space-y-6 bg-white rounded-t-3xl -mt-6 relative">
                           {/* Source Badge (Only View) */}
                           {!isEditing && (
                               <div className="flex justify-center -mt-10 mb-4">
                                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white backdrop-blur-md shadow-lg flex items-center ${selectedOrder.source === 'offline' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                        {selectedOrder.source === 'offline' ? <MapPin size={12} className="mr-1"/> : <Globe size={12} className="mr-1"/>}
                                        {selectedOrder.source === 'offline' ? '线下实体' : '线上闲鱼'}
                                    </span>
                               </div>
                           )}

                          {isEditing ? (
                              // --- Edit Fields ---
                              <div className="space-y-4 pt-2">
                                  <div>
                                      <label className="text-xs font-bold text-gray-500">顾客/单号</label>
                                      <input 
                                        className="w-full text-xl font-bold border-b border-gray-200 focus:border-brand-500 outline-none py-1"
                                        value={editForm.customerName}
                                        onChange={e => setEditForm(prev => ({...prev, customerName: e.target.value}))}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500">价格 (元)</label>
                                      <input 
                                        type="number"
                                        className="w-full text-xl font-bold text-brand-600 border-b border-gray-200 focus:border-brand-500 outline-none py-1"
                                        value={editForm.price}
                                        onChange={e => setEditForm(prev => ({...prev, price: Number(e.target.value)}))}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500">订单时间</label>
                                      <input 
                                        type="datetime-local"
                                        className="w-full py-2 border-b border-gray-200 bg-transparent outline-none"
                                        value={editDateStr}
                                        onChange={e => setEditDateStr(e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 mb-2 block">标签</label>
                                      <div className="flex flex-wrap gap-2">
                                        {QUICK_TAGS.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleEditTag(tag)}
                                                className={`px-2 py-1 rounded-md text-xs border ${
                                                    (editForm.tags || []).includes(tag)
                                                    ? 'bg-brand-500 text-white border-brand-500'
                                                    : 'bg-white text-gray-600 border-gray-200'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500">备注</label>
                                      <textarea 
                                        className="w-full h-32 p-3 bg-gray-50 rounded-xl mt-1 outline-none focus:ring-1 focus:ring-brand-500"
                                        value={editForm.note}
                                        onChange={e => setEditForm(prev => ({...prev, note: e.target.value}))}
                                      />
                                  </div>
                              </div>
                          ) : (
                              // --- Read Only View ---
                              <>
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedOrder.customerName || '无名氏'}</h2>
                                    <div className="text-3xl font-bold text-brand-600">¥{selectedOrder.price}</div>
                                </div>
                                
                                <div className="flex items-center text-gray-500 text-sm">
                                    <Calendar size={14} className="mr-1" />
                                    {new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}
                                    <div className={`ml-3 px-2 py-0.5 rounded-full text-xs font-bold border ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                        {selectedOrder.status === 'completed' ? '已发货' : '待处理'}
                                    </div>
                                </div>

                                {selectedOrder.tags && selectedOrder.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOrder.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">备注内容</h4>
                                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                        {selectedOrder.note || '没有填写备注'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => handleGeneratePreview(selectedOrder)}
                                        disabled={processingId === selectedOrder.id}
                                        className="flex items-center justify-center py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        {processingId === selectedOrder.id ? <Loader2 className="animate-spin mr-2"/> : <ImageIcon className="mr-2" size={18}/>}
                                        生成长图
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(e, selectedOrder.id)}
                                        className="flex items-center justify-center py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="mr-2" size={18} />
                                        删除订单
                                    </button>
                                </div>
                              </>
                          )}
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50 relative z-20">
                      {isEditing ? (
                          <div className="flex gap-3">
                              <button 
                                onClick={cancelEditing}
                                className="flex-1 py-3 rounded-2xl font-bold bg-white border border-gray-300 text-gray-600"
                              >
                                  取消
                              </button>
                              <button 
                                onClick={saveEditing}
                                className="flex-2 w-full py-3 rounded-2xl font-bold bg-brand-600 text-white flex items-center justify-center"
                              >
                                  <Save size={18} className="mr-2"/>
                                  保存修改
                              </button>
                          </div>
                      ) : (
                        <button 
                            onClick={handleToggleStatus}
                            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                                selectedOrder.status === 'pending' 
                                ? 'bg-brand-600 text-white shadow-brand-200' 
                                : 'bg-white text-gray-600 border border-gray-200'
                            }`}
                        >
                            {selectedOrder.status === 'pending' ? (
                                <>
                                    <CheckCircle2 className="mr-2" />
                                    确认发货 (移入已完成)
                                </>
                            ) : (
                                <>
                                    <Clock className="mr-2" />
                                    标记为未完成
                                </>
                            )}
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Image Preview & Share Modal */}
      {previewImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPreviewImage(null)} />
              <div className="relative w-full max-w-sm bg-transparent flex flex-col items-center space-y-4">
                  
                  {/* Image Container */}
                  <div className="w-full max-h-[65vh] overflow-y-auto rounded-xl shadow-2xl bg-white">
                      <img src={previewImage} alt="Preview" className="w-full h-auto block" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 w-full">
                      <button 
                        onClick={handleShare}
                        className="flex-1 flex flex-col items-center justify-center bg-brand-500 text-white py-3 rounded-2xl shadow-lg active:scale-95 transition-transform"
                      >
                          <Share2 size={24} className="mb-1"/>
                          <span className="text-xs font-bold">分享给顾客 / 保存</span>
                      </button>
                      <button 
                         onClick={handleDownloadFile}
                         className="flex-1 flex flex-col items-center justify-center bg-white text-gray-700 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform"
                      >
                          <Download size={24} className="mb-1"/>
                          <span className="text-xs font-bold">直接下载</span>
                      </button>
                  </div>
                  
                  <button 
                    onClick={() => setPreviewImage(null)}
                    className="bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                      <X size={24} />
                  </button>
              </div>
          </div>
      )}

    </div>
  );
};
