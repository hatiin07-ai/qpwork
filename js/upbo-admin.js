// ============================================
// 🔐 업보 숙제장 - Admin 로직
// ============================================

let allMembers = [];
let allTaskTypes = [];
let allTasks = [];

// ============================================
// 초기화 & 인증
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const sb = initSupabase();

  // 세션 체크
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'block';
    await loadAdminData();
  }

  // 로그인 폼
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 시청자 추가 폼
  document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);

  // 항목 추가 폼
  document.getElementById('addTypeForm').addEventListener('submit', handleAddType);

  // 시청자 수정 폼
  document.getElementById('editMemberForm').addEventListener('submit', handleEditMember);

  // 시청자 선택 변경
  document.getElementById('memberSelect').addEventListener('change', handleMemberSelect);
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const sb = initSupabase();

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = '로그인 실패: ' + error.message;
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminScreen').style.display = 'block';
  await loadAdminData();
}

async function handleLogout() {
  const sb = initSupabase();
  await sb.auth.signOut();
  location.reload();
}

// ============================================
// 데이터 로드
// ============================================

async function loadAdminData() {
  const sb = initSupabase();

  // 갱신일
  const { data: settings } = await sb
    .from('upbo_settings')
    .select('*')
    .eq('key', 'last_updated')
    .single();

  if (settings) {
    document.getElementById('currentDate').textContent = `갱신일: ${settings.value}`;
  }

  // 숙제 항목
  const { data: types } = await sb
    .from('upbo_task_types')
    .select('*')
    .order('sort_order', { ascending: true });
  allTaskTypes = types || [];

  // 시청자
  const { data: members } = await sb
    .from('upbo_members')
    .select('*')
    .order('created_at', { ascending: true });
  allMembers = members || [];

  // 숙제
  const { data: tasks } = await sb
    .from('upbo_tasks')
    .select('*, upbo_task_types(*)')
    .order('task_type_id', { ascending: true });
  allTasks = tasks || [];

  // UI 렌더링
  renderMemberSelect();
  renderMemberTable();
  renderTypeTable();
  renderOverview();
  await loadInquiries();
}

// ============================================
// 탭 전환
// ============================================

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('active', el.id === `tab-${tabId}`);
  });
}

// ============================================
// 날짜 갱신
// ============================================

async function updateDate() {
  const sb = initSupabase();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const dateStr = `${y}.${m}.${d}`;

  const { error } = await sb
    .from('upbo_settings')
    .upsert({ key: 'last_updated', value: dateStr, updated_at: new Date().toISOString() });

  if (error) {
    showToast('갱신 실패: ' + error.message);
    return;
  }
  document.getElementById('currentDate').textContent = `갱신일: ${dateStr}`;
  showToast('📅 갱신일이 업데이트되었습니다!');
}

// ============================================
// 시청자 관리
// ============================================

function renderMemberSelect() {
  const select = document.getElementById('memberSelect');
  select.innerHTML = '<option value="">-- 시청자 선택 --</option>' +
    allMembers.map(m => {
      const hidden = m.is_hidden ? ' [숨김]' : '';
      return `<option value="${m.id}">${escapeHtml(m.nickname)} (${escapeHtml(m.user_id)})${hidden}</option>`;
    }).join('');
}

function renderMemberTable() {
  const container = document.getElementById('memberTable');
  if (allMembers.length === 0) {
    container.innerHTML = '<p class="text-sub text-sm">등록된 시청자가 없습니다.</p>';
    return;
  }

  container.innerHTML = allMembers.map(m => {
    const taskCount = allTasks.filter(t => t.member_id === m.id && t.quantity > 0).length;
    return `
      <div class="flex items-center justify-between p-3 rounded-xl bg-bg border border-point/10 hover:border-point/30 transition-colors">
        <div>
          <span class="font-semibold text-txt text-sm">${escapeHtml(m.nickname)}</span>
          <span class="text-sub text-xs ml-1">(${escapeHtml(m.user_id)})</span>
          ${m.is_hidden ? '<span class="ml-2 text-xs bg-gray-200 text-sub px-1.5 py-0.5 rounded">숨김</span>' : ''}
          ${taskCount > 0 ? `<span class="ml-2 text-xs text-accent">숙제 ${taskCount}개</span>` : ''}
        </div>
        <div class="flex gap-1">
          <button onclick="toggleMemberHidden(${m.id}, ${!m.is_hidden})" class="btn-edit">${m.is_hidden ? '👁 보이기' : '🙈 숨기기'}</button>
          <button onclick="openEditMemberModal(${m.id})" class="btn-edit">수정</button>
          <button onclick="deleteMember(${m.id})" class="btn-delete">삭제</button>
        </div>
      </div>`;
  }).join('');
}

