// ------- CONFIG -------
// Thay bằng cấu hình Firebase Web App của bạn:
const firebaseConfig = {
  apiKey: "AIzaSyALw-kDEXZeKBQk__Mnfrqogb7vKuPu92w",
  authDomain: "qltb-37efe.firebaseapp.com",
  projectId: "qltb-37efe",
  storageBucket: "qltb-37efe.firebasestorage.app",
  messagingSenderId: "405387499869",
  appId: "1:405387499869:web:78c8799d558f0acc4270b4",
  measurementId: "G-QKQFMLZBD2"
};

// Domain cho phép:
const ALLOWED_DOMAIN = "agu.edu.vn";

// Email admin (tạm thời cấu hình ở client; triển khai thật nên set bằng Firestore rules hoặc custom claims)
const ADMIN_EMAILS = [
  "nthanhphuong@agu.edu.vn",
  "admin2@agu.edu.vn"
];
// Cho phép email test không thuộc @agu.edu.vn
const TEST_EMAILS = [
  "test1@local.test",
  "test2@local.test"
];


// Helper: email được phép dùng app?
function isAllowedEmail(email) {
  return email.endsWith("@agu.edu.vn") || TEST_EMAILS.includes(email);
}

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ------- INIT FIREBASE -------
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------- DOM -------
const loginArea = document.getElementById("loginArea");
const loginMessage = document.getElementById("loginMessage");
const btnGoogleLogin = document.getElementById("btnGoogleLogin");
const btnLogout = document.getElementById("btnLogout");
const userInfo = document.getElementById("userInfo");
const userEmailEl = document.getElementById("userEmail");
const userRoleTag = document.getElementById("userRoleTag");

const adminEquipment = document.getElementById("adminEquipment");
const eqName = document.getElementById("eqName");
const eqCode = document.getElementById("eqCode");
const eqQty = document.getElementById("eqQty");
const eqDesc = document.getElementById("eqDesc");
const btnAddEq = document.getElementById("btnAddEq");
const equipmentListAdmin = document.getElementById("equipmentListAdmin");

const userSection = document.getElementById("userSection");
const equipmentList = document.getElementById("equipmentList");
const loanEqId = document.getElementById("loanEqId");
const loanQty = document.getElementById("loanQty");
const loanNote = document.getElementById("loanNote");
const btnCreateLoan = document.getElementById("btnCreateLoan");
const loanCreateMsg = document.getElementById("loanCreateMsg");
const myLoans = document.getElementById("myLoans");

const adminLoans = document.getElementById("adminLoans");
const allLoans = document.getElementById("allLoans");
const loanEqSelect = document.getElementById("loanEqSelect");
const loanStart = document.getElementById("loanStart");
const loanDue = document.getElementById("loanDue");

let currentUser = null;
let isAdmin = false;

