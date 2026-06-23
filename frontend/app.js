// StockFlow Inventory Dashboard Application Logic

const API_URL = "http://localhost:5000/api/products";
let allProducts = [];
let isEditing = false;

// DOM Elements
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const productNameInput = document.getElementById("productName");
const categoryInput = document.getElementById("category");
const supplierInput = document.getElementById("supplier");
const priceInput = document.getElementById("price");
const quantityInput = document.getElementById("quantity");

const formTitle = document.getElementById("formTitle");
const btnSubmit = document.getElementById("btnSubmit");
const btnCancel = document.getElementById("btnCancel");

const inventoryBody = document.getElementById("inventoryBody");
const searchInput = document.getElementById("searchInput");
const dbStatus = document.getElementById("dbStatus");

// Stats Elements
const statTotalProducts = document.getElementById("statTotalProducts");
const statTotalValue = document.getElementById("statTotalValue");
const statLowStock = document.getElementById("statLowStock");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
  
  // Event Listeners
  productForm.addEventListener("submit", handleFormSubmit);
  btnCancel.addEventListener("click", resetForm);
  searchInput.addEventListener("input", handleSearch);
});

// Update database connection status dot
function updateConnectionStatus(isConnected) {
  const dot = dbStatus.querySelector(".status-dot");
  const text = dbStatus.querySelector(".status-text");
  
  if (isConnected) {
    dot.className = "status-dot success";
    text.textContent = "Database Connected";
    dbStatus.style.background = "rgba(16, 185, 129, 0.08)";
    dbStatus.style.borderColor = "rgba(16, 185, 129, 0.2)";
  } else {
    dot.className = "status-dot error";
    text.textContent = "Offline / Connection Error";
    dbStatus.style.background = "rgba(239, 68, 68, 0.08)";
    dbStatus.style.borderColor = "rgba(239, 68, 68, 0.2)";
  }
}

// Fetch products from API
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to load products");
    
    allProducts = await response.json();
    updateConnectionStatus(true);
    renderProducts(allProducts);
    updateStats(allProducts);
  } catch (error) {
    console.error("Error loading products:", error);
    updateConnectionStatus(false);
    showToast("Error connecting to database. Please make sure backend is running.", "error");
    inventoryBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <p>⚠️ Failed to fetch inventory data from ${API_URL}</p>
        </td>
      </tr>
    `;
  }
}

// Render products inside the table
function renderProducts(products) {
  if (products.length === 0) {
    inventoryBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <p>No products found in inventory.</p>
        </td>
      </tr>
    `;
    return;
  }

  inventoryBody.innerHTML = products.map(product => {
    // Determine quantity badge styling
    let qtyBadgeClass = "badge quantity";
    let qtyText = product.quantity;
    
    if (product.quantity === 0) {
      qtyBadgeClass = "badge out-of-stock";
      qtyText = "Out of Stock";
    } else if (product.quantity <= 15) {
      qtyBadgeClass = "badge low-stock";
      qtyText = `${product.quantity} (Low)`;
    }

    const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price);
    const updatedDate = new Date(product.updatedAt || product.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr id="row-${product._id}">
        <td style="font-weight: 600;">${escapeHTML(product.productName)}</td>
        <td><span class="badge category">${escapeHTML(product.category)}</span></td>
        <td>${formattedPrice}</td>
        <td><span class="${qtyBadgeClass}">${qtyText}</span></td>
        <td>${escapeHTML(product.supplier)}</td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${updatedDate}</td>
        <td>
          <div class="action-btns">
            <button class="btn-action edit" onclick="prepareEdit('${product._id}')" title="Edit Product">✏️</button>
            <button class="btn-action delete" onclick="handleDelete('${product._id}')" title="Delete Product">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Calculate and display stats
function updateStats(products) {
  const total = products.length;
  const value = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const lowStock = products.filter(p => p.quantity <= 15).length;

  statTotalProducts.textContent = total;
  statTotalValue.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  statLowStock.textContent = lowStock;
}

// Handle Form Submission (Add or Update)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const payload = {
    productName: productNameInput.value.trim(),
    category: categoryInput.value,
    supplier: supplierInput.value.trim(),
    price: parseFloat(priceInput.value),
    quantity: parseInt(quantityInput.value, 10)
  };

  const id = productIdInput.value;
  const isEditMode = isEditing && id;

  const url = isEditMode ? `${API_URL}/update/${id}` : `${API_URL}/add`;
  const method = isEditMode ? "PUT" : "POST";

  try {
    btnSubmit.disabled = true;
    btnSubmit.textContent = isEditMode ? "Saving..." : "Adding...";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to submit product");
    }

    showToast(isEditMode ? "Product updated successfully!" : "Product added successfully!");
    resetForm();
    await fetchProducts();
  } catch (error) {
    console.error("Error submitting form:", error);
    showToast(error.message, "error");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = isEditing ? "Save Changes" : "Add Product";
  }
}

// Prepare the form for editing
function prepareEdit(id) {
  const product = allProducts.find(p => p._id === id);
  if (!product) return;

  isEditing = true;
  formTitle.textContent = "Edit Product Details";
  productIdInput.value = product._id;
  productNameInput.value = product.productName;
  categoryInput.value = product.category;
  supplierInput.value = product.supplier;
  priceInput.value = product.price;
  quantityInput.value = product.quantity;

  btnSubmit.textContent = "Save Changes";
  btnCancel.style.display = "block";
  
  // Scroll form into view on mobile
  productForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form State
function resetForm() {
  isEditing = false;
  formTitle.textContent = "Add New Product";
  productIdInput.value = "";
  productForm.reset();
  
  btnSubmit.textContent = "Add Product";
  btnCancel.style.display = "none";
}

// Handle Delete Request
async function handleDelete(id) {
  const product = allProducts.find(p => p._id === id);
  if (!product) return;
  
  if (!confirm(`Are you sure you want to delete "${product.productName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/delete/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Failed to delete product");
    }

    showToast("Product deleted successfully!");
    // Animate row removal
    const row = document.getElementById(`row-${id}`);
    if (row) {
      row.style.opacity = '0';
      row.style.transform = 'scale(0.9)';
      setTimeout(() => fetchProducts(), 300);
    } else {
      await fetchProducts();
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showToast("Error deleting product", "error");
  }
}

// Handle search filter
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter(p => 
    p.productName.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query) ||
    p.supplier.toLowerCase().includes(query)
  );

  renderProducts(filtered);
}

// Toast notification helper
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const icon = type === "success" ? "✅" : "❌";
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Remove toast after 3.5s
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s reverse cubic-bezier(0.4, 0, 0.2, 1) forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Simple HTML escaping helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Expose functions globally for onclick handlers
window.prepareEdit = prepareEdit;
window.handleDelete = handleDelete;
