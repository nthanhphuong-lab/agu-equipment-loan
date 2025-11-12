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
  if (!user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await signOut(auth);
    loginMessage.textContent = `Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
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

  const snap = await getDocs(collection(db, "equipment"));
  let htmlUser = "";
  let htmlAdmin = "";

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    if (!d.is_active) return;
    const line = `
      <div class="card">
        <div><strong>${d.name}</strong> (${d.code})</div>
        <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
        <div>ID: ${id}</div>
        <div>${d.description || ""}</div>
      </div>
    `;
    htmlUser += line;

    if (isAdmin) {
      htmlAdmin += `
        <div class="card">
          <div><strong>${d.name}</strong> (${d.code})</div>
          <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
          <div>ID: ${id}</div>
          <div>${d.description || ""}</div>
        </div>
      `;
    }
  });

  equipmentList.innerHTML = htmlUser || "<p>Chưa có thiết bị.</p>";
  if (isAdmin) {
    equipmentListAdmin.innerHTML = htmlAdmin || "<p>Chưa có thiết bị.</p>";
  }
}

// ------- TẠO YÊU CẦU MƯỢN (USER) -------
btnCreateLoan.onclick = async () => {
  if (!currentUser) {
    alert("Cần đăng nhập.");
    return;
  }
  const eqId = loanEqId.value.trim();
  const qty = parseInt(loanQty.value, 10) || 0;
  const note = loanNote.value.trim();

  if (!eqId || qty <= 0) {
    loanCreateMsg.textContent = "Nhập ID thiết bị và số lượng > 0.";
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

  // Tạo phiếu ở trạng thái pending, không trừ tồn ngay
  await addDoc(collection(db, "loans"), {
    userId: currentUser.uid,
    userEmail: currentUser.email,
    equipmentId: eqId,
    equipmentName: eq.name,
    quantity: qty,
    note,
    status: "pending",
    createdAt: serverTimestamp(),
    approvedBy: null,
    approvedAt: null,
    returned: false,
    returnedAt: null,
    rejectedReason: null
  });

  loanEqId.value = "";
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

  let adminButtons = "";
  if (adminView && d.status === "pending") {
    adminButtons += `
      <button onclick="approveLoan('${id}')">Duyệt</button>
      <button onclick="rejectLoan('${id}')">Từ chối</button>
    `;
  }
  if (adminView && d.status === "approved" && !d.returned) {
    adminButtons += `
      <button onclick="returnLoan('${id}')">Xác nhận trả</button>
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
      ${d.rejectedReason ? `<div>Lý do từ chối: ${d.rejectedReason}</div>` : ""}
      ${adminButtons}
    </div>
  `;
}

// ------- ADMIN ACTIONS (Duyệt / Từ chối / Trả) -------
// Lưu ý: đây là demo ở client; triển khai thật cần Firestore Security Rules xử lý logic này.

window.approveLoan = async (loanId) => {
  if (!isAdmin) return;

  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();

  if (loan.status !== "pending") return;

  // Check tồn
  const eqRef = doc(db, "equipment", loan.equipmentId);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return;
  const eq = eqSnap.data();
  if (eq.quantity_available < loan.quantity) {
    alert("Không đủ số lượng để duyệt.");
    return;
  }

  await updateDoc(loanRef, {
    status: "approved",
    approvedBy: currentUser.email,
    approvedAt: serverTimestamp()
  });

  await updateDoc(eqRef, {
    quantity_available: eq.quantity_available - loan.quantity
  });

  await refreshAllLoans();
  await refreshEquipmentLists();
};

window.rejectLoan = async (loanId) => {
  if (!isAdmin) return;
  const reason = prompt("Lý do từ chối:");
  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data();
  if (loan.status !== "pending") return;

  await updateDoc(loanRef, {
    status: "rejected",
    rejectedReason: reason || ""
  });

  await refreshAllLoans();
};

window.returnLoan = async (loanId) => {
  if (!isAdmin) return;
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
    returnedAt: serverTimestamp()
  });

  await updateDoc(eqRef, {
    quantity_available: eq.quantity_available + loan.quantity
  });

  await refreshAllLoans();
  await refreshEquipmentLists();
};
