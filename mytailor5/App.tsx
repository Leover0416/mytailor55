import React, { useState, useEffect } from 'react';
import { ViewState, Order } from './types';
import { getOrders } from './services/db';
import { supabase } from './services/supabase';
import { Navigation } from './components/Navigation';
import { Stats } from './components/Stats';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthenticated(!!session);
      } catch (error) {
        console.error('认证检查失败:', error);
        setAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      if (session) {
        fetchOrders();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchOrders();
    }
  }, [authenticated]);

  const handleAddSuccess = () => {
    fetchOrders();
    setView('list');
  };

  const handleAuthSuccess = () => {
    setAuthenticated(true);
    fetchOrders();
  };

  // 显示认证界面
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="text-brand-600 font-bold animate-pulse text-xl">小刘裁缝铺...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="text-brand-600 font-bold animate-pulse text-xl">加载中...</div>
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