async function handleAddMember(e) {
  e.preventDefault();
  const nickname = document.getElementById('inputNickname').value.trim();
  const userId = document.getElementById('inputUserId').value.trim();
  if (!nickname || !userId) return;

  const sb = initSupabase();
  const { error } = await sb.from('upbo_members').insert({ nickname, user_id: userId });

  if (error) {
    showToast('추가 실패: ' + error.message);
    return;
  }

  document.getElementById('inputNickname').value = '';
  document.getElementById('inputUserId').value = '';
  showToast(`✅ ${nickname} 추가 완료!`);
  await loadAdminData();
}

function openEditMemberModal(id) {
  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  document.getElementById('editMemberId').value = id;
  document.getElementById('editNickname').value = member.nickname;
  document.getElementById('editUserId').value = member.user_id;
  document.getElementById('editMemberModal').classList.remove('hidden');
}

function closeEditMemberModal() {
  document.getElementById('editMemberModal').classList.add('hidden');
}

async function handleEditMember(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('editMemberId').value);
  const nickname = document.getElementById('editNickname').value.trim();
  const userId = document.getElementById('editUserId').value.trim();

  const sb = initSupabase();
  const { error } = await sb.from('upbo_members').update({ nickname, user_id: userId }).eq('id', id);

  if (error) {
    showToast('수정 실패: ' + error.message);
    return;
  }

  closeEditMemberModal();
  showToast(`✅ ${nickname} 수정 완료!`);
  await loadAdminData();
}

async function toggleMemberHidden(id, hidden) {
  const sb = initSupabase();
  const { error } = await sb.from('upbo_members').update({ is_hidden: hidden }).eq('id', id);
  if (error) {
    showToast('변경 실패: ' + error.message);
    return;
  }
  const member = allMembers.find(m => m.id === id);
  showToast(hidden ? `🙈 ${member?.nickname} 숨김 처리` : `👁 ${member?.nickname} 다시 표시`);
  await loadAdminData();
}

async function deleteMember(id) {
  const member = allMembers.find(m => m.id === id);
  if (!confirm(`"${member?.nickname}" 시청자를 삭제하시겠습니까?\n연결된 숙제도 모두 삭제됩니다.`)) return;

  const sb = initSupabase();
  const { error } = await sb.from('upbo_members').delete().eq('id', id);

  if (error) {
    showToast('삭제 실패: ' + error.message);
    return;
  }

  showToast(`🗑 ${member?.nickname} 삭제 완료`);
  await loadAdminData();
}

// ============================================
// 숙제 배정
// ============================================

function handleMemberSelect() {
  const memberId = parseInt(document.getElementById('memberSelect').value);
  const taskGrid = document.getElementById('taskGrid');

  if (!memberId) {
    taskGrid.classList.add('hidden');
    return;
  }

  taskGrid.classList.remove('hidden');
  renderTaskCheckboxes(memberId);
}

