#!/bin/bash
set -e

# --- CẤU HÌNH LIÊN KẾT API ---
API_URL="http://localhost:3000/api/v1"
EMAIL="it@talunglogistics.com"
PASSWORD="Admin@123"

echo "============================================="
echo "🔑 1. ĐĂNG NHẬP ĐỂ LẤY JWT TOKEN VÀ TENANT ID..."
echo "============================================="

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$' || true)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":[0-9]*' | head -n1 | grep -o '[0-9]*$' || true)
TENANT_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"tenantId":[0-9]*' | head -n1 | grep -o '[0-9]*$' || true)

if [ -z "$TOKEN" ]; then
  echo "❌ Đăng nhập thất bại!"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Đăng nhập thành công!"
echo "🏢 Tenant ID: $TENANT_ID"

# Helper function to send authenticated POST requests
api_post() {
  local path="$1"
  local data="$2"
  curl -s -X POST "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$data"
}

# Helper to find or create entity
get_or_create_entity() {
  local code="$1"
  local name="$2"
  local desc="$3"
  local autoPattern="$4"
  local titlePattern="$5"

  local entity_id
  entity_id=$(curl -s -X GET "$API_URL/entities?limit=100" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" | jq -r --arg code "$code" '.data[] | select(.code == $code) | .id' 2>/dev/null || true)
  
  if [ -z "$entity_id" ]; then
    local res
    res=$(api_post "entities" "{\"name\": \"$name\", \"code\": \"$code\", \"description\": \"$desc\", \"autoCodePattern\": \"$autoPattern\", \"titlePattern\": \"$titlePattern\"}")
    entity_id=$(echo "$res" | jq -r '.id')
    echo "✅ Tạo mới Entity: $name (ID: $entity_id)"
  else
    echo "⚠️ Entity $name đã tồn tại (ID: $entity_id)"
  fi
  echo "$entity_id"
}

# Helper to find or create workflow
get_or_create_workflow() {
  local entity_id="$1"
  local name="$2"
  local desc="$3"

  local workflow_id
  workflow_id=$(curl -s -X GET "$API_URL/workflows" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" | jq -r --arg eid "$entity_id" '.[] | select(.entityId == ($eid|tonumber)) | .id' 2>/dev/null || true)
  
  if [ -z "$workflow_id" ]; then
    local res
    res=$(api_post "workflows" "{\"entityId\": $entity_id, \"name\": \"$name\", \"description\": \"$desc\"}")
    workflow_id=$(echo "$res" | jq -r '.id')
    echo "✅ Tạo mới Workflow: $name (ID: $workflow_id)"
  else
    echo "⚠️ Workflow $name đã tồn tại (ID: $workflow_id)"
  fi
  echo "$workflow_id"
}

# ==============================================================================
# 📦 QUY TRÌNH I: PHIẾU GIAO VIỆC (TASK ASSIGNMENT)
# ==============================================================================
echo ""
echo "============================================="
echo "📋 CẤU HÌNH QUY TRÌNH 1: PHIẾU GIAO VIỆC"
echo "============================================="

GIAO_VIEC_ID=$(get_or_create_entity "phieu_giao_viec" "Phiếu Giao Việc" "Quản lý việc giao nhiệm vụ xuống phòng Lab" "GV-{YYYY}-{SEQ:5}" "Giao việc: {tieu_de_cong_viec} ({RECORD_CODE})")

# Fields cho Phiếu Giao Việc (Nâng cấp)
api_post "fields" "{\"entityId\": $GIAO_VIEC_ID, \"name\": \"Tiêu đề công việc\", \"code\": \"tieu_de_cong_viec\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $GIAO_VIEC_ID, \"name\": \"Người nhận việc (Nhiều người)\", \"code\": \"danh_sach_thuc_hien\", \"type\": \"MULTI_SELECT\", \"options\": {\"selectOptions\": [\"Nguyễn Văn A\", \"Trần Thị B\", \"Lê Văn C\", \"Phạm Văn D\"]}, \"isRequired\": true, \"orderIndex\": 2}" > /dev/null
api_post "fields" "{\"entityId\": $GIAO_VIEC_ID, \"name\": \"Người liên quan (Theo dõi)\", \"code\": \"nguoi_lien_quan\", \"type\": \"MULTI_SELECT\", \"options\": {\"selectOptions\": [\"Trưởng Lab\", \"Ban Giám Đốc\", \"BP Kế hoạch\", \"BP Vật tư\"]}, \"isRequired\": false, \"orderIndex\": 3}" > /dev/null
api_post "fields" "{\"entityId\": $GIAO_VIEC_ID, \"name\": \"Nội dung chi tiết\", \"code\": \"noi_dung_chi_tiet\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $GIAO_VIEC_ID, \"name\": \"Hạn hoàn thành\", \"code\": \"han_hoan_thanh\", \"type\": \"DATE_TIME\", \"isRequired\": true, \"orderIndex\": 5}" > /dev/null
api_post "fields" "{\"entityId\": $GIAO_VIEC_ID, \"name\": \"Kết quả thực hiện\", \"code\": \"ket_qua_thuc_hien\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 6}" > /dev/null

GV_WF_ID=$(get_or_create_workflow "$GIAO_VIEC_ID" "Quy trình Giao Việc" "Luồng luân chuyển và xác nhận phiếu giao việc")

# Các bước trong quy trình Giao Việc (Nâng cấp)
S_GV_1=$(api_post "workflows/steps" "{\"workflowId\": $GV_WF_ID, \"name\": \"1. Khởi tạo & Giao việc\", \"type\": \"USER_TASK\", \"orderIndex\": 1, \"permissions\": {\"tieu_de_cong_viec\": \"WRITE\", \"danh_sach_thuc_hien\": \"WRITE\", \"nguoi_lien_quan\": \"WRITE\", \"noi_dung_chi_tiet\": \"WRITE\", \"han_hoan_thanh\": \"WRITE\"}}")
S_GV_1_ID=$(echo "$S_GV_1" | jq -r '.id // empty' 2>/dev/null || true)

S_GV_2=$(api_post "workflows/steps" "{\"workflowId\": $GV_WF_ID, \"name\": \"2. Thực hiện nhiệm vụ\", \"type\": \"USER_TASK\", \"orderIndex\": 2, \"permissions\": {\"tieu_de_cong_viec\": \"READ\", \"danh_sach_thuc_hien\": \"READ\", \"nguoi_lien_quan\": \"READ\", \"noi_dung_chi_tiet\": \"READ\", \"han_hoan_thanh\": \"READ\", \"ket_qua_thuc_hien\": \"WRITE\"}}")
S_GV_2_ID=$(echo "$S_GV_2" | jq -r '.id // empty' 2>/dev/null || true)

S_GV_3=$(api_post "workflows/steps" "{\"workflowId\": $GV_WF_ID, \"name\": \"3. Phê duyệt công việc\", \"type\": \"USER_TASK\", \"orderIndex\": 3, \"permissions\": {\"tieu_de_cong_viec\": \"READ\", \"danh_sach_thuc_hien\": \"READ\", \"nguoi_lien_quan\": \"READ\", \"noi_dung_chi_tiet\": \"READ\", \"han_hoan_thanh\": \"READ\", \"ket_qua_thuc_hien\": \"READ\"}}")
S_GV_3_ID=$(echo "$S_GV_3" | jq -r '.id // empty' 2>/dev/null || true)

S_GV_TERM=$(api_post "workflows/steps" "{\"workflowId\": $GV_WF_ID, \"name\": \"Hoàn tất\", \"type\": \"TERMINAL\", \"orderIndex\": 4}")
S_GV_TERM_ID=$(echo "$S_GV_TERM" | jq -r '.id // empty' 2>/dev/null || true)

S_GV_REJ=$(api_post "workflows/steps" "{\"workflowId\": $GV_WF_ID, \"name\": \"Từ chối/Làm lại\", \"type\": \"REJECTED\", \"orderIndex\": 5}")
S_GV_REJ_ID=$(echo "$S_GV_REJ" | jq -r '.id // empty' 2>/dev/null || true)

if [ -n "$S_GV_1_ID" ] && [ -n "$S_GV_2_ID" ]; then
  # Trạm 1 -> Trạm 2: Gửi yêu cầu bắt buộc đính kèm "Phiếu giao nhiệm vụ"
  api_post "workflows/transitions" "{\"workflowId\": $GV_WF_ID, \"fromStepId\": $S_GV_1_ID, \"toStepId\": $S_GV_2_ID, \"name\": \"Gửi yêu cầu\", \"conditionLogic\": {\"actionLabel\": \"Trình giao việc\", \"requiredAttachments\": [\"Phieu giao nhiem vu\"]}}" > /dev/null
  
  # Trạm 2 -> Trạm 3: Báo cáo hoàn tất bắt buộc đính kèm "Báo cáo công việc"
  api_post "workflows/transitions" "{\"workflowId\": $GV_WF_ID, \"fromStepId\": $S_GV_2_ID, \"toStepId\": $S_GV_3_ID, \"name\": \"Yêu cầu phê duyệt\", \"conditionLogic\": {\"actionLabel\": \"Báo cáo hoàn tất\", \"requiredAttachments\": [\"Bao cao cong viec\"]}}" > /dev/null
  
  # Trạm 3 -> Hoàn tất: Sếp duyệt kết quả bắt buộc đính kèm "Báo cáo đánh giá của Sếp" (nếu có) hoặc duyệt thường
  api_post "workflows/transitions" "{\"workflowId\": $GV_WF_ID, \"fromStepId\": $S_GV_3_ID, \"toStepId\": $S_GV_TERM_ID, \"name\": \"Phê duyệt & Đóng việc\", \"conditionLogic\": {\"actionLabel\": \"Đồng ý nghiệm thu\"}}" > /dev/null
  
  # Trạm 3 -> Từ chối/Làm lại (nếu báo cáo chưa đạt yêu cầu)
  api_post "workflows/transitions" "{\"workflowId\": $GV_WF_ID, \"fromStepId\": $S_GV_3_ID, \"toStepId\": $S_GV_REJ_ID, \"name\": \"Từ chối yêu cầu\", \"conditionLogic\": {\"actionLabel\": \"Yêu cầu làm lại\"}}" > /dev/null
  
  # Publish Workflow Giao việc
  api_post "workflows/$GV_WF_ID/publish" "{\"description\": \"Publish Giao Viec Workflow\"}" > /dev/null
fi


# ==============================================================================
# 📦 QUY TRÌNH II: QUY TRÌNH THÍ NGHIỆM LẤY MẪU (6 BƯỚC)
# ==============================================================================
echo ""
echo "============================================="
echo "🧪 CẤU HÌNH QUY TRÌNH 2: QUY TRÌNH THÍ NGHIỆM LẤY MẪU"
echo "============================================="

THI_NGHIEM_ID=$(get_or_create_entity "quy_trinh_thi_nghiem" "Quy trình Thí nghiệm Lấy mẫu" "Quản lý luồng mẫu thí nghiệm qua 6 trạm dây chuyền" "LAB-{YYYY}-{SEQ:5}" "Hồ sơ mẫu: {ma_mau} ({RECORD_CODE})")

# Cấu hình các trường dữ liệu động (Fields)
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Mã số mẫu thử\", \"code\": \"ma_mau\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Mã hóa chất vật tư\", \"code\": \"hoa_chat_vattu\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 2}" > /dev/null
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Thiết bị chạy mẫu\", \"code\": \"thiet_bi_chay\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 3}" > /dev/null
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Nhân sự chạy mẫu\", \"code\": \"nguoi_chay_mau\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Thời gian bắt đầu\", \"code\": \"thoi_gian_bat_dau\", \"type\": \"DATE_TIME\", \"isRequired\": false, \"orderIndex\": 5}" > /dev/null
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Thời gian kết thúc\", \"code\": \"thoi_gian_ket_thuc\", \"type\": \"DATE_TIME\", \"isRequired\": false, \"orderIndex\": 6}" > /dev/null
api_post "fields" "{\"entityId\": $THI_NGHIEM_ID, \"name\": \"Kết luận phân tích\", \"code\": \"ket_luan\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 7}" > /dev/null

LAB_WF_ID=$(get_or_create_workflow "$THI_NGHIEM_ID" "Quy trình Thí nghiệm Phòng Lab" "Kiểm soát quy trình dây chuyền 6 trạm của phòng thí nghiệm")

# Cài đặt các bước trong Quy trình Thí nghiệm Phòng Lab
# Trạm 1: Lấy mẫu
S_LAB_1=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"1. Lấy mẫu\", \"type\": \"USER_TASK\", \"orderIndex\": 1, \"permissions\": {\"ma_mau\": \"WRITE\"}}")
S_LAB_1_ID=$(echo "$S_LAB_1" | jq -r '.id // empty' 2>/dev/null || true)

# Trạm 2: Đồng nhất sơ bộ
S_LAB_2=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"2. Đồng nhất sơ bộ\", \"type\": \"USER_TASK\", \"orderIndex\": 2, \"permissions\": {\"ma_mau\": \"READ\"}}")
S_LAB_2_ID=$(echo "$S_LAB_2" | jq -r '.id // empty' 2>/dev/null || true)

