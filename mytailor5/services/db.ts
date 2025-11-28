import { Order } from '../types';
import { supabase } from './supabase';

const STORAGE_BUCKET = 'orders';
const STORAGE_ROOT_FOLDER = 'public';
const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000001';
const SIGNED_URL_TTL = 60 * 60; // 1 小时

// ============ 图片处理函数 ============

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
           resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
           reject('Canvas context failed');
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// ============ 图片上传到 Supabase Storage ============

/**
 * 将 base64 图片上传到 Supabase Storage
 * @param base64Data base64 格式的图片数据
 * @param orderId 订单 ID
 * @param index 图片索引
 * @returns 图片的公开 URL
 */
const uploadImageToStorage = async (
  base64Data: string,
  orderId: string,
  index: number
): Promise<string> => {
  try {
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();
    
    const fileExt = 'jpg';
    const fileName = `${STORAGE_ROOT_FOLDER}/${orderId}/${index}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    return fileName;
  } catch (error) {
    console.error('图片上传失败:', error);
    return base64Data;
  }
};

/**
 * 批量上传图片
 */
const uploadImages = async (images: string[], orderId: string): Promise<string[]> => {
  const uploadPromises = images.map((img, index) => {
    if (
      img.startsWith('http://') ||
      img.startsWith('https://') ||
      img.startsWith(`${STORAGE_ROOT_FOLDER}/`) ||
      img.startsWith('orders/')
    ) {
      return Promise.resolve(img);
    }
    return uploadImageToStorage(img, orderId, index);
  });
  
  return Promise.all(uploadPromises);
};

/**
 * 获取可访问的图片 URL（支持 Private 存储桶）
 */
export const getImageUrl = async (imagePath: string): Promise<string> => {
  if (!imagePath || typeof imagePath !== 'string') {
    console.warn('无效的图片路径:', imagePath);
    return '';
  }
  
  try {
    if (imagePath.startsWith('data:image') || imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // 兼容旧数据：以 orders/ 开头的路径带有存储桶前缀
    if (imagePath.startsWith('orders/')) {
      const normalized = imagePath.replace(/^orders\//, '');
      if (!normalized) {
        console.error('无效的文件路径:', imagePath);
        return imagePath;
      }

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(normalized, SIGNED_URL_TTL);

      if (error || !data?.signedUrl) {
        console.error('生成签名 URL 失败:', error);
        return imagePath;
      }

      return data.signedUrl;
    }

    // 新数据：直接存储 bucket 内的路径
    if (imagePath.startsWith(`${STORAGE_ROOT_FOLDER}/`)) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(imagePath, SIGNED_URL_TTL);

      if (error || !data?.signedUrl) {
        console.error('生成签名 URL 失败:', error);
        return imagePath;
      }

      return data.signedUrl;
    }
    
    console.warn('未知的图片路径格式:', imagePath);
    return imagePath;
  } catch (error) {
    console.error('获取图片 URL 失败:', error);
    console.error('图片路径:', imagePath);
    return imagePath;
  }
};

// ============ 数据操作函数 ============

/**
 * 将数据库记录转换为 Order 类型
 */
const dbToOrder = (dbOrder: any): Order => {
  return {
    id: dbOrder.id,
    customerName: dbOrder.customer_name,
    createdAt: dbOrder.created_at,
    completedAt: dbOrder.completed_at || undefined,
    images: dbOrder.images || [],
    note: dbOrder.note || '',
    price: Number(dbOrder.price),
    status: dbOrder.status as 'pending' | 'completed',
    source: dbOrder.source as 'online' | 'offline' | undefined,
    tags: dbOrder.tags || [],
  };
};

/**
 * 将 Order 类型转换为数据库记录
 */
const orderToDb = (order: Order): any => {
  return {
    customer_name: order.customerName,
    created_at: order.createdAt,
    completed_at: order.completedAt || null,
    images: order.images || [],
    note: order.note || '',
    price: order.price,
    status: order.status,
    source: order.source || null,
    tags: order.tags || [],
  };
};

// 生成 UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const saveOrder = async (order: Order): Promise<void> => {
  try {
    let orderId = order.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isNewOrder = !orderId || !uuidRegex.test(orderId);
    
    if (isNewOrder) {
      orderId = generateUUID();
    }

    const uploadedImages = await uploadImages(order.images, orderId);

    const dbData: any = {
      ...orderToDb({ ...order, images: uploadedImages }),
      user_id: PUBLIC_USER_ID,
      id: orderId,
    };

    const { data: savedData, error } = await supabase
      .from('orders')
      .upsert(dbData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    
    if (savedData) {
      order.id = savedData.id;
    }
  } catch (error) {
    console.error('保存订单失败:', error);
    throw new Error('保存订单失败: ' + (error as Error).message);
  }
};

export const updateOrder = async (order: Order): Promise<void> => {
  return saveOrder(order);
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = (data || []).map(dbToOrder);
    
    return orders.map(o => {
      let images = o.images || [];
      
      if ((!images || images.length === 0) && (o as any).imageBase64) {
        images = [(o as any).imageBase64];
      }
      
      if (!Array.isArray(images)) {
        images = [];
      }
      
      images = images.filter(img => img && img.trim() !== '');
      
      return {
        ...o,
        images
      };
    });
  } catch (error) {
    console.error('获取订单失败:', error);
    throw new Error('获取订单失败: ' + (error as Error).message);
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    try {
      const files = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(`${STORAGE_ROOT_FOLDER}/${id}/`);
      
      if (files.data && files.data.length > 0) {
        const filePaths = files.data.map(f => `${STORAGE_ROOT_FOLDER}/${id}/${f.name}`);
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filePaths);
      }
    } catch (storageError) {
      console.warn('删除图片文件失败:', storageError);
    }
  } catch (error) {
    console.error('删除订单失败:', error);
    throw new Error('删除订单失败: ' + (error as Error).message);
  }
};

// ============ 水印图片生成 ============

function getLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split('');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + word).width;
        if (width < maxWidth) {
            currentLine += word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

const loadImage = async (src: string): Promise<HTMLImageElement> => {
    // 如果是 Storage 路径，先获取签名 URL
    const imageUrl = await getImageUrl(src);
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        // 设置超时
        const timeout = setTimeout(() => {
            reject(new Error('图片加载超时: ' + src));
        }, 30000); // 30秒超时
        
        img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
        };
        
        img.onerror = (e) => {
            clearTimeout(timeout);
            console.error('图片加载失败:', imageUrl, e);
            reject(new Error('图片加载失败: ' + src));
        };
        
        img.src = imageUrl;
    });
};

export const generateWatermarkedImage = async (order: Order): Promise<string> => {
    try {
        console.log('开始生成水印图片，订单:', order.id);
        console.log('图片列表:', order.images);
        
        // 先获取所有图片的可访问 URL
        const imageUrls = await Promise.all(
            order.images.map(img => getImageUrl(img))
        );
        
        console.log('获取到的图片 URL:', imageUrls);
        
        // 加载所有图片
        const images = await Promise.all(imageUrls.map(url => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                
                const timeout = setTimeout(() => {
                    reject(new Error('图片加载超时: ' + url));
                }, 30000);
                
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve(img);
                };
                
                img.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error('加载图片失败:', url, e);
                    reject(new Error('加载图片失败: ' + url));
                };
                
                img.src = url;
            });
        }));
        
        if (images.length === 0) throw new Error("No images");

        // Settings for the canvas
        const canvasWidth = images[0].width; // Use first image width as reference
        const padding = Math.max(28, Math.floor(canvasWidth / 22));
        const fontSize = padding;
        const lineHeight = fontSize * 1.5;

        // Calculate heights
        // We scale all images to match the width of the first image (or a fixed max width)
        const scaledHeights = images.map(img => (canvasWidth / img.width) * img.height);
        const totalImagesHeight = scaledHeights.reduce((a, b) => a + b, 0);

        // Prepare Text Box Logic (Virtual calculation first)
        const dummyCanvas = document.createElement('canvas');
        const dummyCtx = dummyCanvas.getContext('2d');
        if(!dummyCtx) throw new Error("Canvas error");
        dummyCtx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
        
        const maxWidth = canvasWidth - (padding * 2);
        const notePrefix = "备注: ";
        const noteText = order.note || "无";
        const fullNote = notePrefix + noteText;
        const rawLines = fullNote.split('\n');
        let finalNoteLines: string[] = [];
        rawLines.forEach(line => {
             finalNoteLines = [...finalNoteLines, ...getLines(dummyCtx, line, maxWidth)];
        });

        const headerHeight = (lineHeight * 2) + (padding / 2);
        const separatorHeight = 20;
        const noteHeight = finalNoteLines.length * lineHeight;
        const textBoxHeight = padding + headerHeight + separatorHeight + noteHeight + padding;

        // Create actual canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = totalImagesHeight + textBoxHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context error");

        // 1. Draw Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Images Vertically
        let currentY = 0;
        images.forEach((img, index) => {
            const h = scaledHeights[index];
            ctx.drawImage(img, 0, currentY, canvasWidth, h);
            currentY += h;
            
            // Optional: Draw a thin divider line between images if it's not the last one
            if (index < images.length - 1) {
                ctx.fillStyle = "#f3f4f6";
                ctx.fillRect(0, currentY - 2, canvasWidth, 2);
            }
        });

        // 3. Draw Info Box at the bottom
        const boxY = totalImagesHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, boxY, canvas.width, textBoxHeight);

        // Status bar color
        ctx.fillStyle = order.status === 'completed' ? '#22c55e' : '#ea580c';
        ctx.fillRect(0, boxY, canvas.width, 8);

        let textY = boxY + padding + fontSize;

        // Header info
        ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = '#1f2937'; 
        ctx.fillText(`顾客: ${order.customerName || '未填写'}`, padding, textY);
        
        ctx.fillStyle = '#dc2626';
        const priceLine = `价格: ¥${order.price}`;
        const priceWidth = ctx.measureText(priceLine).width;
        ctx.fillText(priceLine, canvas.width - padding - priceWidth, textY);
        
        textY += lineHeight;

        const sourceText = order.source === 'offline' ? '线下实体' : '线上闲鱼';
        const dateLine = `时间: ${new Date(order.createdAt).toLocaleDateString('zh-CN')} (${sourceText})`;
        ctx.fillStyle = '#6b7280'; 
        ctx.fillText(dateLine, padding, textY);
        
        textY += (padding / 2); 

        // Separator
        ctx.beginPath();
        ctx.moveTo(padding, textY + (separatorHeight/2));
        ctx.lineTo(canvas.width - padding, textY + (separatorHeight/2));
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        textY += separatorHeight + (fontSize / 2);

        // Note Body
        ctx.font = `normal ${fontSize}px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = '#374151'; 

        finalNoteLines.forEach(line => {
            ctx.fillText(line, padding, textY);
            textY += lineHeight;
        });

        return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// ============ 数据导出/导入 ============

export const exportToCSV = async (): Promise<string> => {
  const orders = await getOrders();
  let csvContent = "\uFEFF"; 
  csvContent += "顾客姓名/单号,来源,状态,标签,价格(元),日期,具体时间,发货时间,图片数量,衣物备注,系统ID\n";

  orders.forEach(order => {
    const d = new Date(order.createdAt);
    const dateStr = d.toLocaleDateString('zh-CN');
    const timeStr = d.toLocaleTimeString('zh-CN');
    const statusStr = order.status === 'completed' ? '已发货' : '待处理';
    const sourceStr = order.source === 'offline' ? '线下' : '线上';
    const completedStr = order.completedAt ? new Date(order.completedAt).toLocaleDateString('zh-CN') : '-';
    const imgCount = order.images ? order.images.length : ((order as any).imageBase64 ? 1 : 0);
    const tagsStr = order.tags ? order.tags.join(';') : '';
    
    const safeNote = `"${(order.note || '').replace(/"/g, '""')}"`;
    const safeName = `"${(order.customerName || '').replace(/"/g, '""')}"`;
    const safeTags = `"${tagsStr.replace(/"/g, '""')}"`;
    
    const row = `${safeName},${sourceStr},${statusStr},${safeTags},${order.price},${dateStr},${timeStr},${completedStr},${imgCount}张,${safeNote},${order.id}`;
    csvContent += row + "\n";
  });

  return csvContent;
};

export const exportData = async (): Promise<string> => {
  const orders = await getOrders();
  const data = JSON.stringify(orders);
  return data;
};

export const importData = async (jsonString: string): Promise<number> => {
  try {
    const orders: any[] = JSON.parse(jsonString);
    if (!Array.isArray(orders)) throw new Error("Invalid format");
    
    let count = 0;
    for (const raw of orders) {
      // Compatibility migration during import
      const order: Order = {
          ...raw,
          images: raw.images || (raw.imageBase64 ? [raw.imageBase64] : [])
      };
      
      if (order.id && order.images.length > 0) {
        await saveOrder(order);
        count++;
      }
    }
    
    return count;
  } catch (e) {
    console.error(e);
    throw new Error("Import failed");
  }
};