function renderTaskCheckboxes(memberId) {
  const container = document.getElementById('taskCheckboxes');
  const activeTypes = allTaskTypes.filter(t => t.is_active);
  const memberTasks = allTasks.filter(t => t.member_id === memberId);

  container.innerHTML = activeTypes.map(type => {
    const existing = memberTasks.find(t => t.task_type_id === type.id);
    const qty = existing ? existing.quantity : 0;
    const memo = existing ? (existing.memo || '') : '';
    const checked = qty > 0;
    const isEvent = type.category === 'event';
    const borderClass = isEvent ? 'border-eventBorder bg-eventBg/30' : 'border-point/20 bg-bg';
    const labelClass = isEvent ? 'text-event' : 'text-txt';

    return `
      <div class="flex items-center gap-3 p-3 rounded-xl border ${borderClass}" data-type-id="${type.id}">
        <input type="checkbox" id="chk_${type.id}" ${checked ? 'checked' : ''}
          onchange="toggleTaskRow(${type.id})"
          class="w-4 h-4 rounded accent-accent cursor-pointer">
        <label for="chk_${type.id}" class="flex-1 text-sm ${labelClass} cursor-pointer">
          ${isEvent ? '🟣' : '🔵'} ${escapeHtml(type.name)}
        </label>
        <input type="number" id="qty_${type.id}" value="${qty}" min="0" max="999"
          class="w-16 px-2 py-1 rounded-lg border border-point/30 bg-white text-center text-sm
          focus:outline-none focus:ring-2 focus:ring-accent/30"
          ${!checked ? 'disabled' : ''}>
        <input type="text" id="memo_${type.id}" value="${escapeHtml(memo)}" placeholder="메모"
          class="w-24 md:w-32 px-2 py-1 rounded-lg border border-point/30 bg-white text-xs
          focus:outline-none focus:ring-2 focus:ring-accent/30"
          ${!checked ? 'disabled' : ''}>
      </div>`;
  }).join('');
}

function toggleTaskRow(typeId) {
  const chk = document.getElementById(`chk_${typeId}`);
  const qty = document.getElementById(`qty_${typeId}`);
  const memo = document.getElementById(`memo_${typeId}`);

  if (chk.checked) {
    qty.disabled = false;
    memo.disabled = false;
    if (parseInt(qty.value) === 0) qty.value = 1;
  } else {
    qty.disabled = true;
    memo.disabled = true;
    qty.value = 0;
  }
}

async function saveTasks() {
  const memberId = parseInt(document.getElementById('memberSelect').value);
  if (!memberId) return;

  const sb = initSupabase();
  const activeTypes = allTaskTypes.filter(t => t.is_active);
  const memberTasks = allTasks.filter(t => t.member_id === memberId);

  let successCount = 0;
  let errorCount = 0;

  for (const type of activeTypes) {
    const chk = document.getElementById(`chk_${type.id}`);
    const qtyInput = document.getElementById(`qty_${type.id}`);
    const memoInput = document.getElementById(`memo_${type.id}`);

    if (!chk) continue;

    const qty = parseInt(qtyInput.value) || 0;
    const memo = memoInput.value.trim();
    const existing = memberTasks.find(t => t.task_type_id === type.id);

    if (chk.checked && qty > 0) {
      // upsert
      if (existing) {
        const { error } = await sb.from('upbo_tasks')
          .update({ quantity: qty, memo })
          .eq('id', existing.id);
        if (error) errorCount++; else successCount++;
      } else {
        const { error } = await sb.from('upbo_tasks')
          .insert({ member_id: memberId, task_type_id: type.id, quantity: qty, memo });
        if (error) errorCount++; else successCount++;
      }
    } else {
      // 체크 해제 또는 수량 0 → 삭제
      if (existing) {
        const { error } = await sb.from('upbo_tasks').delete().eq('id', existing.id);
        if (error) errorCount++; else successCount++;
      }
    }
  }

  if (errorCount > 0) {
    showToast(`⚠️ ${errorCount}개 항목 저장 실패`);
  } else {
    showToast('💾 숙제가 저장되었습니다!');
  }

  await loadAdminData();
  // 선택된 멤버 유지
  document.getElementById('memberSelect').value = memberId;
  handleMemberSelect();
}

async function deleteAllTasksForMember() {
  const memberId = parseInt(document.getElementById('memberSelect').value);
  if (!memberId) return;

  const member = allMembers.find(m => m.id === memberId);
  if (!confirm(`"${member?.nickname}"의 모든 숙제를 삭제하시겠습니까?`)) return;

  const sb = initSupabase();
  const { error } = await sb.from('upbo_tasks').delete().eq('member_id', memberId);

  if (error) {
    showToast('삭제 실패: ' + error.message);
    return;
  }

  showToast(`🗑 ${member?.nickname}의 숙제 전체 삭제 완료`);
  await loadAdminData();
  document.getElementById('memberSelect').value = memberId;
  handleMemberSelect();
}

// ============================================
// 전체 현황 (미리보기)
// ============================================

