/**
 * Centralized Payment & Bank Transfer Configuration
 * Đảm bảo đồng nhất 100% giữa màn hình Checkout, Thank You / OrderSuccess và QR Code.
 */
export const PAYMENT_CONFIG = {
  BANK_TRANSFER: {
    bankName: 'MBBank (Quân Đội)',
    bankBin: '970422',
    accountNumber: '888866889999',
    accountNumberFormatted: '8888 6688 9999',
    accountHolder: 'CONG TY CURVE AND CONFIDENCE',
    isSandbox: true,
  },
  VNPAY: {
    tmnCode: 'X23LQ8KA',
    payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    version: '2.1.0',
    command: 'pay',
    currCode: 'VND',
    locale: 'vn',
    orderType: 'other',
  },
};
