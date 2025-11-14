// main.js - Updated
// Yêu cầu: ngày trả có thể trống; user sửa/xóa trước khi duyệt; admin duyệt/từ chối/gia hạn/xác nhận trả/xóa; admin sửa/xóa thiết bị; stats khác nhau kèm thời gian

// ================== CONFIG ==================
const firebaseConfig = {
  apiKey: "AIzaSyALw-kDEXZeKBQk__Mnfrqogb7vKuPu92w",
  authDomain: "qltb-37efe.firebaseapp.com",
  projectId: "qltb-37efe",
  storageBucket: "qltb-37efe.firebasestorage.app",
  messagingSenderId: "405387499869",
  appId: "1:405387499869:web:78c8799d558f0acc4270b4",
  measurementId: "G-QKQFMLZBD2"
};

const ALLOWED_DOMAIN = "agu.edu.vn";
const ADMIN_EMAILS = ["nthanhphuong@agu.edu.vn", "admin2@agu.edu.vn"];
const TEST_EMAILS = ["test1@local.test", "test2@local.test"];
function isAllowedEmail(email){ return email && (email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email)); }

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  updateDoc, deleteDoc, serverTimestamp, query, where, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ================== INIT ==================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== DOM ==================
const loginArea = document.getElementById("loginArea");
const loginMessage = document.getElementById("loginMessage");
const btnGoogleLogin = document.getElementById("btnGoogleLogin");
const btnLogout = document.getElementById("btnLogout");
const userInfo = document.getElementById("userInfo");
const userEmailEl = document.getElementById("userEmail");
const userRoleTag = document.getElementById("userRoleTag");

// Admin equipment
const eqName = document.getElementById("eqName");
const eqCode = document.getElementById("eqCode");
const eqQty = document.getElementById("eqQty");
const eqDesc = document.getElementById("eqDesc");
const btnAddEq = document.getElementById("btnAddEq");
const equipmentListAdmin = document.getElementById("equipmentListAdmin");

// Equipment for users
const equipmentList = document.getElementById("equipmentList");
const loanEqSelect = document.getElementById("loanEqSelect");
const loanQty = document.getElementById("loanQty");
const loanStart = document.getElementById("loanStart");
const loanDue = document.getElementById("loanDue");
const loanNote = document.getElementById("loanNote");
const btnCreateLoan = document.getElementById("btnCreateLoan");
const loanCreateMsg = document.getElementById("loanCreateMsg");
const myLoans = document.getElementById("myLoans");

// Admin loans
const allLoans = document.getElementById("allLoans");

// Stats
const statsArea = document.getElementById("statsArea");

// MENU
const mainNav = document.getElementById("mainNav");
const allPages = () => Array.from(document.querySelectorAll(".page"));
const tabButtons = () => Array.from(document.querySelectorAll(".tab-btn"));

function showPage(pageId){
  allPages().forEach(p => p.classList.add("hidden"));
  tabButtons().forEach(b => b.classList.remove("active"));
  const el = document.getElementById(pageId);
  if (el) el.classList.remove("hidden");
  const btn = tabButtons().find(b => b.dataset.page === pageId);
  if (btn) btn.classList.add("active");

  // refresh page khi show
  if (pageId === "page-devices" || pageId === "page-admin-eq") refreshEquipmentLists();
  else if (pageId === "page-create-loan") refreshEquipmentLists();
  else if (pageId === "page-my-loans") refreshMyLoans();
  else if (pageId === "page-admin-loans") refreshAllLoans();
  else if (pageId === "page-stats") refreshStats();
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.classList && t.classList.contains("tab-btn")) {
    showPage(t.dataset.page);
  }
});

// ================== STATE ==================
let currentUser = null;
let isAdmin = false;
let loanFilters = { status: '', equipmentId: '', from: '', to: '' }; // <-- Đây là chỗ thêm

