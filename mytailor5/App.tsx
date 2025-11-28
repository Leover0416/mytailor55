import React, { useState, useEffect } from 'react';
import { ViewState, Order } from './types';
import { getOrders } from './services/db';
import { Navigation } from './components/Navigation';
import { Stats } from './components/Stats';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { Settings } from './components/Settings';
import './services/debug';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueOrders, setOverdueOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
      const overdue = data.filter(o => {
        if (o.status !== 'pending') return false;
        const days = (Date.now() - o.createdAt) / (1000 * 60 * 60 * 24);
        return days >= 5;
      });
      setOverdueOrders(overdue);
      notifyOverdue(overdue);
    } catch (e) {
      console.error('Failed to fetch orders', e);
    } finally {
      setLoading(false);
    }
  };

  const notifyOverdue = (list: Order[]) => {
    if (!list.length || typeof window === 'undefined' || !('Notification' in window)) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastNotified = localStorage.getItem('overdue-notified-date');
    if (lastNotified === todayKey) return;

    if (Notification.permission === 'granted') {
      new Notification('有积压订单需要处理', {
        body: `共有 ${list.length} 个订单超过 5 天未完成，点开查看详情。`,
      });
      localStorage.setItem('overdue-notified-date', todayKey);
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(result => {
        if (result === 'granted') {
          new Notification('有积压订单需要处理', {
            body: `共有 ${list.length} 个订单超过 5 天未完成，点开查看详情。`,
          });
          localStorage.setItem('overdue-notified-date', todayKey);
        }
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddSuccess = () => {
    fetchOrders();
    setView('list');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="text-brand-600 font-bold animate-pulse text-xl">小刘裁缝铺...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-brand-200">
      {overdueOrders.length > 0 && (
        <div className="max-w-md mx-auto px-4 pt-2">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-red-700 font-bold text-sm">
                {`有 ${overdueOrders.length} 个订单超过 5 天未完成`}
              </p>
              <p className="text-xs text-red-500 mt-1">
                {overdueOrders
                  .slice(0, 3)
                  .map(o => o.customerName || '未命名')
                  .join('、')}
                {overdueOrders.length > 3 ? '...' : ''}
              </p>
            </div>
            <button
              onClick={() => setView('list')}
              className="text-xs font-bold text-red-700 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100 transition-colors"
            >
              去处理
            </button>
          </div>
        </div>
      )}
      <main className="max-w-md mx-auto bg-[#f8fafc] min-h-screen relative">
        {view === 'dashboard' && <Stats orders={orders} />}
        {view === 'add' && <OrderForm onSuccess={handleAddSuccess} />}
        {view === 'list' && <OrderList orders={orders} onRefresh={fetchOrders} />}
        {view === 'settings' && <Settings onRefresh={fetchOrders} />}
      </main>
      <Navigation currentView={view} setView={setView} />
    </div>
  );
}

export default App;