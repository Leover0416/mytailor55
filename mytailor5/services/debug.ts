// 调试工具：检查图片和 Storage 配置
import { supabase } from './supabase';

export const debugImages = async () => {
  console.log('=== 开始调试图片问题 ===');
  
  // 1. 检查用户登录状态
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ 用户未登录:', authError);
    return;
  }
  console.log('✅ 用户已登录:', user.id);
  
  // 2. 检查订单数据
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, images, customer_name')
    .limit(5);
  
  if (ordersError) {
    console.error('❌ 获取订单失败:', ordersError);
    return;
  }
  
  console.log('✅ 找到订单数量:', orders?.length || 0);
  
  // 3. 检查图片路径格式
  orders?.forEach((order, index) => {
    console.log(`\n订单 ${index + 1}:`, order.customer_name);
    console.log('图片数组:', order.images);
    
    if (order.images && Array.isArray(order.images) && order.images.length > 0) {
      order.images.forEach((img: string, imgIndex: number) => {
        console.log(`  图片 ${imgIndex + 1}:`, img);
        console.log(`  类型:`, typeof img);
        console.log(`  是否以 orders/ 开头:`, img.startsWith('orders/'));
        console.log(`  是否以 http 开头:`, img.startsWith('http'));
        console.log(`  是否以 data: 开头:`, img.startsWith('data:'));
      });
    } else {
      console.log('  ⚠️ 没有图片');
    }
  });
  
  // 4. 检查 Storage 存储桶
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ 获取存储桶失败:', bucketsError);
  } else {
    console.log('\n✅ Storage 存储桶:');
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? '公开' : '私有'})`);
    });
    
    const ordersBucket = buckets?.find(b => b.name === 'orders');
    if (!ordersBucket) {
      console.error('❌ 找不到 orders 存储桶！');
    } else {
      console.log('✅ orders 存储桶存在');
    }
  }
  
  // 5. 测试生成签名 URL
  if (orders && orders.length > 0 && orders[0].images && orders[0].images.length > 0) {
    const testImagePath = orders[0].images[0];
    if (testImagePath.startsWith('orders/')) {
      const filePath = testImagePath.replace('orders/', '');
      console.log('\n测试生成签名 URL...');
      console.log('文件路径:', filePath);
      
      const { data: signedData, error: signedError } = await supabase.storage
        .from('orders')
        .createSignedUrl(filePath, 3600);
      
      if (signedError) {
        console.error('❌ 生成签名 URL 失败:', signedError);
        console.error('错误详情:', JSON.stringify(signedError, null, 2));
      } else {
        console.log('✅ 签名 URL 生成成功:', signedData.signedUrl);
      }
    }
  }
  
  console.log('\n=== 调试完成 ===');
};

// 在浏览器控制台调用：window.debugImages()
if (typeof window !== 'undefined') {
  (window as any).debugImages = debugImages;
}

