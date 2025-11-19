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
  setDoc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy, Timestamp
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
let loanFilters = { status: '', equipmentId: '', equipmentName: '', from: '', to: '' };
let loanSort = "";
document.getElementById("loanSort").addEventListener("change", e=>{
    loanSort = e.target.value;
    renderLoans();
});
let allLoansData = []; // Mảng chứa danh sách loan cho admin



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



// ================== Populate thiết bị + Autocomplete ==================
let equipmentNames = []; // lưu danh sách tên thiết bị cho autocomplete

async function populateEquipmentFilter(){
  const eqSelect = document.getElementById("filterEquipment");
  const eqInput = document.getElementById("filterEquipmentName"); // ô nhập tay tên thiết bị
  eqSelect.innerHTML = `<option value="">-- Tất cả thiết bị --</option>`; // default
  equipmentNames = [];
  try{
    const snap = await getDocs(collection(db, "equipment"));
    snap.forEach(docSnap=>{
      const eq = docSnap.data();
      const name = eq.name || eq.code || "";
      equipmentNames.push(name);
      eqSelect.innerHTML += `<option value="${docSnap.id}">${name}</option>`;
    });
  } catch(e){
    console.error("Không tải được danh sách thiết bị:", e);
  }

  // Autocomplete gợi ý khi nhập tay tên thiết bị
  if(eqInput){
    eqInput.addEventListener("input", function(){
      const val = this.value.toLowerCase();
      const suggestions = equipmentNames.filter(n => n.toLowerCase().includes(val));

      // Xóa dropdown cũ
      let listId = "equipmentSuggestions";
      let oldList = document.getElementById(listId);
      if(oldList) oldList.remove();

      if(!val || suggestions.length === 0) return;

      const list = document.createElement("ul");
      list.id = listId;
      list.style.position = "absolute";
      list.style.background = "#fff";
      list.style.border = "1px solid #ccc";
      list.style.padding = "5px";
      list.style.margin = "0";
      list.style.listStyle = "none";
      list.style.maxHeight = "150px";
      list.style.overflowY = "auto";
      list.style.width = eqInput.offsetWidth + "px";

      suggestions.forEach(name=>{
        const item = document.createElement("li");
        item.style.padding = "2px 5px";
        item.style.cursor = "pointer";
        item.textContent = name;
        item.onclick = ()=>{
          eqInput.value = name;
          list.remove();
        };
        list.appendChild(item);
      });

      eqInput.parentNode.appendChild(list);
    });

    // Ẩn dropdown khi click ra ngoài
    document.addEventListener("click", e => {
      const list = document.getElementById("equipmentSuggestions");
      if(list && e.target !== eqInput) list.remove();
    });
  }
}

// Gọi khi load admin page
populateEquipmentFilter();


// =============== BIẾN TOÀN CỤC ===============
//let allLoansData = []; // Mảng chứa danh sách loan cho admin