// ------- AUTH FLOW -------
btnGoogleLogin.onclick = async () => {
  loginMessage.textContent = "";
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email || "";
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await signOut(auth);
      loginMessage.textContent = `Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
      return;
    }
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Đăng nhập thất bại.";
  }
};

btnLogout.onclick = async () => {
  await signOut(auth);
};

const localEmail = document.getElementById("localEmail");
const localPass  = document.getElementById("localPass");
const btnLocalSignup = document.getElementById("btnLocalSignup");
const btnLocalLogin  = document.getElementById("btnLocalLogin");
const localMsg = document.getElementById("localMsg");

btnLocalSignup.onclick = async () => {
  localMsg.textContent = "";
  try {
    const email = (localEmail.value || "").trim();
    const pass  = localPass.value || "";
    if (!email || !pass) {
      localMsg.textContent = "Nhập email và mật khẩu.";
      return;
    }
    // Chỉ cho đăng ký nếu là email @agu.edu.vn hoặc nằm trong TEST_EMAILS
    if (!isAllowedEmail(email)) {
      localMsg.textContent = "Email không được phép (chỉ @agu.edu.vn hoặc trong TEST_EMAILS).";
      return;
    }
    await createUserWithEmailAndPassword(auth, email, pass);
    localMsg.textContent = "Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  } catch (e) {
    console.error(e);
    localMsg.textContent = "Đăng ký thất bại: " + (e.code || "");
  }
};

btnLocalLogin.onclick = async () => {
  localMsg.textContent = "";
  try {
    const email = (localEmail.value || "").trim();
    const pass  = localPass.value || "";
    if (!email || !pass) {
      localMsg.textContent = "Nhập email và mật khẩu.";
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
    localMsg.textContent = "Đăng nhập test thành công.";
  } catch (e) {
    console.error(e);
    localMsg.textContent = "Đăng nhập thất bại: " + (e.code || "");
  }
};


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    isAdmin = false;
    userInfo.classList.add("hidden");
    adminEquipment.classList.add("hidden");
    userSection.classList.add("hidden");
    adminLoans.classList.add("hidden");
    loginArea.classList.remove("hidden");
    return;
  }

  // Check domain
  if (!isAllowedEmail(user.email)) {
  await signOut(auth);
  loginMessage.textContent = `Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test trong TEST_EMAILS.`;
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
  userSection.classList.remove("hidden");

  if (isAdmin) {
    adminEquipment.classList.remove("hidden");
    adminLoans.classList.remove("hidden");
  } else {
    adminEquipment.classList.add("hidden");
    adminLoans.classList.add("hidden");
  }

  await refreshEquipmentLists();
  await refreshMyLoans();
  if (isAdmin) await refreshAllLoans();
});

// ------- THIẾT BỊ -------

// Thêm thiết bị (Admin)
btnAddEq.onclick = async () => {
  if (!isAdmin || !currentUser) return;
  const name = eqName.value.trim();
  const code = eqCode.value.trim();
  const qty = parseInt(eqQty.value, 10) || 0;
  const desc = eqDesc.value.trim();

  if (!name || !code || qty <= 0) {
    alert("Nhập đầy đủ tên, mã, số lượng > 0.");
    return;
  }

  await addDoc(collection(db, "equipment"), {
    name,
    code,
    description: desc,
    quantity_total: qty,
    quantity_available: qty,
    is_active: true
  });

  eqName.value = "";
  eqCode.value = "";
  eqQty.value = "";
  eqDesc.value = "";

  await refreshEquipmentLists();
};

// Load danh sách thiết bị cho cả admin & user

async function refreshEquipmentLists() {
  equipmentList.innerHTML = "Đang tải...";
  equipmentListAdmin.innerHTML = "";
  loanEqSelect.innerHTML = `<option value="">-- Chọn thiết bị --</option>`;

  const snap = await getDocs(collection(db, "equipment"));
  let htmlUser = "";
  let htmlAdmin = "";

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    if (!d.is_active) return;

    // Card hiển thị
    const line = `
      <div class="card">
        <div><strong>${d.name}</strong> (${d.code})</div>
        <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
        <div>ID: ${id}</div>
        <div>${d.description || ""}</div>
      </div>
    `;
    htmlUser += line;
    if (isAdmin) htmlAdmin += line;

    // Option cho dropdown mượn
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`;
    loanEqSelect.appendChild(opt);
  });

  equipmentList.innerHTML = htmlUser || "<p>Chưa có thiết bị.</p>";
  if (isAdmin) {
    equipmentListAdmin.innerHTML = htmlAdmin || "<p>Chưa có thiết bị.</p>";
  }

  // set mặc định ngày mượn = hôm nay, hạn trả = +7 ngày nếu chưa chọn
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const toInput = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if (!loanStart.value) loanStart.value = toInput(today);
  if (!loanDue.value) {
    const tmp = new Date(today);
    tmp.setDate(tmp.getDate() + 7);
    loanDue.value = toInput(tmp);
  }
}


// ------- TẠO YÊU CẦU MƯỢN (USER) -------

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

  // Check tồn
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

    // yêu cầu thời gian
    requestedStart: startDate, // Date sẽ được serialize thành Timestamp
    requestedDue: dueDate,

    // thời gian sau khi duyệt
    approvedBy: null,
    approvedAt: null,
    startAt: null,
    dueAt: null,

    // trả
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


// ------- XEM YÊU CẦU CỦA MÌNH -------
async function refreshMyLoans() {
  if (!currentUser) return;
  const qRef = query(
    collection(db, "loans"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);
  let html = "";

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    html += renderLoanCard(docSnap.id, d, false);
  });

  myLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
}

// ------- ADMIN: XEM & DUYỆT TẤT CẢ -------
async function refreshAllLoans() {
  if (!isAdmin) return;
  const qRef = query(
    collection(db, "loans"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);
  let html = "";

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    html += renderLoanCard(docSnap.id, d, true);
  });

  allLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
}

