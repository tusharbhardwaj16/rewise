
document.addEventListener("DOMContentLoaded", () => {
  const examId = getExamIdFromUrl();

  if (!examId) {
    document.body.innerHTML = "<h2 style='padding:20px'>Exam not found</h2>";
    return;
  }

  fetchExamData(examId);
});

/* ROUTING — HASH BASED */
function getExamIdFromUrl() {
  return window.location.hash.replace("#", "");
}

/* FETCH DATA */
function fetchExamData(examId) {
  fetch(`/data/exams/${examId}.json`)
    .then(res => {
      if (!res.ok) throw new Error("Exam JSON not found");
      return res.json();
    })
    .then(renderExamPage)
    .catch(() => {
      document.body.innerHTML = "<h2 style='padding:20px'>Invalid exam</h2>";
    });
}

/* RENDER PIPELINE */
function renderExamPage(data) {
  renderExamHeader(data.exam);
  renderAvailability(data.availability);
  renderSubjects(data.subjects);
}

/* HEADER */
function renderExamHeader(exam) {
  setText("exam-name", exam.name);
  setText("exam-context", exam.short_context);
  setText("exam-status", exam.status.toUpperCase());

  if (exam.next_phase) {
    setText(
      "exam-next-phase",
      `${exam.next_phase.label} in ${formatDate(exam.next_phase.date)}`
    );
  }
}

/* AVAILABILITY */
function renderAvailability(availability) {
  const el = document.getElementById("exam-availability");
  const items = [];

  if (availability.practice_sets) items.push("Practice question sets");
  if (availability.notes) items.push("Revision notes");
  if (availability.mock_sets) items.push("Exam-mapped mock-style sets");

  el.innerHTML = items.map(i => `<li>${i}</li>`).join("");
}

/* SUBJECTS */
function renderSubjects(subjects) {
  const container = document.getElementById("subjects-container");
  container.innerHTML = "";

  subjects.forEach(subject => {
    if (!subject.products || subject.products.length === 0) return;

    const section = document.createElement("section");
    section.className = "subject-section";

    section.innerHTML = `
      <h3 class="subject-title">${subject.name}</h3>
      <div class="product-grid">
        ${subject.products
          .filter(p => p.active)
          .map(renderProductCard)
          .join("")}
      </div>
    `;

    container.appendChild(section);
  });
}

/* PRODUCT CARD */
function renderProductCard(product) {
  return `
    <div class="product-card">
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        ${product.description ? `<div class="product-desc">${product.description}</div>` : ""}
      </div>
      <div class="product-meta">
        <div class="product-price">₹${product.price}</div>
        <button 
          class="product-action"
          data-product-id="${product.id}"
          data-price="${product.price}"
        >Buy</button>
      </div>
    </div>
  `;
}

/* PAYMENT CLICK */
document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("product-action")) return;

  const btn = e.target;
  const productId = btn.dataset.productId;
  const price = btn.dataset.price;

  btn.disabled = true;
  btn.textContent = "Processing…";

  try {
    const order = await createOrder(productId);
    openRazorpay(order, productId, btn);
  } catch {
    btn.disabled = false;
    btn.textContent = "Buy";
  }
});

/* CREATE ORDER */
async function createOrder(productId) {
  const res = await fetch("http://localhost:4000/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: productId})
  });
  if (!res.ok) throw new Error();
  return res.json();
}

/* RAZORPAY */
function openRazorpay(order, productId, btn) {
  const options = {
    key: order.key,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: "ReWise",
    handler: function (response) {
      verifyPayment(response, productId, btn);
    },
    modal: {
      ondismiss: function () {
        btn.disabled = false;
        btn.textContent = "Buy";
      }
    }
  };
  new Razorpay(options).open();
}

/* VERIFY */
async function verifyPayment(response, productId, btn) {
  const res = await fetch("http://localhost:4000/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature
  })
  });

  if (!res.ok) {
    btn.disabled = false;
    btn.textContent = "Buy";
    return;
  }

  const data = await res.json();

  if (!data.success || !data.downloadToken) {
    alert("Payment verified, but download failed");
    return;
  }
  window.location.href =
    "http://localhost:4000/download/" + data.downloadToken;

  btn.textContent = "Access";
  btn.disabled = false;
}

/* HELPERS */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
