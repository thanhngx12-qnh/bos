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
# 📦 QUY TRÌNH 2: KIỂM SOÁT XE KHU VỰC PA2 (BỆ SANG TẢI)
# ==============================================================================
echo ""
echo "============================================="
echo "🚚 CẤU HÌNH QUY TRÌNH 2: XE BỆ SANG TẢI (PA2)"
echo "============================================="

PA2_ID=$(get_or_create_entity "xe_ra_vao_pa2" "Xe Bệ Sang Tải (PA2)" "Kiểm soát phương tiện bốc xếp sang tải khu vực bệ PA2" "PA2-{YYYY}-{SEQ:5}" "Xe sang tải {bien_so_vn} / {bien_so_tq} ({RECORD_CODE})")

# Fields
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Biển số Việt Nam\", \"code\": \"bien_so_vn\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Biển số Trung Quốc\", \"code\": \"bien_so_tq\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 2}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Chủ hàng\", \"code\": \"chu_hang\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 3}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Loại hàng\", \"code\": \"loai_hang\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Loại hình\", \"code\": \"loai_hinh\", \"type\": \"SELECT\", \"isRequired\": true, \"options\": {\"selectOptions\": [\"Nhập\", \"Xuất\"]}, \"orderIndex\": 5}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Ghi chú\", \"code\": \"ghi_chu\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 6}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Giờ vào\", \"code\": \"gio_vao\", \"type\": \"DATE_TIME\", \"isRequired\": true, \"orderIndex\": 7}" > /dev/null
api_post "fields" "{\"entityId\": $PA2_ID, \"name\": \"Giờ ra\", \"code\": \"gio_ra\", \"type\": \"DATE_TIME\", \"isRequired\": false, \"orderIndex\": 8}" > /dev/null

PA2_WF_ID=$(get_or_create_workflow "$PA2_ID" "Quy trình Bệ Sang Tải (PA2)" "Theo dõi các bước bốc xếp sang tải bệ bãi PA2")

# Workflow steps
S2_1=$(api_post "workflows/steps" "{\"workflowId\": $PA2_WF_ID, \"name\": \"Cổng Vào (An Ninh)\", \"type\": \"USER_TASK\", \"orderIndex\": 1, \"permissions\": {\"position\": {\"x\": 100, \"y\": 100}, \"bien_so_vn\": \"WRITE\", \"bien_so_tq\": \"WRITE\", \"chu_hang\": \"WRITE\", \"loai_hang\": \"WRITE\", \"loai_hinh\": \"WRITE\", \"gio_vao\": \"WRITE\", \"ghi_chu\": \"WRITE\"}}")
S2_1_ID=$(echo "$S2_1" | jq -r '.id // empty' 2>/dev/null || true)

S2_2=$(api_post "workflows/steps" "{\"workflowId\": $PA2_WF_ID, \"name\": \"Bệ Sang Tải (Điều Phối)\", \"type\": \"USER_TASK\", \"orderIndex\": 2, \"permissions\": {\"position\": {\"x\": 100, \"y\": 250}, \"bien_so_vn\": \"READ\", \"bien_so_tq\": \"READ\", \"chu_hang\": \"READ\", \"loai_hang\": \"READ\", \"loai_hinh\": \"READ\", \"gio_vao\": \"READ\", \"ghi_chu\": \"WRITE\"}}")
S2_2_ID=$(echo "$S2_2" | jq -r '.id // empty' 2>/dev/null || true)

S2_3=$(api_post "workflows/steps" "{\"workflowId\": $PA2_WF_ID, \"name\": \"Cổng Ra (An Ninh)\", \"type\": \"USER_TASK\", \"orderIndex\": 3, \"permissions\": {\"position\": {\"x\": 100, \"y\": 400}, \"bien_so_vn\": \"READ\", \"bien_so_tq\": \"READ\", \"chu_hang\": \"READ\", \"loai_hang\": \"READ\", \"loai_hinh\": \"READ\", \"gio_vao\": \"READ\", \"gio_ra\": \"WRITE\", \"ghi_chu\": \"READ\"}}")
S2_3_ID=$(echo "$S2_3" | jq -r '.id // empty' 2>/dev/null || true)

S2_TERM=$(api_post "workflows/steps" "{\"workflowId\": $PA2_WF_ID, \"name\": \"Hoàn tất\", \"type\": \"TERMINAL\", \"orderIndex\": 4, \"permissions\": {\"position\": {\"x\": 100, \"y\": 550}}}")
S2_TERM_ID=$(echo "$S2_TERM" | jq -r '.id // empty' 2>/dev/null || true)

