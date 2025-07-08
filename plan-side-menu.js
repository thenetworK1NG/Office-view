// Side menu animation and UX
const sideMenu = document.getElementById('sideMenu');
const closeSideMenu = document.getElementById('closeSideMenu');

// Drag-and-drop state variables
let draggedJob = null;
let dragOriginUser = null;

// Show menu with animation
function openSideMenu() {
  sideMenu.classList.add('open');
  sideMenu.style.display = 'block';
  setTimeout(() => {
    sideMenu.querySelector('#closeSideMenu').focus();
  }, 300);
}
// Hide menu with animation
function closeMenuAnimated() {
  sideMenu.classList.remove('open');
  setTimeout(() => {
    sideMenu.style.display = 'none';
    // Clear content for next open
    document.getElementById('clientListMenu').innerHTML = '';
    document.getElementById('clientJobsPanel').innerHTML = '';
  }, 400);
}
// Hook up close button
closeSideMenu.onclick = closeMenuAnimated;
// Escape key closes menu
window.addEventListener('keydown', (e) => {
  if (sideMenu.style.display === 'block' && (e.key === 'Escape' || e.key === 'Esc')) {
    closeMenuAnimated();
  }
});
// Add drag instruction to side menu
function ensureDragInstruction() {
  const sideMenu = document.getElementById('sideMenu');
  let instr = document.getElementById('drag-instruction');
  if (!instr) {
    instr = document.createElement('div');
    instr.id = 'drag-instruction';
    instr.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="min-width:22px;min-height:22px;"><rect x="3" y="11" width="18" height="2" rx="1"/><rect x="11" y="3" width="2" height="18" rx="1"/></svg>
      <span>Drag a job card by the handle to a user's desk to transfer</span>
    `;
    sideMenu.insertBefore(instr, sideMenu.children[2]);
  } else {
    instr.style.display = 'flex';
  }
}
// Standalone showClientsForUser
window.showClientsForUser = function(userName) {
  // Show drag instruction
  ensureDragInstruction();
  const sideMenuTitle = document.getElementById('sideMenuTitle');
  const clientListMenu = document.getElementById('clientListMenu');
  const clientJobsPanel = document.getElementById('clientJobsPanel');
  sideMenuTitle.textContent = `${userName}'s Clients`;
  clientListMenu.innerHTML = '';
  clientJobsPanel.innerHTML = '';
  openSideMenu();
  const { getDatabase, ref, onValue } = window.firebaseDbApi;
  const database = window.firebaseDbInstance;
  const jobsRef = ref(database, 'jobCards');
  onValue(jobsRef, (snapshot) => {
    if (!snapshot.exists()) {
      clientListMenu.innerHTML = '<div style="color:#b23c3c;">No jobs found for this user.</div>';
      return;
    }
    const allJobs = Object.values(snapshot.val());
    const userJobs = allJobs.filter(j => j.assignedTo === userName);
    if (userJobs.length === 0) {
      clientListMenu.innerHTML = '<div style="color:#b23c3c;">No jobs found for this user.</div>';
      return;
    }
    const clientMap = (function groupJobsByClient(jobs) {
      const map = new Map();
      jobs.forEach(job => {
        if (!job.customerName) return;
        if (!map.has(job.customerName)) map.set(job.customerName, []);
        map.get(job.customerName).push(job);
      });
      return map;
    })(userJobs);
    let html = '';
    for (const [client, jobs] of clientMap.entries()) {
      html += `<button class='client-name' style='width:100%;margin-bottom:10px;' data-client="${client}">${client} <span style='color:#7c3aed;font-weight:400;'>(${jobs.length})</span></button>`;
    }
    clientListMenu.innerHTML = html;
    clientListMenu.querySelectorAll('.client-name').forEach(btn => {
      btn.onclick = () => window.showJobsForClient(userName, btn.getAttribute('data-client'));
    });
  });
  if (window.initMessagingPanel) window.initMessagingPanel(userName);
};
// Standalone showJobsForClient
window.showJobsForClient = function(user, client) {
  const panel = document.getElementById('clientJobsPanel');
  panel.innerHTML = `<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;'>
    <h3 style='color:#38bdf8;margin:0;'>${client}</h3>
    <button id='detailedViewBtn' style='background:#7c3aed;color:#fff;border:none;padding:7px 16px;border-radius:7px;font-size:0.98rem;cursor:pointer;'>Detailed View</button>
  </div>`;
  setTimeout(() => {
    const btn = document.getElementById('detailedViewBtn');
    if (btn) btn.onclick = () => window.open('https://thenetwork1ng.github.io/view-jobs-/', '_blank');
  }, 0);
  const { getDatabase, ref, onValue } = window.firebaseDbApi;
  const database = window.firebaseDbInstance;
  const jobsRef = ref(database, 'jobCards');
  onValue(jobsRef, (snapshot) => {
    if (!snapshot.exists()) {
      panel.innerHTML += '<div style="color:#b23c3c;">No jobs found for this client.</div>';
      return;
    }
    const allJobsObj = snapshot.val();
    const userJobs = [];
    for (const [key, job] of Object.entries(allJobsObj)) {
      if (job.assignedTo === user && job.customerName === client) {
        userJobs.push({ ...job, _key: key });
      }
    }
    if (userJobs.length === 0) {
      panel.innerHTML += '<div style="color:#b23c3c;">No jobs found for this client.</div>';
      return;
    }
    let html = '';
    userJobs.forEach((job, idx) => {
      html += `<div class='a4-job-details' data-jobid='${job._key}' style='margin-bottom:18px;animation:fadeInUp 0.5s;'>
        <table style='margin-bottom:8px;'>
          <tr><th>Date</th><td>${job.date || '\u2014'}</td></tr>
          <tr><th>Customer Cell Number</th><td>${job.customerCell || '\u2014'}</td></tr>
          <tr><th>Email</th><td>${job.email || '\u2014'}</td></tr>
          <tr><th>Job Total</th><td>${job.jobTotal ? 'R ' + Number(job.jobTotal).toFixed(2) : '\u2014'}</td></tr>
          <tr><th>Deposit</th><td>${job.deposit ? 'R ' + Number(job.deposit).toFixed(2) : '\u2014'}</td></tr>
          <tr><th>Balance Due</th><td>${job.balanceDue ? 'R ' + Number(job.balanceDue).toFixed(2) : '\u2014'}</td></tr>
          <tr><th>Stickers</th><td>${Array.isArray(job.stickers) && job.stickers.length ? job.stickers.join(', ') : '\u2014'}</td></tr>
          <tr><th>Other</th><td>${Array.isArray(job.other) && job.other.length ? job.other.join(', ') : '\u2014'}</td></tr>
          <tr><th>Banner/Canvas</th><td>${Array.isArray(job.banner_canvas) && job.banner_canvas.length ? job.banner_canvas.join(', ') : '\u2014'}</td></tr>
          <tr><th>Boards</th><td>${Array.isArray(job.boards) && job.boards.length ? job.boards.join(', ') : '\u2014'}</td></tr>
          <tr><th>Description</th><td>${job.jobDescription || '\u2014'}</td></tr>
          <tr><th>Assigned To</th><td>${job.assignedTo || '\u2014'}</td></tr>
        </table>
      </div>`;
    });
    panel.innerHTML += html;
    setTimeout(() => makeJobCardsDraggable(user), 200);
  });
};
// --- Firebase-based Recycle Bin Logic ---
function addToRecycleBinFirebase(job, key) {
  const { getDatabase, ref, set, remove } = window.firebaseDbApi;
  const database = window.firebaseDbInstance;
  // Remove from jobCards, add to recycleBin
  remove(ref(database, 'jobCards/' + key)).then(() => {
    set(ref(database, 'recycleBin/' + key), { ...job, _key: key, deletedOn: Date.now() });
  });
}
function restoreFromRecycleBinFirebase(job, key) {
  const { getDatabase, ref, set, remove } = window.firebaseDbApi;
  const database = window.firebaseDbInstance;
  // Remove from recycleBin, add to jobCards
  remove(ref(database, 'recycleBin/' + key)).then(() => {
    set(ref(database, 'jobCards/' + key), job);
  });
}
function deleteForeverFromRecycleBinFirebase(key) {
  const { getDatabase, ref, remove } = window.firebaseDbApi;
  const database = window.firebaseDbInstance;
  remove(ref(database, 'recycleBin/' + key));
}
// Add drag handle to job cards and make only the handle draggable
function makeJobCardsDraggable(user) {
  document.querySelectorAll('#clientJobsPanel .a4-job-details').forEach((card, idx) => {
    // Remove any duplicate handles
    const oldHandles = card.querySelectorAll('.drag-handle');
    oldHandles.forEach(h => h.remove());
    // Add drag handle at the very top
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = `<svg viewBox='0 0 24 24' fill='none' stroke='#7c3aed' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' style='min-width:20px;min-height:20px;'><rect x='3' y='11' width='18' height='2' rx='1'/><rect x='11' y='3' width='2' height='18' rx='1'/></svg>Drag to desk`;
    card.insertBefore(handle, card.firstChild);
    // Add delete button as the second child (after handle)
    let delBtn = card.querySelector('.delete-job-btn');
    if (delBtn) delBtn.remove();
    delBtn = document.createElement('button');
    delBtn.className = 'delete-job-btn';
    delBtn.textContent = 'Delete';
    delBtn.style.cssText = 'float:right;background:#b23c3c;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:0.98rem;cursor:pointer;margin-bottom:8px;';
    delBtn.onclick = function(e) {
      e.stopPropagation();
      const jobId = card.dataset.jobid;
      console.log('[Delete] Clicked for jobId:', jobId);
      // Find job in Firebase
      const { getDatabase, ref, onValue, remove } = window.firebaseDbApi;
      const database = window.firebaseDbInstance;
      const jobsRef = ref(database, 'jobCards');
      onValue(jobsRef, (snapshot) => {
        if (!snapshot.exists()) {
          console.log('[Delete] No jobs found in Firebase');
          return;
        }
        const allJobs = snapshot.val();
        let foundJob = null;
        let foundKey = null;
        for (const [key, job] of Object.entries(allJobs)) {
          if (key === jobId || job._key === jobId || job.id === jobId) {
            foundJob = job;
            foundKey = key;
            break;
          }
        }
        console.log('[Delete] Found job:', foundJob, 'with key:', foundKey);
        if (foundJob && foundKey) {
          addToRecycleBinFirebase(foundJob, foundKey);
          window.showPopupNotification && window.showPopupNotification('Job moved to bin!', 'success');
          setTimeout(() => window.showClientsForUser(user), 500);
        } else {
          console.log('[Delete] Job not found for deletion');
        }
      }, { onlyOnce: true });
    };
    card.insertBefore(delBtn, card.children[1]);
    // Only handle is draggable
    card.setAttribute('draggable', 'false');
    handle.setAttribute('draggable', 'true');
    handle.ondragstart = (e) => {
      draggedJob = card.dataset.jobid;
      dragOriginUser = user;
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    };
    handle.ondragend = () => {
      draggedJob = null;
      dragOriginUser = null;
      card.classList.remove('dragging');
    };
  });
}
// Desk buttons as drop targets
['yolandie','francois','andre','neil'].forEach(id => {
  const btn = document.getElementById(id);
  btn.ondragover = (e) => {
    if (draggedJob && dragOriginUser && dragOriginUser.toLowerCase() !== id) {
      e.preventDefault();
      btn.classList.add('drag-over');
    }
  };
  btn.ondragleave = () => btn.classList.remove('drag-over');
  btn.ondrop = (e) => {
    btn.classList.remove('drag-over');
    // Map id to user name
    const idToUser = { yolandie: 'Yolandie', francois: 'Francois', andre: 'Andre', neil: 'Neil' };
    const toUser = idToUser[id];
    if (draggedJob && dragOriginUser && dragOriginUser !== toUser) {
      showTransferPopup(draggedJob, dragOriginUser, toUser);
    }
  };
});
// Popup menu for transfer options
function showTransferPopup(jobId, fromUser, toUser) {
  let popup = document.getElementById('transferPopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'transferPopup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#fff';
    popup.style.boxShadow = '0 8px 32px rgba(44,62,80,0.18)';
    popup.style.borderRadius = '14px';
    popup.style.padding = '32px 28px';
    popup.style.zIndex = '5000';
    popup.style.textAlign = 'center';
    popup.innerHTML = `
      <h3 style='color:#7c3aed;margin-bottom:18px;'>Send Job to ${toUser}?</h3>
      <button id='duplicateSendBtn' style='margin:8px 18px 0 0;background:#38bdf8;'>Duplicate and Send</button>
      <button id='removeSendBtn' style='margin:8px 0 0 0;background:#b23c3c;'>Remove and Send</button>
      <br><button id='cancelTransferBtn' style='margin-top:18px;background:#888;'>Cancel</button>
    `;
    document.body.appendChild(popup);
  } else {
    popup.style.display = 'block';
  }
  document.getElementById('cancelTransferBtn').onclick = () => { popup.style.display = 'none'; };
  document.getElementById('duplicateSendBtn').onclick = async () => {
    popup.style.display = 'none';
    // Duplicate and Send logic
    // 1. Find the job in Firebase
    const { getDatabase, ref, onValue, push, set } = window.firebaseDbApi;
    const database = window.firebaseDbInstance;
    const jobsRef = ref(database, 'jobCards');
    onValue(jobsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const allJobs = snapshot.val();
      let foundJob = null;
      let foundKey = null;
      for (const [key, job] of Object.entries(allJobs)) {
        if (key === jobId || job._key === jobId || job.id === jobId) {
          foundJob = job;
          foundKey = key;
          break;
        }
      }
      if (foundJob) {
        // Duplicate job for toUser
        const newJob = { ...foundJob, assignedTo: toUser };
        delete newJob._key;
        push(jobsRef, newJob);
        // Optionally, show a notification
        window.showPopupNotification && window.showPopupNotification('Job duplicated and sent!', 'success');
      }
    }, { onlyOnce: true });
    // Refresh UI
    setTimeout(() => window.showClientsForUser(dragOriginUser), 500);
  };
  document.getElementById('removeSendBtn').onclick = async () => {
    popup.style.display = 'none';
    // Remove and Send logic
    // 1. Find the job in Firebase
    const { getDatabase, ref, onValue, set } = window.firebaseDbApi;
    const database = window.firebaseDbInstance;
    const jobsRef = ref(database, 'jobCards');
    onValue(jobsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const allJobs = snapshot.val();
      let foundJob = null;
      let foundKey = null;
      for (const [key, job] of Object.entries(allJobs)) {
        if (key === jobId || job._key === jobId || job.id === jobId) {
          foundJob = job;
          foundKey = key;
          break;
        }
      }
      if (foundJob && foundKey) {
        // Update job's assignedTo
        const updatedJob = { ...foundJob, assignedTo: toUser };
        set(ref(database, 'jobCards/' + foundKey), updatedJob);
        window.showPopupNotification && window.showPopupNotification('Job sent and removed from original user!', 'success');
      }
    }, { onlyOnce: true });
    // Refresh UI
    setTimeout(() => window.showClientsForUser(dragOriginUser), 500);
  };
}
// Expose Firebase for patching
import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
window.firebaseDbApi = { getDatabase, ref, onValue, set, push, remove };
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
window.firebaseDbInstance = getDatabase(initializeApp({
  apiKey: "AIzaSyDcxQLLka_eZ5tduUW3zEAKKdKMvebeXRI",
  authDomain: "job-card-8bb4b.firebaseapp.com",
  databaseURL: "https://job-card-8bb4b-default-rtdb.firebaseio.com",
  projectId: "job-card-8bb4b",
  storageBucket: "job-card-8bb4b.firebasestorage.app",
  messagingSenderId: "355622785459",
  appId: "1:355622785459:web:fc49655132c77fb9cbfbc6",
  measurementId: "G-T7EET4NRQR"
}));
// Update renderRecycleBin to fetch from Firebase
window.renderRecycleBin = function(event) {
  const dropdown = document.getElementById('recycleBinDropdown');
  if (!dropdown) return;
  // Try to get selected user from side menu or modal
  let selectedPerson = null;
  const sideMenuTitle = document.getElementById('sideMenuTitle');
  if (sideMenuTitle && sideMenuTitle.textContent) {
    selectedPerson = sideMenuTitle.textContent.split("'s")[0];
  }
  // Fetch from Firebase
  const { getDatabase, ref, onValue } = window.firebaseDbApi;
  const database = window.firebaseDbInstance;
  const recycleRef = ref(database, 'recycleBin');
  onValue(recycleRef, (snapshot) => {
    let recycle = [];
    if (snapshot.exists()) {
      recycle = Object.entries(snapshot.val()).map(([key, job]) => ({ ...job, _key: key }));
    }
    const userRecycle = selectedPerson ? recycle.filter(j => j.assignedTo === selectedPerson) : recycle;
    let html = `<div style='background:#fff;min-width:420px;max-width:700px;max-height:420px;overflow-y:auto;border-radius:12px;box-shadow:0 8px 32px rgba(44,62,80,0.18);padding:18px 12px 12px 12px;position:relative;'>`;
    html += `<div style='font-weight:bold;font-size:1.2em;color:#b23c3c;margin-bottom:10px;'>Recycle Bin</div>`;
    if (userRecycle.length === 0) {
      html += `<div style='color:#b23c3c;text-align:center;'>No deleted jobs found${selectedPerson ? ' for ' + selectedPerson : ''}.</div>`;
    } else {
      html += `<table style='width:100%;font-size:0.98em;'><thead><tr><th>Client</th><th>Date</th><th>Cell</th><th>Description</th><th>User</th><th>Restore</th><th>Delete</th></tr></thead><tbody>`;
      userRecycle.forEach(j => {
        html += `<tr>
          <td>${j.customerName || '—'}</td>
          <td>${j.date || '—'}</td>
          <td>${j.customerCell || '—'}</td>
          <td>${(j.jobDescription || '').slice(0,40) + ((j.jobDescription||'').length>40?'...':'')}</td>
          <td>${j.assignedTo || '—'}</td>
          <td><button class="restore-btn" data-jobid="${j._key}" style="background:#38bdf8;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">Restore</button></td>
          <td><button class="delete-forever-btn" data-jobid="${j._key}" style="background:#b23c3c;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</div>`;
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    // Position dropdown below the clicked bin button
    if (event && event.target) {
      const btnRect = event.target.getBoundingClientRect();
      dropdown.style.left = btnRect.left + 'px';
      dropdown.style.top = (btnRect.bottom + 8) + 'px';
      dropdown.style.position = 'fixed';
    }
    // Restore logic
    dropdown.querySelectorAll('.restore-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const jobId = btn.dataset.jobid;
        const job = recycle.find(j => j._key === jobId);
        if (job) {
          restoreFromRecycleBinFirebase(job, jobId);
          window.showPopupNotification && window.showPopupNotification('Job restored!', 'success');
          setTimeout(() => window.renderRecycleBin(event), 500);
        }
      };
    });
    // Delete forever logic
    dropdown.querySelectorAll('.delete-forever-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const jobId = btn.dataset.jobid;
        deleteForeverFromRecycleBinFirebase(jobId);
        window.showPopupNotification && window.showPopupNotification('Job permanently deleted!', 'success');
        setTimeout(() => window.renderRecycleBin(event), 500);
      };
    });
    // Close dropdown on outside click or Escape
    function closeDropdown(e) {
      if (!dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('mousedown', closeDropdown);
        document.removeEventListener('keydown', escListener);
      }
    }
    function escListener(e) {
      if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        document.removeEventListener('mousedown', closeDropdown);
        document.removeEventListener('keydown', escListener);
      }
    }
    setTimeout(() => {
      document.addEventListener('mousedown', closeDropdown);
      document.addEventListener('keydown', escListener);
    }, 0);
  }, { onlyOnce: true });
};
// Event delegation for delete buttons
const clientJobsPanel = document.getElementById('clientJobsPanel');
if (clientJobsPanel) {
  clientJobsPanel.addEventListener('click', function(e) {
    const btn = e.target.closest('.delete-job-btn');
    if (!btn) return;
    e.stopPropagation();
    const card = btn.closest('.a4-job-details');
    if (!card) return;
    const jobId = card.dataset.jobid;
    const user = document.getElementById('sideMenuTitle')?.textContent?.split("'s")[0] || '';
    console.log('[Delete] Clicked for jobId:', jobId);
    // Find job in Firebase
    const { getDatabase, ref, onValue, remove } = window.firebaseDbApi;
    const database = window.firebaseDbInstance;
    const jobsRef = ref(database, 'jobCards');
    onValue(jobsRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('[Delete] No jobs found in Firebase');
        return;
      }
      const allJobs = snapshot.val();
      let foundJob = null;
      let foundKey = null;
      for (const [key, job] of Object.entries(allJobs)) {
        if (key === jobId || job._key === jobId || job.id === jobId) {
          foundJob = job;
          foundKey = key;
          break;
        }
      }
      console.log('[Delete] Found job:', foundJob, 'with key:', foundKey);
      if (foundJob && foundKey) {
        addToRecycleBinFirebase(foundJob, foundKey);
        window.showPopupNotification && window.showPopupNotification('Job moved to bin!', 'success');
        setTimeout(() => window.showClientsForUser(user), 500);
      } else {
        console.log('[Delete] Job not found for deletion');
      }
    }, { onlyOnce: true });
  });
}
// --- Store and display sent messages ---
window.saveSentMessage = function(sender, recipient, message) {
  const messages = JSON.parse(localStorage.getItem('sentMessages') || '[]');
  messages.push({ sender, recipient, message, time: Date.now() });
  localStorage.setItem('sentMessages', JSON.stringify(messages));
};
window.getSentMessages = function() {
  return JSON.parse(localStorage.getItem('sentMessages') || '[]');
};
// --- User-to-User Messaging with Firebase ---
window.initMessagingPanel = function(currentUser) {
  const userSelect = document.getElementById('messageUserSelect');
  const messageHistory = document.getElementById('messageHistory');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageFirebaseBtn');
  const clearBtn = document.getElementById('clearChatBtn');
  // --- Improved file input UI ---
  let fileInput = document.getElementById('messageFileInput');
  let fileLabel = document.getElementById('messageFileLabel');
  let fileNameDisplay = document.getElementById('messageFileNameDisplay');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'messageFileInput';
    fileInput.accept = '.jpg,.jpeg,.png,.pdf,.cdr,.ai,.svg,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar'; // add .cdr and common types
    fileInput.style.display = 'none';
    // Label styled as a button
    fileLabel = document.createElement('label');
    fileLabel.id = 'messageFileLabel';
    fileLabel.htmlFor = 'messageFileInput';
    fileLabel.textContent = '📎 Attach File';
    fileLabel.style.display = 'inline-block';
    fileLabel.style.background = '#38bdf8';
    fileLabel.style.color = '#fff';
    fileLabel.style.padding = '7px 16px';
    fileLabel.style.borderRadius = '7px';
    fileLabel.style.fontSize = '0.98rem';
    fileLabel.style.cursor = 'pointer';
    fileLabel.style.marginTop = '8px';
    fileLabel.style.marginBottom = '4px';
    fileLabel.style.transition = 'background 0.18s';
    fileLabel.onmouseover = () => fileLabel.style.background = '#0ea5e9';
    fileLabel.onmouseout = () => fileLabel.style.background = '#38bdf8';
    // File name display
    fileNameDisplay = document.createElement('span');
    fileNameDisplay.id = 'messageFileNameDisplay';
    fileNameDisplay.style.display = 'inline-block';
    fileNameDisplay.style.marginLeft = '10px';
    fileNameDisplay.style.fontSize = '0.97rem';
    fileNameDisplay.style.color = '#7c3aed';
    // Insert elements
    sendBtn.parentNode.insertBefore(fileLabel, sendBtn.nextSibling);
    sendBtn.parentNode.insertBefore(fileInput, fileLabel.nextSibling);
    sendBtn.parentNode.insertBefore(fileNameDisplay, fileInput.nextSibling);
    // Supported types note
    let note = document.getElementById('fileTypeNote');
    if (!note) {
      note = document.createElement('div');
      note.id = 'fileTypeNote';
      note.textContent = 'Supported: images, PDF, DOC, XLS, ZIP, RAR, SVG, AI, and CorelDRAW (.cdr)';
      note.style.fontSize = '0.92rem';
      note.style.color = '#888';
      note.style.margin = '2px 0 8px 0';
      sendBtn.parentNode.insertBefore(note, fileLabel.nextSibling);
    }
  }
  // Show selected file name
  fileInput.onchange = function() {
    if (fileInput.files && fileInput.files[0]) {
      fileNameDisplay.textContent = fileInput.files[0].name;
      // Optionally, warn if not supported
      const allowed = [
        'jpg','jpeg','png','pdf','cdr','ai','svg','doc','docx','xls','xlsx','txt','zip','rar'
      ];
      const ext = fileInput.files[0].name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        fileNameDisplay.textContent += ' (⚠️ Not a recommended file type)';
        fileNameDisplay.style.color = '#e11d48';
      } else {
        fileNameDisplay.style.color = '#7c3aed';
      }
    } else {
      fileNameDisplay.textContent = '';
    }
  };
  if (!userSelect || !messageHistory || !messageInput || !sendBtn || !clearBtn) return;

  // Populate user select (excluding self)
  const users = ['Yolandie', 'Francois', 'Andre', 'Neil'];
  userSelect.innerHTML = '';
  users.forEach(u => {
    if (u !== currentUser) {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      userSelect.appendChild(opt);
    }
  });

  let selectedUser = userSelect.value;
  userSelect.onchange = function() {
    selectedUser = userSelect.value;
    loadMessages();
  };

  // Load messages from Firebase
  function loadMessages() {
    messageHistory.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:20px;">Loading...</div>';
    const { getDatabase, ref, onValue } = window.firebaseDbApi;
    const database = window.firebaseDbInstance;
    // Messages are stored under /messages/{userA}_{userB}
    const chatKey = [currentUser, selectedUser].sort().join('_');
    const chatRef = ref(database, 'messages/' + chatKey);
    onValue(chatRef, (snapshot) => {
      let msgs = [];
      if (snapshot.exists()) {
        msgs = Object.values(snapshot.val());
      }
      messageHistory.innerHTML = '';
      if (!msgs.length) {
        messageHistory.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:20px;">No messages yet.</div>';
        return;
      }
      msgs.sort((a, b) => a.time - b.time);
      msgs.forEach(m => {
        const div = document.createElement('div');
        div.style.margin = '8px 0';
        div.style.textAlign = m.sender === currentUser ? 'right' : 'left';
        let content = '';
        if (m.text) {
          content += `<span style='display:inline-block;max-width:70%;padding:8px 14px;border-radius:12px;background:${m.sender === currentUser ? '#7c3aed' : '#eee'};color:${m.sender === currentUser ? '#fff' : '#232946'};font-size:1rem;'>${m.text}</span>`;
        }
        if (m.fileName && m.fileUrl) {
          content += `<br><a href="${m.fileUrl}" download="${m.fileName}" style="display:inline-block;margin-top:6px;color:#38bdf8;text-decoration:underline;">📎 ${m.fileName}</a>`;
        }
        content += `<br><span style='font-size:0.85em;color:#888;'>${m.sender} • ${new Date(m.time).toLocaleString()}</span>`;
        div.innerHTML = content;
        messageHistory.appendChild(div);
      });
      messageHistory.scrollTop = messageHistory.scrollHeight;
    });
  }

  // Send message
  sendBtn.onclick = function() {
    const text = messageInput.value.trim();
    const file = fileInput.files[0];
    if ((!text && !file) || !selectedUser) return;
    const { getDatabase, ref, push } = window.firebaseDbApi;
    const database = window.firebaseDbInstance;
    const chatKey = [currentUser, selectedUser].sort().join('_');
    const chatRef = ref(database, 'messages/' + chatKey);
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileUrl = e.target.result;
        push(chatRef, {
          sender: currentUser,
          recipient: selectedUser,
          text,
          fileName: file.name,
          fileUrl,
          time: Date.now()
        });
        messageInput.value = '';
        fileInput.value = '';
      };
      reader.readAsDataURL(file);
    } else {
      push(chatRef, {
        sender: currentUser,
        recipient: selectedUser,
        text,
        time: Date.now()
      });
      messageInput.value = '';
    }
  };

  // Clear chat
  clearBtn.onclick = function() {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to clear this chat?')) return;
    const { getDatabase, ref, remove } = window.firebaseDbApi;
    const database = window.firebaseDbInstance;
    const chatKey = [currentUser, selectedUser].sort().join('_');
    const chatRef = ref(database, 'messages/' + chatKey);
    remove(chatRef).then(() => {
      messageHistory.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:20px;">No messages yet.</div>';
    });
  };

  // Initial load
  loadMessages();
};
// Call initMessagingPanel with the current user (default to Yolandie for demo)
window.addEventListener('DOMContentLoaded', function() {
  window.initMessagingPanel('Yolandie'); // Change to actual user if you have auth
}); 