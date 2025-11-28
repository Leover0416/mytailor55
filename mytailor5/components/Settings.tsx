import React, { useRef, useState } from 'react';
import { Download, Upload, Database, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { exportData, importData, exportToCSV } from '../services/db';

interface Props {
  onRefresh: () => void;
}

export const Settings: React.FC<Props> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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