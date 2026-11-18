# GoatSports Frontend Client

Ứng dụng web dành cho **người chơi** (Angular 21, Tailwind CSS 4). Chủ sân và quản trị viên dùng app
`goat-sports-admin`; đăng nhập / đăng ký nằm ở app `goat-sports-auth`.

## Chức năng

| Trang (`src/app/presentation/pages/client`) | Nội dung |
|---|---|
| `home` | Trang chủ: sân gần bạn / dành cho bạn, kèo đang mở, lịch hôm nay |
| `venues`, `booking`, `payment` | Tìm sân trên danh sách và bản đồ (Leaflet), đặt sân, cọc VietQR, vé QR, hủy sân |
| `matchmaking` | Ghép trận AI theo các bước, chấp nhận kèo, nhập tỷ số, đánh giá đối thủ |
| `feed` | Cộng đồng: bảng tin, kèo tìm người chơi, bạn bè, gợi ý theo dõi |
| `chat` | Nhắn tin realtime (STOMP qua gateway) |
| `clubs`, `tournaments` | Câu lạc bộ, giải đấu, đăng ký đội |
| `notifications`, `settings` | Thông báo realtime, tài khoản, quyền riêng tư, xóa tài khoản |
| `policy/*` | Chính sách đặt sân, hủy sân, quyền riêng tư, tiêu chuẩn sân, liên hệ hỗ trợ |

Trợ lý GOAT AI (chatbot RAG) hiện ở nút nổi trên các trang.

## Cấu trúc

Mã nguồn theo Clean Architecture, quy tắc phụ thuộc mô tả trong [src/app/ARCHITECTURE.md](src/app/ARCHITECTURE.md):

```
src/app/
├── domain/          # model thuần
├── application/     # port, DTO, use case
├── infrastructure/  # gọi API (HttpClient), repository, cấu hình endpoint
└── presentation/    # trang, component, layout dùng chung (@shared)
```

`npm run check:architecture` kiểm tra import sai tầng; lệnh này cũng chạy trước mỗi lần build production.

## Cấu hình

`src/environments/environment.ts` đọc biến môi trường lúc build:

| Biến | Mặc định |
|---|---|
| `NG_APP_API_URL` | `http://localhost:7070` (API Gateway) |
| `NG_APP_AUTH_API_URL` | `http://localhost:4400` (app đăng nhập) |
| `NG_APP_ADMIN_API_URL` | `http://localhost:4300` (app quản trị) |
| `NG_APP_KEYCLOAK_URL`, `NG_APP_KEYCLOAK_REALM`, `NG_APP_KEYCLOAK_CLIENT_ID` | Keycloak cho đăng nhập Google |

## Chạy

```bash
npm install
npm start                 # http://localhost:4200
npm run build
npm test                  # unit test
npm run test:e2e:install  # cài Chromium cho Playwright (một lần)
npm run test:e2e          # kiểm thử end-to-end (thư mục e2e/)
```

## Triển khai

Build và host trên Vercel.
