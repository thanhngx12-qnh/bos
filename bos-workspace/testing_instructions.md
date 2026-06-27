# Tài liệu Hướng dẫn Kiểm thử Hệ thống BOS (Business Operating System)

Tài liệu này cung cấp hướng dẫn kiểm thử chi tiết các tính năng vừa phát triển và trả lời các thắc mắc liên quan đến chức năng Trình ký & Chữ ký số trong hệ thống.

---

## 📌 THÔNG TIN HỆ THỐNG & CẤU HÌNH KIỂM THỬ

* **Next.js Frontend:** [http://localhost:3002](http://localhost:3002)
* **NestJS Backend:** [http://localhost:3000](http://localhost:3000)
* **Tài khoản kiểm thử Admin/SuperAdmin:**
  * **Email:** `it@talunglogistics.com`
  * **Mật khẩu:** `Admin@123`
  * **Workspace:** `Công ty CP TLQM (TLQM)` (Tenant ID: 12)

---

## 🧪 PHẦN 1: HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL TEST CASES)

### 📋 Test Case 1: Cấu hình Chọn Người Duyệt Tiếp Theo Động (Dynamic Next Assignee)

* **Mục tiêu:** Kiểm tra người gửi/người duyệt trước có thể chủ động chọn cụ thể ai là người duyệt tiếp theo ở bước sau.
* **Các bước thực hiện:**
  1. Đăng nhập vào [http://localhost:3002](http://localhost:3002) bằng tài khoản quản trị `it@talunglogistics.com`.
  2. Truy cập trang quản trị **Biểu mẫu & Quy trình** (`/metadata`).
  3. Chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** $\rightarrow$ bấm **"Xem chi tiết/Thiết kế"**.
  4. Chọn tab **"Sơ đồ quy trình (Canvas)"**.
  5. Nhấp đúp vào trạm đầu tiên **"Kiểm soát viên soát xét"** để mở Drawer cấu hình bên phải.
  6. Tích chọn ô: **"Cho phép người gửi/người duyệt trước chọn cụ thể người duyệt tiếp theo"**.
  7. Bấm **"Lưu cấu hình trạm"** và nhấn **"Publish Quy trình"** ở góc phải canvas.
  8. Quay lại trang **Hồ sơ** (`/records`), chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** và bấm **"Nộp hồ sơ mới"**.
  9. Điền thông tin đề xuất (Ví dụ: Nhà cung cấp: *Thép Hòa Phát*, Phương thức: *Chuyển khoản*, số tiền > 50M).
  10. Nhấn **"Nộp & Trình ký"**.
* **Kết quả kỳ vọng:**
  - Hệ thống hiển thị Modal hoặc ô chọn Người duyệt tiếp theo, cho phép người dùng chọn danh sách ứng viên (ví dụ chọn *BOS Admin* hoặc tài khoản khác).
  - Sau khi nộp, hồ sơ được gán chính xác cho người vừa được chọn.

---

### 📋 Test Case 2: Bộ lọc Trạng thái trường Liên kết (Lookup Status Filtering)

* **Mục tiêu:** Xác minh tính năng lọc các bản ghi liên kết (Lookup) dựa trên trạng thái (chỉ hiện bản ghi đã hoàn thành `COMPLETED`).
* **Các bước thực hiện:**
  1. Truy cập trang quản trị **Biểu mẫu & Quy trình** (`/metadata`).
  2. Tạo mới một Thực thể (Entity):
     * **Tên:** `Biên bản đối chiếu công nợ`
     * **Mã:** `DEBT_RECONCILIATION`
  3. Vào trang thiết kế trường của biểu mẫu vừa tạo $\rightarrow$ Kéo thả thêm trường mới:
     * **Tên trường:** `Hồ sơ thanh toán liên kết`
     * **Mã trường:** `payment_request_id`
     * **Kiểu dữ liệu:** `Liên kết (LOOKUP)`
     * **Thực thể liên kết:** Chọn `Đề xuất Thanh toán Đơn hàng`
     * **Cột hiển thị nhãn:** `id` hoặc `title`
     * **Lọc theo trạng thái hồ sơ liên kết:** Chọn `Hoàn thành (COMPLETED)`.
     * Bấm **"Lưu trường"**.
  4. Truy cập trang **Hồ sơ** (`/records`), chọn biểu mẫu **"Biên bản đối chiếu công nợ"** $\rightarrow$ bấm **"Nộp hồ sơ mới"**.
  5. Nhấp vào dropdown chọn của trường **"Hồ sơ thanh toán liên kết"**.
* **Kết quả kỳ vọng:**
  - Danh sách dropdown chỉ hiển thị các hồ sơ `Đề xuất Thanh toán Đơn hàng` đã được duyệt hoàn toàn ở trạng thái **Hoàn thành (COMPLETED)**.
  - Các hồ sơ đang ở trạng thái Nháp (DRAFT), Đang duyệt (IN_PROGRESS) hoặc Bị từ chối (REJECTED) **không được phép xuất hiện** trong danh sách này.

---

### 📋 Test Case 3: Báo cáo BI & Biểu đồ Analytics (Dashboard Analytics)

* **Mục tiêu:** Kiểm tra hiển thị tổng hợp hiệu suất quy trình, chi tiêu phòng ban và điểm nghẽn SLA.
* **Các bước thực hiện:**
  1. Truy cập trang chủ Dashboard (`/`).
  2. Bấm chuyển đổi nút Segmented từ **"Bàn làm việc"** sang **"Báo cáo BI (Analytics)"**.
  3. Lựa chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** và trường số học **"Tổng tiền thanh toán"** tại khu vực thống kê chi tiêu phòng ban.
* **Kết quả kỳ vọng:**
  - Biểu đồ hình cột SVG hiển thị đúng tỷ lệ chi tiêu thực tế của từng phòng ban.
  - Hiển thị danh sách các trạm duyệt bị quá thời hạn SLA (điểm nghẽn quy trình) tại bảng Bottlenecks.
  - Các thẻ chỉ số tổng quát (Tổng số hồ sơ, Hồ sơ đang duyệt, Hồ sơ hoàn thành...) tải dữ liệu chính xác theo Tenant hiện tại.

---

### 📋 Test Case 4: Giám sát Trễ Hạn & Tự động Chuyển trạm SLA (SLA Auto-Escalation)

* **Mục tiêu:** Xác minh hệ thống tự động cảnh báo khi quá hạn SLA và chuyển tiếp quy trình tự động nếu cấu hình hành động trễ hạn là `AUTO_SKIP` hoặc `AUTO_REJECT`.
* **Các bước thực hiện:**
  1. Đăng nhập vào [http://localhost:3002](http://localhost:3002) bằng tài khoản `it@talunglogistics.com`.
  2. Truy cập trang quản trị **Biểu mẫu & Quy trình** (`/metadata`), chọn biểu mẫu và nhấp **"Xem chi tiết/Thiết kế"**.
  3. Chọn tab **"Sơ đồ quy trình (Canvas)"**.
  4. Nhấp đúp vào bước duyệt hiện tại (ví dụ: *Trạm kiểm soát*).
  5. Cấu hình **Thời hạn xử lý (SLA)**: Nhập số lượng `1`, chọn đơn vị là `Giờ` (hoặc `Ngày`).
  6. Tại ô cấu hình **Hành động khi trễ hạn SLA**, chọn `Tự động phê duyệt (AUTO_SKIP)` hoặc `Tự động từ chối (AUTO_REJECT)`.
  7. Nhấn **"Lưu cấu hình trạm"** và bấm **"Publish Quy trình"** ở góc phải màn hình.
  8. Quay lại trang **Hồ sơ** (`/records`) và nộp một hồ sơ mới để kích hoạt quy trình này.
  9. Để kiểm thử nhanh mà không cần đợi 1 giờ thực tế:
     - Mở cơ sở dữ liệu hoặc sử dụng script truy vấn để sửa đổi cột `estimated_completion_time` của bản ghi Task vừa được tạo thành một mốc thời gian quá khứ (ví dụ: lùi lại 2 giờ trước).
     - Chờ Cron Job quét chạy (được thiết lập quét định kỳ mỗi phút: `@Cron(CronExpression.EVERY_MINUTE)`).
* **Kết quả kỳ vọng:**
  - Người được giao duyệt (`assigneeId`) sẽ nhận được thông báo: *"🚨 CẢNH BÁO: NHIỆM VỤ QUÁ HẠN SLA"*.
  - Task quá hạn được chuyển trạng thái sang `OVERDUE`.
  - Hệ thống tự động thực hiện hành động chuyển trạm:
    - Nếu cấu hình `AUTO_SKIP`: Hồ sơ tự động được phê duyệt thông qua bước đó và chuyển tiếp đến trạm tiếp theo.
    - Nếu cấu hình `AUTO_REJECT`: Hồ sơ tự động bị từ chối chuyển sang trạng thái `REJECTED`.
  - Kiểm tra tab **"Nhật ký Phê duyệt (Logs)"** của hồ sơ, xuất hiện dòng nhật ký: *"Hệ thống tự động thực hiện chuyển trạm [AUTO_SKIP/AUTO_REJECT] do trễ hạn SLA"* với người thực hiện là `Hệ thống` (userId bằng null).

---

### 📋 Test Case 5: Cột dữ liệu động, Sắp xếp & Bộ lọc nâng cao (Báo cáo theo Entity)

* **Mục tiêu:** Xác minh danh sách hồ sơ tự động hiển thị các cột tùy chỉnh theo biểu mẫu, cho phép tìm kiếm, sắp xếp và lọc nâng cao theo từng trường custom.
* **Các bước thực hiện:**
  1. Đăng nhập vào [http://localhost:3002](http://localhost:3002) bằng tài khoản `it@talunglogistics.com`.
  2. Truy cập trang **Hồ sơ & Biểu mẫu** (`/records`).
  3. Chọn biểu mẫu **"Đề xuất Thanh toán Đơn hàng"** từ danh sách bên trái.
* **Kết quả kỳ vọng:**
  - **Cột dữ liệu động:** Bảng hiển thị các cột tương ứng với các trường đã cấu hình cho biểu mẫu này (ví dụ: *Phương thức thanh toán*, *Số tiền đề xuất*, *Nhà cung cấp*...) thay vì chỉ hiển thị các cột mặc định.
  - **Sắp xếp theo trường:** Bấm vào tiêu đề bất kỳ cột nào (ví dụ: *Số tiền đề xuất*), dữ liệu được sắp xếp tăng dần/giảm dần theo giá trị của trường đó, gọi API backend truyền `sortBy` và `sortOrder` chính xác.
  - **Bộ lọc nâng cao:**
    - Bấm nút **"Bộ lọc nâng cao"** trên thanh công cụ.
    - Một panel bộ lọc động hiển thị danh sách các trường tùy chỉnh dưới dạng input lọc thích hợp (ví dụ: trường SELECT hiển thị dropdown, DATE hiển thị lịch chọn ngày, CHECKBOX hiển thị Có/Không...).
    - Điền giá trị lọc bất kỳ (ví dụ chọn Nhà cung cấp là *Thép Hòa Phát*), bảng tự động tải lại hồ sơ khớp điều kiện lọc.

---

## ✒️ PHẦN 2: THÔNG TIN CHI TIẾT VỀ CHỨC NĂNG TRÌNH KÝ & CHỮ KÝ SỐ

Dưới đây là phần trả lời chi tiết cho các câu hỏi của anh về cơ chế Trình ký & Chữ ký số trong hệ thống BOS:

### ❓ Câu hỏi 1: Chữ ký sẽ được đặt ở vị trí nào khi trình ký?

**Trả lời:** Chữ ký số trong hệ thống BOS được hiển thị ở 2 khu vực chính:
1. **Trong Nhật ký Phê duyệt (Timeline & Logs) của Hồ sơ:**
   - Khi xem chi tiết hồ sơ ở Drawer chi tiết hoặc trên Dashboard, lịch sử các bước phê duyệt được sắp xếp theo dạng Timeline từ dưới lên.
   - Tại mỗi bước đã phê duyệt, hệ thống hiển thị thông tin người ký, thời gian ký, ý kiến phản hồi (comment) và **ảnh chữ ký tay base64/con dấu đỏ thực tế** được vẽ hoặc chọn từ thư viện của người đó.
2. **Trong Mẫu in (Print Template - WYSIWYG):**
   - Khi thiết kế mẫu in, người quản trị có thể chủ động kéo thả hoặc gõ mã token động dạng `{{approvals[0].signature}}`, `{{approvals[1].signature}}` (tương ứng với chữ ký của trạm 1, trạm 2...) đặt vào **bất kỳ vị trí nào** trên bản in (thường là trong bảng ký tên ở cuối văn bản).
   - Khi xuất in hồ sơ, thẻ chữ ký số chất lượng cao sẽ hiển thị đúng vị trí đã cấu hình.

---

### ❓ Câu hỏi 2: Hệ thống có hỗ trợ Ký nháy hay không?

**Trả lời:**
* **Hiện tại:** Hệ thống hỗ trợ cơ chế ký phê duyệt điện tử ở từng bước. Nếu tài liệu cần nhiều chữ ký xác nhận ở từng trang hoặc từng mục, người phê duyệt có thể tự tạo một mẫu chữ ký viết tắt (Chữ ký nháy) trong hồ sơ cá nhân và chọn nó khi thực hiện thao tác ký. Trên mẫu in, quản trị viên có thể chèn các token chữ ký ở lề trang hoặc các điều khoản cụ thể.
* **Đề xuất phát triển:** Trong các phiên bản tới, chúng ta có thể bổ sung tùy chọn **"Ký nháy hàng loạt (Marginal Initials)"** tự động đè một chữ ký thu nhỏ của người đại diện vào góc dưới bên phải tất cả các trang của văn bản PDF khi xuất bản.

---

### ❓ Câu hỏi 3: Khi xem Preview văn bản mẫu in, có thể nhấn vào từng chữ ký để xem thông tin xác thực hay không?

**Trả lời:**
* **Thiết kế in ấn sạch (Clean Print):** Để bản in ra giấy hoặc xuất file PDF đẹp, không bị đè các nút bấm web, hệ thống đã **hiển thị trực tiếp toàn bộ thông tin xác thực của chữ ký ngay trên thẻ chữ ký số**.
* Cụ thể, mỗi chữ ký hiển thị trên bản in sẽ bao gồm một khung chứa:
  - Thẻ tag màu xanh lá: **`[ĐÃ KÝ ĐIỆN TỬ]`**
  - Ảnh **chữ ký vẽ tay** của người duyệt.
  - Ảnh **con dấu đỏ** (nếu chọn sử dụng dấu pháp nhân doanh nghiệp đè lên chữ ký).
  - Các thông tin đi kèm (được cấu hình ẩn/hiện): **Họ và tên**, **Chức vụ/Vai trò**, **Phòng ban**, và **Thời gian ký số chính xác**.
* Do thông tin đã hiển thị tường minh trực tiếp trên bản in, người dùng **không cần phải nhấp vào** chữ ký để mở popover (tránh việc khi xuất PDF hoặc in ra giấy bị mất thông tin ẩn).
* **Trong tương lai:** Nếu tích hợp chữ ký số chứng thư công cộng (CA), tệp PDF xuất ra sẽ chứa Metadata chữ ký số hợp chuẩn. Khi người dùng tải file PDF về và mở bằng Adobe Reader, click vào chữ ký sẽ hiển thị chứng thư số bảo mật (Certificate details) của người ký.
