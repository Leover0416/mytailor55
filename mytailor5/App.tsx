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

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (e) {
      console.error('Failed to fetch orders', e);
    } finally {
      setLoading(false);
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