S2_REJ=$(api_post "workflows/steps" "{\"workflowId\": $PA2_WF_ID, \"name\": \"Từ chối\", \"type\": \"REJECTED\", \"orderIndex\": 5, \"permissions\": {\"position\": {\"x\": 350, \"y\": 250}}}")
S2_REJ_ID=$(echo "$S2_REJ" | jq -r '.id // empty' 2>/dev/null || true)

if [ -n "$S2_1_ID" ] && [ -n "$S2_2_ID" ]; then
  api_post "workflows/transitions" "{\"workflowId\": $PA2_WF_ID, \"fromStepId\": $S2_1_ID, \"toStepId\": $S2_2_ID, \"name\": \"Vào bệ sang tải\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $PA2_WF_ID, \"fromStepId\": $S2_2_ID, \"toStepId\": $S2_3_ID, \"name\": \"Sang tải xong, ra cổng\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $PA2_WF_ID, \"fromStepId\": $S2_3_ID, \"toStepId\": $S2_TERM_ID, \"name\": \"Cho xe xuất bãi\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $PA2_WF_ID, \"fromStepId\": $S2_2_ID, \"toStepId\": $S2_REJ_ID, \"name\": \"Từ chối/Hủy phiếu\"}" > /dev/null
  api_post "workflows/$PA2_WF_ID/publish" "{\"description\": \"Publish PA2 Workflow\"}" > /dev/null
fi


# ==============================================================================
# 📦 QUY TRÌNH 3: KIỂM SOÁT XE KHÁCH / CÔNG VỤ
# ==============================================================================
echo ""
echo "============================================="
echo "🚗 CẤU HÌNH QUY TRÌNH 3: XE KHÁCH / CÔNG VỤ"
echo "============================================="

PA_GUEST_ID=$(get_or_create_entity "xe_khach_cong_vu" "Xe Khách / Công Vụ" "Kiểm soát phương tiện của BGĐ, Khách hàng, Đối tác ra vào" "PA-GUEST-{SEQ:4}" "Xe khách {bien_so_xe} ({RECORD_CODE})")

api_post "fields" "{\"entityId\": $PA_GUEST_ID, \"name\": \"Biển số xe\", \"code\": \"bien_so_xe\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $PA_GUEST_ID, \"name\": \"Họ tên lái xe / Khách\", \"code\": \"ten_lai_xe\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 2}" > /dev/null
api_post "fields" "{\"entityId\": $PA_GUEST_ID, \"name\": \"Mục đích vào bãi\", \"code\": \"muc_dich\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 3}" > /dev/null
api_post "fields" "{\"entityId\": $PA_GUEST_ID, \"name\": \"Giờ vào\", \"code\": \"gio_vao\", \"type\": \"DATE_TIME\", \"isRequired\": true, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $PA_GUEST_ID, \"name\": \"Giờ ra\", \"code\": \"gio_ra\", \"type\": \"DATE_TIME\", \"isRequired\": false, \"orderIndex\": 5}" > /dev/null

PA_GUEST_WF_ID=$(get_or_create_workflow "$PA_GUEST_ID" "Quy trình Xe Khách / Công vụ" "Quy trình giám sát xe công vụ/xe khách")

S3_1=$(api_post "workflows/steps" "{\"workflowId\": $PA_GUEST_WF_ID, \"name\": \"Cổng Vào (An Ninh)\", \"type\": \"USER_TASK\", \"orderIndex\": 1, \"permissions\": {\"position\": {\"x\": 100, \"y\": 100}, \"bien_so_xe\": \"WRITE\", \"ten_lai_xe\": \"WRITE\", \"muc_dich\": \"WRITE\", \"gio_vao\": \"WRITE\"}}")
S3_1_ID=$(echo "$S3_1" | jq -r '.id // empty' 2>/dev/null || true)

S3_2=$(api_post "workflows/steps" "{\"workflowId\": $PA_GUEST_WF_ID, \"name\": \"Cổng Ra (An Ninh)\", \"type\": \"USER_TASK\", \"orderIndex\": 2, \"permissions\": {\"position\": {\"x\": 100, \"y\": 250}, \"bien_so_xe\": \"READ\", \"ten_lai_xe\": \"READ\", \"muc_dich\": \"READ\", \"gio_vao\": \"READ\", \"gio_ra\": \"WRITE\"}}")
S3_2_ID=$(echo "$S3_2" | jq -r '.id // empty' 2>/dev/null || true)