// Render 1 phiếu mượn
function renderLoanCard(id, d, adminView) {
  let statusClass = "";
  if (d.status === "pending") statusClass = "status-pending";
  else if (d.status === "approved" && !d.returned) statusClass = "status-approved";
  else if (d.status === "rejected") statusClass = "status-rejected";
  else if (d.returned) statusClass = "status-returned";

  // Helper hiển thị ngày
  const fmt = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString();
  };

  // Input cho admin (duyệt + gia hạn + trả)
  let adminControls = "";
  if (adminView && d.status === "pending") {
    const reqStart = fmt(d.requestedStart);
    const reqDue = fmt(d.requestedDue);
    adminControls += `
      <div style="margin-top:6px">
        <div><em>Người mượn đề xuất:</em> ${reqStart || "-"} → ${reqDue || "-"}</div>
        <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
        <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
        <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
        <button onclick="rejectLoan('${id}')">Từ chối</button>
      </div>
    `;
  }
  if (adminView && d.status === "approved" && !d.returned) {
    adminControls += `
      <div style="margin-top:6px">
        <div><em>Đang mượn:</em> ${fmt(d.startAt) || "-"} → ${fmt(d.dueAt) || "-"}</div>
        <label>Gia hạn đến: <input type="date" id="extend_due_${id}"></label>
        <button onclick="extendLoan('${id}')">Gia hạn</button>
        &nbsp; | &nbsp;
        <label>Thời điểm trả: <input type="datetime-local" id="ret_at_${id}"></label>
        <button onclick="returnLoanWithTime('${id}')">Xác nhận trả</button>
      </div>
    `;
  }

  return `
    <div class="card">
      <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
      <div>Người mượn: ${d.userEmail}</div>
      <div class="${statusClass}">
        Trạng thái: ${d.status.toUpperCase()}${d.returned ? " (ĐÃ TRẢ)" : ""}
      </div>
      <div>Ghi chú: ${d.note || ""}</div>

      ${
        d.requestedStart || d.requestedDue
          ? `<div>Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>`
          : ""
      }
      ${
        d.startAt || d.dueAt
          ? `<div>Được duyệt: ${fmt(d.startAt)} → ${fmt(d.dueAt)}</div>`
          : ""
      }
      ${d.rejectedReason ? `<div>Lý do từ chối: ${d.rejectedReason}</div>` : ""}
      ${adminControls}
    </div>
  `;
}




// ------- ADMIN ACTIONS (Duyệt / Từ chối / Trả) -------
// Lưu ý: đây là demo ở client; triển khai thật cần Firestore Security Rules xử lý logic này.

// Duyệt: lấy ngày từ input, set startAt/dueAt, trừ tồn
window.approveLoanWithDates = async (loanId) => {
  if (!isAdmin) return;

  const s = document.getElementById(`ap_start_${loanId}`).value;
  const d = document.getElementById(`ap_due_${loanId}`).value;
  if (!s || !d) { alert("Chọn ngày bắt đầu và hạn trả."); return; }

  const startAt = new Date(`${s}T00:00:00`);
  const dueAt = new Date(`${d}T23:59:59`);
  if (startAt > dueAt) { alert("Hạn trả phải sau ngày bắt đầu."); return; }

  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();

  if (loan.status !== "pending") return;

  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return;
  const eq = eqSnap.data();

  if (eq.quantity_available < loan.quantity) {
    alert("Không đủ số lượng để duyệt.");
    return;
  }

  // cập nhật loan
  await updateDoc(loanRef, {
    status: "approved",
    approvedBy: currentUser.email,
    approvedAt: serverTimestamp(),
    startAt: startAt,
    dueAt: dueAt
  });

  // trừ tồn
  await updateDoc(eqRef, {
    quantity_available: eq.quantity_available - loan.quantity
  });

  await refreshAllLoans();
  await refreshEquipmentLists();
};

// Gia hạn: cập nhật dueAt
window.extendLoan = async (loanId) => {
  if (!isAdmin) return;
  const dueStr = document.getElementById(`extend_due_${loanId}`).value;
  if (!dueStr) { alert("Chọn ngày gia hạn."); return; }
  const newDue = new Date(`${dueStr}T23:59:59`);

  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();

  if (loan.status !== "approved" || loan.returned) return;

  await updateDoc(loanRef, { dueAt: newDue });
  await refreshAllLoans();
};

// Trả: cho phép chọn thời điểm trả (datetime-local)
window.returnLoanWithTime = async (loanId) => {
  if (!isAdmin) return;

  const input = document.getElementById(`ret_at_${loanId}`).value;
  const returnedAt = input ? new Date(input) : new Date();

  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status !== "approved" || loan.returned) return;

  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return;
  const eq = eqSnap.data();

  await updateDoc(loanRef, {
    returned: true,
    returnedAt: returnedAt
  });

  await updateDoc(eqRef, {
    quantity_available: eq.quantity_available + loan.quantity
  });

  await refreshAllLoans();
  await refreshEquipmentLists();
};
