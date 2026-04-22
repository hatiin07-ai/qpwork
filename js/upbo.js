// ============================================
// 💖 업보 숙제장 - 공개 페이지 로직
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function renderMembers(members, memberTasks) {
  const memberList = document.getElementById('memberList');
  const emptyState = document.getElementById('emptyState');
  const memberCount = document.getElementById('memberCount');

  if (members.length === 0) {
    memberList.innerHTML = '';
    emptyState.style.display = 'block';
    memberCount.classList.add('hidden');
    return;
  }

  emptyState.style.display = 'none';
  memberCount.textContent = `총 ${members.length}명`;
  memberCount.classList.remove('hidden');

  memberList.innerHTML = members.map(m => {
    const tasks = memberTasks[m.id] || [];

    const taskTags = tasks.map(t => {
      const name = escapeHtml(t.upbo_task_types.name);
      const isEvent = t.upbo_task_types.category === 'event';
      const tagBg = isEvent ? 'bg-eventBg' : 'bg-card';
      const tagBorder = isEvent ? 'border-eventBorder' : 'border-point/20';
      const tagText = isEvent ? 'text-event' : 'text-txt';
      const qtyColor = isEvent ? 'text-event' : 'text-accent';

      let tag = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs md:text-sm border ${tagBg} ${tagBorder} ${tagText}">`;
      tag += `${name}`;
      if (t.quantity > 1) {
        tag += ` <span class="font-bold ${qtyColor}">×${t.quantity}</span>`;
      }
      if (t.memo) {
        tag += ` <span class="text-sub text-[10px] md:text-xs">(${escapeHtml(t.memo)})</span>`;
      }
      tag += `</span>`;
      return tag;
    }).join('');

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-point/20 p-4 md:p-5 flex gap-4 items-start hover:shadow-md transition-shadow">
        <div class="flex-shrink-0 min-w-[72px] md:min-w-[100px]">
          <p class="font-semibold text-txt text-sm md:text-base leading-tight">${escapeHtml(m.nickname)}</p>
          <p class="text-sub text-xs mt-0.5">(${escapeHtml(m.user_id)})</p>
        </div>
        <div class="flex flex-wrap gap-1.5 flex-1">
          ${taskTags || '<span class="text-sub text-xs">숙제 없음</span>'}
        </div>
      </div>`;
  }).join('');
}

async function loadUpboData() {
  const memberList = document.getElementById('memberList');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const searchInput = document.getElementById('searchInput');
  const lastUpdated = document.getElementById('lastUpdated');

  try {
    const sb = initSupabase();

    // 갱신일 로드
    const { data: settings } = await sb
      .from('upbo_settings')
      .select('*')
      .eq('key', 'last_updated')
      .single();

    if (settings) {
      lastUpdated.textContent = `갱신일: ${settings.value}`;
    } else {
      lastUpdated.textContent = '갱신일: -';
    }

    // 멤버 로드
    const { data: members, error: membersError } = await sb
      .from('upbo_members')
      .select('*')
      .order('created_at', { ascending: true });

    if (membersError) throw membersError;

    // 숙제 로드 (quantity > 0 인 것만, task_type 조인)
    const { data: tasks, error: tasksError } = await sb
      .from('upbo_tasks')
      .select('*, upbo_task_types(*)')
      .gt('quantity', 0)
      .order('task_type_id', { ascending: true });

    if (tasksError) throw tasksError;

    loadingState.style.display = 'none';

    // 멤버별로 숙제 그룹핑
    const memberTasks = {};
    (tasks || []).forEach(t => {
      if (!memberTasks[t.member_id]) memberTasks[t.member_id] = [];
      memberTasks[t.member_id].push(t);
    });

    // 숙제가 있는 멤버만 필터 + 닉네임 가나다순 정렬
    const activeMembers = (members || []).filter(m =>
      memberTasks[m.id] && memberTasks[m.id].length > 0 && m.is_hidden !== true
    ).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'));

    if (activeMembers.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    window._allMembers = activeMembers;
    window._memberTasks = memberTasks;

    renderMembers(activeMembers, memberTasks);

    // 검색 기능
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderMembers(window._allMembers, window._memberTasks);
        return;
      }
      const filtered = window._allMembers.filter(m =>
        m.nickname.toLowerCase().includes(query) ||
        m.user_id.toLowerCase().includes(query)
      );
      renderMembers(filtered, window._memberTasks);
    });

  } catch (err) {
    console.error('Error:', err);
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', loadUpboData);

// ============================================
// ✉️ 문의 기능
// ============================================

function openInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('hidden');
  document.getElementById('inquirySuccess').classList.add('hidden');
  document.getElementById('inquiryForm').classList.remove('hidden');
  document.getElementById('inquiryForm').reset();
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.add('hidden');
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('inquiryModal');
  if (e.target === modal) closeInquiryModal();
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('inquiryForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = document.getElementById('inquiryNickname').value.trim();
      const content = document.getElementById('inquiryContent').value.trim();
      if (!nickname || !content) return;

      const sb = initSupabase();
      const { error } = await sb.from('upbo_inquiries').insert({ nickname, content });

      if (error) {
        alert('문의 접수 실패: ' + error.message);
        return;
      }

      form.classList.add('hidden');
      document.getElementById('inquirySuccess').classList.remove('hidden');
      setTimeout(() => closeInquiryModal(), 2000);
    });
  }
});
