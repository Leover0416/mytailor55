import jsPDF from 'jspdf';
import { Order } from '../types';

interface PdfOptions {
  orders: Order[];
  title?: string;
}

const formatCurrency = (value: number) => {
  return `¥${(value || 0).toFixed(2)}`;
};

export const generateOrdersPDF = ({ orders, title = '小刘裁缝铺订单汇总' }: PdfOptions) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const lineHeight = 6;
  let cursorY = 20;

  const addHeader = () => {
    doc.setFontSize(16);
    doc.text(title, margin, cursorY);
    cursorY += lineHeight + 2;
    doc.setFontSize(11);
    const summary = `生成时间: ${new Date().toLocaleString('zh-CN')}`;
    doc.text(summary, margin, cursorY);
    cursorY += lineHeight;

    const totalRevenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);
    const totalText = `订单数量: ${orders.length}，累计金额: ${formatCurrency(totalRevenue)}`;
    doc.text(totalText, margin, cursorY);
    cursorY += lineHeight * 2;
  };

  const checkPage = (extra = 0) => {
    if (cursorY + extra > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  addHeader();

  orders.forEach((order, index) => {
    checkPage(lineHeight * 6);
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${order.customerName || '未填写'}`, margin, cursorY);
    doc.setFontSize(10);
    doc.text(`${formatCurrency(order.price)} · ${order.status === 'completed' ? '已完成' : '待处理'}`, pageWidth - margin - 50, cursorY);
    cursorY += lineHeight;

    doc.setFontSize(9);
    const dateText = `时间：${new Date(order.createdAt).toLocaleString('zh-CN')} (${order.source === 'offline' ? '线下' : '线上'})`;
    doc.text(dateText, margin, cursorY);
    cursorY += lineHeight;

    if (order.tags?.length) {
      doc.text(`标签：${order.tags.join(' / ')}`, margin, cursorY);
      cursorY += lineHeight;
    }

    if (order.note) {
      const textWidth = pageWidth - margin * 2;
      const noteLines = doc.splitTextToSize(`备注：${order.note}`, textWidth);
      doc.text(noteLines, margin, cursorY);
      cursorY += noteLines.length * lineHeight;
    }

    const imgSummary = order.images?.length ? `${order.images.length} 张图片` : '无图片';
    doc.text(`图片：${imgSummary}，系统 ID：${order.id}`, margin, cursorY);
    cursorY += lineHeight + 2;

    doc.setDrawColor(230);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += lineHeight / 2;
  });

  return doc;
};

