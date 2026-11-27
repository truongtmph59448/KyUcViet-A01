# Ký Ức Việt – Hồ sơ số di sản tư liệu (Mã A01)

Dự án xã hội phi lợi nhuận (không bán hàng, không thu phí, không quảng cáo) phục vụ tra cứu, học tập và hỗ trợ bảo tồn 13 di sản tư liệu Việt Nam được UNESCO ghi danh cùng 2 hồ sơ con chuyên đề Bia Tiến sĩ.

- **Sinh viên thực hiện:** Trần Mạnh Trường (PH59448 – Nhóm 1)
- **Chương trình:** Thực tập sinh Đợt 15 — FPT Polytechnic × IMTA TECH
- **Phạm vi:** Kế hoạch thực tập tuần 4 và tuần 5 (Mốc 05/11/2026)

## 1. Kiến trúc kỹ thuật đơn giản & ổn định trên Vercel

- **Dữ liệu tĩnh đã duyệt (`data/tulieu.json`, `data/sources.json`):**
  - Toàn bộ 15 hồ sơ công khai (13 di sản UNESCO: 4 Thế giới, 9 Khu vực + 2 hồ sơ con `A01-00014`, `A01-00015`) và 9 nguồn tham chiếu (`N01`–`N09`) được đóng gói trực tiếp cùng mã nguồn.
  - Website đọc trực tiếp dữ liệu từ JSON tĩnh (không cần Redis/Upstash/Vercel KV hay kết nối cơ sở dữ liệu). Không chứa dữ liệu nội bộ hay tư liệu chưa được phép công bố.
  - Xuất dữ liệu **JSON** và **CSV (UTF-8 BOM)** trực tiếp trên trang **Kho tư liệu** và in phiếu tư liệu tại trang **Chi tiết**.
- **Trợ lý Gemini phía máy chủ (`server/app.ts`, `api/[...route].ts`):**
  - Chỉ dùng `GEMINI_API_KEY` ở phía máy chủ thông qua Vercel Serverless Functions (`/api/gemini/ask`, `/api/gemini/transcribe-preview`).
  - Nếu chưa cấu hình `GEMINI_API_KEY`, các trang tra cứu (Trang chủ, Kho tư liệu, Chi tiết, Dòng thời gian, Nguồn & Quyền, Giới thiệu, Xuất JSON/CSV) vẫn hoạt động bình thường.
- **Định tuyến Production (`vercel.json`):**
  - Loại trừ `/api/*` và tài nguyên tĩnh khỏi SPA rewrite để mọi đường dẫn API trả về JSON chuẩn, đồng thời hỗ trợ tải lại trực tiếp mọi trang con (`/kho-tu-lieu`, `/tu-lieu/A01-00001`, `/dong-thoi-gian`, ...).

## 2. Biến môi trường

### Chạy cục bộ (`.env`)

```bash
GEMINI_API_KEY="khoa_api_gemini_cua_ban"
APP_URL="http://localhost:3000"
```

### Triển khai Production trên Vercel

- `GEMINI_API_KEY` *(tùy chọn — chỉ cần cho trang Trợ lý Gemini; các tính năng tra cứu dữ liệu hoạt động độc lập)*

## 3. Lệnh chạy, kiểm tra và build

```bash
npm install
npm run dev
npm run lint
npm run build
```