S3_TERM=$(api_post "workflows/steps" "{\"workflowId\": $PA_GUEST_WF_ID, \"name\": \"Hoàn tất\", \"type\": \"TERMINAL\", \"orderIndex\": 3, \"permissions\": {\"position\": {\"x\": 100, \"y\": 400}}}")
S3_TERM_ID=$(echo "$S3_TERM" | jq -r '.id // empty' 2>/dev/null || true)

if [ -n "$S3_1_ID" ] && [ -n "$S3_2_ID" ]; then
  api_post "workflows/transitions" "{\"workflowId\": $PA_GUEST_WF_ID, \"fromStepId\": $S3_1_ID, \"toStepId\": $S3_2_ID, \"name\": \"Cho xe vào bãi\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $PA_GUEST_WF_ID, \"fromStepId\": $S3_2_ID, \"toStepId\": $S3_TERM_ID, \"name\": \"Cho xe ra bãi\"}" > /dev/null
  api_post "workflows/$PA_GUEST_WF_ID/publish" "{\"description\": \"Publish Guest Workflow\"}" > /dev/null
fi


# ==============================================================================
# 📦 QUY TRÌNH 4: QUẢN LÝ KHO XE MỚI (WMS - PA3)
# ==============================================================================
echo ""
echo "============================================="
echo "🚙 CẤU HÌNH QUY TRÌNH 4: KHO XE MỚI PA3 (WMS)"
echo "============================================="

# 4.1. Lô Kế Hoạch
PA3_PLAN_ID=$(get_or_create_entity "pa3_lo_nhap" "Kế hoạch Nhập PA3" "Lô kế hoạch nhập xe mới bãi PA3" "PA3-PLAN-{SEQ:4}" "Kế hoạch Lô {ma_lo} ({RECORD_CODE})")

api_post "fields" "{\"entityId\": $PA3_PLAN_ID, \"name\": \"Mã lô\", \"code\": \"ma_lo\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $PA3_PLAN_ID, \"name\": \"Chủ hàng\", \"code\": \"chu_hang\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 2}" > /dev/null
api_post "fields" "{\"entityId\": $PA3_PLAN_ID, \"name\": \"Loại xe\", \"code\": \"loai_xe\", \"type\": \"SELECT\", \"isRequired\": true, \"options\": {\"selectOptions\": [\"Sát xi\", \"Đầu kéo\"]}, \"orderIndex\": 3}" > /dev/null
api_post "fields" "{\"entityId\": $PA3_PLAN_ID, \"name\": \"Kế hoạch nhập\", \"code\": \"ke_hoach_nhap\", \"type\": \"NUMBER\", \"isRequired\": true, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $PA3_PLAN_ID, \"name\": \"Ngày dự kiến\", \"code\": \"ngay_du_kien\", \"type\": \"DATE_TIME\", \"isRequired\": true, \"orderIndex\": 5}" > /dev/null

# 4.2. Chi Tiết Nhập/Xuất Thực Tế (Cross-Table Validation)
PA3_ACTUAL_ID=$(get_or_create_entity "pa3_chi_tiet_kho" "Nhật ký Kho PA3" "Ghi nhận Nhập/Xuất kho thực tế bãi PA3 đối chiếu Kế hoạch" "PA3-LOG-{SEQ:5}" "Nhật ký {ten_chuyen} ({RECORD_CODE})")

api_post "fields" "{\"entityId\": $PA3_ACTUAL_ID, \"name\": \"Tên chuyến\", \"code\": \"ten_chuyen\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $PA3_ACTUAL_ID, \"name\": \"Liên kết lô kế hoạch\", \"code\": \"ma_lo_lk\", \"type\": \"NUMBER\", \"isRequired\": true, \"orderIndex\": 2}" > /dev/null

# Ràng buộc số lượng nhập thực tế không được vượt quá số lượng lô kế hoạch
VAL_CONFIG='{
  "crossTableValidation": {
    "lookupFieldCode": "ma_lo_lk",
    "targetSumFieldCode": "ke_hoach_nhap",
    "actualSumFieldCode": "sl_nhap",
    "errorMessage": "Tổng số lượng nhập kho thực tế vượt quá định mức Kế hoạch nhập của Lô này!"
  }
}'
api_post "fields" "{
  \"entityId\": $PA3_ACTUAL_ID,
  \"name\": \"Số lượng nhập\",
  \"code\": \"sl_nhap\",
  \"type\": \"NUMBER\",
  \"isRequired\": false,
  \"options\": $(echo "$VAL_CONFIG" | jq -c .),
  \"orderIndex\": 3
}" > /dev/null

