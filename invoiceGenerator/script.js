'use strict';

/* ── State ────────────────────────────────────────────────────── */
let items = [];
let nextId = 1;

function makeItem(desc, qty, price) {
  return { id: nextId++, desc: desc || '', qty: qty ?? 1, price: price ?? 0 };
}

/* ── Elements ─────────────────────────────────────────────────── */
const els = {
  fromInfo: document.getElementById('fromInfo'),
  toInfo: document.getElementById('toInfo'),
  invoiceNumber: document.getElementById('invoiceNumber'),
  invoiceDate: document.getElementById('invoiceDate'),
  dueDate: document.getElementById('dueDate'),
  lineItemsBody: document.getElementById('lineItemsBody'),
  addItemBtn: document.getElementById('addItemBtn'),
  taxRate: document.getElementById('taxRate'),
  discountValue: document.getElementById('discountValue'),
  discountType: document.getElementById('discountType'),
  notes: document.getElementById('notes'),
  resetBtn: document.getElementById('resetBtn'),
  copyTextBtn: document.getElementById('copyTextBtn'),
  printBtn: document.getElementById('printBtn'),

  previewFrom: document.getElementById('previewFrom'),
  previewTo: document.getElementById('previewTo'),
  previewNumber: document.getElementById('previewNumber'),
  previewDate: document.getElementById('previewDate'),
  previewDue: document.getElementById('previewDue'),
  previewItemsBody: document.getElementById('previewItemsBody'),
  previewSubtotal: document.getElementById('previewSubtotal'),
  previewDiscountRow: document.getElementById('previewDiscountRow'),
  previewDiscountLabel: document.getElementById('previewDiscountLabel'),
  previewDiscount: document.getElementById('previewDiscount'),
  previewTaxLabel: document.getElementById('previewTaxLabel'),
  previewTax: document.getElementById('previewTax'),
  previewTotal: document.getElementById('previewTotal'),
  previewNotes: document.getElementById('previewNotes'),
};

/* ── Helpers ──────────────────────────────────────────────────── */
function money(n) {
  const v = Number.isFinite(n) ? n : 0;
  return '$' + v.toFixed(2);
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // avoid UTC roll-back
  return d.toISOString().slice(0, 10);
}

function plusDaysISO(baseISO, days) {
  const d = new Date(baseISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function suggestedInvoiceNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `INV-${y}${m}${day}`;
}

function formatDateDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── THE single shared calculation function ──────────────────────
   Used by both the on-screen live preview and by print (which
   simply prints the same #invoicePreview DOM element that this
   function already rendered) — there is exactly one place where
   subtotal / discount / tax / total are computed. */
function calcInvoice(itemsList, taxRatePct, discountValue, discountType) {
  const lineTotals = itemsList.map(it => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    return { ...it, amount: qty * price };
  });

  const subtotal = lineTotals.reduce((sum, it) => sum + it.amount, 0);

  const rawDiscount = discountType === 'percent'
    ? subtotal * ((Number(discountValue) || 0) / 100)
    : (Number(discountValue) || 0);
  const discountAmount = Math.min(Math.max(rawDiscount, 0), subtotal > 0 ? subtotal : rawDiscount);

  const taxableAmount = subtotal - discountAmount;
  const taxRate = Number(taxRatePct) || 0;
  const taxAmount = taxableAmount * (taxRate / 100);

  const total = taxableAmount + taxAmount;

  return { items: lineTotals, subtotal, discountAmount, taxRate, taxAmount, total };
}

/* ── Line item rows (form) ────────────────────────────────────── */
function addItem(desc, qty, price) {
  items.push(makeItem(desc, qty, price));
  renderLineItemRows();
  render();
}

function removeItem(id) {
  items = items.filter(it => it.id !== id);
  renderLineItemRows();
  render();
}

