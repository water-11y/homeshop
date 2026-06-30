export const formatPrice = (value) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

export const statusLabel = (status) => {
  return {
    paid: 'Paid',
    preparing: 'Preparing',
    shipping: 'Shipping',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  }[status] || status;
};
