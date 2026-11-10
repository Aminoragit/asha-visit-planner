/* ASHA Visit Planner
   Plain JavaScript. No libraries, no network calls.
   All data is kept in this browser's local storage. */

'use strict';

var STORAGE_KEY = 'ashaVisitPlanner.v1';

/* Checklist prompts for each visit type. These are planning prompts for the
   worker to use on a visit. They are not medical advice and name no
   medicines and no doses. */
var CHECKLISTS = {
  antenatal: [
    'Ask how the pregnancy is going and listen to any concerns',
    'Check the expected delivery date and remind the family about the next facility visit',
    'Check whether the mother has her health card and earlier visit records',
    'Note any referral needed, and the name of the facility',
    'Agree the date of the next visit'
  ],
  immunisation: [
    "Check the child's immunisation card",
    'Confirm which visit is due and the date',
    'Remind the family of the session day, time and place',
    'Note any child who missed a session and plan a return visit',
    'Record the visit and update the card'
  ],
  followup: [
    'Ask how the person is doing since the last visit',
    'Check whether any referral or facility visit happened',
    'Note any new concern to pass on to the health centre',
    'Agree the date of the next visit'
  ]
};

var TYPE_LABELS = {
  antenatal: 'Antenatal',
  immunisation: 'Immunisation',
  followup: 'Follow-up'
};

var state = load() || { households: [], visits: [] };

/* ---------- storage ---------- */

function load() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || !Array.isArray(data.households) || !Array.isArray(data.visits)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    showMessage('Could not save: the browser storage is full or blocked.');
  }
}

function newId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/* ---------- dates (local dates, no time zones involved) ---------- */

function parseDate(str) {
  if (!str) return null;
  var parts = str.split('-');
  if (parts.length !== 3) return null;
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(str) {
  var d = parseDate(str);
  if (!d) return str || '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayStr() {
  var now = new Date();
  return toDateStr(now);
}

function toDateStr(d) {
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function addDays(dateStr, days) {
  var d = parseDate(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function addMonths(dateStr, months) {
  var d = parseDate(dateStr);
  if (!d) return null;
  var day = d.getDate();
  d.setMonth(d.getMonth() + months);
  /* If the target month is shorter (e.g. 31 Jan + 1 month), the date rolls
     over; pull it back to the last day of the target month. */
  if (d.getDate() !== day) d.setDate(0);
  return toDateStr(d);
}

/* Days from today to the given date: negative means overdue. */
function daysUntil(dateStr) {
  var d = parseDate(dateStr);
  if (!d) return null;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function relativeLabel(dateStr) {
  var n = daysUntil(dateStr);
  if (n === null) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return '1 day overdue';
  if (n < 0) return Math.abs(n) + ' days overdue';
  return 'in ' + n + ' days';
}

/* ---------- visit status ---------- */

function visitStatus(visit) {
  if (visit.done) return 'done';
  var n = daysUntil(visit.dueDate);
  if (n === null) return 'upcoming';
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  return 'upcoming';
}

function statusBadge(visit) {
  var s = visitStatus(visit);
  if (s === 'done') return '<span class="badge done">Completed</span>';
  if (s === 'overdue') return '<span class="badge overdue">Overdue</span>';
  if (s === 'today') return '<span class="badge today">Due today</span>';
  return '<span class="badge upcoming">Upcoming</span>';
}

function householdById(id) {
  return state.households.find(function (h) { return h.id === id; }) || null;
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- messages ---------- */

var messageTimer = null;
function showMessage(text) {
  var el = document.getElementById('appMessage');
  el.textContent = text;
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(function () { el.textContent = ''; }, 6000);
}

/* ---------- navigation ---------- */

document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.remove('active');
      t.removeAttribute('aria-current');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-current', 'page');
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = true; });
    document.getElementById('view-' + tab.dataset.view).hidden = false;
  });
});

/* ---------- dashboard ---------- */