api_post "fields" "{\"entityId\": $PA3_ACTUAL_ID, \"name\": \"Số lượng xuất\", \"code\": \"sl_xuat\", \"type\": \"NUMBER\", \"isRequired\": false, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $PA3_ACTUAL_ID, \"name\": \"Ngày ghi nhận\", \"code\": \"ngay_ghi_nhan\", \"type\": \"DATE_TIME\", \"isRequired\": true, \"orderIndex\": 5}" > /dev/null


# ==============================================================================
# 🔌 ĐỐI SOÁT DỊCH VỤ CẮM ĐIỆN CONTAINER LẠNH (PA2/PA1)
# ==============================================================================
echo ""
echo "============================================="
echo "🔌 CẤU HÌNH QUY TRÌNH: DỊCH VỤ CẮM ĐIỆN CONT LẠNH"
echo "============================================="

CAM_DIEN_ID=$(get_or_create_entity "cam_dien_cont_lanh" "Cắm Điện Cont Lạnh" "Quản lý thời gian cắm/rút điện và tự động tính tiền cho container lạnh" "COLD-{YYYY}-{SEQ:5}" "Cắm cont {so_container} - Xe {bien_so_xe} ({RECORD_CODE})")

api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Số container\", \"code\": \"so_container\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 1}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Biển số xe\", \"code\": \"bien_so_xe\", \"type\": \"TEXT\", \"isRequired\": true, \"orderIndex\": 2}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Chủ hàng\", \"code\": \"chu_hang\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 3}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Thời gian cắm\", \"code\": \"thoi_gian_cam\", \"type\": \"DATE_TIME\", \"isRequired\": true, \"orderIndex\": 4}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Thời gian rút\", \"code\": \"thoi_gian_rut\", \"type\": \"DATE_TIME\", \"isRequired\": false, \"orderIndex\": 5}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Đơn giá giờ\", \"code\": \"don_gia_gio\", \"type\": \"NUMBER\", \"isRequired\": false, \"options\": {\"defaultValue\": 100000}, \"orderIndex\": 6}" > /dev/null

# Số giờ cắm điện = (thoi_gian_rut - thoi_gian_cam) / 3600000
api_post "fields" "{
  \"entityId\": $CAM_DIEN_ID,
  \"name\": \"Số giờ cắm điện\",
  \"code\": \"so_gio_cam\",
  \"type\": \"FORMULA\",
  \"isRequired\": false,
  \"options\": {
    \"formula\": \"(thoi_gian_rut - thoi_gian_cam) / 3600000\"
  },
  \"orderIndex\": 7
}" > /dev/null

# Thành tiền = so_gio_cam * don_gia_gio
api_post "fields" "{
  \"entityId\": $CAM_DIEN_ID,
  \"name\": \"Thành tiền cắm cont\",
  \"code\": \"thanh_tien\",
  \"type\": \"FORMULA\",
  \"isRequired\": false,
  \"options\": {
    \"formula\": \"so_gio_cam * don_gia_gio\"
  },
  \"orderIndex\": 8
}" > /dev/null

api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Hình thức thu\", \"code\": \"hinh_thuc_thu\", \"type\": \"SELECT\", \"isRequired\": false, \"options\": {\"selectOptions\": [\"Tiền mặt\", \"Chuyển khoản\"]}, \"orderIndex\": 9}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Tên lái xe\", \"code\": \"ten_lai_xe\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 10}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"CCCD hoặc Mã số thuế\", \"code\": \"cccd_mst\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 11}" > /dev/null
api_post "fields" "{\"entityId\": $CAM_DIEN_ID, \"name\": \"Địa chỉ\", \"code\": \"dia_chi\", \"type\": \"TEXT\", \"isRequired\": false, \"orderIndex\": 12}" > /dev/null


CAM_DIEN_WF_ID=$(get_or_create_workflow "$CAM_DIEN_ID" "Quy trình Cắm điện Cont Lạnh" "Quy trình dịch vụ cắm điện container lạnh")

