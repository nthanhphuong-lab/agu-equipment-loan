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
const MANAGER_EMAILS = ["manager1@agu.edu.vn", "manager2@agu.edu.vn"]; // Cập nhật email quản lý

function isAllowedEmail(email){
  return email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email);
}

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  updateDoc, serverTimestamp, query, where, orderBy
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

const eqName = document.getElementById("eqName");
const eqCode = document.getElementById("eqCode");
const eqQty = document.getElementById("eqQty");
const eqDesc = document.getElementById("eqDesc");
const btnAddEq = document.getElementById("btnAddEq");
const equipmentListAdmin = document.getElementById("equipmentListAdmin");

const equipmentList = document.getElementById("equipmentList");
const loanEqSelect = document.getElementById("loanEqSelect");
const loanQty = document.getElementById("loanQty");
const loanStart = document.getElementById("loanStart");
const loanDue = document.getElementById("loanDue");
const loanNote = document.getElementById("loanNote");
const btnCreateLoan = document.getElementById("btnCreateLoan");
const loanCreateMsg = document.getElementById("loanCreateMsg");
const myLoans = document.getElementById("myLoans");

const allLoans = document.getElementById("allLoans");

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

  if (pageId === "page-dashboard") {
    buildDashboard(); // nạp thống kê
  }
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
let isManager = false; // Khung cho quản lý (manager)

// ================== AUTH FLOW ==================
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
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Đăng nhập thất bại.";
  }
};

btnLogout.onclick = async () => { await signOut(auth); };

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

// Khi đổi trạng thái đăng nhập
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    isAdmin = false;
    isManager = false;
    document.getElementById("userInfo").classList.add("hidden");
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
  isManager = MANAGER_EMAILS.includes(user.email);  // Kiểm tra quản lý

  userEmailEl.textContent = user.email;
  userRoleTag.textContent = isAdmin ? "ADMIN" : (isManager ? "MANAGER" : "USER");
  userRoleTag.classList.remove("admin", "manager", "user");
  userRoleTag.classList.add(isAdmin ? "admin" : (isManager ? "manager" : "user"));

  loginArea.classList.add("hidden");
  document.getElementById("userInfo").classList.remove("hidden");

  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b => {
    if (isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden");
  });

  document.querySelectorAll(".manager-only").forEach(b => {
    if (isManager) b.classList.remove("hidden"); else b.classList.add("hidden");
  });

  showPage(isAdmin ? "page-dashboard" : "page-devices");
  await buildDashboard().catch(console.warn);
  await refreshEquipmentLists().catch(console.warn);
  await refreshMyLoans().catch(console.warn);
  if (isAdmin) await refreshAllLoans().catch(console.warn);
});

// ================== THIẾT BỊ ==================
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

async function refreshEquipmentLists(){
  equipmentList.innerHTML = "Đang tải...";
  equipmentListAdmin.innerHTML = "";
  loanEqSelect.innerHTML = `<option value="">-- Chọn thiết bị --</option>`;

  const snap = await getDocs(collection(db,"equipment"));
  let htmlUser = "", htmlAdmin = "";
  snap.forEach(docSnap=>{
    const d = docSnap.data(); const id = docSnap.id;
    if (!d.is_active) return;
    const line = `
      <div class="card">
        <div><strong>${d.name}</strong> (${d.code})</div>
        <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
        <div class="muted">ID: ${id}</div>
        <div>${d.description||""}</div>
      </div>`;
    htmlUser += line;
    if (isAdmin) htmlAdmin += line;

    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`;
    loanEqSelect.appendChild(opt);
  });

  equipmentList.innerHTML = htmlUser || "<p>Chưa có thiết bị.</p>";
  if (isAdmin) equipmentListAdmin.innerHTML = htmlAdmin || "<p>Chưa có thiết bị.</p>";

  // set mặc định ngày
  const today = new Date();
  const pad = n=>String(n).padStart(2,"0");
  const toInput = dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if (!loanStart.value) loanStart.value = toInput(today);
  if (!loanDue.value){
    const t = new Date(today); t.setDate(t.getDate()+7);
    loanDue.value = toInput(t);
  }
}

// ================== TÌM KIẾM & LỌC ==================
let cacheEquip = [];
let cacheLoans = [];

function renderEquipList(){
  const kw = (searchEquip?.value||"").trim().toLowerCase();
  const list = !kw ? cacheEquip : cacheEquip.filter(x =>
    x.name.toLowerCase().includes(kw) || x.code.toLowerCase().includes(kw)
  );
  let html = "";
  list.forEach(({id, name, code, quantity_available, quantity_total, description})=>{
    html += `
      <div class="card">
        <div><strong>${name}</strong> (${code})</div>
        <div>Còn: ${quantity_available} / ${quantity_total}</div>
        <div class="muted">ID: ${id}</div>
        <div>${description||""}</div>
      </div>`;
  });
  if (equipmentList) equipmentList.innerHTML = html || "<p>Không có thiết bị khớp tìm kiếm.</p>";
}

searchEquip?.addEventListener("input", renderEquipList);

function renderLoansAdmin(){
  const kw = (searchLoans?.value||"").trim().toLowerCase();
  const status = (filterStatus?.value||"");
  let arr = cacheLoans.slice();

  if (status){
    if (status === "returned"){
      arr = arr.filter(x => x.data.returned === true);
    } else {
      arr = arr.filter(x => x.data.status === status);
    }
  }
  if (kw){
    arr = arr.filter(x => {
      const d = x.data;
      return (d.userEmail||"").toLowerCase().includes(kw) ||
             (d.equipmentName||"").toLowerCase().includes(kw);
    });
  }
  let html = "";
  arr.forEach(x => html += renderLoanCard(x.id, x.data, true));
  allLoans.innerHTML = html || "<p>Không có đơn khớp bộ lọc/tìm kiếm.</p>";
}

searchLoans?.addEventListener("input", renderLoansAdmin);
filterStatus?.addEventListener("change", renderLoansAdmin);

// ================== DASHBOARD ==================
async function buildDashboard(){
  try{
    const eqSnap = await getDocs(collection(db,"equipment"));
    let equipCount = 0;
    eqSnap.forEach(d=>{ const x=d.data(); if (x.is_active) equipCount++; });

    const lnSnap = await getDocs(collection(db,"loans"));
    let pending=0, borrowing=0, overdue=0;
    const now = Date.now();
    lnSnap.forEach(ds=>{
      const d = ds.data();
      if (d.status==="pending") pending++;
      if (d.status==="approved" && !d.returned){
        borrowing++;
        const dueMs = d.dueAt?.toMillis?.();
        if (dueMs && dueMs < now) overdue++;
      }
    });

    statEquip.textContent = equipCount;
    statPending.textContent = pending;
    statBorrowing.textContent = borrowing;
    statOverdue.textContent = overdue;
  }catch(e){
    console.warn("buildDashboard:", e);
  }
}