// ================== LOANS + FILTERS ==================
function applyLoanFilters(loans){
  return loans.filter(l=>{
    if (l.deleted) return false;

    if (loanFilters.status){
      switch(loanFilters.status){
        case "pending":   if (l.status !== "pending") return false; break;
        case "approved":  if (l.status !== "approved" || l.returned) return false; break;
        case "returned":  if (!l.returned) return false; break;
        case "rejected":  if (l.status !== "rejected") return false; break;
      }
    }

    if (loanFilters.equipmentId && l.equipmentId !== loanFilters.equipmentId) return false;

    if (loanFilters.equipmentName && !l.equipmentName.toLowerCase().includes(loanFilters.equipmentName.toLowerCase()))
      return false;

    const startDate = l.startAt?.toDate ? l.startAt.toDate() : l.startAt ? new Date(l.startAt) : null;
    const dueDate   = l.dueAt?.toDate   ? l.dueAt.toDate()   : l.dueAt   ? new Date(l.dueAt)   : null;

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

// ================== SORT ==================
function sortLoans(list){
  return list.sort((a, b)=>{
    const createdA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const createdB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);

    const dueA = a.dueAt?.toDate ? a.dueAt.toDate() : new Date(a.dueAt || 0);
    const dueB = b.dueAt?.toDate ? b.dueAt.toDate() : new Date(b.dueAt || 0);

    switch(loanSort){
      case "createdAsc":  return createdA - createdB;
      case "createdDesc": return createdB - createdA;
      case "equipmentAsc":  return (a.equipmentName || "").localeCompare(b.equipmentName || "");
      case "equipmentDesc": return (b.equipmentName || "").localeCompare(a.equipmentName || "");
      case "userAsc": return (a.userName || "").localeCompare(b.userName || "");
      case "userDesc": return (b.userName || "").localeCompare(a.userName || "");
      case "statusAsc": return (a.status || "").localeCompare(b.status || "");
      case "statusDesc": return (b.status || "").localeCompare(a.status || "");
      case "dueAsc": return dueA - dueB;
      case "dueDesc": return dueB - dueA;
    }
    return 0;
  });
}

// ================== DISPLAY ==================
window.displayLoans = function(list, targetEl){
  targetEl.innerHTML = "";
  list.forEach(l => targetEl.innerHTML += renderLoanCard(l.id, l, isAdmin));
};

// ================== REFRESH MY LOANS ==================
async function refreshMyLoans(){
  if (!currentUser) return;
  myLoans.innerHTML = "Đang tải...";

  try {
    const snap = await getDocs(collection(db,"loans"));
    let arr = [];
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      if(!d.deleted && d.userEmail === currentUser.email && applyLoanFilters([d]).length > 0){
        arr.push({id: docSnap.id, ...d});
      }
    });

    arr = sortLoans(arr);
    displayLoans(arr, myLoans);

    if(arr.length === 0) myLoans.innerHTML = "<p>Chưa có yêu cầu mượn nào.</p>";

  } catch(e){
    console.error(e);
    myLoans.innerHTML = "<p>Không tải được dữ liệu.</p>";
  }
}

// ================== REFRESH ALL LOANS (ADMIN) ==================
async function refreshAllLoans(){
  if(!isAdmin) return;
  allLoans.innerHTML = "Đang tải...";

  try {
    const snap = await getDocs(collection(db,"loans"));
    let arr = [];
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      if(d && !d.deleted && applyLoanFilters([d]).length > 0){
        arr.push({id: docSnap.id, ...d});
      }
    });

    arr = sortLoans(arr);
    displayLoans(arr, allLoans);

    if(arr.length === 0) allLoans.innerHTML = "<p>Chưa có yêu cầu mượn nào.</p>";

  } catch(e){
    console.error(e);
    allLoans.innerHTML = "<p>Không tải được dữ liệu.</p>";
  }
}

// ================== RENDER LOANS ==================
window.renderLoans = function(){
  if(isAdmin) refreshAllLoans();
  else refreshMyLoans();
};

// ================== EVENT SORT ==================
document.getElementById("loanSort").addEventListener("change", e=>{
  loanSort = e.target.value;
  renderLoans();
});



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

// ================== ADMIN LOAN ACTIONS (FULL TIMESTAMPS) ==================  

// ======= DUYỆT YÊU CẦU MƯỢN =======
window.approveLoanWithDates = async (id) => {
  if (!isAdmin) return alert("Chỉ admin mới có quyền duyệt yêu cầu.");

  const loanRef = doc(db, "loans", id);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return alert("Yêu cầu không tồn tại.");

  const loan = loanSnap.data();
  if (loan.status !== "pending") return alert("Yêu cầu đã được xử lý trước đó.");

  // Ngày đề xuất user
  const start = loan.requestedStart?.toDate ? loan.requestedStart.toDate() : new Date();
  const due = loan.requestedDue?.toDate ? loan.requestedDue.toDate() : start;

  // Lấy thông tin thiết bị
  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  const eq = eqSnap.data();
  if (eq.quantity_available < loan.quantity) return alert("Không đủ thiết bị.");

  // Trừ số lượng
  await updateDoc(eqRef, { quantity_available: eq.quantity_available - loan.quantity });

  const now = serverTimestamp();
  await updateDoc(loanRef, {
    status: "approved",
    startAt: Timestamp.fromDate(start),
    dueAt: Timestamp.fromDate(due),
    approvedAt: now,
    approvedBy: currentUser.email,
    actionAt: now,
    actionBy: currentUser.email,
    adminNote: loan.adminNote || ""
  });

  const loanSnap2 = await getDoc(loanRef);
  const loanFixed = {
    id,
    ...loanSnap2.data(),
    equipmentName: eq.name || "",
    qty: loan.quantity || 0,
    userEmail: loan.userEmail || "",
    userName: loan.userName || ""
  };

  await enqueueEmail(loanFixed, "approved");
  await refreshAllLoans();
  await refreshMyLoans();
};