# Trạm 3: Tách chiết
S_LAB_3=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"3. Tách chiết\", \"type\": \"USER_TASK\", \"orderIndex\": 3, \"permissions\": {\"ma_mau\": \"READ\", \"hoa_chat_vattu\": \"WRITE\"}}")
S_LAB_3_ID=$(echo "$S_LAB_3" | jq -r '.id // empty' 2>/dev/null || true)

# Trạm 4: Chạy máy
S_LAB_4=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"4. Chạy máy\", \"type\": \"USER_TASK\", \"orderIndex\": 4, \"permissions\": {\"ma_mau\": \"READ\", \"thiet_bi_chay\": \"WRITE\", \"nguoi_chay_mau\": \"WRITE\", \"thoi_gian_bat_dau\": \"WRITE\", \"thoi_gian_ket_thuc\": \"WRITE\"}}")
S_LAB_4_ID=$(echo "$S_LAB_4" | jq -r '.id // empty' 2>/dev/null || true)

# Trạm 5: Chất lượng
S_LAB_5=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"5. Chất lượng\", \"type\": \"USER_TASK\", \"orderIndex\": 5, \"permissions\": {\"ma_mau\": \"READ\", \"ket_luan\": \"WRITE\"}}")
S_LAB_5_ID=$(echo "$S_LAB_5" | jq -r '.id // empty' 2>/dev/null || true)

