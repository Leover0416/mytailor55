import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order } from '../types';

interface PdfOptions {
  orders: Order[];
  title?: string;
}

const formatCurrency = (value: number) => `¥${(value || 0).toFixed(2)}`;

const chunkOrders = (orders: Order[], size: number) => {
  const chunks: Order[][] = [];
  for (let i = 0; i < orders.length; i += size) {
    chunks.push(orders.slice(i, i + size));
  }
  return chunks;
};

const createChunkElement = (
  title: string,
  orders: Order[],
  chunkIndex: number,
  summaryText: string
) => {
  const wrapper = document.createElement('div');
  wrapper.style.width = '800px';
  wrapper.style.padding = '24px';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#111827';
  wrapper.style.fontFamily = '"PingFang SC","Noto Sans SC",sans-serif';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';

  if (chunkIndex === 0) {
    const header = document.createElement('div');
    header.style.marginBottom = '16px';

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.margin = '0';
    titleEl.style.fontSize = '24px';
    header.appendChild(titleEl);

    const infoEl = document.createElement('p');
    infoEl.textContent = summaryText;
    infoEl.style.margin = '8px 0 0 0';
    infoEl.style.fontSize = '14px';
    infoEl.style.color = '#6b7280';
    header.appendChild(infoEl);

    wrapper.appendChild(header);
  }

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const headers = ['顾客', '金额 / 状态', '日期', '标签', '备注'];
  headers.forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.borderBottom = '1px solid #e5e7eb';
    th.style.padding = '8px';
    th.style.textAlign = text === '备注' ? 'left' : 'center';
    th.style.color = '#374151';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  orders.forEach(order => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #f3f4f6';

    const customerTd = document.createElement('td');
    customerTd.textContent = order.customerName || '未填写';
    customerTd.style.padding = '8px';
    customerTd.style.fontWeight = '600';
    tr.appendChild(customerTd);

    const priceTd = document.createElement('td');
    priceTd.textContent = `${formatCurrency(order.price)} · ${
      order.status === 'completed' ? '已完成' : '待处理'
    }`;
    priceTd.style.padding = '8px';
    priceTd.style.textAlign = 'center';
    tr.appendChild(priceTd);

    const dateTd = document.createElement('td');
    dateTd.textContent = new Date(order.createdAt).toLocaleString('zh-CN');
    dateTd.style.padding = '8px';
    dateTd.style.textAlign = 'center';
    tr.appendChild(dateTd);

    const tagTd = document.createElement('td');
    tagTd.textContent = order.tags?.length ? order.tags.join(' / ') : '-';
    tagTd.style.padding = '8px';
    tagTd.style.textAlign = 'center';
    tr.appendChild(tagTd);

    const noteTd = document.createElement('td');
    const noteText = order.note || '无备注';
    noteTd.textContent = noteText.length > 60 ? `${noteText.slice(0, 60)}...` : noteText;
    noteTd.style.padding = '8px';
    noteTd.style.color = '#4b5563';
    noteTd.style.textAlign = 'left';
    tr.appendChild(noteTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
};

export const generateOrdersPDF = async ({
  orders,
  title = '小刘裁缝铺订单汇总',
}: PdfOptions) => {
  if (typeof document === 'undefined') {
    throw new Error('PDF 导出仅支持在浏览器中执行');
  }

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  const summaryText = `生成时间：${new Date().toLocaleString('zh-CN')} · 订单数量：${
    orders.length
  } · 累计金额：${formatCurrency(totalRevenue)}`;

  const chunkSize = 14;
  const chunks = chunkOrders(orders, chunkSize);

  for (let index = 0; index < chunks.length; index++) {
    const chunkElement = createChunkElement(title, chunks[index], index, summaryText);
    document.body.appendChild(chunkElement);

    const canvas = await html2canvas(chunkElement, {
      scale: 2,
      useCORS: true,
    });

    document.body.removeChild(chunkElement);

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (index > 0) {
      doc.addPage();
    }

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  return doc;
};