function renderLineItemRows() {
  const body = els.lineItemsBody;
  body.innerHTML = '';

  if (!items.length) {
    const tr = document.createElement('tr');
    tr.className = 'line-items-empty';
    tr.innerHTML = `<td colspan="5">No line items yet — click "Add Item" below.</td>`;
    body.appendChild(tr);
    return;
  }

  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.dataset.id = it.id;
    tr.innerHTML = `
      <td class="col-desc"><input type="text" class="li-desc-input" placeholder="Service or product" value="${escapeAttr(it.desc)}" /></td>
      <td class="col-qty"><input type="number" class="li-qty-input" min="0" step="1" value="${it.qty}" /></td>
      <td class="col-price"><input type="number" class="li-price-input" min="0" step="0.01" value="${it.price}" /></td>
      <td class="col-amount"><span class="li-amount">${money((Number(it.qty) || 0) * (Number(it.price) || 0))}</span></td>
      <td class="col-remove"><button type="button" class="li-remove-btn" title="Remove item" aria-label="Remove item">✕</button></td>
    `;
    body.appendChild(tr);

    tr.querySelector('.li-desc-input').addEventListener('input', (e) => { it.desc = e.target.value; render(); });
    tr.querySelector('.li-qty-input').addEventListener('input', (e) => { it.qty = e.target.value; render(); });
    tr.querySelector('.li-price-input').addEventListener('input', (e) => { it.price = e.target.value; render(); });
    tr.querySelector('.li-remove-btn').addEventListener('click', () => removeItem(it.id));
  });
}

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Render preview + keep amount cells in the form in sync ─────── */
function render() {
  // Sync per-row amount display in the form table without a full re-render
  items.forEach(it => {
    const row = els.lineItemsBody.querySelector(`tr[data-id="${it.id}"]`);
    if (row) {
      const amt = row.querySelector('.li-amount');
      if (amt) amt.textContent = money((Number(it.qty) || 0) * (Number(it.price) || 0));
    }
  });

  const result = calcInvoice(
    items,
    els.taxRate.value,
    els.discountValue.value,
    els.discountType.value
  );

  els.previewFrom.textContent = els.fromInfo.value.trim();
  els.previewTo.textContent = els.toInfo.value.trim();
  els.previewNumber.textContent = els.invoiceNumber.value.trim() || '—';
  els.previewDate.textContent = formatDateDisplay(els.invoiceDate.value);
  els.previewDue.textContent = formatDateDisplay(els.dueDate.value);
  els.previewNotes.textContent = els.notes.value.trim();

  // Preview line items table
  els.previewItemsBody.innerHTML = '';
  if (!result.items.length) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="4">No line items added yet</td>`;
    els.previewItemsBody.appendChild(tr);
  } else {
    result.items.forEach(it => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-desc">${escapeHtml(it.desc) || '<em>Untitled item</em>'}</td>
        <td class="col-qty">${Number(it.qty) || 0}</td>
        <td class="col-price">${money(Number(it.price) || 0)}</td>
        <td class="col-amount">${money(it.amount)}</td>
      `;
      els.previewItemsBody.appendChild(tr);
    });
  }

  els.previewSubtotal.textContent = money(result.subtotal);

  const discountLabelText = els.discountType.value === 'percent'
    ? `Discount (${Number(els.discountValue.value) || 0}%)`
    : 'Discount';
  els.previewDiscountLabel.textContent = discountLabelText;
  els.previewDiscount.textContent = '−' + money(result.discountAmount);
  els.previewDiscountRow.style.display = result.discountAmount > 0 ? 'flex' : 'none';

  els.previewTaxLabel.textContent = `Tax (${result.taxRate || 0}%)`;
  els.previewTax.textContent = money(result.taxAmount);

  els.previewTotal.textContent = money(result.total);

  return result;
}

/* ── Validation ───────────────────────────────────────────────── */
function validateForAction() {
  const hasValidItem = items.some(it => (it.desc && it.desc.trim()) && ((Number(it.qty) || 0) * (Number(it.price) || 0) > 0));
  if (!items.length || !hasValidItem) {
    showToast('Add at least one line item with a description, quantity and price');
    return false;
  }
  if (!els.fromInfo.value.trim() || !els.toInfo.value.trim()) {
    showToast('Fill in both "From" and "To" details first');
    return false;
  }
  return true;
}

/* ── Actions ──────────────────────────────────────────────────── */
els.addItemBtn.addEventListener('click', () => addItem('', 1, 0));

els.resetBtn.addEventListener('click', () => {
  els.fromInfo.value = '';
  els.toInfo.value = '';
  els.invoiceNumber.value = suggestedInvoiceNumber();
  const today = todayISO();
  els.invoiceDate.value = today;
  els.dueDate.value = plusDaysISO(today, 14);
  els.taxRate.value = 0;
  els.discountValue.value = 0;
  els.discountType.value = 'flat';
  els.notes.value = '';
  items = [];
  addItem('', 1, 0);
  render();
  showToast('Invoice cleared');
});

els.printBtn.addEventListener('click', () => {
  if (!validateForAction()) return;
  window.print();
});

els.copyTextBtn.addEventListener('click', () => {
  if (!validateForAction()) return;
  const result = render();
  const lines = [];
  lines.push('INVOICE');
  lines.push('');
  lines.push('From:');
  lines.push(els.fromInfo.value.trim());
  lines.push('');
  lines.push('Bill to:');
  lines.push(els.toInfo.value.trim());
  lines.push('');
  lines.push(`Invoice #: ${els.invoiceNumber.value.trim() || '—'}`);
  lines.push(`Invoice date: ${formatDateDisplay(els.invoiceDate.value)}`);
  lines.push(`Due date: ${formatDateDisplay(els.dueDate.value)}`);
  lines.push('');
  lines.push('Line items:');
  result.items.forEach(it => {
    lines.push(`  - ${it.desc || 'Untitled item'} — ${Number(it.qty) || 0} x ${money(Number(it.price) || 0)} = ${money(it.amount)}`);
  });
  lines.push('');
  lines.push(`Subtotal: ${money(result.subtotal)}`);
  if (result.discountAmount > 0) lines.push(`Discount: -${money(result.discountAmount)}`);
  lines.push(`Tax (${result.taxRate || 0}%): ${money(result.taxAmount)}`);
  lines.push(`Total: ${money(result.total)}`);
  if (els.notes.value.trim()) {
    lines.push('');
    lines.push('Notes:');
    lines.push(els.notes.value.trim());
  }
  copyToClipboard(lines.join('\n'), 'Invoice copied as plain text');
});

/* ── Wire up live updates ─────────────────────────────────────── */
[els.fromInfo, els.toInfo, els.invoiceNumber, els.invoiceDate, els.dueDate,
  els.taxRate, els.discountValue, els.notes].forEach(el => {
  el.addEventListener('input', render);
});
els.discountType.addEventListener('change', render);

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');

  els.invoiceNumber.value = suggestedInvoiceNumber();
  const today = todayISO();
  els.invoiceDate.value = today;
  els.dueDate.value = plusDaysISO(today, 14);

  items = [
    makeItem('Website design', 3, 50),
    makeItem('Hosting setup', 1, 200),
  ];
  renderLineItemRows();
  render();
});
