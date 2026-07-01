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

# Helper function to send authenticated PATCH requests
api_patch() {
  local path="$1"
  local data="$2"
  curl -s -X PATCH "$API_URL/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$data"
}

echo ""
echo "============================================="
echo "📦 2. KHỞI TẠO ENTITY (XE_RA_VAO)"
echo "============================================="

ENTITY_DATA='{
  "name": "Xe Ra Vào Cảng (PA1)",
  "code": "XE_RA_VAO",
  "description": "Biểu mẫu kiểm soát xe ra vào cảng PA1 hỗ trợ tự động điền xe quay lại và ẩn hiện động.",
  "autoCodePattern": "PA1-{YYYY}-{SEQ:5}",
  "titlePattern": "Xe {bien_so_xe} - Cont {so_container} ({RECORD_CODE})"
}'

ENTITY_RESPONSE=$(api_post "entities" "$ENTITY_DATA")
ENTITY_ID=$(echo "$ENTITY_RESPONSE" | jq -r '.id // empty' 2>/dev/null || true)

if [ -z "$ENTITY_ID" ]; then
  echo "⚠️ Entity đã tồn tại. Đang tìm Entity ID..."
  ENTITY_ID=$(curl -s -X GET "$API_URL/entities?limit=100" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" | jq -r '.data[] | select(.code == "XE_RA_VAO") | .id' 2>/dev/null || true)
  if [ -z "$ENTITY_ID" ]; then
    echo "❌ Không thể tìm thấy Entity ID."
    exit 1
  fi
  echo "✅ Sử dụng Entity ID có sẵn: $ENTITY_ID"
else
  echo "✅ Đã tạo Entity thành công! ID: $ENTITY_ID"
fi

echo ""
echo "============================================="
echo "📋 3. KHỞI TẠO CÁC TRƯỜNG DỮ LIỆU (FIELDS - LÀM BẰNG CHỮ THƯỜNG)"
echo "============================================="

# 1. Biển số xe
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Biển số xe\",
  \"code\": \"bien_so_xe\",
  \"type\": \"TEXT\",
  \"isRequired\": true,
  \"orderIndex\": 1
}" > /dev/null

# 2. Số container
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Số container\",
  \"code\": \"so_container\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"orderIndex\": 2
}" > /dev/null

# 3. Chủ hàng
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Chủ hàng\",
  \"code\": \"chu_hang\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"orderIndex\": 3
}" > /dev/null

# 4. Loại hàng
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Loại hàng\",
  \"code\": \"loai_hang\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"orderIndex\": 4
}" > /dev/null

# 5. Loại hình
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Loại hình\",
  \"code\": \"loai_hinh\",
  \"type\": \"SELECT\",
  \"isRequired\": true,
  \"options\": {
    \"selectOptions\": [\"Nhập\", \"Xuất\"]
  },
  \"orderIndex\": 5
}" > /dev/null

# 6. Loại hình cũ
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Loại hình cũ\",
  \"code\": \"loai_hinh_cu\",
  \"type\": \"TEXT\",
  \"isRequired\": false,
  \"orderIndex\": 6
}" > /dev/null

# 7. Giờ vào
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Giờ vào\",
  \"code\": \"gio_vao\",
  \"type\": \"DATE_TIME\",
  \"isRequired\": true,
  \"orderIndex\": 7
}" > /dev/null

# 8. Giờ ra
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Giờ ra\",
  \"code\": \"gio_ra_l1\",
  \"type\": \"DATE_TIME\",
  \"isRequired\": false,
  \"orderIndex\": 8
}" > /dev/null

# 9. Số tiền thu (Ẩn nếu xe quay lại - tức loai_hinh_cu đã được gán)
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Số tiền thu\",
  \"code\": \"so_tien_thu\",
  \"type\": \"NUMBER\",
  \"isRequired\": false,
  \"options\": {
    \"defaultValue\": 300000,
    \"showIf\": {
      \"field\": \"loai_hinh_cu\",
      \"operator\": \"NOT_IN\",
      \"value\": [\"Nhập\", \"Xuất\"]
    }
  },
  \"orderIndex\": 9
}" > /dev/null

# 10. Hình thức thu (Ẩn nếu xe quay lại)
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Hình thức thu\",
  \"code\": \"hinh_thuc_thu\",
  \"type\": \"SELECT\",
  \"isRequired\": false,
  \"options\": {
    \"selectOptions\": [\"Tiền mặt\", \"Chuyển khoản\"],
    \"showIf\": {
      \"field\": \"loai_hinh_cu\",
      \"operator\": \"NOT_IN\",
      \"value\": [\"Nhập\", \"Xuất\"]
    }
  },
  \"orderIndex\": 10
}" > /dev/null