// ======= XÁC NHẬN TRẢ =======
window.returnLoanWithTime = async (id) => {
  if (!isAdmin) return alert("Chỉ admin mới xác nhận trả thiết bị.");

  const retEl = document.getElementById("ret_at_" + id);
  let retDate = retEl?.value ? new Date(retEl.value) : new Date();

  const loanRef = doc(db, "loans", id);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return alert("Yêu cầu không tồn tại.");

  const loan = loanSnap.data();
  const startAt = loan.startAt?.toDate ? loan.startAt.toDate() : new Date();
  if (retDate < startAt) retDate = new Date(startAt.getTime() + 60 * 1000);

  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  const eq = eqSnap.data();

  // Cập nhật số lượng
  await updateDoc(eqRef, { quantity_available: eq.quantity_available + loan.quantity });

  const now = serverTimestamp();
  await updateDoc(loanRef, {
    status: "returned",
    returned: true,
    returnedAt: Timestamp.fromDate(retDate),
    returnedBy: currentUser.email,
    actionAt: now,
    actionBy: currentUser.email
  });

  const loanSnap2 = await getDoc(loanRef);
  const loanFixed = {
    id,
    ...loanSnap2.data(),
    equipmentName: eq.name || "",
    qty: loan.quantity || 0,
    userEmail: loan.userEmail || "",
    userName: loan.userName || ""
  };

  await enqueueEmail(loanFixed, "returned");
  await refreshAllLoans();
  await refreshMyLoans();
};

// ======= TỪ CHỐI =======
window.rejectLoan = async (id) => {
  if (!isAdmin) return alert("Chỉ admin mới từ chối yêu cầu.");

  const reason = prompt("Lý do từ chối:");
  if (reason === null) return;

  const loanRef = doc(db, "loans", id);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return alert("Yêu cầu không tồn tại.");

  const loan = loanSnap.data();
  const now = serverTimestamp();

  await updateDoc(loanRef, {
    status: "rejected",
    rejectedAt: now,
    rejectedBy: currentUser.email,
    approvedAt: now, // giữ cho email nội dung
    approvedBy: currentUser.email,
    adminNote: reason,
    actionAt: now,
    actionBy: currentUser.email
  });

  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  const eq = eqSnap.data();

  const loanFixed = {
    id,
    ...loan,
    equipmentName: eq.name || "",
    qty: loan.quantity || 0,
    userEmail: loan.userEmail || "",
    userName: loan.userName || "",
    adminNote: reason
  };

  await enqueueEmail(loanFixed, "rejected");
  await refreshAllLoans();
  await refreshMyLoans();
};