// ================== AUTH ==================
btnGoogleLogin.onclick = async () => {
  loginMessage.textContent = "";
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || "";
    if (!email.endsWith("@"+ALLOWED_DOMAIN)) {
      await signOut(auth);
      loginMessage.textContent = `Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
    }
  } catch (err) { console.error(err); loginMessage.textContent = "Đăng nhập thất bại."; }
};

btnLogout.onclick = async () => { await signOut(auth); };

// ================== LOCAL LOGIN ==================
const localEmail = document.getElementById("localEmail");
const localPass  = document.getElementById("localPass");
const btnLocalSignup = document.getElementById("btnLocalSignup");
const btnLocalLogin  = document.getElementById("btnLocalLogin");
const localMsg = document.getElementById("localMsg");

btnLocalSignup.onclick = async () => {
  localMsg.textContent = "";
  try {
    const email = (localEmail.value||"").trim();
    const pass = localPass.value || "";
    if (!email || !pass){ localMsg.textContent = "Nhập email và mật khẩu."; return; }
    if (!isAllowedEmail(email)){ localMsg.textContent = "Email không được phép."; return; }
    await createUserWithEmailAndPassword(auth, email, pass);
    localMsg.textContent = "Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  } catch(e){ console.error(e); localMsg.textContent = "Đăng ký thất bại: " + (e.code||""); }
};
btnLocalLogin.onclick = async () => {
  localMsg.textContent = "";
  try {
    const email = (localEmail.value||"").trim();
    const pass = localPass.value || "";
    if (!email || !pass){ localMsg.textContent = "Nhập email và mật khẩu."; return; }
    await signInWithEmailAndPassword(auth, email, pass);
    localMsg.textContent = "Đăng nhập test thành công.";
  } catch(e){ console.error(e); localMsg.textContent = "Đăng nhập thất bại: " + (e.code||""); }
};

// ================== AUTH STATE ==================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null; isAdmin = false;
    userInfo.classList.add("hidden");
    loginArea.classList.remove("hidden");
    mainNav.classList.add("hidden");
    allPages().forEach(p => p.classList.add("hidden"));
    return;
  }

  if (!isAllowedEmail(user.email)){
    await signOut(auth);
    loginMessage.textContent = `Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test trong TEST_EMAILS.`;
    return;
  }

  currentUser = user;
  isAdmin = ADMIN_EMAILS.includes(user.email);

  userEmailEl.textContent = user.email;
  userRoleTag.textContent = isAdmin ? "ADMIN" : "USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin ? "admin" : "user");

  loginArea.classList.add("hidden");
  userInfo.classList.remove("hidden");

  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{
    if (isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden");
  });

  showPage(isAdmin ? "page-admin-eq" : "page-devices");
  await refreshEquipmentLists();
  await refreshMyLoans();
  if (isAdmin) await refreshAllLoans();
});

// ================== EQUIPMENT ==================
// Add equipment
btnAddEq.onclick = async () => {
  if (!isAdmin || !currentUser) return;
  const name = eqName.value.trim();
  const code = eqCode.value.trim();
  const qty = parseInt(eqQty.value,10) || 0;
  const desc = eqDesc.value.trim();
  if (!name || !code || qty <= 0){ alert("Nhập đầy đủ tên, mã, số lượng > 0."); return; }
  try{
    await addDoc(collection(db,"equipment"), {
      name, code, description: desc,
      quantity_total: qty, quantity_available: qty,
      is_active: true
    });
    eqName.value = eqCode.value = eqDesc.value = ""; eqQty.value = "";
    await refreshEquipmentLists();
    alert("Đã thêm thiết bị.");
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message)); }
};

// Refresh equipment lists
async function refreshEquipmentLists(){
  equipmentList.innerHTML = "Đang tải...";
  equipmentListAdmin.innerHTML = "";
  loanEqSelect.innerHTML = `<option value="">-- Chọn thiết bị --</option>`;

  const snap = await getDocs(collection(db,"equipment"));
  let htmlUser = "", htmlAdmin = "";

  snap.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    if (!d.is_active) return;
    // user view
    htmlUser += `<div class=\"card\"><strong>${d.name}</strong> (${d.code}) — Còn: ${d.quantity_available}/${d.quantity_total}<br>${d.description||""}</div>`;
    // admin view
    if (isAdmin){
      htmlAdmin += `<div class=\"card\">\n        <strong>${d.name}</strong> (${d.code}) — Còn: ${d.quantity_available}/${d.quantity_total}<br>${d.description||""}\n        <button onclick=\"editEquipment('${id}')\">Sửa</button>\n        <button onclick=\"deleteEquipment('${id}')\">Xóa</button>\n      </div>`;
    }
    // select for loan
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`;
    loanEqSelect.appendChild(opt);
  });

  equipmentList.innerHTML = htmlUser || "<p>Chưa có thiết bị.</p>";
  if (isAdmin) equipmentListAdmin.innerHTML = htmlAdmin || "<p>Chưa có thiết bị.</p>";

  // set default dates
  const today = new Date();
  const pad = n=>String(n).padStart(2,"0");
  const toInput = dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if (!loanStart.value) loanStart.value = toInput(today);
  if (!loanDue.value){
    const t = new Date(today); t.setDate(t.getDate()+7);
    loanDue.value = toInput(t);
  }
}

// Edit / Delete equipment
window.editEquipment = async (id)=>{
  const eqRef = doc(db,"equipment",id);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return;
  const d = eqSnap.data();
  const name = prompt("Tên thiết bị:", d.name);
  if (name === null) return;
  const code = prompt("Mã thiết bị:", d.code);
  if (code === null) return;
  const qty = parseInt(prompt("Tổng số lượng:", d.quantity_total),10);
  if (isNaN(qty) || qty<0) return alert("Số lượng không hợp lệ");
  const desc = prompt("Mô tả:", d.description||"");
  // điều chỉnh quantity_available tương ứng nếu cần
  const delta = qty - (d.quantity_total || 0);
  const newAvailable = (d.quantity_available || 0) + delta;
  await updateDoc(eqRef,{name,code,description:desc,quantity_total:qty,quantity_available:newAvailable});
  await refreshEquipmentLists();
};
window.deleteEquipment = async (id)=>{
  if (!confirm("Xác nhận xóa thiết bị này?")) return;
  const eqRef = doc(db,"equipment",id);
  await updateDoc(eqRef,{is_active:false});
  await refreshEquipmentLists();
};

// ================== CREATE LOAN ==================
btnCreateLoan.onclick = async () => {
  if (!currentUser){ alert("Cần đăng nhập."); return; }
  const eqId = (loanEqSelect.value||"").trim();
  const qty = parseInt(loanQty.value,10) || 0;
  const note = loanNote.value.trim();
  const startStr = loanStart.value, dueStr = loanDue.value;

  if (!eqId || qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng > 0."; return; }
  if (!startStr){ loanCreateMsg.textContent="Chọn ngày mượn."; return; }

  const startDate = new Date(`${startStr}T00:00:00`);
  const dueDate = dueStr ? new Date(`${dueStr}T23:59:59`) : null;
  if (dueDate && startDate > dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return; }

  try{
    const eqRef = doc(db,"equipment",eqId);
    const eqSnap = await getDoc(eqRef);
    if (!eqSnap.exists()){ loanCreateMsg.textContent="Không tìm thấy thiết bị."; return; }
    const eq = eqSnap.data();
    if (!eq.is_active){ loanCreateMsg.textContent="Thiết bị không hoạt động."; return; }
    if (eq.quantity_available < qty){ loanCreateMsg.textContent="Không đủ số lượng còn lại."; return; }

    await addDoc(collection(db,"loans"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      equipmentId: eqId,
      equipmentName: eq.name,
      quantity: qty,
      note,
      status: "pending",
      createdAt: serverTimestamp(),
      requestedStart: Timestamp.fromDate(startDate),
      requestedDue: dueDate ? Timestamp.fromDate(dueDate) : null,
      approvedBy: null, approvedAt: null,
      startAt: null, dueAt: null,
      returned: false, returnedAt: null,
      rejectedReason: null,
      deleted: false
    });

    loanEqSelect.value = ""; loanQty.value = ""; loanNote.value = "";
    loanCreateMsg.textContent = "Đã gửi yêu cầu mượn.";
    await refreshMyLoans();
    if (isAdmin) await refreshAllLoans();
  }catch(e){ console.error(e); loanCreateMsg.textContent = "Gửi yêu cầu thất bại: " + (e.code||e.message); }
};

// ================== MY LOANS ==================
function renderLoanCard(id, d, adminView) {
  // Xác định lớp màu trạng thái
  let statusClass = "";
  if (d.status === "pending") statusClass = "status-pending";
  else if (d.status === "approved" && !d.returned) statusClass = "status-approved";
  else if (d.status === "rejected") statusClass = "status-rejected";
  else if (d.returned) statusClass = "status-returned";

  // Hàm định dạng ngày
  const fmt = (ts) => {
    if (!ts) return "-";
    try { return ts.toDate ? ts.toDate().toLocaleDateString() : new Date(ts).toLocaleDateString(); }
    catch(e){ return "-"; }
  };

  // Xác định văn bản hiển thị trạng thái kèm thời gian
  let displayStatus = "";
  if (d.status === "pending") displayStatus = `Chờ duyệt (tạo: ${fmt(d.createdAt)})`;
  else if (d.status === "approved" && !d.returned) displayStatus = `Đang mượn (${fmt(d.startAt)} → ${fmt(d.dueAt)})`;
  else if (d.returned) displayStatus = `Đã trả (hạn: ${fmt(d.dueAt)})`;
  else if (d.status === "rejected") displayStatus = `Bị từ chối (tạo: ${fmt(d.createdAt)})`;

  // Controls dành cho admin
  let adminControls = "";
  if (adminView) {
    if (d.status === "pending") {
      adminControls += `<div style="margin-top:6px">
        <div><em>Người mượn đề xuất:</em> ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>
        <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
        <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
        <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
        <button onclick="rejectLoan('${id}')">Từ chối</button>
        <button onclick="deleteLoan('${id}')">Xóa</button>
      </div>`;
    } else if (d.status === "approved" && !d.returned) {
      adminControls += `<div style="margin-top:6px">
        <div><em>Đang mượn:</em> ${fmt(d.startAt)} → ${fmt(d.dueAt)}</div>
        <label>Gia hạn đến: <input type="date" id="extend_due_${id}"></label>
        <button onclick="extendLoan('${id}')">Gia hạn</button>
        &nbsp; | &nbsp;
        <label>Thời điểm trả: <input type="datetime-local" id="ret_at_${id}"></label>
        <button onclick="returnLoanWithTime('${id}')">Xác nhận trả</button>
        <button onclick="deleteLoan('${id}')">Xóa</button>
      </div>`;
    } else if (d.status === "rejected" || d.returned) {
      adminControls += `<div style="margin-top:6px">
        <button onclick="deleteLoan('${id}')">Xóa</button>
      </div>`;
    }
  }

  // Controls dành cho user (chỉ khi pending)
  let userControls = "";
  if (!adminView && d.status === "pending" && d.userEmail === currentUser.email) {
    userControls += `<div style="margin-top:6px">
      <button onclick="editMyLoan('${id}')">Sửa</button>
      <button onclick="deleteLoan('${id}')">Xóa</button>
    </div>`;
  }

  // Kết hợp nội dung card
  return `<div class="card">
    <div><strong>${d.equipmentName || d.equipmentId}</strong> - SL: ${d.quantity}</div>
    <div>Người mượn: ${d.userEmail}</div>
    <div class="${statusClass}">Trạng thái: ${displayStatus}</div>
    <div>Ghi chú: ${d.note || ""}</div>
    ${(d.requestedStart || d.requestedDue) ? `<div>Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>` : ""}
    ${(d.startAt || d.dueAt) ? `<div>Thực tế: ${fmt(d.startAt)} → ${fmt(d.dueAt)}</div>` : ""}
    ${adminControls || userControls}
  </div>`;
}


// main.js - Full Corrected Version with Filters + User/Admin Loan Management

// ================== LOANS + FILTERS ==================


function applyLoanFilters(loans){
  return loans.filter(l=>{
    if (l.deleted) return false;

    // Filter trạng thái
    if (loanFilters.status){
      switch(loanFilters.status){
        case "pending":
          if (l.status !== "pending") return false;
          break;
        case "approved":
          if (l.status !== "approved" || l.returned) return false;
          break;
        case "returned":
          if (!l.returned) return false;
          break;
        case "rejected":
          if (l.status !== "rejected") return false;
          break;
      }
    }

    // Filter theo thiết bị
    if (loanFilters.equipmentId && l.equipmentId !== loanFilters.equipmentId) return false;

    // Filter ngày
    const startDate = l.startAt?.toDate ? l.startAt.toDate() : l.startAt ? new Date(l.startAt) : null;
    const dueDate = l.dueAt?.toDate ? l.dueAt.toDate() : l.dueAt ? new Date(l.dueAt) : null;

    if (loanFilters.from){
      const from = new Date(loanFilters.from);
      if (dueDate && dueDate < from) return false;
    }
    if (loanFilters.to){
      const to = new Date(loanFilters.to);
      if (startDate && startDate > to) return false;
    }

    return true;
  });
}

// ================== REFRESH MY LOANS ==================
async function refreshMyLoans(){
  if (!currentUser) return;
  myLoans.innerHTML = "Đang tải...";
  try{
    const q = query(collection(db,"loans"), where("userEmail","==",currentUser.email), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    let html = "";
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      if(d.deleted) return;
      if(applyLoanFilters([d]).length > 0) html += renderLoanCard(docSnap.id,d,false);
    });
    myLoans.innerHTML = html || "<p>Chưa có yêu cầu mượn nào.</p>";
  }catch(e){
    console.error(e);
    const snap = await getDocs(collection(db,"loans"));
    const arr = [];
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      if(!d.deleted && d.userEmail===currentUser.email) arr.push({id:docSnap.id,data:d});
    });
    arr.sort((a,b)=> (b.data.createdAt?.toMillis?.() ?? 0) - (a.data.createdAt?.toMillis?.() ?? 0));
    let html = "";
    for(const it of arr){
      if(applyLoanFilters([it.data]).length > 0) html += renderLoanCard(it.id,it.data,false);
    }
    myLoans.innerHTML = html || "<p>Chưa có yêu cầu mượn nào.</p>";
  }
}

// ================== REFRESH ALL LOANS (ADMIN) ==================
async function refreshAllLoans(){
  if(!isAdmin) return;
  allLoans.innerHTML="Đang tải...";
  try{
    const snap = await getDocs(collection(db,"loans"));
    let all = [];
    snap.forEach(d=>{
      const data = d.data();
      if(data && !data.deleted) all.push({id:d.id,data:data});
    });
    const filtered = all.filter(a => applyLoanFilters([a.data]).length > 0);
    let html = '';
    filtered.forEach(d=> html += renderLoanCard(d.id,d.data,true));
    allLoans.innerHTML = html || "<p>Chưa có yêu cầu mượn nào.</p>";
  }catch(e){
    console.error(e);
    allLoans.innerHTML="<p>Không tải được dữ liệu.</p>";
  }
}

// ================== FILTER UI EVENTS ==================
const btnApplyLoanFilter = document.getElementById("btnApplyLoanFilter");
const btnResetLoanFilter = document.getElementById("btnResetLoanFilter");
btnApplyLoanFilter.onclick = () => {
  loanFilters.status = document.getElementById("filterStatus").value;
  loanFilters.equipmentId = document.getElementById("filterEquipment").value;
  loanFilters.from = document.getElementById("filterFrom").value;
  loanFilters.to = document.getElementById("filterTo").value;
  if(isAdmin) refreshAllLoans(); else refreshMyLoans();
};
btnResetLoanFilter.onclick = () => {
  loanFilters = { status: '', equipmentId: '', from: '', to: '' };
  document.getElementById("filterStatus").value = '';
  document.getElementById("filterEquipment").value = '';
  document.getElementById("filterFrom").value = '';
  document.getElementById("filterTo").value = '';
  if(isAdmin) refreshAllLoans(); else refreshMyLoans();
};





// ================== ADMIN LOAN ACTIONS ==================
window.approveLoanWithDates = async (id)=>{
  const startEl = document.getElementById("ap_start_"+id);
  const dueEl = document.getElementById("ap_due_"+id);
  const start = startEl && startEl.value ? new Date(startEl.value+"T00:00:00") : null;
  const due = dueEl && dueEl.value ? new Date(dueEl.value+"T23:59:59") : null;
  if (!start || !due){ alert("Chọn ngày bắt đầu và hạn trả."); return; }
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef); if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status !== "pending") return alert("Yêu cầu đã xử lý.");

  // trừ số lượng thiết bị
  const eqRef = doc(db,"equipment",loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  const eq = eqSnap.data();
  if (eq.quantity_available < loan.quantity){ alert("Không đủ thiết bị."); return; }
  await updateDoc(eqRef,{quantity_available: eq.quantity_available - loan.quantity});

  await updateDoc(loanRef,{
    status: "approved",
    approvedBy: currentUser.email,
    approvedAt: serverTimestamp(),
    startAt: Timestamp.fromDate(start),
    dueAt: Timestamp.fromDate(due)
  });
  await refreshAllLoans(); await refreshMyLoans();
};

window.rejectLoan = async (id)=>{
  const reason = prompt("Lý do từ chối:");
  if (reason === null) return;
  const loanRef = doc(db,"loans",id);
  await updateDoc(loanRef,{status:"rejected", rejectedReason:reason, approvedBy:currentUser.email, approvedAt:serverTimestamp()});
  await refreshAllLoans(); await refreshMyLoans();
};

window.extendLoan = async (id)=>{
  const newDueEl = document.getElementById("extend_due_"+id);
  if (!newDueEl || !newDueEl.value) return;
  const newDue = new Date(newDueEl.value+"T23:59:59");
  const loanRef = doc(db,"loans",id);
  await updateDoc(loanRef,{dueAt: Timestamp.fromDate(newDue)});
  await refreshAllLoans(); await refreshMyLoans();
};

window.returnLoanWithTime = async (id)=>{
  const retEl = document.getElementById("ret_at_"+id);
  if (!retEl || !retEl.value){ alert("Chọn thời điểm trả"); return; }
  const retDate = new Date(retEl.value);
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef);
  const loan = loanSnap.data();
  const eqRef = doc(db,"equipment",loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  const eq = eqSnap.data();
  await updateDoc(eqRef,{quantity_available: eq.quantity_available + loan.quantity});
  await updateDoc(loanRef,{returned:true, returnedAt: Timestamp.fromDate(retDate)});
  await refreshAllLoans(); await refreshMyLoans();
};

// User edit / delete
window.editMyLoan = async (id)=>{
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef); if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status !== "pending") return alert("Không thể sửa yêu cầu đã duyệt.");
  const qty = parseInt(prompt("Số lượng:", loan.quantity),10);
  if (isNaN(qty)||qty<=0) return;
  const startStr = prompt("Ngày mượn (YYYY-MM-DD):", loan.requestedStart?.toDate ? loan.requestedStart.toDate().toISOString().slice(0,10) : "");
  const dueStr = prompt("Ngày trả (YYYY-MM-DD, để trống nếu chưa biết):", loan.requestedDue?.toDate ? loan.requestedDue.toDate().toISOString().slice(0,10) : "");
  if (!startStr) return alert("Ngày mượn bắt buộc");
  const startDate = new Date(`${startStr}T00:00:00`);
  const dueDate = dueStr ? new Date(`${dueStr}T23:59:59`) : null;
  if (dueDate && startDate>dueDate) return alert("Ngày trả phải sau ngày mượn");
  const note = prompt("Ghi chú:", loan.note||"") || "";
  await updateDoc(loanRef,{quantity:qty, requestedStart: Timestamp.fromDate(startDate), requestedDue: dueDate?Timestamp.fromDate(dueDate):null, note});
  await refreshMyLoans();
};

window.deleteLoan = async (id)=>{
  if (!confirm("Xác nhận xóa yêu cầu này?")) return;
  const loanRef = doc(db,"loans",id);
  await updateDoc(loanRef,{deleted:true});
  await refreshMyLoans(); if (isAdmin) await refreshAllLoans();
};

// ================== STATS ==================
async function refreshStats(){
  if (!currentUser) return;
  statsArea.innerHTML = "Đang tải...";
  const snap = await getDocs(collection(db,"loans"));
  const loans = [];
  snap.forEach(d=>{ if (!d.data().deleted) loans.push(d.data()); });

  if (isAdmin){
    const pending = loans.filter(l=>l.status==="pending").length;
    const approved = loans.filter(l=>l.status==="approved" && !l.returned).length;
    const returned = loans.filter(l=>l.returned).length;
    // thêm thời gian (mốc) — hiển thị last activity
    const lastActivityTs = loans.map(l=>l.approvedAt||l.createdAt||l.returnedAt).filter(Boolean).sort((a,b)=> (b.toMillis?b.toMillis():0)-(a.toMillis?a.toMillis():0))[0];
    const lastActivity = lastActivityTs ? (lastActivityTs.toDate? lastActivityTs.toDate().toLocaleString(): new Date(lastActivityTs).toLocaleString()) : 'Chưa có hoạt động';
    statsArea.innerHTML = `\n      <p>Chờ duyệt: ${pending}</p>\n      <p>Đang mượn: ${approved}</p>\n      <p>Đã trả: ${returned}</p>\n      <p>Hoạt động gần nhất: ${lastActivity}</p>\n    `;
  } else {
    const myLoans = loans.filter(l=>l.userId===currentUser.uid);
    statsArea.innerHTML = myLoans.map(l=>{
      const t = l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString() : (l.createdAt ? new Date(l.createdAt).toLocaleString() : '');
      return `\n      <div class=\"card\">\n        <strong>${l.equipmentName}</strong> - SL: ${l.quantity} - ${l.status}${l.returned?" (ĐÃ TRẢ)":""}\n        <br><small>Yêu cầu: ${t}</small>\n      </div>`;
    }).join("") || "<p>Chưa có hoạt động mượn trả.</p>";
  }
}

// EOF
