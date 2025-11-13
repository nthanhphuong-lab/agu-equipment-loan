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

const ADMIN_EMAILS = [
  "nthanhphuong@agu.edu.vn",
  "admin2@agu.edu.vn"
];

// Email test (được phép dùng app khi dev)
const TEST_EMAILS = ["test1@local.test", "test2@local.test"];

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

  if (pageId === "page-devices") {
    refreshEquipmentLists();
  } else if (pageId === "page-create-loan") {
    refreshEquipmentLists();
  } else if (pageId === "page-my-loans") {
    refreshMyLoans();
  } else if (pageId === "page-admin-eq") {
    refreshEquipmentLists();
  } else if (pageId === "page-admin-loans") {
    refreshAllLoans();
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

  userEmailEl.textContent = user.email;
  userRoleTag.textContent = isAdmin ? "ADMIN" : "USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin ? "admin" : "user");

  loginArea.classList.add("hidden");
  document.getElementById("userInfo").classList.remove("hidden");

  // bật menu
  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{
    if (isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden");
  });

  // Trang mặc định
  showPage(isAdmin ? "page-admin-eq" : "page-devices");

  // nạp sẵn dữ liệu
  await refreshEquipmentLists();
  await refreshMyLoans();
  if (isAdmin) await refreshAllLoans();
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

// ================== YÊU CẦU MƯỢN (USER) ==================
btnCreateLoan.onclick = async () => {
  if (!currentUser){ alert("Cần đăng nhập."); return; }
  const eqId = (loanEqSelect.value||"").trim();
  const qty = parseInt(loanQty.value,10) || 0;
  const note = loanNote.value.trim();
  const startStr = loanStart.value, dueStr = loanDue.value;

  if (!eqId || qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng > 0."; return; }
  if (!startStr || !dueStr){ loanCreateMsg.textContent="Chọn ngày mượn và ngày trả dự kiến."; return; }

  const startDate = new Date(`${startStr}T00:00:00`);
  const dueDate = new Date(`${dueStr}T23:59:59`);
  if (startDate > dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return; }

  try{
    // check tồn
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
      requestedStart: startDate,
      requestedDue: dueDate,
      approvedBy: null, approvedAt: null,
      startAt: null, dueAt: null,
      returned: false, returnedAt: null,
      rejectedReason: null
    });
    loanEqSelect.value = ""; loanQty.value = ""; loanNote.value = "";
    loanCreateMsg.textContent = "Đã gửi yêu cầu mượn.";
    console.log("Loan created OK");

    await refreshMyLoans();
    if (isAdmin) await refreshAllLoans();
  }catch(e){
    console.error("Create loan error:", e);
    loanCreateMsg.textContent = "Gửi yêu cầu thất bại: " + (e.code||e.message);
  }
};

// ================== RENDER LOAN ==================
function renderLoanCard(id, d, adminView){
  let statusClass = "";
  if (d.status==="pending") statusClass="status-pending";
  else if (d.status==="approved" && !d.returned) statusClass="status-approved";
  else if (d.status==="rejected") statusClass="status-rejected";
  else if (d.returned) statusClass="status-returned";

  const fmt = (ts)=>{
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString();
  };

  let adminControls = "";
  if (adminView && d.status==="pending"){
    const reqStart = fmt(d.requestedStart), reqDue = fmt(d.requestedDue);
    adminControls += `
      <div style="margin-top:6px">
        <div><em>Người mượn đề xuất:</em> ${reqStart||"-"} → ${reqDue||"-"}</div>
        <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
        <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
        <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
        <button onclick="rejectLoan('${id}')">Từ chối</button>
      </div>`;
  }
  if (adminView && d.status==="approved" && !d.returned){
    adminControls += `
      <div style="margin-top:6px">
        <div><em>Đang mượn:</em> ${fmt(d.startAt)||"-"} → ${fmt(d.dueAt)||"-"}</div>
        <label>Gia hạn đến: <input type="date" id="extend_due_${id}"></label>
        <button onclick="extendLoan('${id}')">Gia hạn</button>
        &nbsp; | &nbsp;
        <label>Thời điểm trả: <input type="datetime-local" id="ret_at_${id}"></label>
        <button onclick="returnLoanWithTime('${id}')">Xác nhận trả</button>
      </div>`;
  }

  return `
    <div class="card">
      <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
      <div>Người mượn: ${d.userEmail}</div>
      <div class="${statusClass}">
        Trạng thái: ${d.status.toUpperCase()}${d.returned ? " (ĐÃ TRẢ)" : ""}
      </div>
      <div>Ghi chú: ${d.note||""}</div>
      ${ (d.requestedStart||d.requestedDue) ? `<div>Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>` : "" }
      ${ (d.startAt||d.dueAt) ? `<div>Được duyệt: ${fmt(d.startAt)} → ${fmt(d.dueAt)}</div>` : "" }
      ${ d.rejectedReason ? `<div>Lý do từ chối: ${d.rejectedReason}</div>` : "" }
      ${ adminControls }
    </div>`;
}

