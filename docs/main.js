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
window.editEquipment = async (id)=>{ /* unchanged from your code */ }
window.deleteEquipment = async (id)=>{ /* unchanged from your code */ }

// ================== CREATE LOAN ==================
btnCreateLoan.onclick = async () => { /* unchanged from your code */ }

// ================== MY LOANS ==================
function renderLoanCard(id, d, adminView){ /* unchanged from your code */ }
async function refreshMyLoans(){ /* unchanged from your code */ }
async function refreshAllLoans(){ /* unchanged from your code */ }

// ================== ADMIN LOAN ACTIONS ==================
window.approveLoanWithDates = async (id)=>{ /* unchanged */ }
window.rejectLoan = async (id)=>{ /* unchanged */ }
window.extendLoan = async (id)=>{ /* unchanged */ }
window.returnLoanWithTime = async (id)=>{ /* unchanged */ }
window.editMyLoan = async (id)=>{ /* unchanged */ }
window.deleteLoan = async (id)=>{ /* unchanged */ }

// ================== STATS ==================
async function refreshStats(){
  if (!currentUser) return;
  statsArea.innerHTML = "Đang tải...";
  const snap = await getDocs(collection(db,"loans"));
  const loans = [];
  snap.forEach(d=>{
    const data = d.data();
    data.id = d.id;
    if (!data.deleted) loans.push(data);
  });

  if (isAdmin){
    const pending = loans.filter(l=>l.status==="pending").length;
    const approved = loans.filter(l=>l.status==="approved" && !l.returned).length;
    const returned = loans.filter(l=>l.returned).length;

    statsArea.innerHTML = `
      <p><span class="clickable" id="stat_pending">Chờ duyệt: ${pending}</span></p>
      <p><span class="clickable" id="stat_approved">Đang mượn: ${approved}</span></p>
      <p><span class="clickable" id="stat_returned">Đã trả: ${returned}</span></p>
      <div id="statsDetail"></div>
    `;

    const statsDetail = document.getElementById("statsDetail");

    const renderAdminLoanCard = (id,d)=>{
      let html = `<div class="card">
        <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
        <div>Người mượn: ${d.userEmail}</div>
        <div>Trạng thái: ${d.status.toUpperCase()}${d.returned?" (ĐÃ TRẢ)":""}</div>
        <div>Ghi chú: ${d.note||""}</div>
      `;

      if(d.status==="pending"){
        html += `
          <button onclick="approveLoanWithDatesNoDate('${id}')">Duyệt</button>
          <button onclick="rejectLoan('${id}')">Từ chối</button>
          <button onclick="deleteLoan('${id}')">Xóa</button>
        `;
      } else if(d.status==="approved" && !d.returned){
        html += `
          <button onclick="extendLoanNoDate('${id}')">Gia hạn</button>
          <button onclick="returnLoanNoDate('${id}')">Xác nhận trả</button>
          <button onclick="deleteLoan('${id}')">Xóa</button>
        `;
      }

      html += "</div>";
      return html;
    };

    const refreshLoansByStatus = (status)=>{
      const filtered = loans.filter(l=>{
        if(l.deleted) return false;
        if(status==="pending") return l.status==="pending";
        if(status==="approved") return l.status==="approved" && !l.returned;
        if(status==="returned") return l.returned;
        return false;
      });
      statsDetail.innerHTML = filtered.map(l=>renderAdminLoanCard(l.id,l)).join("") || "<p>Không có yêu cầu nào.</p>";
    };

    document.getElementById("stat_pending").onclick = ()=>refreshLoansByStatus("pending");
    document.getElementById("stat_approved").onclick = ()=>refreshLoansByStatus("approved");
    document.getElementById("stat_returned").onclick = ()=>refreshLoansByStatus("returned");
  } else {
    const myLoansList = loans.filter(l=>l.userId===currentUser.uid);
    statsArea.innerHTML = myLoansList.map(l=>{
      const t = l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString() : (l.createdAt ? new Date(l.createdAt).toLocaleString() : '');
      return `
        <div class="card">
          <strong>${l.equipmentName}</strong> - SL: ${l.quantity} - ${l.status}${l.returned?" (ĐÃ TRẢ)":""}
          <br><small>Yêu cầu: ${t}</small>
        </div>`;
    }).join("") || "<p>Chưa có hoạt động mượn trả.</p>";
  }
}

// ================== ADMIN ACTIONS WITHOUT DATE ==================
window.approveLoanWithDatesNoDate = async (id)=>{
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if(loan.status!=="pending") return alert("Yêu cầu đã xử lý.");

  const eqRef = doc(db,"equipment",loan.equipmentId);
  const eqSnap = await getDoc(eqRef); const eq = eqSnap.data();
  if(eq.quantity_available<loan.quantity){ alert("Không đủ thiết bị."); return; }

  await updateDoc(eqRef,{quantity_available: eq.quantity_available - loan.quantity});
  const now = new Date();
  await updateDoc(loanRef,{
    status:"approved",
    approvedBy: currentUser.email,
    approvedAt: serverTimestamp(),
    startAt: loan.requestedStart || Timestamp.fromDate(now),
    dueAt: loan.requestedDue || Timestamp.fromDate(new Date(now.getTime()+7*24*60*60*1000))
  });
  await refreshAllLoans(); await refreshStats();
};

window.extendLoanNoDate = async (id)=>{
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef); const loan = loanSnap.data();
  const newDue = loan.dueAt?.toDate() ? new Date(loan.dueAt.toDate().getTime()+7*24*60*60*1000) : new Date();
  await updateDoc(loanRef,{dueAt: Timestamp.fromDate(newDue)});
  await refreshAllLoans(); await refreshStats();
};

window.returnLoanNoDate = async (id)=>{
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef); const loan = loanSnap.data();
  const eqRef = doc(db,"equipment",loan.equipmentId);
  const eqSnap = await getDoc(eqRef); const eq = eqSnap.data();
  await updateDoc(eqRef,{quantity_available: eq.quantity_available + loan.quantity});
  await updateDoc(loanRef,{returned:true, returnedAt: serverTimestamp()});
  await refreshAllLoans(); await refreshStats();
};
