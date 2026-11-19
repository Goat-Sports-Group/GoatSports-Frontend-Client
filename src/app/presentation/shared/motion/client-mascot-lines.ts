import { MascotLines } from './goat-mascot.component';

/** Lời thoại của linh vật dê trên app người chơi (khách + người chơi), theo tiền tố đường dẫn. */
export const CLIENT_MASCOT_LINES: MascotLines = {
  hello: 'Chào bạn! Mình là GOAT 🐐',
  hide: 'Ẩn linh vật',
  routes: [
    { prefix: '/home', text: 'Hôm nay ra sân không? Xem lịch và kèo hợp với bạn nè.' },
    { prefix: '/venues', text: 'Lọc theo môn, khu vực, giờ trống để tìm sân nhanh nhé!' },
    { prefix: '/venues/saved', text: 'Sân bạn đã lưu nằm hết ở đây.' },
    { prefix: '/booking/create', text: 'Chọn khung giờ rồi thanh toán, sân giữ cho bạn 15 phút ⏱️' },
    { prefix: '/booking/history', text: 'Đơn đặt sân của bạn, có cả vé QR để check-in.' },
    { prefix: '/my-bookings', text: 'Đơn đặt sân của bạn, có cả vé QR để check-in.' },
    { prefix: '/booking/detail', text: 'Đến sân thì đưa mã QR này cho chủ sân quét nhé.' },
    { prefix: '/payment/success', text: 'Thanh toán xong rồi! Hẹn gặp ở sân ⚽' },
    { prefix: '/payment/cancel', text: 'Thanh toán chưa xong, bạn thử lại giúp mình nha.' },
    { prefix: '/clubs', text: 'Tìm CLB cùng môn, cùng khu vực để chơi đều đặn.' },
    { prefix: '/clubs/my', text: 'CLB của bạn: lịch sinh hoạt, thành viên, giải đấu.' },
    { prefix: '/tournaments', text: 'Giải đấu đang mở đăng ký — rủ đội tham gia đi!' },
    { prefix: '/matchmaking', text: 'AI ghép kèo theo ELO, lịch rảnh và khoảng cách 🤖' },
    { prefix: '/ai-recommendation', text: 'Gợi ý được tính riêng cho bạn đó.' },
    { prefix: '/feed', text: 'Cộng đồng đang bàn gì hôm nay?' },
    { prefix: '/chat', text: 'Nhắn đồng đội chốt giờ đá nhé 💬' },
    { prefix: '/friends', text: 'Kết bạn với người từng chơi cùng để dễ rủ kèo.' },
    { prefix: '/notifications', text: 'Thông báo mới nhất nằm ở đây.' },
    { prefix: '/profile', text: 'Cập nhật hồ sơ để AI ghép kèo chuẩn hơn.' },
    { prefix: '/settings', text: 'Cài đặt tài khoản, bảo mật và quyền riêng tư.' },
    { prefix: '/claim', text: 'Bạn là chủ sân này? Nhận quản lý ngay.' },
    { prefix: '/policy', text: 'Chính sách và điều khoản của GOAT Sports.' }
  ],
  clicks: [
    'Sẵn sàng ra sân chưa? ⚽',
    'GOAT = Greatest Of All Time 🐐',
    'Cuối tuần đá một trận không?',
    'Nhớ khởi động trước khi chơi nha!',
    'Thua thì phục thù, thắng thì khao nước 😄'
  ]
};