function renderOverview() {
  const container = document.getElementById('overviewList');

  const membersWithTasks = allMembers.filter(m =>
    allTasks.some(t => t.member_id === m.id && t.quantity > 0)
  ).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'));

  if (membersWithTasks.length === 0) {
    container.innerHTML = '<p class="text-sub text-sm">배정된 숙제가 없습니다.</p>';
    return;
  }

  container.innerHTML = membersWithTasks.map(m => {
    const tasks = allTasks.filter(t => t.member_id === m.id && t.quantity > 0);
    const tags = tasks.map(t => {
      const isEvent = t.upbo_task_types?.category === 'event';
      const cls = isEvent ? 'bg-eventBg border-eventBorder text-event' : 'bg-card border-point/20 text-txt';
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${cls}">
        ${escapeHtml(t.upbo_task_types?.name)}${t.quantity > 1 ? ` ×${t.quantity}` : ''}
      </span>`;
    }).join('');

    return `
      <div class="flex items-start gap-3 p-3 rounded-xl bg-bg border border-point/10">
        <div class="flex-shrink-0 min-w-[80px]">
          <p class="font-semibold text-txt text-xs">${escapeHtml(m.nickname)}</p>
          <p class="text-sub text-[10px]">(${escapeHtml(m.user_id)})</p>
        </div>
        <div class="flex flex-wrap gap-1">${tags}</div>
      </div>`;
  }).join('');
}

// ============================================
// 항목 관리
// ============================================

function renderTypeTable() {
  const container = document.getElementById('typeTable');
  if (allTaskTypes.length === 0) {
    container.innerHTML = '<p class="text-sub text-sm">등록된 항목이 없습니다.</p>';
    return;
  }

  const regularTypes = allTaskTypes.filter(t => t.category === 'regular');
  const eventTypes = allTaskTypes.filter(t => t.category === 'event');

  let html = '';

  if (regularTypes.length > 0) {
    html += '<p class="text-xs font-semibold text-sub mb-2 mt-2">🔵 고정 항목 (룰렛)</p>';
    html += regularTypes.map(t => renderTypeRow(t)).join('');
  }

  if (eventTypes.length > 0) {
    html += '<p class="text-xs font-semibold text-event mb-2 mt-4">🟣 이벤트 항목</p>';
    html += eventTypes.map(t => renderTypeRow(t)).join('');
  }

  container.innerHTML = html;
}

function renderTypeRow(type) {
  const isEvent = type.category === 'event';
  const bgClass = isEvent ? 'bg-eventBg/30 border-eventBorder/50' : 'bg-bg border-point/10';
  const activeClass = type.is_active ? '' : 'opacity-50';

  return `
    <div class="flex items-center justify-between p-3 rounded-xl border ${bgClass} ${activeClass} hover:border-point/30 transition-colors mb-1">
      <div class="flex items-center gap-2">
        <span class="text-sm text-txt">${isEvent ? '🟣' : '🔵'} ${escapeHtml(type.name)}</span>
        ${!type.is_active ? '<span class="text-xs text-sub bg-gray-100 px-1.5 py-0.5 rounded">비활성</span>' : ''}
      </div>
      <div class="flex gap-1">
        <button onclick="toggleTypeActive(${type.id}, ${!type.is_active})"
          class="px-2 py-1 text-xs rounded-lg border ${type.is_active ? 'border-sub/30 text-sub hover:bg-yellow-50 hover:text-yellow-600' : 'border-green-300 text-green-600 hover:bg-green-50'}">
          ${type.is_active ? '비활성화' : '활성화'}
        </button>
        <button onclick="deleteType(${type.id})"
          class="btn-delete">삭제</button>
      </div>
    </div>`;
}

async function handleAddType(e) {
  e.preventDefault();
  const name = document.getElementById('inputTypeName').value.trim();
  const category = document.getElementById('inputTypeCategory').value;
  if (!name) return;

  // sort_order 자동 설정 (마지막 + 1)
  const maxOrder = allTaskTypes.reduce((max, t) => Math.max(max, t.sort_order || 0), 0);

  const sb = initSupabase();
  const { error } = await sb.from('upbo_task_types')
    .insert({ name, category, sort_order: maxOrder + 1 });

  if (error) {
    showToast('추가 실패: ' + error.message);
    return;
  }

  document.getElementById('inputTypeName').value = '';
  showToast(`✅ "${name}" 항목 추가 완료!`);
  await loadAdminData();
}

async function toggleTypeActive(id, newActive) {
  const sb = initSupabase();
  const { error } = await sb.from('upbo_task_types')
    .update({ is_active: newActive })
    .eq('id', id);

  if (error) {
    showToast('변경 실패: ' + error.message);
    return;
  }

  showToast(newActive ? '✅ 항목 활성화 완료' : '🙈 항목 비활성화 완료');
  await loadAdminData();
}

async function deleteType(id) {
  const type = allTaskTypes.find(t => t.id === id);
  const linkedTasks = allTasks.filter(t => t.task_type_id === id);

  if (linkedTasks.length > 0) {
    if (!confirm(`"${type?.name}" 항목에 연결된 숙제 ${linkedTasks.length}개가 있습니다.\n정말 삭제하시겠습니까? (연결된 숙제도 함께 삭제됩니다)`)) return;
  } else {
    if (!confirm(`"${type?.name}" 항목을 삭제하시겠습니까?`)) return;
  }

  const sb = initSupabase();
  const { error } = await sb.from('upbo_task_types').delete().eq('id', id);

  if (error) {
    showToast('삭제 실패: ' + error.message);
    return;
  }

  showToast(`🗑 "${type?.name}" 삭제 완료`);
  await loadAdminData();
}

// ============================================
// 유틸리티
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ============================================
// ✉️ 문의 관리
// ============================================

let allInquiries = [];

async function loadInquiries() {
  const sb = initSupabase();
  const { data } = await sb
    .from('upbo_inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  allInquiries = data || [];
  renderInquiries();
  updateInquiryBadge();
}

function updateInquiryBadge() {
  const badge = document.getElementById('inquiryBadge');
  const unchecked = allInquiries.filter(i => !i.is_checked).length;
  if (unchecked > 0) {
    badge.textContent = unchecked;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderInquiries() {
  const container = document.getElementById('inquiryList');
  if (allInquiries.length === 0) {
    container.innerHTML = '<p class="text-sub text-sm">문의가 없습니다.</p>';
    return;
  }

  container.innerHTML = allInquiries.map(inq => {
    const date = new Date(inq.created_at);
    const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
    const checkedClass = inq.is_checked ? 'opacity-50' : '';
    const checkIcon = inq.is_checked ? '✅' : '⬜';

    return `
      <div class="flex items-start gap-3 p-3 rounded-xl bg-bg border border-point/10 ${checkedClass}">
        <button onclick="toggleInquiryCheck(${inq.id}, ${!inq.is_checked})" class="text-lg mt-0.5 cursor-pointer">${checkIcon}</button>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-semibold text-txt text-sm">${escapeHtml(inq.nickname)}</span>
            <span class="text-sub text-[10px]">${dateStr}</span>
          </div>
          <p class="text-txt text-sm whitespace-pre-wrap break-words">${escapeHtml(inq.content)}</p>
        </div>
        <button onclick="deleteInquiry(${inq.id})" class="btn-delete flex-shrink-0">삭제</button>
      </div>`;
  }).join('');
}

async function toggleInquiryCheck(id, checked) {
  const sb = initSupabase();
  await sb.from('upbo_inquiries').update({ is_checked: checked }).eq('id', id);
  await loadInquiries();
}

async function deleteInquiry(id) {
  if (!confirm('이 문의를 삭제하시겠습니까?')) return;
  const sb = initSupabase();
  await sb.from('upbo_inquiries').delete().eq('id', id);
  showToast('🗑 문의 삭제 완료');
  await loadInquiries();
}

async function deleteCheckedInquiries() {
  const checked = allInquiries.filter(i => i.is_checked);
  if (checked.length === 0) {
    showToast('체크된 문의가 없습니다');
    return;
  }
  if (!confirm(`체크된 ${checked.length}개 문의를 삭제하시겠습니까?`)) return;
  const sb = initSupabase();
  for (const inq of checked) {
    await sb.from('upbo_inquiries').delete().eq('id', inq.id);
  }
  showToast(`🗑 ${checked.length}개 문의 삭제 완료`);
  await loadInquiries();
}