function renderDashboard() {
  var visits = state.visits;
  var done = visits.filter(function (v) { return v.done; }).length;
  var overdue = visits.filter(function (v) { return visitStatus(v) === 'overdue'; }).length;
  var dueToday = visits.filter(function (v) { return visitStatus(v) === 'today'; }).length;
  var upcoming = visits.filter(function (v) { return visitStatus(v) === 'upcoming'; }).length;

  document.getElementById('countHouseholds').textContent = state.households.length;
  document.getElementById('countDueToday').textContent = dueToday;
  document.getElementById('countOverdue').textContent = overdue;
  document.getElementById('countUpcoming').textContent = upcoming;
  document.getElementById('countDone').textContent = done;

  document.getElementById('progressText').textContent = done + ' of ' + visits.length;
  var pct = visits.length ? Math.round((done / visits.length) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';

  renderShortList('dueTodayList', visits.filter(function (v) { return visitStatus(v) === 'today'; }), 'Nothing due today.');
  renderShortList('overdueList', visits.filter(function (v) { return visitStatus(v) === 'overdue'; })
    .sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; }), 'Nothing overdue.');

  var counts = { antenatal: 0, immunisation: 0, followup: 0 };
  visits.forEach(function (v) { if (counts[v.type] !== undefined) counts[v.type]++; });
  var typeEl = document.getElementById('typeCounts');
  typeEl.innerHTML = Object.keys(counts).map(function (type) {
    var open = visits.filter(function (v) { return v.type === type && !v.done; }).length;
    return '<li><span>' + TYPE_LABELS[type] + '</span><span>' + counts[type] +
      ' total · ' + open + ' still open</span></li>';
  }).join('');
}

function renderShortList(elId, list, emptyText) {
  var el = document.getElementById(elId);
  if (!list.length) {
    el.innerHTML = '<li class="empty">' + emptyText + '</li>';
    return;
  }
  el.innerHTML = list.map(function (v) {
    var h = householdById(v.householdId);
    return '<li><span class="visit-title">' + escapeHtml(v.title) + '</span>' +
      '<p class="visit-meta">' + escapeHtml(h ? h.name + ' — ' + h.village : 'Household removed') +
      ' · ' + formatDate(v.dueDate) + '</p>' +
      '<button type="button" class="btn small" data-open-visit="' + v.id + '">Open visit</button></li>';
  }).join('');
}

/* ---------- households ---------- */

function renderHouseholds() {
  var q = (document.getElementById('householdSearch').value || '').trim().toLowerCase();
  var list = state.households.filter(function (h) {
    if (!q) return true;
    return (h.name + ' ' + h.village).toLowerCase().indexOf(q) !== -1;
  });
  var el = document.getElementById('householdList');
  if (!state.households.length) {
    el.innerHTML = '<li class="empty">No households yet. Add one above, or load the sample households to try the app.</li>';
    return;
  }
  if (!list.length) {
    el.innerHTML = '<li class="empty">No households match that search.</li>';
    return;
  }
  el.innerHTML = list.map(function (h) {
    var count = state.visits.filter(function (v) { return v.householdId === h.id; }).length;
    var open = state.visits.filter(function (v) { return v.householdId === h.id && !v.done; }).length;
    return '<li><span class="visit-title">' + escapeHtml(h.name) + '</span>' +
      (h.sample ? '<span class="badge sample">Sample</span>' : '') +
      '<p class="visit-meta">' + escapeHtml(h.village) +
      (h.members ? ' · ' + h.members + ' people' : '') +
      (h.phone ? ' · ' + escapeHtml(h.phone) : '') + '</p>' +
      (h.notes ? '<p class="visit-meta">' + escapeHtml(h.notes) + '</p>' : '') +
      '<p class="check-progress">' + count + ' visit' + (count === 1 ? '' : 's') +
      ' · ' + open + ' still open</p>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn small" data-add-visit="' + h.id + '">Add visit</button>' +
      '<button type="button" class="btn small" data-edit-household="' + h.id + '">Edit</button>' +
      '<button type="button" class="btn small" data-delete-household="' + h.id + '">Delete</button>' +
      '</div></li>';
  }).join('');
}

document.getElementById('householdSearch').addEventListener('input', renderHouseholds);

document.getElementById('householdForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var id = document.getElementById('householdId').value;
  var data = {
    name: document.getElementById('hhName').value.trim(),
    village: document.getElementById('hhVillage').value.trim(),
    members: Number(document.getElementById('hhMembers').value) || 1,
    phone: document.getElementById('hhPhone').value.trim(),
    notes: document.getElementById('hhNotes').value.trim()
  };
  if (!data.name || !data.village) return;
  if (id) {
    var existing = householdById(id);
    if (existing) Object.assign(existing, data);
    showMessage('Household updated.');
  } else {
    state.households.push(Object.assign({ id: newId(), sample: false }, data));
    showMessage('Household saved.');
  }
  save();
  resetHouseholdForm();
  renderAll();
});

