// ============================================
// 🔌 Supabase Configuration
// ============================================
// ⚠️ 아래 값을 본인의 Supabase 프로젝트 정보로 교체하세요!
const SUPABASE_URL = 'https://awbynivwrdlukphfofga.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YnluaXZ3cmRsdWtwaGZvZmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTM3NzcsImV4cCI6MjA5MjI2OTc3N30.pXF5BKewKU_30vjM_N7-B62v_CxoQdJZXatUYvxdDHo';

// Supabase CDN
const { createClient } = supabase;

// 전역 Supabase 클라이언트
let supabaseClient = null;

function initSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Toast 알림
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
