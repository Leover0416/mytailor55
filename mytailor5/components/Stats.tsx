
import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, YAxis } from 'recharts';
import { TrendingUp, ShoppingBag, Calendar, AlertCircle, CheckCircle2, Clock, ChevronLeft, ChevronRight, Package, User, PieChart, LayoutList, XCircle, MapPin, Globe } from 'lucide-react';
import { ImageDisplay } from './ImageDisplay';

interface Props {
  orders: Order[];
  onRefresh?: () => void;
}

export const Stats: React.FC<Props> = ({ orders, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // --- WEEKLY VIEW STATE ---
  // Initialize to the start of the current week (Monday)
  const [startOfWeek, setStartOfWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7; // Get current day number, convert Sun(0) to 7
    if (day !== 1) d.setHours(-24 * (day - 1)); // Go back to Monday
    return d; 
  });
  // Default selected date to Today for weekly view
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('zh-CN'));

  // --- MONTHLY VIEW STATE ---
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- HANDLERS ---
  const handleWeekChange = (offset: number) => {
      const newDate = new Date(startOfWeek);
      newDate.setDate(newDate.getDate() + (offset * 7));
      setStartOfWeek(newDate);
  };

  const handleMonthChange = (offset: number) => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + offset);
      setCurrentMonth(newDate);
  };

  // --- WEEKLY DATA CALCULATION ---
  const weekDays = useMemo(() => {
    const days = [];
    const curr = new Date(startOfWeek);
    for (let i = 0; i < 7; i++) {
        const d = new Date(curr);
        d.setDate(curr.getDate() + i);
        days.push(d);
    }
    return days;
  }, [startOfWeek]);

  const stats = useMemo(() => {
    const totalIncome = orders.reduce((sum, o) => sum + o.price, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending');
    
    // Critical Overdue Logic
    const now = Date.now();
    const criticalOrders = pendingOrders.filter(o => {
        const diff = (now - o.createdAt) / (1000 * 60 * 60 * 24);
        return diff > 5;
    });

    // Daily tasks for the calendar dots
    const tasksByDate: {[key: string]: {pending: number, completed: number}} = {};
    orders.forEach(o => {
        const d = new Date(o.createdAt).toLocaleDateString('zh-CN');
        if(!tasksByDate[d]) tasksByDate[d] = {pending: 0, completed: 0};
        if(o.status === 'completed') tasksByDate[d].completed++;
        else tasksByDate[d].pending++;
    });

    return { totalIncome, pendingCount: pendingOrders.length, criticalCount: criticalOrders.length, tasksByDate };
  }, [orders]);

  // Chart data: Last 7 days trend
  const weeklyTrendData = useMemo(() => {
     const data = [];
     for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('zh-CN', {month:'2-digit', day:'2-digit'});
        const fullDateStr = d.toLocaleDateString('zh-CN');
        
        const dayTotal = orders
            .filter(o => new Date(o.createdAt).toLocaleDateString('zh-CN') === fullDateStr)
            .reduce((sum, o) => sum + o.price, 0);
            
        data.push({ name: key, value: dayTotal });
     }
     return data;
  }, [orders]);

  const selectedDateOrders = useMemo(() => {
      return orders.filter(o => new Date(o.createdAt).toLocaleDateString('zh-CN') === selectedDateStr);
  }, [orders, selectedDateStr]);


  // --- MONTHLY DATA CALCULATION ---
  const monthlyData = useMemo(() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth(); // 0-indexed

      // Filter orders for this month
      const monthOrders = orders.filter(o => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === year && d.getMonth() === month;
      });

      const totalIncome = monthOrders.reduce((sum, o) => sum + o.price, 0);
      const totalCount = monthOrders.length;

      // Group by Week (Week 1: 1-7, Week 2: 8-14, etc.)
      const weeklyBreakdown = [
          { name: '第一周', range: '1日-7日', startDay: 1, endDay: 7, income: 0, count: 0, orders: [] as Order[] },
          { name: '第二周', range: '8日-14日', startDay: 8, endDay: 14, income: 0, count: 0, orders: [] as Order[] },
          { name: '第三周', range: '15日-21日', startDay: 15, endDay: 21, income: 0, count: 0, orders: [] as Order[] },
          { name: '第四周', range: '22日-28日', startDay: 22, endDay: 28, income: 0, count: 0, orders: [] as Order[] },
          { name: '第五周', range: '29日-月底', startDay: 29, endDay: 32, income: 0, count: 0, orders: [] as Order[] },
      ];

      monthOrders.forEach(o => {
          const day = new Date(o.createdAt).getDate();
          const weekIndex = weeklyBreakdown.findIndex(w => day >= w.startDay && day <= w.endDay);
          if (weekIndex !== -1) {
              weeklyBreakdown[weekIndex].income += o.price;
              weeklyBreakdown[weekIndex].count += 1;
              weeklyBreakdown[weekIndex].orders.push(o);
          }
      });

      // Filter out empty 5th week if simpler
      return { totalIncome, totalCount, weeklyBreakdown: weeklyBreakdown.filter(w => w.income > 0 || w.name !== '第五周') };
  }, [orders, currentMonth]);


  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28">
      {/* Header */}
      <header className="mb-4 px-1 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">小刘裁缝铺</h1>
            <p className="text-gray-500 text-xs mt-1">今天也要加油鸭 💪</p>
          </div>
          
          {/* View Switcher */}
          <div className="bg-gray-200 p-1 rounded-xl flex text-xs font-bold">
              <button 
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${viewMode === 'week' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
              >
                  <Calendar size={14} className="mr-1"/>
                  周视图
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg flex items-center transition-all ${viewMode === 'month' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
              >
                  <PieChart size={14} className="mr-1"/>
                  月报表
              </button>
          </div>
      </header>

      {/* Alert Section (Always Visible if Critical) */}
      {stats.criticalCount > 0 && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
              <div className="flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-bold text-sm">有 {stats.criticalCount} 个订单积压超过5天！</span>
              </div>
              <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full font-bold">急</span>
          </div>
      )}

      {/* ================= WEEK VIEW ================= */}
      {viewMode === 'week' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Weekly Calendar */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => handleWeekChange(-1)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                        <h3 className="font-bold text-gray-800 text-sm flex items-center">
                            <Calendar size={16} className="mr-2 text-brand-500"/>
                            {selectedDateStr === new Date().toLocaleDateString('zh-CN') ? '今天' : selectedDateStr} 的详情
                        </h3>
                        <span className="text-xs text-gray-400">
                            {weekDays[0].toLocaleDateString('zh-CN', {month:'numeric', day:'numeric'})} - {weekDays[6].toLocaleDateString('zh-CN', {month:'numeric', day:'numeric'})}
                        </span>
                    </div>
                    <button onClick={() => handleWeekChange(1)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                        <ChevronRight size={20} />
                    </button>
                </div>
                
                <div className="flex justify-between">
                    {weekDays.map((date, idx) => {
                        const dateStr = date.toLocaleDateString('zh-CN');
                        const isSelected = selectedDateStr === dateStr;
                        const isToday = new Date().toLocaleDateString('zh-CN') === dateStr;
                        const task = stats.tasksByDate[dateStr];
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedDateStr(dateStr)}
                                className={`flex flex-col items-center space-y-2 cursor-pointer p-1 rounded-xl transition-all ${isSelected ? 'bg-brand-50' : ''}`}
                            >
                                <span className={`text-xs ${isSelected ? 'text-brand-600 font-bold' : 'text-gray-400'}`}>
                                    {['一','二','三','四','五','六','日'][date.getDay() === 0 ? 6 : date.getDay() - 1]}
                                </span>
                                <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all
                                    ${isSelected 
                                        ? 'bg-brand-500 text-white shadow-md scale-110' 
                                        : isToday ? 'bg-gray-200 text-gray-800' : 'bg-transparent text-gray-700'}`}>
                                    {date.getDate()}
                                </div>
                                <div className="flex space-x-0.5 h-1.5">
                                    {task?.pending > 0 && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                                    {task?.completed > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Selected Date Orders List */}
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-3 ml-1 flex items-center">
                    <LayoutList size={16} className="mr-2 text-brand-600"/>
                    当日订单 ({selectedDateOrders.length})
                </h3>
                {selectedDateOrders.length > 0 ? (
                    <div className="space-y-3">
                        {selectedDateOrders.map(order => (
                            <div 
                                key={order.id} 
                                onClick={() => setSelectedOrder(order)}
                                className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <ImageDisplay src={order.images?.[0] || (order as any).imageBase64} className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" alt="mini"/>
                                    <div className="min-w-0">
                                        <div className="font-bold text-gray-800 text-sm truncate">{order.customerName}</div>
                                        <div className="text-xs text-gray-500 truncate">{order.note || '无备注'}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                    <span className="font-bold text-brand-600">¥{order.price}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {order.status === 'completed' ? '已发' : '未发'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">这一天没有记录哦</p>
                    </div>
                )}
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <div className="flex items-center text-orange-500 mb-1">
                        <Clock size={16} className="mr-2"/>
                        <span className="text-xs font-bold">全店积压</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.pendingCount} <span className="text-xs text-gray-400">单</span></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <div className="flex items-center text-green-600 mb-1">
                        <CheckCircle2 size={16} className="mr-2"/>
                        <span className="text-xs font-bold">累计总收入</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">¥{stats.totalIncome}</div>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-6">近7天收入趋势</h3>
                <div className="h-40 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyTrendData}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            formatter={(value: number) => [`¥${value}`, '']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* ================= MONTH VIEW ================= */}
      {viewMode === 'month' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Month Navigator */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{currentMonth.getFullYear()}年</div>
                    <div className="text-xl font-bold text-gray-900">{currentMonth.getMonth() + 1}月 报表</div>
                </div>
                <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Month Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-lg shadow-brand-200">
                     <div className="flex items-center text-brand-100 mb-1 text-xs font-bold">
                         <ShoppingBag size={14} className="mr-1"/>
                         本月总收入
                     </div>
                     <div className="text-3xl font-bold">¥{monthlyData.totalIncome}</div>
                 </div>
                 <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center">
                     <div className="flex items-center text-gray-400 mb-1 text-xs font-bold">
                         <Package size={14} className="mr-1"/>
                         本月接单
                     </div>
                     <div className="text-3xl font-bold text-gray-800">{monthlyData.totalCount} <span className="text-sm text-gray-400 font-normal">笔</span></div>
                 </div>
            </div>

            {/* Weekly Breakdown Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center">
                    <TrendingUp size={16} className="mr-2 text-brand-500"/>
                    每周收入对比
                </h3>
                <div className="h-56 w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData.weeklyBreakdown} layout="vertical" margin={{top:0, right:30, left:10, bottom:0}}>
                             <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6"/>
                             <XAxis type="number" hide />
                             <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false}/>
                             <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number) => [`¥${value}`, '收入']}
                             />
                             <Bar dataKey="income" radius={[0, 4, 4, 0]} barSize={20}>
                                {monthlyData.weeklyBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f97316' : '#fdba74'} />
                                ))}
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Weekly List */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 ml-1">周详情清单</h3>
                {monthlyData.weeklyBreakdown.length > 0 ? (
                    monthlyData.weeklyBreakdown.map((week, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50/50 p-4 flex justify-between items-center border-b border-gray-100">
                                <div>
                                    <div className="font-bold text-sm text-gray-900">{week.name} <span className="text-xs text-gray-400 font-normal ml-1">({week.range})</span></div>
                                    <div className="text-xs text-gray-500 mt-0.5">{week.count} 单</div>
                                </div>
                                <div className="text-brand-600 font-bold">¥{week.income}</div>
                            </div>
                            {week.orders.length > 0 && (
                                <div className="divide-y divide-gray-50">
                                    {week.orders.map(order => (
                                        <div 
                                            key={order.id} 
                                            onClick={() => setSelectedOrder(order)}
                                            className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.98]"
                                        >
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                                    <ImageDisplay src={order.images?.[0] || (order as any).imageBase64} className="w-full h-full object-cover"/>
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 truncate w-24">{order.customerName}</span>
                                            </div>
                                            <div className="flex items-center text-xs space-x-2">
                                                 <span className="text-gray-400">{new Date(order.createdAt).getDate()}日</span>
                                                 <span className="font-bold text-gray-900">¥{order.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-dashed">
                        本月暂无数据
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
              <div className="bg-white rounded-3xl w-full max-w-lg h-[85vh] overflow-hidden relative z-10 shadow-2xl flex flex-col">
                  
                  {/* Close Button */}
                  <div className="absolute top-4 right-4 z-20">
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/70"
                      >
                          <XCircle size={20} />
                      </button>
                  </div>

                  <div className="overflow-y-auto flex-1 bg-gray-50">
                      
                      {/* Image Section */}
                      <div className="bg-gray-100 flex flex-col space-y-1 pb-1">
                          {(selectedOrder.images && selectedOrder.images.length > 0 ? selectedOrder.images : [(selectedOrder as any).imageBase64]).map((img: string, idx: number) => (
                              <div key={idx} className="relative w-full">
                                  <ImageDisplay src={img} className="w-full h-auto object-cover" alt={`Detail ${idx+1}`} variant="full" />
                                  <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-lg text-xs backdrop-blur-md">
                                      {idx + 1} / {(selectedOrder.images || []).length || 1}
                                  </div>
                              </div>
                          ))}
                      </div>

                      {/* Content Section */}
                      <div className="p-6 space-y-6 bg-white rounded-t-3xl -mt-6 relative">
                           {/* Source Badge */}
                           <div className="flex justify-center -mt-10 mb-4">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white backdrop-blur-md shadow-lg flex items-center ${selectedOrder.source === 'offline' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                    {selectedOrder.source === 'offline' ? <MapPin size={12} className="mr-1"/> : <Globe size={12} className="mr-1"/>}
                                    {selectedOrder.source === 'offline' ? '线下实体' : '线上闲鱼'}
                                </span>
                           </div>

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
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50 relative z-20">
                      <button 
                          onClick={() => {
                              setSelectedOrder(null);
                              if (onRefresh) onRefresh();
                          }}
                          className="w-full py-4 rounded-2xl font-bold text-lg bg-brand-600 text-white shadow-lg transition-transform active:scale-95"
                      >
                          关闭
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
