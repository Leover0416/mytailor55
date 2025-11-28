import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Database, CheckCircle, AlertTriangle, FileSpreadsheet, FileText, Smartphone } from 'lucide-react';
import { exportData, importData, exportToCSV, getOrders } from '../services/db';
import { generateOrdersPDF } from '../services/pdf';

interface Props {
  onRefresh: () => void;
}

export const Settings: React.FC<Props> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检测 PWA 安装提示
  useEffect(() => {
    // 检测是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // 监听 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const json = await exportData();
      downloadFile(json, `小刘裁缝铺_系统备份_${getDateStr()}.json`, 'application/json');
      setMessage({ type: 'success', text: '系统备份文件已下载' });
    } catch (e) {
      setMessage({ type: 'error', text: '导出失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const csv = await exportToCSV();
      downloadFile(csv, `小刘裁缝铺_账本表格_${getDateStr()}.csv`, 'text/csv;charset=utf-8;');
      setMessage({ type: 'success', text: 'Excel 表格已下载' });
    } catch (e) {
      setMessage({ type: 'error', text: '导出失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const orders = await getOrders();
      if (!orders.length) {
        setMessage({ type: 'error', text: '暂无订单可导出' });
        setLoading(false);
        return;
      }
      const doc = await generateOrdersPDF({ orders });
      doc.save(`小刘裁缝铺_订单汇总_${getDateStr()}.pdf`);
      setMessage({ type: 'success', text: 'PDF 已生成并下载' });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'PDF 导出失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const getDateStr = () => new Date().toISOString().slice(0, 10);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const count = await importData(json);
        setMessage({ type: 'success', text: `成功恢复了 ${count} 条记录` });
        onRefresh();
      } catch (err) {
        setMessage({ type: 'error', text: '文件格式错误，请确保上传的是系统备份(.json)文件' });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      // Chrome/Edge 等浏览器
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setMessage({ type: 'success', text: '正在安装到桌面...' });
      }
      setDeferredPrompt(null);
    } else {
      // iOS Safari 或其他浏览器，显示手动安装说明
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        setMessage({ 
          type: 'success', 
          text: 'iOS 用户：点击浏览器底部"分享"按钮，选择"添加到主屏幕"即可' 
        });
      } else if (isAndroid) {
        setMessage({ 
          type: 'success', 
          text: 'Android 用户：点击浏览器菜单，选择"添加到主屏幕"或"安装应用"' 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: '请使用浏览器菜单中的"安装应用"或"添加到主屏幕"功能' 
        });
      }
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">数据管理</h2>

      {message && (
        <div className={`p-4 rounded-xl mb-6 flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle size={20} className="mr-2"/> : <AlertTriangle size={20} className="mr-2"/>}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        
        {/* PWA Install Section */}
        {!isInstalled && (
          <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-6 rounded-2xl shadow-lg border border-brand-400">
            <div className="flex items-center mb-4 text-white">
              <Smartphone className="w-6 h-6 mr-2" />
              <h3 className="font-bold text-lg">添加到桌面</h3>
            </div>
            <p className="text-white/90 text-sm mb-4 leading-relaxed">
              将应用添加到手机桌面，像原生 APP 一样快速打开，无需每次输入网址。
            </p>
            <button 
              onClick={handleInstallPWA}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 bg-white text-brand-600 font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              {deferredPrompt ? '立即添加到桌面' : '查看安装说明'}
            </button>
          </div>
        )}

        {/* Export Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-4 text-brand-600">
                <FileSpreadsheet className="w-6 h-6 mr-2" />
                <h3 className="font-bold text-lg">导出账本</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                导出为 Excel 可读的表格文件，方便在电脑上查看所有订单、价格和备注。
            </p>
             <button 
                onClick={handleExportExcel}
                disabled={loading}
                className="w-full flex items-center justify-center py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition-colors"
            >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                导出 Excel 表格
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 mt-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-5 h-5 mr-2" />
              导出 PDF 汇总
            </button>
        </div>

        {/* System Backup Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-4 text-gray-700">
                <Database className="w-6 h-6 mr-2" />
                <h3 className="font-bold text-lg">系统备份与迁移</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                如果您要换手机，或者防止清理缓存导致图片丢失，请使用此功能下载包含所有图片数据的备份文件。
            </p>

            <div className="space-y-3">
                <button 
                    onClick={handleExportJSON}
                    disabled={loading}
                    className="w-full flex items-center justify-center py-3 bg-brand-50 text-brand-700 font-bold rounded-xl border border-brand-100 hover:bg-brand-100 transition-colors"
                >
                    <Download className="w-5 h-5 mr-2" />
                    下载系统备份 (JSON)
                </button>

                <div className="relative">
                    <button 
                         disabled={loading}
                        className="w-full flex items-center justify-center py-3 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-5 h-5 mr-2" />
                        恢复备份 (上传JSON)
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                    />
                </div>
            </div>
        </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-2">关于小刘裁缝铺</h3>
             <p className="text-sm text-gray-500">
                 版本 v2.0.0 (免登录云端版)<br/>
                 数据实时同步到 Supabase，任意设备打开即可使用。<br/>
                 建议每周导出一次 Excel 或备份以防丢失。
             </p>
         </div>
      </div>
    </div>
  );
};