S4_1=$(api_post "workflows/steps" "{\"workflowId\": $CAM_DIEN_WF_ID, \"name\": \"Chờ Cắm Điện\", \"type\": \"USER_TASK\", \"orderIndex\": 1, \"permissions\": {\"position\": {\"x\": 100, \"y\": 100}, \"so_container\": \"WRITE\", \"bien_so_xe\": \"WRITE\", \"chu_hang\": \"WRITE\", \"ten_lai_xe\": \"WRITE\", \"cccd_mst\": \"WRITE\", \"dia_chi\": \"WRITE\"}}")
S4_1_ID=$(echo "$S4_1" | jq -r '.id // empty' 2>/dev/null || true)

S4_2=$(api_post "workflows/steps" "{\"workflowId\": $CAM_DIEN_WF_ID, \"name\": \"Đang Cắm Điện\", \"type\": \"USER_TASK\", \"orderIndex\": 2, \"permissions\": {\"position\": {\"x\": 100, \"y\": 250}, \"so_container\": \"READ\", \"bien_so_xe\": \"READ\", \"chu_hang\": \"READ\", \"thoi_gian_cam\": \"WRITE\", \"don_gia_gio\": \"WRITE\"}}")
S4_2_ID=$(echo "$S4_2" | jq -r '.id // empty' 2>/dev/null || true)

S4_3=$(api_post "workflows/steps" "{\"workflowId\": $CAM_DIEN_WF_ID, \"name\": \"Chờ Rút Điện / Rút Điện\", \"type\": \"USER_TASK\", \"orderIndex\": 3, \"permissions\": {\"position\": {\"x\": 100, \"y\": 400}, \"so_container\": \"READ\", \"bien_so_xe\": \"READ\", \"thoi_gian_cam\": \"READ\", \"thoi_gian_rut\": \"WRITE\", \"so_gio_cam\": \"READ\", \"thanh_tien\": \"READ\"}}")
S4_3_ID=$(echo "$S4_3" | jq -r '.id // empty' 2>/dev/null || true)

S4_4=$(api_post "workflows/steps" "{\"workflowId\": $CAM_DIEN_WF_ID, \"name\": \"Thu Tiền / Xuất Bãi\", \"type\": \"USER_TASK\", \"orderIndex\": 4, \"permissions\": {\"position\": {\"x\": 100, \"y\": 550}, \"so_container\": \"READ\", \"bien_so_xe\": \"READ\", \"so_gio_cam\": \"READ\", \"thanh_tien\": \"READ\", \"hinh_thuc_thu\": \"WRITE\"}}")
S4_4_ID=$(echo "$S4_4" | jq -r '.id // empty' 2>/dev/null || true)

S4_TERM=$(api_post "workflows/steps" "{\"workflowId\": $CAM_DIEN_WF_ID, \"name\": \"Hoàn tất\", \"type\": \"TERMINAL\", \"orderIndex\": 5, \"permissions\": {\"position\": {\"x\": 100, \"y\": 700}}}")
S4_TERM_ID=$(echo "$S4_TERM" | jq -r '.id // empty' 2>/dev/null || true)

if [ -n "$S4_1_ID" ] && [ -n "$S4_2_ID" ]; then
  api_post "workflows/transitions" "{\"workflowId\": $CAM_DIEN_WF_ID, \"fromStepId\": $S4_1_ID, \"toStepId\": $S4_2_ID, \"name\": \"Xác nhận cắm điện\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $CAM_DIEN_WF_ID, \"fromStepId\": $S4_2_ID, \"toStepId\": $S4_3_ID, \"name\": \"Báo cáo hoàn tất cắm\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $CAM_DIEN_WF_ID, \"fromStepId\": $S4_3_ID, \"toStepId\": $S4_4_ID, \"name\": \"Xác nhận rút điện\"}" > /dev/null
  api_post "workflows/transitions" "{\"workflowId\": $CAM_DIEN_WF_ID, \"fromStepId\": $S4_4_ID, \"toStepId\": $S4_TERM_ID, \"name\": \"Xác nhận thu tiền\"}" > /dev/null
  api_post "workflows/$CAM_DIEN_WF_ID/publish" "{\"description\": \"Publish Cold Container Workflow\"}" > /dev/null
fi

echo ""
echo "============================================="
echo "🎉 TẤT CẢ CÁC LUỒNG VẬN HÀNH SOP PHÚ ANH ĐÃ ĐƯỢC TẠO HOÀN CHỈNH BẰNG CURL!"
echo "============================================="