function resetHouseholdForm() {
  document.getElementById('householdForm').reset();
  document.getElementById('householdId').value = '';
  document.getElementById('hhMembers').value = 4;
  document.getElementById('householdFormTitle').textContent = 'Add a household';
  document.getElementById('householdCancel').hidden = true;
}

document.getElementById('householdCancel').addEventListener('click', resetHouseholdForm);

document.getElementById('loadSample').addEventListener('click', function () {
  loadSampleData();
  save();
  renderAll();
  showMessage('Sample households loaded. They are marked “Sample”.');
});

/* ---------- visits ---------- */

function checklistDraft() {
  var items = [];
  document.querySelectorAll('#checklistEditor li').forEach(function (li) {
    items.push({ text: li.dataset.text, done: li.querySelector('input[type="checkbox"]').checked });
  });
  return items;
}

function renderChecklistEditor(items) {
  var el = document.getElementById('checklistEditor');
  el.innerHTML = '';
  items.forEach(function (item, index) {
    var li = document.createElement('li');
    li.dataset.text = item.text;
    var label = document.createElement('label');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!item.done;
    var span = document.createElement('span');
    span.textContent = item.text;
    label.appendChild(box);
    label.appendChild(span);
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn small';
    remove.textContent = 'Remove';
    remove.addEventListener('click', function () {
      var current = checklistDraft();
      current.splice(index, 1);
      renderChecklistEditor(current);
    });
    li.appendChild(label);
    li.appendChild(remove);
    el.appendChild(li);
  });
}

function setChecklistForType(type) {
  renderChecklistEditor(CHECKLISTS[type].map(function (text) {
    return { text: text, done: false };
  }));
}

document.getElementById('visitType').addEventListener('change', function (e) {
  if (!document.getElementById('visitId').value) setChecklistForType(e.target.value);
});

document.getElementById('addCheckItem').addEventListener('click', function () {
  var input = document.getElementById('newCheckItem');
  var text = input.value.trim();
  if (!text) return;
  var current = checklistDraft();
  current.push({ text: text, done: false });
  renderChecklistEditor(current);
  input.value = '';
  input.focus();
});