// ======= GIA HẠN =======
window.extendLoan = async (id) => {
  if (!isAdmin) return alert("Chỉ admin mới gia hạn yêu cầu.");

  const newDueEl = document.getElementById("extend_due_" + id);
  if (!newDueEl || !newDueEl.value) return alert("Chọn ngày gia hạn");

  const loanRef = doc(db, "loans", id);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return alert("Yêu cầu không tồn tại.");

  const loan = loanSnap.data();
  const currentStart = loan.startAt?.toDate ? loan.startAt.toDate() : new Date();
  const newDue = new Date(newDueEl.value + "T23:59:59");
  if (newDue < currentStart) return alert("Ngày gia hạn phải lớn hơn hoặc bằng ngày thực tế mượn.");

  const now = serverTimestamp();
  await updateDoc(loanRef, {
    status: "extended",
    dueAt: Timestamp.fromDate(newDue),
    extendedAt: now,
    extendedBy: currentUser.email,
    actionAt: now,
    actionBy: currentUser.email
  });

  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  const eq = eqSnap.data();

  const loanFixed = {
    id,
    ...loan,
    dueAt: Timestamp.fromDate(newDue),
    equipmentName: eq.name || "",
    qty: loan.quantity || 0,
    userEmail: loan.userEmail || "",
    userName: loan.userName || ""
  };

  await enqueueEmail(loanFixed, "extended");
  await refreshAllLoans();
  await refreshMyLoans();
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


// ================== EXPORT EXCEL / PDF ==================
document.getElementById("btnExportExcel").onclick = exportLoansExcel;
document.getElementById("btnExportPDF").onclick = exportLoansPDF;

// ================== EXPORT EXCEL NÂNG CAO ==================
async function exportLoansExcel() {
    let exportList = [];

    try {
        let loansQuery;

        // Lấy dữ liệu từ Firebase
        if (isAdmin) {
            loansQuery = query(collection(db, "loans"), where("deleted", "==", false));
        } else {
            loansQuery = query(
                collection(db, "loans"),
                where("userEmail", "==", currentUser.email),
                where("deleted", "==", false)
            );
        }

        const snap = await getDocs(loansQuery);
        snap.forEach(doc => {
            const d = doc.data();
            exportList.push({ id: doc.id, ...d });
        });

        if (exportList.length === 0) {
            alert("Không có dữ liệu để xuất");
            return;
        }

        // Hàm format ngày giờ
        const formatDate = dt => {
            if (!dt?.toDate) return "";
            const date = dt.toDate();
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            const hh = String(date.getHours()).padStart(2, "0");
            const min = String(date.getMinutes()).padStart(2, "0");
            return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
        };

        // Tạo header CSV
        let csv = "ID,Người dùng,Email,Thiết bị,Số lượng,Ngày mượn,Ngày trả/giá hạn,Trạng thái,Ghi chú,AdminNote\n";

        exportList.forEach(r => {
            csv += [
                r.id,
                r.userName || "",
                r.userEmail || "",
                r.equipmentName || "",
                r.quantity || r.qty || 0,
                formatDate(r.startAt),
                formatDate(r.dueAt),
                r.status || "",
                (r.note || "").replace(/(\r\n|\n|\r)/gm, " "),
                (r.adminNote || "").replace(/(\r\n|\n|\r)/gm, " ")
            ].join(",") + "\n";
        });

        // Thêm BOM UTF-8 để Excel đọc tiếng Việt
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "loans_export.csv";
        a.click();

    } catch (err) {
        console.error("Lỗi khi xuất Excel:", err);
        alert("Có lỗi xảy ra khi xuất Excel. Xem console để biết chi tiết.");
    }
}

// ================== LOAD JSPDF MỘT LẦN KHI TRANG LOAD ==================
let jsPDFLoaded = false;
let jsPDFInstance = null;

function loadJsPDF() {
    return new Promise((resolve, reject) => {
        if (jsPDFLoaded) {
            resolve(jsPDFInstance);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => {
            jsPDFLoaded = true;
            jsPDFInstance = window.jspdf.jsPDF;
            resolve(jsPDFInstance);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ================== EXPORT PDF ==================
async function exportLoansPDF() {
    try {
        const jsPDF = await loadJsPDF();  // đảm bảo jsPDF đã load
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Danh sách mượn thiết bị", 20, 20);

        let loansQuery;
        if (isAdmin) {
            loansQuery = query(collection(db, "loans"), where("deleted", "==", false));
        } else {
            loansQuery = query(
                collection(db, "loans"),
                where("userEmail", "==", currentUser.email),
                where("deleted", "==", false)
            );
        }

        const snap = await getDocs(loansQuery);
        const loans = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (loans.length === 0) {
            doc.setFontSize(12);
            doc.text("Không có dữ liệu.", 20, 30);
        } else {
            doc.setFontSize(12);
            let y = 30;
            loans.forEach(loan => {
                const startAt = loan.startAt ? loan.startAt.toDate().toLocaleString() : "(chưa có)";
                const dueAt = loan.dueAt ? loan.dueAt.toDate().toLocaleString() : "(chưa có)";
                const returnedAt = loan.returnedAt ? loan.returnedAt.toDate().toLocaleString() : "-";

                const line = `Thiết bị: ${loan.equipmentName || "(Không có)"} | Số lượng: ${loan.quantity || loan.qty || 0} | Trạng thái: ${loan.status} | Ngày mượn: ${startAt} | Ngày trả/gia hạn: ${dueAt} | Trả: ${returnedAt}`;
                doc.text(line, 20, y);
                y += 10;
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
            });
        }

        doc.save("Danh_sach_muon_thiet_bi.pdf");
        alert("✅ Xuất PDF thành công!");
    } catch (err) {
        console.error("Lỗi xuất PDF:", err);
        alert("Có lỗi xảy ra khi xuất PDF. Xem console để biết chi tiết.");
    }
}

// ================== GẮN NÚT ==================
document.getElementById("btnExportPDF").onclick = exportLoansPDF;


// ================== HELPER ==================
function formatDate(timestamp) {
  if (!timestamp) return "(Không có)";
  
  // Nếu timestamp là Firestore Timestamp
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  const day = String(date.getDate()).padStart(2,'0');
  const month = String(date.getMonth()+1).padStart(2,'0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2,'0');
  const seconds = String(date.getSeconds()).padStart(2,'0');
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  hours = String(hours).padStart(2,'0');

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

// ================== EMAIL QUEUE ==================
const statusMap = {
  approved: "Yêu cầu mượn đã được DUYỆT",
  rejected: "Yêu cầu mượn đã bị TỪ CHỐI",
  returned: "Xác nhận ĐÃ TRẢ thiết bị",
  extended: "Gia hạn mượn thiết bị"
};

// Các hàm admin loan actions: approveLoanWithDates, rejectLoan, extendLoan, returnLoanWithTime

// enqueueEmail chỉ khai báo một lần
async function enqueueEmail(loan, status) {
  try {
    if (!loan || !loan.id) return console.error("enqueueEmail: loan or loan.id missing");

    const toEmail = loan.userEmail || "";
    const userName = loan.userName || "";
    const quantity = loan.quantity || loan.qty || 0;

    const proposedStart = loan.startAt?.toDate ? loan.startAt.toDate() : new Date();
    const proposedDue = loan.dueAt?.toDate ? loan.dueAt.toDate() : new Date();
    const approvedAt = loan.approvedAt?.toDate ? loan.approvedAt.toDate() : null;
    const returnedAt = loan.returnedAt?.toDate ? loan.returnedAt.toDate() : null;
    const rejectedAt = loan.rejectedAt?.toDate ? loan.rejectedAt.toDate() : null;
    const extendedAt = loan.extendedAt?.toDate ? loan.extendedAt.toDate() : null;

    const emailData = {
      loanId: loan.id,
      userEmail: toEmail,
      userName,
      equipmentName: loan.equipmentName || "",
      qty: quantity,
      type: status,
      subject: statusMap[status] || "",
      body: `
Thiết bị: ${loan.equipmentName || "(Không có)"}
Số lượng: ${quantity}
Trạng thái: ${status}
Ghi chú từ Admin: ${loan.adminNote || "(Không có)"}
Ngày đề xuất: ${proposedStart.toLocaleDateString()} → ${proposedDue.toLocaleDateString()}
Ngày duyệt: ${approvedAt ? approvedAt.toLocaleString() : "-"}
Ngày trả: ${returnedAt ? returnedAt.toLocaleString() : "-"}
Ngày từ chối: ${rejectedAt ? rejectedAt.toLocaleString() : "-"}
Ngày gia hạn: ${extendedAt ? extendedAt.toLocaleDateString() : "-"}
      `.trim(),
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "emailQueue"), emailData);
    console.log(`✅ Email queued for loanId=${loan.id}, status=${status}`);
  } catch (err) {
    console.error("Email queue error:", err);
  }
}

// EOF