# 11. Có Gate In
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Có Gate In?\",
  \"code\": \"co_gate_in\",
  \"type\": \"CHECKBOX\",
  \"isRequired\": false,
  \"orderIndex\": 11
}" > /dev/null

# 12. Ngày Gate In
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Ngày Gate In\",
  \"code\": \"ngay_gate_in\",
  \"type\": \"DATE_TIME\",
  \"isRequired\": false,
  \"orderIndex\": 12
}" > /dev/null

# 13. Có Phiếu HQ
api_post "fields" "{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Có Phiếu HQ?\",
  \"code\": \"co_phieu_hq\",
  \"type\": \"CHECKBOX\",
  \"isRequired\": false,
  \"orderIndex\": 13
}" > /dev/null

echo "✅ Đã tạo các trường dữ liệu bằng chữ thường snake_case thành công!"

echo ""
echo "============================================="
echo "⚙️ 4. KHỞI TẠO QUY TRÌNH DUYỆT (WORKFLOW)"
echo "============================================="

WORKFLOW_DATA="{
  \"entityId\": $ENTITY_ID,
  \"name\": \"Quy trình kiểm soát Xe Ra Vào Cảng (PA1)\",
  \"description\": \"Kiểm soát xe vào cổng, cân xe và xuất bãi theo SOP Phú Anh V3.0.\"
}"

WORKFLOW_RESPONSE=$(api_post "workflows" "$WORKFLOW_DATA")
WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | jq -r '.id // empty' 2>/dev/null || true)

if [ -z "$WORKFLOW_ID" ]; then
  WORKFLOW_ID=$(curl -s -X GET "$API_URL/workflows" -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: $TENANT_ID" | jq -r --arg eid "$ENTITY_ID" '.[] | select(.entityId == ($eid|tonumber)) | .id' 2>/dev/null || true)
  if [ -z "$WORKFLOW_ID" ]; then
     echo "❌ Không tạo được quy trình."
     exit 1
  fi
  echo "⚠️ Workflow đã tồn tại. ID: $WORKFLOW_ID"
else
  echo "✅ Đã tạo Quy trình thành công! ID: $WORKFLOW_ID"
fi

echo ""
echo "============================================="
echo "🛤️ 5. KHỞI TẠO CÁC BƯỚC DUYỆT (STEPS)"
echo "============================================="

STEP_COVAL=$(api_post "workflows/steps" "{
  \"workflowId\": $WORKFLOW_ID,
  \"name\": \"Cổng Vào (An Ninh)\",
  \"type\": \"USER_TASK\",
  \"orderIndex\": 1,
  \"permissions\": {
    \"position\": { \"x\": 100, \"y\": 100 },
    \"bien_so_xe\": \"WRITE\",
    \"so_container\": \"WRITE\",
    \"chu_hang\": \"WRITE\",
    \"loai_hang\": \"WRITE\",
    \"loai_hinh\": \"WRITE\",
    \"gio_vao\": \"WRITE\",
    \"so_tien_thu\": \"WRITE\",
    \"hinh_thuc_thu\": \"WRITE\",
    \"co_gate_in\": \"HIDDEN\",
    \"ngay_gate_in\": \"HIDDEN\",
    \"co_phieu_hq\": \"HIDDEN\"
  }
}")
STEP_COVAL_ID=$(echo "$STEP_COVAL" | jq -r '.id')
echo "📍 Tạo Trạm: Cổng Vào - ID: $STEP_COVAL_ID"

STEP_TC=$(api_post "workflows/steps" "{
  \"workflowId\": $WORKFLOW_ID,
  \"name\": \"Trạm Cân & Hải Quan\",
  \"type\": \"USER_TASK\",
  \"orderIndex\": 2,
  \"permissions\": {
    \"position\": { \"x\": 100, \"y\": 250 },
    \"bien_so_xe\": \"READ\",
    \"so_container\": \"WRITE\",
    \"chu_hang\": \"WRITE\",
    \"loai_hang\": \"WRITE\",
    \"loai_hinh\": \"WRITE\",
    \"gio_vao\": \"READ\",
    \"so_tien_thu\": \"READ\",
    \"hinh_thuc_thu\": \"READ\",
    \"co_gate_in\": \"WRITE\",
    \"ngay_gate_in\": \"WRITE\",
    \"co_phieu_hq\": \"WRITE\"
  }
}")
STEP_TC_ID=$(echo "$STEP_TC" | jq -r '.id')
echo "📍 Tạo Trạm: Trạm Cân & Hải Quan - ID: $STEP_TC_ID"

