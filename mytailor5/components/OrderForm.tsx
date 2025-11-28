
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, Save, UserCircle, Image as ImageIcon, X, Calendar, Tag, Clock, Mic, MicOff } from 'lucide-react';
import { compressImage, saveOrder } from '../services/db';
import { Order } from '../types';
import { useSpeechInput } from '../hooks/useSpeechInput';

interface Props {
  onSuccess: () => void;
}

const QUICK_TAGS = ['改裤脚', '换拉链', '收腰', '修补破洞', '换松紧', '钉扣子', '改袖长', '大改小'];
const QUICK_PRICES = [10, 20, 50];

export const OrderForm: React.FC<Props> = ({ onSuccess }) => {
  const [images, setImages] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [source, setSource] = useState<'online' | 'offline'>('online');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Date state: Format YYYY-MM-DDTHH:mm
  const [orderDate, setOrderDate] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const handleSpeechResult = (text: string) => {
    setNote(prev => {
      if (!prev) return text;
      return `${prev}${prev.endsWith(' ') ? '' : ' '}${text}`;
    });
  };
  const { supported: speechSupported, listening, startListening, stopListening } = useSpeechInput({
    onResult: handleSpeechResult,
    lang: 'zh-CN'
  });
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Initialize date to current local time on mount
  useEffect(() => {
      const now = new Date();
      // Adjust to local timezone string for input type="datetime-local"
      const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setOrderDate(localIso);
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, src: 'online' | 'offline') => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      try {
        const newImages: string[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
            const compressed = await compressImage(e.target.files[i]);
            newImages.push(compressed);
        }
        setImages(prev => [...prev, ...newImages]);
        setSource(src);
      } catch (err) {
        alert('图片处理失败');
      } finally {
        setIsProcessing(false);
        if(e.target) e.target.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
      setSelectedTags(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
  };

  const addPrice = (amount: number) => {
      const current = parseFloat(price) || 0;
      setPrice((current + amount).toString());
  };

  const handleSave = async () => {
    if (images.length === 0) {
      alert('请至少上传一张照片');
      return;
    }
    if (!price) {
        alert('请输入价格');
        return;
    }
    if (!customerName.trim()) {
        alert('请输入顾客姓名或单号');
        return;
    }

    setIsProcessing(true);
    try {
      const createdAtTimestamp = orderDate ? new Date(orderDate).getTime() : Date.now();

      // 生成临时 ID，实际保存时会在 db.ts 中生成 UUID
      const tempId = `temp-${Date.now()}`;
      
      const newOrder: Order = {
        id: tempId, // 临时 ID，保存时会转换为 UUID
        customerName: customerName.trim(),
        createdAt: createdAtTimestamp, // Logic time based on user input
        images: images,
        note: note,
        price: parseFloat(price),
        status: 'pending',
        source: source,
        tags: selectedTags
      };
      
      await saveOrder(newOrder);
      onSuccess();
    } catch (e) {
      alert('保存失败: ' + e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 font-serif px-1 mb-4">
            记一笔
        </h2>
        
        {/* Date Picker - Prominent Position */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-100 flex items-center justify-between">
            <div className="flex items-center text-brand-700">
                <Clock className="w-5 h-5 mr-3" />
                <span className="font-bold text-sm">订单时间 (补录)</span>
            </div>
            <input 
                type="datetime-local" 
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-gray-800 font-bold text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-6">
            
            {/* Customer Name */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center">
                    <UserCircle size={16} className="mr-2 text-brand-600"/>
                    顾客姓名 / 闲鱼单号
                </label>
                <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="例：王大姐 或 单号2023..."
                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all font-medium text-gray-800 placeholder-gray-400"
                />
            </div>

            {/* Image Selection Area */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center justify-between">
                    <div className="flex items-center">
                        <ImageIcon size={16} className="mr-2 text-brand-600"/>
                        衣服照片 ({images.length}张)
                    </div>
                    {images.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${source === 'offline' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {source === 'offline' ? '线下实体' : '线上闲鱼'}
                        </span>
                    )}
                </label>
                
                {images.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative flex-shrink-0 w-32 h-32 rounded-xl border border-gray-200 overflow-hidden snap-center group">
                                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                    <button 
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded-md">
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                            <div className="flex-shrink-0 w-32 h-32 flex flex-col gap-2">
                            <button 
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex-1 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors"
                            >
                                <Camera size={20} />
                                <span className="text-xs font-bold mt-1">+拍照</span>
                            </button>
                            <button 
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex-1 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 flex flex-col items-center justify-center text-purple-400 hover:bg-purple-100 transition-colors"
                            >
                                <Upload size={20} />
                                <span className="text-xs font-bold mt-1">+相册</span>
                            </button>
                            </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 h-32">
                        <div 
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 text-blue-700"
                        >
                            <div className="bg-white p-2 rounded-full shadow-sm mb-2 text-blue-600">
                                <Camera size={24} />
                            </div>
                            <span className="font-bold text-sm">拍照</span>
                            <span className="text-[10px] opacity-70">记为线下单</span>
                        </div>

                        <div 
                             onClick={() => galleryInputRef.current?.click()}
                             className="bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 text-purple-700"
                        >
                             <div className="bg-white p-2 rounded-full shadow-sm mb-2 text-purple-600">
                                <Upload size={24} />
                            </div>
                            <span className="font-bold text-sm">相册</span>
                            <span className="text-[10px] opacity-70">记为线上单</span>
                        </div>
                    </div>
                )}
                
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={(e) => handleImageChange(e, 'offline')} className="hidden" />
                <input type="file" ref={galleryInputRef} accept="image/*" multiple onChange={(e) => handleImageChange(e, 'online')} className="hidden" />
            </div>

            {/* Quick Tags */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center">
                    <Tag size={16} className="mr-2 text-brand-600"/>
                    快捷标签
                </label>
                <div className="flex flex-wrap gap-2">
                    {QUICK_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                selectedTags.includes(tag)
                                ? 'bg-brand-500 text-white border-brand-600 shadow-sm'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Note Input */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700 flex items-center">
                        <Tag size={16} className="mr-2 text-brand-600"/>
                        备注详情
                    </label>
                    <button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      disabled={!speechSupported}
                      className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${
                        listening
                          ? 'bg-red-100 text-red-600 border-red-200'
                          : 'text-brand-600 border-brand-200 hover:bg-brand-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {listening ? <MicOff size={14} /> : <Mic size={14} />}
                      {listening ? '停止' : '语音输入'}
                    </button>
                </div>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="补充更多细节..."
                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl h-32 resize-none focus:ring-2 focus:ring-brand-500 transition-all text-gray-700 leading-relaxed"
                />
                {!speechSupported && (
                  <p className="text-xs text-gray-400">
                    当前浏览器暂不支持语音识别，可在 Chrome / Edge 等浏览器尝试。
                  </p>
                )}
            </div>

            {/* Price Input */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex justify-between items-center">
                    <span>价格 (元)</span>
                    <div className="flex space-x-2">
                        {QUICK_PRICES.map(amt => (
                            <button 
                                key={amt}
                                onClick={() => addPrice(amt)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-600 transition-colors"
                            >
                                +{amt}
                            </button>
                        ))}
                    </div>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">¥</span>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                        className="w-full p-4 pl-10 bg-gray-50 border-0 rounded-2xl text-2xl font-bold text-gray-800 focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                </div>
            </div>

            {/* Save Button */}
            <button
            onClick={handleSave}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-200 flex items-center justify-center space-x-2 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 mt-4"
            >
            {isProcessing ? (
                <Loader2 className="animate-spin" />
            ) : (
                <>
                <Save size={20} />
                <span>保存订单</span>
                </>
            )}
            </button>
        </div>
      </div>
    </div>
  );
};