# Trạm 6: Lãnh đạo phê duyệt kết quả và in phiếu
S_LAB_6=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"6. Lãnh đạo phê duyệt\", \"type\": \"USER_TASK\", \"orderIndex\": 6, \"permissions\": {\"ma_mau\": \"READ\", \"ket_luan\": \"READ\"}}")
S_LAB_6_ID=$(echo "$S_LAB_6" | jq -r '.id // empty' 2>/dev/null || true)

# Trạm Hoàn tất
S_LAB_TERM=$(api_post "workflows/steps" "{\"workflowId\": $LAB_WF_ID, \"name\": \"Hoàn tất\", \"type\": \"TERMINAL\", \"orderIndex\": 7}")
S_LAB_TERM_ID=$(echo "$S_LAB_TERM" | jq -r '.id // empty' 2>/dev/null || true)

if [ -n "$S_LAB_1_ID" ] && [ -n "$S_LAB_2_ID" ]; then
  # 1. Lấy mẫu -> 2. Đồng nhất sơ bộ: Yêu cầu đính kèm "Biên bản lấy mẫu"
  api_post "workflows/transitions" "{\"workflowId\": $LAB_WF_ID, \"fromStepId\": $S_LAB_1_ID, \"toStepId\": $S_LAB_2_ID, \"name\": \"Chuyển đồng nhất mẫu\", \"conditionLogic\": {\"actionLabel\": \"Xác nhận chuyển\", \"requiredAttachments\": [\"Bien ban lay mau\"]}}" > /dev/null
  
  # 2. Đồng nhất sơ bộ -> 3. Tách chiết: Yêu cầu đính kèm "Phiếu giao nhiệm vụ"
  api_post "workflows/transitions" "{\"workflowId\": $LAB_WF_ID, \"fromStepId\": $S_LAB_2_ID, \"toStepId\": $S_LAB_3_ID, \"name\": \"Chuyển tách chiết\", \"conditionLogic\": {\"actionLabel\": \"Đồng nhất xong\", \"requiredAttachments\": [\"Phieu giao nhiem vu\"]}}" > /dev/null
  
  # 3. Tách chiết -> 4. Chạy máy: Yêu cầu đính kèm "Nhật ký thí nghiệm"
  api_post "workflows/transitions" "{\"workflowId\": $LAB_WF_ID, \"fromStepId\": $S_LAB_3_ID, \"toStepId\": $S_LAB_4_ID, \"name\": \"Chuyển chạy máy\", \"conditionLogic\": {\"actionLabel\": \"Tách chiết xong\", \"requiredAttachments\": [\"Nhat ky thi nghiem\"]}}" > /dev/null
  
  # 4. Chạy máy -> 5. Chất lượng: Yêu cầu đính kèm "Hồ sơ quan trắc gốc"
  api_post "workflows/transitions" "{\"workflowId\": $LAB_WF_ID, \"fromStepId\": $S_LAB_4_ID, \"toStepId\": $S_LAB_5_ID, \"name\": \"Gửi kiểm định chất lượng\", \"conditionLogic\": {\"actionLabel\": \"Hoàn thành chạy máy\", \"requiredAttachments\": [\"Ho so quan trac goc\"]}}" > /dev/null
  
  # 5. Chất lượng -> 6. Lãnh đạo phê duyệt: Yêu cầu đính kèm "Dự thảo báo cáo kết quả"
  api_post "workflows/transitions" "{\"workflowId\": $LAB_WF_ID, \"fromStepId\": $S_LAB_5_ID, \"toStepId\": $S_LAB_6_ID, \"name\": \"Trình lãnh đạo\", \"conditionLogic\": {\"actionLabel\": \"Duyệt chất lượng\", \"requiredAttachments\": [\"Du thao bao cao ket qua\"]}}" > /dev/null
  
  # 6. Lãnh đạo phê duyệt -> Hoàn tất: Yêu cầu đính kèm "Báo cáo kết quả đóng dấu"
  api_post "workflows/transitions" "{\"workflowId\": $LAB_WF_ID, \"fromStepId\": $S_LAB_6_ID, \"toStepId\": $S_LAB_TERM_ID, \"name\": \"Phát hành & In phiếu\", \"conditionLogic\": {\"actionLabel\": \"Ký duyệt & Đóng dấu\", \"requiredAttachments\": [\"Bao cao ket qua dong dau\"]}}" > /dev/null
  
  # Publish Workflow Lab
  api_post "workflows/$LAB_WF_ID/publish" "{\"description\": \"Publish Laboratory Workflow\"}" > /dev/null
fi

echo "🎉 THIẾT LẬP THÀNH CÔNG HAI QUY TRÌNH CHUYÊN NGHIỆP TRÊN DATABASE!"
echo "--------------------------------------------------------------------------"
echo "👉 CÁC TÀI LIỆU BẮT BUỘC RÀNG BUỘC KHI CHUYỂN BƯỚC DUYỆT:"
echo "   - Bước 1 -> 2: Cần upload File có tên chứa cụm từ 'Bien ban lay mau'"
echo "   - Bước 2 -> 3: Cần upload File có tên chứa cụm từ 'Phieu giao nhiem vu'"
echo "   - Bước 3 -> 4: Cần upload File có tên chứa cụm từ 'Nhat ky thi nghiem'"
echo "   - Bước 4 -> 5: Cần upload File có tên chứa cụm từ 'Ho so quan trac goc'"
echo "   - Bước 5 -> 6: Cần upload File có tên chứa cụm từ 'Du thao bao cao ket qua'"
echo "   - Bước 6 -> Hoàn tất: Cần upload File có tên chứa cụm từ 'Bao cao ket qua dong dau'"
echo "--------------------------------------------------------------------------"