STEP_DONE=$(api_post "workflows/steps" "{
  \"workflowId\": $WORKFLOW_ID,
  \"name\": \"Cho xe Xuất Bãi\",
  \"type\": \"USER_TASK\",
  \"orderIndex\": 3,
  \"permissions\": {
    \"position\": { \"x\": 100, \"y\": 400 },
    \"bien_so_xe\": \"READ\",
    \"so_container\": \"READ\",
    \"chu_hang\": \"READ\",
    \"loai_hang\": \"READ\",
    \"loai_hinh\": \"READ\",
    \"gio_vao\": \"READ\",
    \"gio_ra_l1\": \"WRITE\",
    \"so_tien_thu\": \"READ\",
    \"hinh_thuc_thu\": \"READ\",
    \"co_gate_in\": \"READ\",
    \"ngay_gate_in\": \"READ\",
    \"co_phieu_hq\": \"READ\"
  }
}")
STEP_DONE_ID=$(echo "$STEP_DONE" | jq -r '.id')
echo "📍 Tạo Trạm: Cho xe Xuất Bãi - ID: $STEP_DONE_ID"

STEP_TERMINAL=$(api_post "workflows/steps" "{
  \"workflowId\": $WORKFLOW_ID,
  \"name\": \"Hoàn tất hành trình\",
  \"type\": \"TERMINAL\",
  \"orderIndex\": 4,
  \"permissions\": {
    \"position\": { \"x\": 100, \"y\": 550 }
  }
}")
STEP_TERMINAL_ID=$(echo "$STEP_TERMINAL" | jq -r '.id')
echo "📍 Tạo Trạm: Hoàn tất - ID: $STEP_TERMINAL_ID"

STEP_REJECT=$(api_post "workflows/steps" "{
  \"workflowId\": $WORKFLOW_ID,
  \"name\": \"Từ chối\",
  \"type\": \"REJECTED\",
  \"orderIndex\": 5,
  \"permissions\": {
    \"position\": { \"x\": 350, \"y\": 250 }
  }
}")
STEP_REJECT_ID=$(echo "$STEP_REJECT" | jq -r '.id')
echo "📍 Tạo Trạm: Từ chối - ID: $STEP_REJECT_ID"

echo ""
echo "============================================="
echo "🔀 6. KẾT NỐI LUỒNG BẰNG ĐƯỜNG RẼ NHÁNH (TRANSITIONS)"
echo "============================================="

api_post "workflows/transitions" "{
  \"workflowId\": $WORKFLOW_ID,
  \"fromStepId\": $STEP_COVAL_ID,
  \"toStepId\": $STEP_TC_ID,
  \"name\": \"Trình cân & Hải Quan\"
}" > /dev/null
echo "🔗 Cổng Vào -> Trạm Cân"

api_post "workflows/transitions" "{
  \"workflowId\": $WORKFLOW_ID,
  \"fromStepId\": $STEP_TC_ID,
  \"toStepId\": $STEP_DONE_ID,
  \"name\": \"Đồng ý cho ra\"
}" > /dev/null
echo "🔗 Trạm Cân -> Xuất bãi"

api_post "workflows/transitions" "{
  \"workflowId\": $WORKFLOW_ID,
  \"fromStepId\": $STEP_TC_ID,
  \"toStepId\": $STEP_REJECT_ID,
  \"name\": \"Từ chối hồ sơ\"
}" > /dev/null
echo "🔗 Trạm Cân -> Từ chối"

api_post "workflows/transitions" "{
  \"workflowId\": $WORKFLOW_ID,
  \"fromStepId\": $STEP_DONE_ID,
  \"toStepId\": $STEP_TERMINAL_ID,
  \"name\": \"Hoàn thành chuyến\"
}" > /dev/null
echo "🔗 Xuất bãi -> Hoàn tất"

echo "✅ Kết nối thành công."

echo ""
echo "============================================="
echo "🚀 7. PHÁT HÀNH QUY TRÌNH (PUBLISH WORKFLOW)"
echo "============================================="

api_post "workflows/$WORKFLOW_ID/publish" "{\"description\": \"Phiên bản XE_RA_VAO V3.0\"}" > /dev/null

echo "🎉 THIẾT LẬP THÀNH CÔNG XE_RA_VAO VỚI MÃ TRƯỜNG CHỮ THƯỜNG!"