function fillHouseholdSelect(selectedId) {
  var select = document.getElementById('visitHousehold');
  select.innerHTML = '';
  if (!state.households.length) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Add a household first';
    select.appendChild(opt);
    return;
  }
  state.households.forEach(function (h) {
    var opt = document.createElement('option');
    opt.value = h.id;
    opt.textContent = h.name + ' — ' + h.village;
    if (h.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

document.getElementById('visitForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var id = document.getElementById('visitId').value;
  var householdId = document.getElementById('visitHousehold').value;
  if (!householdId) {
    showMessage('Add a household first, then add a visit for it.');
    return;
  }
  var data = {
    householdId: householdId,
    type: document.getElementById('visitType').value,
    dueDate: document.getElementById('visitDue').value,
    title: document.getElementById('visitTitle').value.trim(),
    notes: document.getElementById('visitNotes').value.trim(),
    checklist: checklistDraft()
  };
  if (!data.title || !data.dueDate) return;
  if (id) {
    var existing = state.visits.find(function (v) { return v.id === id; });
    if (existing) {
      var wasDone = existing.done;
      Object.assign(existing, data);
      existing.done = wasDone;
    }
    showMessage('Visit updated.');
  } else {
    state.visits.push(Object.assign({ id: newId(), done: false }, data));
    showMessage('Visit saved for ' + formatDate(data.dueDate) + ' (' + relativeLabel(data.dueDate) + ').');
  }
  save();
  resetVisitForm();
  renderAll();
});

function resetVisitForm() {
  document.getElementById('visitForm').reset();
  document.getElementById('visitId').value = '';
  document.getElementById('visitFormTitle').textContent = 'Add a visit';
  document.getElementById('visitCancel').hidden = true;
  document.getElementById('visitDue').value = todayStr();
  fillHouseholdSelect();
  setChecklistForType(document.getElementById('visitType').value);
}

document.getElementById('visitCancel').addEventListener('click', resetVisitForm);

document.getElementById('visitFilter').addEventListener('change', renderVisits);
document.getElementById('visitTypeFilter').addEventListener('change', renderVisits);

function renderVisits() {
  var statusFilter = document.getElementById('visitFilter').value;
  var typeFilter = document.getElementById('visitTypeFilter').value;
  var list = state.visits.slice().sort(function (a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.dueDate < b.dueDate ? -1 : (a.dueDate > b.dueDate ? 1 : 0);
  }).filter(function (v) {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'done') return v.done;
    return visitStatus(v) === statusFilter;
  });

  var el = document.getElementById('visitList');
  if (!state.visits.length) {
    el.innerHTML = '<li class="empty">No visits yet. Add a household first, then add a visit with a due date.</li>';
    return;
  }
  if (!list.length) {
    el.innerHTML = '<li class="empty">No visits match this filter.</li>';
    return;
  }
  el.innerHTML = list.map(function (v) {
    var h = householdById(v.householdId);
    var doneCount = v.checklist.filter(function (c) { return c.done; }).length;
    var status = visitStatus(v);
    var cls = status === 'overdue' ? 'overdue' : (status === 'today' ? 'due-today' : (status === 'done' ? 'done' : ''));
    return '<li data-visit-id="' + v.id + '" class="' + cls + '">' +
      '<span class="visit-title">' + escapeHtml(v.title) + '</span>' + statusBadge(v) +
      '<p class="visit-meta">' + TYPE_LABELS[v.type] + ' · ' +
      escapeHtml(h ? h.name + ' — ' + h.village : 'Household removed') +
      ' · due ' + formatDate(v.dueDate) + ' (' + relativeLabel(v.dueDate) + ')</p>' +
      (v.notes ? '<p class="visit-meta">' + escapeHtml(v.notes) + '</p>' : '') +
      '<p class="check-progress">Checklist: ' + doneCount + ' of ' + v.checklist.length + ' done</p>' +
      '<ul class="checklist">' + v.checklist.map(function (item, i) {
        return '<li class="' + (item.done ? 'checked' : '') + '"><label>' +
          '<input type="checkbox" data-visit="' + v.id + '" data-item="' + i + '"' +
          (item.done ? ' checked' : '') + '> <span>' + escapeHtml(item.text) + '</span></label></li>';
      }).join('') + '</ul>' +
      '<div class="row-actions">' +
      (v.done
        ? '<button type="button" class="btn small" data-reopen-visit="' + v.id + '">Reopen visit</button>'
        : '<button type="button" class="btn small primary" data-complete-visit="' + v.id + '">Mark visit done</button>') +
      '<button type="button" class="btn small" data-edit-visit="' + v.id + '">Edit</button>' +
      '<button type="button" class="btn small" data-delete-visit="' + v.id + '">Delete</button>' +
      '</div></li>';
  }).join('');
}

/* Checklist ticks, completion, edit and delete are handled through one
   delegated listener so the list can be re-rendered freely. */
document.getElementById('visitList').addEventListener('click', function (e) {
  var t = e.target;
  var completeBtn = t.closest('[data-complete-visit]');
  var reopenBtn = t.closest('[data-reopen-visit]');
  var editBtn = t.closest('[data-edit-visit]');
  var deleteBtn = t.closest('[data-delete-visit]');
  var openBtn = null;
  if (completeBtn) {
    var v = state.visits.find(function (x) { return x.id === completeBtn.dataset.completeVisit; });
    if (v) { v.done = true; save(); renderAll(); showMessage('Visit marked done.'); }
  } else if (reopenBtn) {
    var v2 = state.visits.find(function (x) { return x.id === reopenBtn.dataset.reopenVisit; });
    if (v2) { v2.done = false; save(); renderAll(); showMessage('Visit reopened.'); }
  } else if (editBtn) {
    openVisitForEdit(editBtn.dataset.editVisit);
  } else if (deleteBtn) {
    var v3 = state.visits.find(function (x) { return x.id === deleteBtn.dataset.deleteVisit; });
    if (v3 && confirm('Delete this visit: "' + v3.title + '"?')) {
      state.visits = state.visits.filter(function (x) { return x.id !== v3.id; });
      save(); renderAll(); showMessage('Visit deleted.');
    }
  }
});

document.getElementById('visitList').addEventListener('change', function (e) {
  var box = e.target.closest('input[type="checkbox"][data-visit]');
  if (!box) return;
  var v = state.visits.find(function (x) { return x.id === box.dataset.visit; });
  if (!v) return;
  v.checklist[Number(box.dataset.item)].done = box.checked;
  save();
  renderAll();
});

document.getElementById('dueTodayList').addEventListener('click', openVisitFromList);
document.getElementById('overdueList').addEventListener('click', openVisitFromList);

function openVisitFromList(e) {
  var btn = e.target.closest('[data-open-visit]');
  if (btn) openVisitForEdit(btn.dataset.openVisit);
}

function openVisitForEdit(visitId) {
  var v = state.visits.find(function (x) { return x.id === visitId; });
  if (!v) return;
  document.querySelector('.tab[data-view="visits"]').click();
  document.getElementById('visitId').value = v.id;
  fillHouseholdSelect(v.householdId);
  document.getElementById('visitType').value = v.type;
  document.getElementById('visitDue').value = v.dueDate;
  document.getElementById('visitTitle').value = v.title;
  document.getElementById('visitNotes').value = v.notes || '';
  renderChecklistEditor(v.checklist);
  document.getElementById('visitFormTitle').textContent = 'Edit visit';
  document.getElementById('visitCancel').hidden = false;
  document.getElementById('visitForm').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('householdList').addEventListener('click', function (e) {
  var t = e.target;
  var addBtn = t.closest('[data-add-visit]');
  var editBtn = t.closest('[data-edit-household]');
  var deleteBtn = t.closest('[data-delete-household]');
  if (addBtn) {
    document.querySelector('.tab[data-view="visits"]').click();
    resetVisitForm();
    fillHouseholdSelect(addBtn.dataset.addVisit);
    document.getElementById('visitTitle').focus();
  } else if (editBtn) {
    var h = householdById(editBtn.dataset.editHousehold);
    if (!h) return;
    document.getElementById('householdId').value = h.id;
    document.getElementById('hhName').value = h.name;
    document.getElementById('hhVillage').value = h.village;
    document.getElementById('hhMembers').value = h.members || 1;
    document.getElementById('hhPhone').value = h.phone || '';
    document.getElementById('hhNotes').value = h.notes || '';
    document.getElementById('householdFormTitle').textContent = 'Edit household';
    document.getElementById('householdCancel').hidden = false;
    document.getElementById('householdForm').scrollIntoView({ behavior: 'smooth' });
  } else if (deleteBtn) {
    var h2 = householdById(deleteBtn.dataset.deleteHousehold);
    if (!h2) return;
    var n = state.visits.filter(function (v) { return v.householdId === h2.id; }).length;
    if (confirm('Delete household "' + h2.name + '" and its ' + n + ' visit(s)?')) {
      state.households = state.households.filter(function (x) { return x.id !== h2.id; });
      state.visits = state.visits.filter(function (v) { return v.householdId !== h2.id; });
      save(); renderAll(); showMessage('Household deleted.');
    }
  }
});

/* ---------- due-date helpers ---------- */

document.getElementById('makeImmunisation').addEventListener('click', function () {
  var householdId = document.getElementById('visitHousehold').value;
  var birth = document.getElementById('birthDate').value;
  if (!householdId) { showMessage('Pick a household in the visit form first.'); return; }
  if (!birth) { showMessage('Enter the child’s birth date first.'); return; }
  var milestones = [
    { days: 42, label: '6 weeks' },
    { days: 70, label: '10 weeks' },
    { days: 98, label: '14 weeks' },
    { months: 9, label: '9 months' }
  ];
  milestones.forEach(function (m) {
    var due = m.days ? addDays(birth, m.days) : addMonths(birth, m.months);
    state.visits.push({
      id: newId(),
      householdId: householdId,
      type: 'immunisation',
      dueDate: due,
      title: 'Immunisation visit — ' + m.label + ' after birth',
      notes: 'Planning date from the birth date. Check the child’s immunisation card and the local health centre for the exact date.',
      checklist: CHECKLISTS.immunisation.map(function (text) { return { text: text, done: false }; }),
      done: false
    });
  });
  save();
  renderAll();
  showMessage('Four immunisation visits added. Check them against the child’s card.');
});

document.getElementById('makeAntenatal').addEventListener('click', function () {
  var householdId = document.getElementById('visitHousehold').value;
  var edd = document.getElementById('eddDate').value;
  if (!householdId) { showMessage('Pick a household in the visit form first.'); return; }
  if (!edd) { showMessage('Enter the expected delivery date first.'); return; }
  [
    { weeks: 4, label: '4 weeks before expected delivery' },
    { weeks: 1, label: '1 week before expected delivery' }
  ].forEach(function (m) {
    state.visits.push({
      id: newId(),
      householdId: householdId,
      type: 'antenatal',
      dueDate: addDays(edd, -m.weeks * 7),
      title: 'Antenatal check-in — ' + m.label,
      notes: 'Suggested date only. Confirm with the health centre.',
      checklist: CHECKLISTS.antenatal.map(function (text) { return { text: text, done: false }; }),
      done: false
    });
  });
  save();
  renderAll();
  showMessage('Two antenatal check-in visits added. Confirm the dates with the health centre.');
});

/* ---------- print ---------- */

document.getElementById('printToday').addEventListener('click', function () {
  document.querySelector('.tab[data-view="visits"]').click();
  document.getElementById('visitFilter').value = 'today';
  renderVisits();
  window.print();
});

/* ---------- data: export, import, clear ---------- */

document.getElementById('exportData').addEventListener('click', function () {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'asha-visit-planner-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showMessage('Backup downloaded.');
});

document.getElementById('importFile').addEventListener('change', function (e) {
  var file = e.target.files && e.target.files[0];
  var status = document.getElementById('importStatus');
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.households) || !Array.isArray(data.visits)) {
        throw new Error('bad file');
      }
      if (!confirm('Replace everything on this device with the backup file?')) return;
      state = data;
      save();
      renderAll();
      status.textContent = 'Backup loaded: ' + data.households.length + ' households, ' + data.visits.length + ' visits.';
      showMessage('Backup loaded.');
    } catch (err) {
      status.textContent = 'That file could not be read as a backup from this app.';
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('clearData').addEventListener('click', function () {
  if (!confirm('Delete ALL households and visits on this device? This cannot be undone.')) return;
  state = { households: [], visits: [] };
  save();
  resetHouseholdForm();
  resetVisitForm();
  renderAll();
  showMessage('All data deleted.');
});

/* ---------- sample data (clearly marked, dates relative to today) ---------- */

function loadSampleData() {
  var today = todayStr();
  var h1 = { id: newId(), name: 'Meena Sharma', village: 'Rampur', members: 5, phone: '', notes: 'House near the primary school.', sample: true };
  var h2 = { id: newId(), name: 'Ravi Kumar', village: 'Rampur', members: 3, phone: '', notes: '', sample: true };
  var h3 = { id: newId(), name: 'Sunita Devi', village: 'Chandpur', members: 6, phone: '', notes: 'Ask for the grandmother at the door.', sample: true };
  state.households.push(h1, h2, h3);
  var mk = function (householdId, type, dueDate, title, notes, done) {
    return {
      id: newId(), householdId: householdId, type: type, dueDate: dueDate,
      title: title, notes: notes || '',
      checklist: CHECKLISTS[type].map(function (text) { return { text: text, done: false }; }),
      done: !!done
    };
  };
  state.visits.push(
    mk(h1.id, 'antenatal', addDays(today, -2), 'Antenatal check-in — 4 weeks before expected delivery', 'Overdue by 2 days in this sample.', false),
    mk(h2.id, 'immunisation', today, 'Immunisation visit — 6 weeks after birth', 'Session day at the health sub-centre.', false),
    mk(h3.id, 'followup', addDays(today, 3), 'Follow-up visit after referral', '', false),
    mk(h1.id, 'immunisation', addDays(today, -10), 'Immunisation visit — 10 weeks after birth', '', true)
  );
}

/* ---------- online / offline indicator ---------- */

function updateNetStatus() {
  var el = document.getElementById('netStatus');
  if (navigator.onLine) {
    el.textContent = 'Online — still works offline';
    el.classList.remove('offline');
  } else {
    el.textContent = 'Offline — app keeps working';
    el.classList.add('offline');
  }
}
window.addEventListener('online', updateNetStatus);
window.addEventListener('offline', updateNetStatus);

/* ---------- render everything ---------- */

function renderAll() {
  fillHouseholdSelect(document.getElementById('visitHousehold').value);
  renderDashboard();
  renderHouseholds();
  renderVisits();
}

updateNetStatus();
document.getElementById('visitDue').value = todayStr();
setChecklistForType('antenatal');
renderAll();
