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

function isAllowedEmail(email) {
  return email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email);
}

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  updateDoc, serverTimestamp, query, where, orderBy, deleteDoc
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

// ================== STATE ==================
let currentUser = null;
let isAdmin = false;
let isManager = false;

// ================== AUTH FLOW ==================
btnGoogleLogin.onclick = async () => {
  loginMessage.textContent = "";
  const provider = new GoogleAuthProvider();
  try {
    // Sử dụng signInWithRedirect thay vì signInWithPopup
    await signInWithRedirect(auth, provider);
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Đăng nhập thất bại.";
  }
};

btnLogout.onclick = async () => { await signOut(auth); };

// Xử lý khi chuyển hướng sau khi đăng nhập
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    isAdmin = false;
    userInfo.classList.add("hidden");
    loginArea.classList.remove("hidden");
    return;
  }

  // Kiểm tra email người dùng
  if (!isAllowedEmail(user.email)) {
    await signOut(auth);
    loginMessage.textContent = `Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN} hoặc email test trong TEST_EMAILS.`;
    return;
  }

  currentUser = user;
  isAdmin = ADMIN_EMAILS.includes(user.email);

  userEmailEl.textContent = user.email;
  userRoleTag.textContent = isAdmin ? "ADMIN" : "USER";
  userRoleTag.style.background = isAdmin ? "#222" : "#eee";
  userRoleTag.style.color = isAdmin ? "#fff" : "#000";

  loginArea.classList.add("hidden");
  userInfo.classList.remove("hidden");

  // Hiển thị trang khác cho admin
  if (isAdmin) {
    equipmentListAdmin.classList.remove("hidden");
  } else {
    equipmentListAdmin.classList.add("hidden");
  }

  // Tải lại danh sách thiết bị và yêu cầu
  await refreshEquipmentLists();
  await refreshMyLoans();
  if (isAdmin) await refreshAllLoans();
});

// ================== QUẢN LÝ YÊU CẦU MƯỢN ==================
async function refreshAllLoans() {
  if (!isAdmin) return;
  const qRef = query(collection(db, "loans"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qRef);
  let html = "";
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    html += renderLoanCard(docSnap.id, d, true); // Hiển thị thông tin yêu cầu mượn
  });
  allLoans.innerHTML = html || "<p>Chưa có yêu cầu mượn.</p>";
}

async function renderLoanCard(id, d, adminView) {
  let statusClass = "";
  if (d.status === "pending") statusClass = "status-pending";
  else if (d.status === "approved" && !d.returned) statusClass = "status-approved";
  else if (d.status === "rejected") statusClass = "status-rejected";
  else if (d.returned) statusClass = "status-returned";

  const fmt = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString();
  };

  let adminControls = "";
  if (adminView && d.status === "pending") {
    adminControls = `
      <div style="margin-top:6px">
        <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
        <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
        <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
        <button onclick="rejectLoan('${id}')">Từ chối</button>
      </div>
    `;
  }

  return `
    <div class="card">
      <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
      <div>Người mượn: ${d.userEmail}</div>
      <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}</div>
      <div>Ghi chú: ${d.note || ""}</div>
      ${adminControls}
    </div>
  `;
}

// ================== TẠO YÊU CẦU MƯỢN ==================
btnCreateLoan.onclick = async () => {
  if (!currentUser) {
    alert("Cần đăng nhập.");
    return;
  }
  const eqId = (loanEqSelect.value || "").trim();
  const qty = parseInt(loanQty.value, 10) || 0;
  const note = loanNote.value.trim();
  const startStr = loanStart.value; // yyyy-mm-dd
  const dueStr = loanDue.value;

  if (!eqId || qty <= 0) {
    loanCreateMsg.textContent = "Chọn thiết bị và số lượng > 0.";
    return;
  }
  if (!startStr || !dueStr) {
    loanCreateMsg.textContent = "Chọn ngày mượn và ngày trả dự kiến.";
    return;
  }
  const startDate = new Date(`${startStr}T00:00:00`);
  const dueDate = new Date(`${dueStr}T23:59:59`);
  if (startDate > dueDate) {
    loanCreateMsg.textContent = "Ngày trả phải sau hoặc bằng ngày mượn.";
    return;
  }

  const eqRef = doc(db, "equipment", eqId);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) {
    loanCreateMsg.textContent = "Không tìm thấy thiết bị.";
    return;
  }
  const eq = eqSnap.data();
  if (!eq.is_active) {
    loanCreateMsg.textContent = "Thiết bị không còn hoạt động.";
    return;
  }
  if (eq.quantity_available < qty) {
    loanCreateMsg.textContent = "Không đủ số lượng còn lại.";
    return;
  }

  await addDoc(collection(db, "loans"), {
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
    approvedBy: null,
    approvedAt: null,
    startAt: null,
    dueAt: null,
    returned: false,
    returnedAt: null,
    rejectedReason: null
  });

  loanEqSelect.value = "";
  loanQty.value = "";
  loanNote.value = "";
  loanCreateMsg.textContent = "Đã gửi yêu cầu mượn.";

  await refreshMyLoans();
  if (isAdmin) await refreshAllLoans();
};
