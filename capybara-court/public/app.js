(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const socket = io({ autoConnect: true });
  const state = { side: 'A', joined: false, code: '', joining: false, submitting: false, aiReady: false, latestRoomState: null };
  const ids = {
    landing: 'landing', courtView: 'courtView', joinForm: 'joinForm', roomCode: 'roomCode', nickname: 'nickname',
    generateCode: 'generateCode', joinButton: 'joinButton', joinError: 'joinError', statementForm: 'statementForm',
    story: 'story', concern: 'concern', storyCount: 'storyCount', statementError: 'statementError', writingPanel: 'writingPanel',
    submittedPanel: 'submittedPanel', waitingCopy: 'waitingCopy', judgingPanel: 'judgingPanel', judgeErrorPanel: 'judgeErrorPanel',
    judgeErrorText: 'judgeErrorText', retryJudge: 'retryJudge', resultPanel: 'resultPanel', aiSetupNotice: 'aiSetupNotice',
    roomCodeDisplay: 'roomCodeDisplay', toast: 'toast'
  };
  let toastTimer;

  function setHidden(id, hidden) { $(id).hidden = hidden; }
  function showError(id, message) { const element = $(id); element.textContent = message || ''; element.hidden = !message; }
  function toast(message) {
    const node = $(ids.toast);
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2300);
  }
  function randomRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  }
  function getClientId() {
    const key = 'capybaraCourtClientId';
    let id = localStorage.getItem(key);
    if (!id || id.length < 8) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(key, id);
    }
    return id;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function renderList(id, items) {
    const target = $(id);
    target.innerHTML = '';
    const safeItems = Array.isArray(items) && items.length ? items : ['暂时没有足够信息。'];
    for (const item of safeItems) {
      const li = document.createElement('li');
      li.textContent = String(item);
      target.appendChild(li);
    }
  }
  function joinWithSocket(code, side, nickname) {
    state.joining = true;
    $('joinButton').disabled = true;
    $('joinButton').querySelector('span:first-child').textContent = '正在进入…';
    showError('joinError', '');
    if (!socket.connected) socket.connect();
    const attempt = () => {
      socket.emit('join_room', { code, side, nickname, clientId: getClientId() }, (response) => {
        state.joining = false;
        $('joinButton').disabled = false;
        $('joinButton').querySelector('span:first-child').textContent = '进入法庭';
        if (!response?.ok) {
          showError('joinError', response?.error || '进入房间失败，请稍后重试。');
          return;
        }
        state.joined = true;
        state.code = code;
        state.side = side;
        state.aiReady = Boolean(response.aiReady);
        $('roomCodeDisplay').textContent = code;
        setHidden(ids.landing, true);
        setHidden(ids.courtView, false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setHidden(ids.aiSetupNotice, !state.aiReady);
        toast(`已进入 ${code} · ${side} 方席位`);
      });
    };
    if (socket.connected) attempt();
    else socket.once('connect', attempt);
  }

  document.querySelectorAll('.side-option').forEach((button) => {
    button.addEventListener('click', () => {
      state.side = button.dataset.side;
      document.querySelectorAll('.side-option').forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
    });
  });

  $(ids.generateCode).addEventListener('click', () => {
    $(ids.roomCode).value = randomRoomCode();
    $(ids.roomCode).focus();
  });

  $(ids.roomCode).addEventListener('input', (event) => {
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  });

  $(ids.joinForm).addEventListener('submit', (event) => {
    event.preventDefault();
    const code = $(ids.roomCode).value.trim().toUpperCase();
    const nickname = $(ids.nickname).value.trim().slice(0, 24);
    if (!/^[A-Z0-9]{4,10}$/.test(code)) {
      showError('joinError', '房间码需要是 4–10 位英文字母或数字。');
      return;
    }
    joinWithSocket(code, state.side, nickname);
  });

  $(ids.story).addEventListener('input', () => { $('storyCount').textContent = `${$(ids.story).value.length} / 2000`; });

  $(ids.statementForm).addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.submitting) return;
    const story = $(ids.story).value.trim();
    const concern = $(ids.concern).value.trim();
    if (story.length < 10) {
      showError('statementError', '再多讲一点点吧，至少写 10 个字，法官才能判断。');
      return;
    }
    state.submitting = true;
    $('submitButton').disabled = true;
    $('submitButton').querySelector('span:first-child').textContent = '提交中…';
    showError('statementError', '');
    socket.emit('submit_statement', { story, concern }, (response) => {
      state.submitting = false;
      $('submitButton').disabled = false;
      $('submitButton').querySelector('span:first-child').textContent = '提交陈述';
      if (!response?.ok) {
        showError('statementError', response?.error || '提交失败，请检查连接后重试。');
        return;
      }
      toast('陈述已封存');
    });
  });

  function renderStatus(roomState) {
    for (const side of ['A', 'B']) {
      const player = roomState.players[side];
      $(`statusName${side}`).textContent = player.nickname || `${side} 方`;
      const statusText = player.submitted ? '陈述已提交' : player.connected ? '已进入法庭' : '等待加入';
      $(`statusText${side}`).textContent = statusText;
      $(`statusMark${side}`).textContent = player.submitted ? '✓' : player.connected ? '●' : '…';
      $(`statusDot${side}`).style.opacity = player.connected ? '1' : '.35';
    }
  }

  function renderResult(result, roomState) {
    const verdict = result.verdict;
    const banner = $('verdictBanner');
    banner.classList.remove('verdict-a', 'verdict-b', 'verdict-unclear');
    if (verdict === 'A') banner.classList.add('verdict-a');
    if (verdict === 'B') banner.classList.add('verdict-b');
    if (verdict === 'unclear') banner.classList.add('verdict-unclear');
    $('verdictSymbol').textContent = verdict === 'A' ? 'A' : verdict === 'B' ? 'B' : verdict === 'tie' ? '⚖' : '?';
    $('verdictLabel').textContent = result.verdict_label || '水豚法官的判断';
    $('verdictTitle').textContent = result.title || '这件事，还可以好好谈谈';
    $('verdictSummary').textContent = result.summary || '';
    $('commonGround').textContent = result.common_ground || '双方可能有尚未说开的共同诉求。';
    renderList('evidenceNotes', result.evidence_notes);
    $('analysisTitleA').textContent = `${roomState.players.A.nickname || 'A 方'}值得被看见的部分`;
    $('analysisTitleB').textContent = `${roomState.players.B.nickname || 'B 方'}值得被看见的部分`;
    renderList('strengthsA', result.side_a_strengths);
    renderList('strengthsB', result.side_b_strengths);
    $('responsibilities').textContent = result.responsibilities || '';
    const actionTarget = $('actionPlan');
    actionTarget.innerHTML = '';
    const actions = Array.isArray(result.action_plan) && result.action_plan.length ? result.action_plan : ['先确认双方理解的是同一件事，再讨论解决办法。'];
    actions.forEach((action) => {
      const li = document.createElement('li');
      li.textContent = String(action);
      actionTarget.appendChild(li);
    });
    $('followUpQuestion').textContent = result.follow_up_question || '还有什么关键事实需要补充？';
    $('closingLine').textContent = result.closing_line || '水豚判词已毕，记得对彼此温柔一点。';
    if (roomState.stories) {
      $('revealNameA').textContent = roomState.stories.A.nickname || 'A 方';
      $('revealNameB').textContent = roomState.stories.B.nickname || 'B 方';
      $('revealStoryA').textContent = roomState.stories.A.story || '';
      $('revealStoryB').textContent = roomState.stories.B.story || '';
      $('revealConcernA').textContent = roomState.stories.A.concern ? `最在意：${roomState.stories.A.concern}` : '未单独填写最在意的事';
      $('revealConcernB').textContent = roomState.stories.B.concern ? `最在意：${roomState.stories.B.concern}` : '未单独填写最在意的事';
    }
  }

  function renderRoom(roomState) {
    state.latestRoomState = roomState;
    state.side = roomState.selfSide;
    state.aiReady = Boolean(roomState.aiReady);
    renderStatus(roomState);
    setHidden(ids.aiSetupNotice, state.aiReady);
    const ownSubmitted = Boolean(roomState.mySubmission);
    const bothSubmitted = Boolean(roomState.bothSubmitted);
    const isResult = Boolean(roomState.result);
    const isError = Boolean(roomState.aiError) && bothSubmitted && !isResult && !roomState.judging;
    setHidden(ids.writingPanel, ownSubmitted || bothSubmitted || isResult);
    setHidden(ids.submittedPanel, ownSubmitted && !bothSubmitted && !isResult);
    setHidden(ids.judgingPanel, bothSubmitted && Boolean(roomState.judging) && !isResult);
    setHidden(ids.judgeErrorPanel, isError);
    setHidden(ids.resultPanel, !isResult);
    if (ownSubmitted && !bothSubmitted && !isResult) {
      const otherName = roomState.players[roomState.selfSide === 'A' ? 'B' : 'A'].nickname || '另一位当事人';
      $('waitingCopy').textContent = roomState.opponentSubmitted ? '双方已提交，水豚法官马上开始审理。' : `正在等 ${otherName} 提交。对方提交前，看不到你的陈述。`;
    }
    if (isError) $('judgeErrorText').textContent = roomState.aiError;
    if (isResult) renderResult(roomState.result, roomState);
  }

  socket.on('room_state', (roomState) => {
    if (!state.joined && roomState.code !== state.code) return;
    if (roomState.code !== state.code) return;
    renderRoom(roomState);
  });

  socket.on('server_status', (status) => {
    state.aiReady = Boolean(status.aiReady);
    if (state.joined) setHidden(ids.aiSetupNotice, state.aiReady);
  });

  socket.on('connect', () => {
    if (state.joined && state.code) {
      const side = state.side;
      const nickname = $(ids.nickname).value.trim();
      socket.emit('join_room', { code: state.code, side, nickname, clientId: getClientId() }, (response) => {
        if (response?.ok) toast('连接已恢复');
      });
    }
  });

  socket.on('connect_error', () => {
    if (state.joined) toast('连接中断，正在尝试恢复…');
  });

  $('copyCode').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      toast('房间码已复制，发给另一位当事人吧');
    } catch {
      const temp = document.createElement('textarea');
      temp.value = state.code;
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand('copy');
      temp.remove();
      toast(ok ? '房间码已复制' : `请手动复制房间码：${state.code}`);
    }
  });

  function backToLanding() {
    if (state.joined) socket.emit('leave_room');
    state.joined = false;
    state.code = '';
    state.submitting = false;
    state.latestRoomState = null;
    $(ids.joinForm).reset();
    $(ids.statementForm).reset();
    $('storyCount').textContent = '0 / 2000';
    showError('joinError', '');
    showError('statementError', '');
    setHidden(ids.landing, false);
    setHidden(ids.courtView, true);
    setHidden(ids.resultPanel, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('backHome').addEventListener('click', backToLanding);
  $('newCaseButton').addEventListener('click', backToLanding);
  $('printButton').addEventListener('click', () => window.print());

  $('retryJudge').addEventListener('click', () => {
    $('retryJudge').disabled = true;
    socket.emit('retry_judgement', (response) => {
      $('retryJudge').disabled = false;
      if (!response?.ok) toast(response?.error || '暂时无法重试');
      else toast('已重新开庭');
    });
  });
})();