// ================== LIST MY LOANS ==================
async function refreshMyLoans(){
  if (!currentUser) return;
  myLoans.innerHTML = "Đang tải...";
  try{
    // thử query có orderBy (cần composite index)
    const qRef = query(
      collection(db,"loans"),
      where("userId","==", currentUser.uid),
      orderBy("createdAt","desc")
    );
    const snap = await getDocs(qRef);
    let html = "";
    snap.forEach(docSnap=>{ html += renderLoanCard(docSnap.id, docSnap.data(), false); });
    myLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
  }catch(e){
    // fallback: không orderBy, sort client để không cần index
    console.warn("refreshMyLoans fallback (no index):", e.code||e.message);
    const qRef = query(collection(db,"loans"), where("userId","==", currentUser.uid));
    const snap = await getDocs(qRef);
    const arr = [];
    snap.forEach(docSnap=>arr.push({id:docSnap.id, data:docSnap.data()}));
    arr.sort((a,b)=> (b.data.createdAt?.toMillis?.() ?? 0) - (a.data.createdAt?.toMillis?.() ?? 0));
    let html = "";
    for (const it of arr){ html += renderLoanCard(it.id, it.data, false); }
    myLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
  }
}

// ================== LIST ALL LOANS (ADMIN) ==================
async function refreshAllLoans(){
  if (!isAdmin) return;
  allLoans.innerHTML = "Đang tải...";
  try{
    const qRef = query(collection(db,"loans"), orderBy("createdAt","desc"));
    const snap = await getDocs(qRef);
    let html = ""; let count = 0;
    snap.forEach(docSnap=>{ html += renderLoanCard(docSnap.id, docSnap.data(), true); count++; });
    allLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
    console.log("[Admin] loans count =", count);
  }catch(e){
    console.warn("refreshAllLoans fallback:", e.code||e.message);
    const snap = await getDocs(collection(db,"loans"));
    const arr = [];
    snap.forEach(docSnap=>arr.push({id:docSnap.id, data:docSnap.data()}));
    arr.sort((a,b)=> (b.data.createdAt?.toMillis?.() ?? 0) - (a.data.createdAt?.toMillis?.() ?? 0));
    let html = "";
    for (const it of arr){ html += renderLoanCard(it.id, it.data, true); }
    allLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
  }
}

// ================== ADMIN ACTIONS ==================
window.approveLoanWithDates = async (loanId)=>{
  if (!isAdmin) return;
  const s = document.getElementById(`ap_start_${loanId}`).value;
  const d = document.getElementById(`ap_due_${loanId}`).value;
  if (!s || !d){ alert("Chọn ngày bắt đầu và hạn trả."); return; }
  const startAt = new Date(`${s}T00:00:00`);
  const dueAt = new Date(`${d}T23:59:59`);
  if (startAt > dueAt){ alert("Hạn trả phải sau ngày bắt đầu."); return; }

  const loanRef = doc(db,"loans",loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status!=="pending") return;

  const eqRef = doc(db,"equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return;
  const eq = eqSnap.data();
  if (eq.quantity_available < loan.quantity){ alert("Không đủ số lượng để duyệt."); return; }

  await updateDoc(loanRef,{
    status:"approved",
    approvedBy: currentUser.email,
    approvedAt: serverTimestamp(),
    startAt, dueAt
  });
  await updateDoc(eqRef,{ quantity_available: eq.quantity_available - loan.quantity });

  await refreshAllLoans(); await refreshEquipmentLists();
};

window.extendLoan = async (loanId)=>{
  if (!isAdmin) return;
  const dueStr = document.getElementById(`extend_due_${loanId}`).value;
  if (!dueStr){ alert("Chọn ngày gia hạn."); return; }
  const newDue = new Date(`${dueStr}T23:59:59`);

  const loanRef = doc(db,"loans",loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status!=="approved" || loan.returned) return;

  await updateDoc(loanRef,{ dueAt: newDue });
  await refreshAllLoans();
};

window.returnLoanWithTime = async (loanId)=>{
  if (!isAdmin) return;
  const input = document.getElementById(`ret_at_${loanId}`).value;
  const returnedAt = input ? new Date(input) : new Date();

  const loanRef = doc(db,"loans",loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status!=="approved" || loan.returned) return;

  const eqRef = doc(db,"equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return;
  const eq = eqSnap.data();

  await updateDoc(loanRef,{ returned:true, returnedAt });
  await updateDoc(eqRef,{ quantity_available: eq.quantity_available + loan.quantity });

  await refreshAllLoans(); await refreshEquipmentLists();
};

// (Tuỳ chọn) Từ chối
window.rejectLoan = async (loanId)=>{
  if (!isAdmin) return;
  const reason = prompt("Lý do từ chối? (tuỳ chọn)") || null;
  const loanRef = doc(db,"loans",loanId);
  await updateDoc(loanRef,{ status:"rejected", rejectedReason: reason, approvedBy: currentUser.email, approvedAt: serverTimestamp() });
  await refreshAllLoans();
};
