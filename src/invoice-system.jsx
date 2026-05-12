import { useState, useEffect, useRef } from "react";

// ── Inject Google Fonts ──────────────────────────────────────────────────────
if (!document.getElementById("inv-gf")) {
  const l = document.createElement("link");
  l.id = "inv-gf"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

// ── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = {
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  USD: { symbol: "$", name: "US Dollar" },
  GBP: { symbol: "£", name: "British Pound" },
  EUR: { symbol: "€", name: "Euro" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { symbol: "R", name: "South African Rand" },
};

const STATUS = {
  draft:  { label: "Draft",  bg: "#EEF2FF", color: "#4338CA" },
  unpaid: { label: "Unpaid", bg: "#FEF3C7", color: "#92400E" },
  paid:   { label: "Paid",   bg: "#D1FAE5", color: "#065F46" },
};

const DEF_SETTINGS = {
  companyName: "", companyEmail: "", companyPhone: "", companyAddress: "",
  bankAccountName: "", bankAccountNumber: "", bankName: "",
  defaultCurrency: "NGN", defaultTaxRate: "7.5",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function fmtMoney(amount, currency = "NGN") {
  const sym = CURRENCIES[currency]?.symbol ?? "";
  return sym + (+(amount || 0)).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcTotals(inv) {
  const subtotal = (inv.items || []).reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0
  );
  const taxAmt = subtotal * ((parseFloat(inv.taxRate) || 0) / 100);
  return { subtotal, taxAmt, total: subtotal + taxAmt };
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

// ── Global CSS ───────────────────────────────────────────────────────────────
const G = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'DM Sans', -apple-system, sans-serif; background: #EFECE5; color: #0D1B2A; }
  input, select, textarea { font-family: inherit; font-size: 14px; color: #0D1B2A;
    border: 1.5px solid #D9D4CB; border-radius: 9px; padding: 9px 13px;
    background: #FAFAF8; outline: none; transition: border-color .15s, box-shadow .15s; width: 100%; }
  input:focus, select:focus, textarea:focus { border-color: #C9841A; box-shadow: 0 0 0 3px rgba(201,132,26,.12); }
  button { cursor: pointer; border: none; outline: none; font-family: inherit; }
  textarea { resize: vertical; min-height: 80px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { background: white; }
    .print-area { box-shadow: none !important; border: none !important; }
  }
  .print-only { display: none; }
  .hover-row:hover { background: #F9F7F3 !important; }
`;

// ── Shared UI ────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const c = STATUS[status] || STATUS.draft;
  return <span style={{ padding: "3px 11px", borderRadius: 20, background: c.bg, color: c.color, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{c.label}</span>;
}

function Toast({ t }) {
  if (!t) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999, animation: "fadeUp .25s ease",
      background: t.type === "error" ? "#DC2626" : "#059669", color: "#fff",
      padding: "11px 22px", borderRadius: 12, fontSize: 14, fontWeight: 500,
      boxShadow: "0 4px 24px rgba(0,0,0,.18)",
    }}>{t.msg}</div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", style: s = {}, disabled }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", transition: "opacity .15s, transform .1s", opacity: disabled ? .5 : 1 };
  const sizes = { sm: { padding: "6px 14px", fontSize: 13 }, md: { padding: "9px 20px", fontSize: 14 }, lg: { padding: "12px 28px", fontSize: 15 } };
  const variants = {
    primary: { background: "#C9841A", color: "#fff" },
    secondary: { background: "#fff", color: "#0D1B2A", border: "1.5px solid #D9D4CB" },
    ghost: { background: "transparent", color: "#6B7280" },
    danger: { background: "#FEE2E2", color: "#B91C1C" },
    navy: { background: "#0D1B2A", color: "#fff" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...s }}>{children}</button>;
}

function Section({ title, children, action }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
      {title && (
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #F3F0EA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1B2A" }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function FormRow({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 20 }}>{sub}</div>
      {action}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, maxWidth = 520 }) {
  useEffect(() => {
    const fn = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(13,27,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FAFAF8", borderRadius: 18, width: "100%", maxWidth, maxHeight: "92vh", overflowY: "auto", padding: 28, animation: "fadeUp .2s ease" }}>
        {children}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ settings, clients, invoices, onNewInvoice, onViewInvoice }) {
  const paid = invoices.filter(i => i.status === "paid");
  const unpaid = invoices.filter(i => i.status === "unpaid");
  const draft = invoices.filter(i => i.status === "draft");
  const revenue = paid.reduce((s, i) => s + calcTotals(i).total, 0);
  const pending = unpaid.reduce((s, i) => s + calcTotals(i).total, 0);
  const cur = settings.defaultCurrency || "NGN";
  const recent = [...invoices].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);

  const stats = [
    { label: "Total Revenue", val: fmtMoney(revenue, cur), sub: `${paid.length} paid invoice${paid.length !== 1 ? "s" : ""}`, accent: "#059669", icon: "💰" },
    { label: "Outstanding", val: fmtMoney(pending, cur), sub: `${unpaid.length} awaiting payment`, accent: "#D97706", icon: "⏳" },
    { label: "Total Invoices", val: invoices.length, sub: `${draft.length} draft${draft.length !== 1 ? "s" : ""}`, accent: "#3B82F6", icon: "📄" },
    { label: "Clients", val: clients.length, sub: "registered clients", accent: "#7C3AED", icon: "👥" },
  ];

  return (
    <div style={{ animation: "slideIn .2s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#0D1B2A", marginBottom: 4 }}>
          {settings.companyName ? `Welcome back${settings.companyName ? ", " + settings.companyName : ""}` : "Dashboard"}
        </h1>
        <p style={{ fontSize: 14, color: "#9CA3AF" }}>Here's what's happening with your business today.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", borderTop: `4px solid ${c.accent}`, transition: "transform .15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px" }}>{c.label}</span>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#0D1B2A", marginBottom: 4 }}>{c.val}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <Section title="Recent Invoices" action={<Btn onClick={onNewInvoice} size="sm">+ New Invoice</Btn>}>
        {recent.length === 0 ? (
          <EmptyState icon="📋" title="No invoices yet" sub="Create your first invoice to get started" action={<Btn onClick={onNewInvoice}>Create Invoice</Btn>} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#F9F7F3" }}>
                  {["Invoice #", "Client", "Date", "Amount", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(inv => {
                  const cl = clients.find(c => c.id === inv.clientId);
                  const { total } = calcTotals(inv);
                  return (
                    <tr key={inv.id} className="hover-row" style={{ borderTop: "1px solid #F3F0EA", cursor: "pointer" }} onClick={() => onViewInvoice(inv)}>
                      <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: "#C9841A" }}>{inv.number}</td>
                      <td style={{ padding: "13px 16px", fontSize: 14, color: "#374151" }}>{cl?.name || <span style={{ color: "#9CA3AF" }}>No client</span>}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#6B7280" }}>{fmtDate(inv.date)}</td>
                      <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: "#0D1B2A" }}>{fmtMoney(total, inv.currency)}</td>
                      <td style={{ padding: "13px 16px" }}><Badge status={inv.status} /></td>
                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onViewInvoice(inv); }}>View →</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Invoice List ─────────────────────────────────────────────────────────────
function InvoiceList({ invoices, clients, onView, onDelete, onMarkPaid, onNew, onEdit }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = invoices
    .filter(i => filter === "all" || i.status === filter)
    .filter(i => {
      if (!search) return true;
      const cl = clients.find(c => c.id === i.clientId);
      return (
        (i.number || "").toLowerCase().includes(search.toLowerCase()) ||
        (cl?.name || "").toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div style={{ animation: "slideIn .2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#0D1B2A", marginBottom: 2 }}>Invoices</h1>
          <p style={{ fontSize: 14, color: "#9CA3AF" }}>{invoices.length} total invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <Btn onClick={onNew}>+ New Invoice</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input placeholder="Search by invoice # or client..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        </div>
        <div style={{ display: "flex", background: "#fff", borderRadius: 10, border: "1.5px solid #E5E0D8", overflow: "hidden" }}>
          {["all", "draft", "unpaid", "paid"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 600, background: filter === f ? "#C9841A" : "transparent",
              color: filter === f ? "#fff" : "#6B7280", transition: "all .15s", textTransform: "capitalize",
            }}>{f}</button>
          ))}
        </div>
      </div>

      <Section>
        {filtered.length === 0 ? (
          <EmptyState icon="🔍" title="No invoices found" sub={filter !== "all" ? `No ${filter} invoices` : "Try a different search"} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#F9F7F3" }}>
                  {["Invoice #", "Client", "Issue Date", "Due Date", "Amount", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const cl = clients.find(c => c.id === inv.clientId);
                  const { total } = calcTotals(inv);
                  return (
                    <tr key={inv.id} className="hover-row" style={{ borderTop: "1px solid #F3F0EA" }}>
                      <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: "#C9841A", cursor: "pointer" }} onClick={() => onView(inv)}>{inv.number}</td>
                      <td style={{ padding: "13px 16px", fontSize: 14, color: "#374151" }}>{cl?.name || <span style={{ color: "#9CA3AF" }}>—</span>}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>{fmtDate(inv.date)}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status === "unpaid" ? "#DC2626" : "#6B7280", whiteSpace: "nowrap" }}>{fmtDate(inv.dueDate)}</td>
                      <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: "#0D1B2A", whiteSpace: "nowrap" }}>{fmtMoney(total, inv.currency)}</td>
                      <td style={{ padding: "13px 16px" }}><Badge status={inv.status} /></td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn variant="secondary" size="sm" onClick={() => onView(inv)}>View</Btn>
                          {inv.status === "unpaid" && <Btn variant="primary" size="sm" onClick={() => onMarkPaid(inv.id)}>✓ Paid</Btn>}
                          <Btn variant="danger" size="sm" onClick={() => { if (window.confirm("Delete this invoice?")) onDelete(inv.id); }}>✕</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Create Invoice ───────────────────────────────────────────────────────────
function CreateInvoice({ form, setForm, clients, onSave, onCancel }) {
  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }
  function setItem(idx, key, val) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      return { ...f, items };
    });
  }
  function addItem() { setForm(f => ({ ...f, items: [...f.items, { id: genId(), description: "", qty: "1", price: "" }] })); }
  function removeItem(idx) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })); }

  const { subtotal, taxAmt, total } = calcTotals(form);
  const cur = form.currency || "NGN";

  return (
    <div style={{ animation: "slideIn .2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#0D1B2A", marginBottom: 2 }}>Create Invoice</h1>
          <p style={{ fontSize: 14, color: "#9CA3AF" }}>Invoice #{form.number}</p>
        </div>
        <Btn variant="secondary" onClick={onCancel}>✕ Cancel</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Invoice Details */}
        <Section title="Invoice Details">
          <div style={{ padding: "20px 24px" }}>
            <FormRow label="Invoice Number">
              <input value={form.number} onChange={e => setField("number", e.target.value)} />
            </FormRow>
            <FormRow label="Client">
              <select value={form.clientId} onChange={e => setField("clientId", e.target.value)}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormRow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormRow label="Issue Date">
                <input type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
              </FormRow>
              <FormRow label="Due Date">
                <input type="date" value={form.dueDate} onChange={e => setField("dueDate", e.target.value)} />
              </FormRow>
            </div>
          </div>
        </Section>

        {/* Payment Details */}
        <Section title="Payment Details">
          <div style={{ padding: "20px 24px" }}>
            <FormRow label="Currency">
              <select value={form.currency} onChange={e => setField("currency", e.target.value)}>
                {Object.entries(CURRENCIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.symbol} — {v.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Tax Rate (%)" hint="Applied to subtotal">
              <input type="number" min="0" max="100" step="0.5" value={form.taxRate} onChange={e => setField("taxRate", e.target.value)} />
            </FormRow>
            <FormRow label="Notes / Terms">
              <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} placeholder="Payment terms, notes..." style={{ minHeight: 64 }} />
            </FormRow>
          </div>
        </Section>
      </div>

      {/* Line Items */}
      <Section title="Line Items">
        <div style={{ padding: "0 24px 24px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", marginTop: 16 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #F3F0EA" }}>
                  <th style={{ padding: "8px 8px 12px 0", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", width: "50%" }}>Description</th>
                  <th style={{ padding: "8px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", width: "12%" }}>Qty</th>
                  <th style={{ padding: "8px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", width: "20%" }}>Unit Price</th>
                  <th style={{ padding: "8px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", width: "15%" }}>Total</th>
                  <th style={{ width: "3%" }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #F3F0EA" }}>
                    <td style={{ padding: "10px 8px 10px 0" }}>
                      <input value={item.description} onChange={e => setItem(idx, "description", e.target.value)} placeholder="Item description..." />
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <input type="number" min="0" step="1" value={item.qty} onChange={e => setItem(idx, "qty", e.target.value)} style={{ textAlign: "right" }} />
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <input type="number" min="0" step="0.01" value={item.price} onChange={e => setItem(idx, "price", e.target.value)} placeholder="0.00" style={{ textAlign: "right" }} />
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, fontSize: 14, color: "#0D1B2A", whiteSpace: "nowrap" }}>
                      {fmtMoney((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), cur)}
                    </td>
                    <td style={{ padding: "10px 0 10px 8px" }}>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)} style={{ background: "#FEE2E2", color: "#B91C1C", border: "none", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addItem} style={{ marginTop: 12, background: "transparent", border: "1.5px dashed #D9D4CB", borderRadius: 9, padding: "8px 16px", fontSize: 13, color: "#6B7280", cursor: "pointer", fontWeight: 500, transition: "all .15s" }}>
            + Add Line Item
          </button>

          {/* Totals */}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 260 }}>
              {[
                { label: "Subtotal", val: fmtMoney(subtotal, cur), muted: true },
                { label: `Tax (${form.taxRate || 0}%)`, val: fmtMoney(taxAmt, cur), muted: true },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: "#6B7280" }}>
                  <span>{r.label}</span><span>{r.val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #E5E0D8", marginTop: 6, fontSize: 18, fontWeight: 700, color: "#0D1B2A" }}>
                <span>Total</span><span style={{ color: "#C9841A" }}>{fmtMoney(total, cur)}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn variant="secondary" onClick={() => onSave(form, "draft")}>Save as Draft</Btn>
        <Btn variant="navy" onClick={() => onSave(form, "unpaid")}>Issue Invoice →</Btn>
      </div>
    </div>
  );
}

// ── View Invoice ─────────────────────────────────────────────────────────────
function ViewInvoice({ invoice, clients, settings, onClose, onMarkPaid, onDelete }) {
  const cl = clients.find(c => c.id === invoice.clientId);
  const { subtotal, taxAmt, total } = calcTotals(invoice);

  return (
    <div style={{ animation: "slideIn .2s ease" }}>
      {/* Toolbar */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#0D1B2A", marginBottom: 2 }}>Invoice {invoice.number}</h1>
          <p style={{ fontSize: 14, color: "#9CA3AF" }}>Issued {fmtDate(invoice.date)}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="secondary" onClick={onClose}>← Back</Btn>
          {invoice.status === "unpaid" && <Btn variant="primary" onClick={() => onMarkPaid(invoice.id)}>✓ Mark as Paid</Btn>}
          <Btn variant="navy" onClick={() => window.print()}>🖨 Print</Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm("Delete this invoice?")) { onDelete(invoice.id); onClose(); } }}>Delete</Btn>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="print-area" style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 24px rgba(0,0,0,.06)" }}>
        {/* Header Band */}
        <div style={{ background: "#0D1B2A", padding: "36px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#C9841A", marginBottom: 8 }}>
              {settings.companyName || "Your Company"}
            </div>
            <div style={{ fontSize: 13, color: "#8A9BAB", lineHeight: 1.8 }}>
              {settings.companyAddress && <div>{settings.companyAddress}</div>}
              {settings.companyEmail && <div>{settings.companyEmail}</div>}
              {settings.companyPhone && <div>{settings.companyPhone}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#8A9BAB", marginBottom: 4 }}>INVOICE</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{invoice.number}</div>
            <Badge status={invoice.status} />
          </div>
        </div>

        {/* Meta strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", background: "#F7F5F0", borderBottom: "1px solid #E8E5DF" }}>
          {[
            { label: "Issue Date", val: fmtDate(invoice.date) },
            { label: "Due Date", val: fmtDate(invoice.dueDate) },
            { label: "Currency", val: `${invoice.currency} (${CURRENCIES[invoice.currency]?.symbol})` },
          ].map(m => (
            <div key={m.label} style={{ padding: "14px 20px", borderRight: "1px solid #E8E5DF" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1B2A" }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Bill to */}
        <div style={{ padding: "28px 40px", borderBottom: "1px solid #F0EDE6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Bill To</div>
          {cl ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0D1B2A", marginBottom: 4 }}>{cl.name}</div>
              <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.8 }}>
                {cl.email && <div>{cl.email}</div>}
                {cl.phone && <div>{cl.phone}</div>}
                {cl.address && <div>{cl.address}</div>}
              </div>
            </div>
          ) : (
            <div style={{ color: "#9CA3AF", fontSize: 14 }}>No client assigned</div>
          )}
        </div>

        {/* Line Items */}
        <div style={{ padding: "0 40px" }}>
          <table style={{ width: "100%", margin: "24px 0" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E5DF" }}>
                {[["Description", "50%"], ["Qty", "10%"], ["Unit Price", "20%"], ["Total", "20%"]].map(([h, w]) => (
                  <th key={h} style={{ padding: "10px 8px", textAlign: h === "Description" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", width: w }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: "1px solid #F3F0EA" }}>
                  <td style={{ padding: "14px 8px", fontSize: 14, color: "#374151" }}>{item.description || <em style={{ color: "#9CA3AF" }}>No description</em>}</td>
                  <td style={{ padding: "14px 8px", fontSize: 14, color: "#374151", textAlign: "right" }}>{item.qty}</td>
                  <td style={{ padding: "14px 8px", fontSize: 14, color: "#374151", textAlign: "right" }}>{fmtMoney(item.price, invoice.currency)}</td>
                  <td style={{ padding: "14px 8px", fontSize: 14, fontWeight: 600, color: "#0D1B2A", textAlign: "right" }}>
                    {fmtMoney((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
            <div style={{ minWidth: 280 }}>
              {[
                { label: "Subtotal", val: fmtMoney(subtotal, invoice.currency) },
                { label: `Tax (${invoice.taxRate || 0}%)`, val: fmtMoney(taxAmt, invoice.currency) },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 14, color: "#6B7280", borderBottom: "1px solid #F0EDE6" }}>
                  <span>{r.label}</span><span>{r.val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", marginTop: 4, fontSize: 20, fontWeight: 700, color: "#0D1B2A" }}>
                <span>Total Due</span>
                <span style={{ color: "#C9841A", fontSize: 22 }}>{fmtMoney(total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ borderTop: "1px solid #F0EDE6", padding: "20px 0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Notes & Terms</div>
              <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Bank Details Footer */}
        {(settings.bankAccountName || settings.bankAccountNumber || settings.bankName) && (
          <div style={{ background: "#F7F5F0", borderTop: "1px solid #E8E5DF", padding: "24px 40px", marginTop: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Payment Details</div>
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {[
                { label: "Account Name", val: settings.bankAccountName },
                { label: "Account Number", val: settings.bankAccountNumber },
                { label: "Bank Name", val: settings.bankName },
              ].filter(f => f.val).map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0D1B2A" }}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer line */}
        <div style={{ background: "#C9841A", height: 5 }} />
      </div>
    </div>
  );
}

// ── Clients Page ─────────────────────────────────────────────────────────────
function ClientsPage({ clients, invoices, onAdd, onEdit, onDelete }) {
  return (
    <div style={{ animation: "slideIn .2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#0D1B2A", marginBottom: 2 }}>Clients</h1>
          <p style={{ fontSize: 14, color: "#9CA3AF" }}>{clients.length} client{clients.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Btn onClick={onAdd}>+ Add Client</Btn>
      </div>

      {clients.length === 0 ? (
        <Section><EmptyState icon="👥" title="No clients yet" sub="Add your first client to get started" action={<Btn onClick={onAdd}>Add Client</Btn>} /></Section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {clients.map(c => {
            const clientInvs = invoices.filter(i => i.clientId === c.id);
            const revenue = clientInvs.filter(i => i.status === "paid").reduce((s, i) => s + calcTotals(i).total, 0);
            const initials = c.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: "20px", transition: "transform .15s" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#F5E6CC", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0D1B2A", marginBottom: 2 }}>{c.name}</div>
                    {c.email && <div style={{ fontSize: 12, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>}
                    {c.phone && <div style={{ fontSize: 12, color: "#9CA3AF" }}>{c.phone}</div>}
                  </div>
                </div>
                {c.address && <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.5 }}>{c.address}</div>}
                <div style={{ borderTop: "1px solid #F3F0EA", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>{clientInvs.length} invoices · Revenue</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#C9841A" }}>{fmtMoney(revenue, "NGN")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="secondary" size="sm" onClick={() => onEdit(c)}>Edit</Btn>
                    <Btn variant="danger" size="sm" onClick={() => { if (window.confirm(`Delete ${c.name}?`)) onDelete(c.id); }}>✕</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Client Form ──────────────────────────────────────────────────────────────
function ClientForm({ data, mode, onSave, onClose }) {
  const [form, setForm] = useState(data);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#0D1B2A" }}>{mode === "add" ? "Add Client" : "Edit Client"}</h2>
        <button onClick={onClose} style={{ background: "none", color: "#9CA3AF", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>
      <FormRow label="Full Name / Company *">
        <input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Acme Corp" />
      </FormRow>
      <FormRow label="Email Address">
        <input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="contact@acme.com" />
      </FormRow>
      <FormRow label="Phone Number">
        <input type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+234 800 000 0000" />
      </FormRow>
      <FormRow label="Address">
        <textarea value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="123 Business Street, Lagos" style={{ minHeight: 72 }} />
      </FormRow>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if (!form.name?.trim()) return alert("Name is required"); onSave(form); }}>Save Client</Btn>
      </div>
    </div>
  );
}

// ── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ settings, setSettings, onSave }) {
  const [local, setLocal] = useState(settings);
  const set = (k, v) => setLocal(f => ({ ...f, [k]: v }));

  function save() {
    setSettings(local);
    onSave();
  }

  return (
    <div style={{ animation: "slideIn .2s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#0D1B2A", marginBottom: 2 }}>Settings</h1>
        <p style={{ fontSize: 14, color: "#9CA3AF" }}>Configure your business profile and invoice defaults</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Company Info */}
        <Section title="Company Information">
          <div style={{ padding: "20px 24px" }}>
            <FormRow label="Company Name">
              <input value={local.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Your Company Name" />
            </FormRow>
            <FormRow label="Email Address">
              <input type="email" value={local.companyEmail} onChange={e => set("companyEmail", e.target.value)} placeholder="hello@yourcompany.com" />
            </FormRow>
            <FormRow label="Phone Number">
              <input value={local.companyPhone} onChange={e => set("companyPhone", e.target.value)} placeholder="+234 800 000 0000" />
            </FormRow>
            <FormRow label="Business Address">
              <textarea value={local.companyAddress} onChange={e => set("companyAddress", e.target.value)} placeholder="123 Business Ave, Lagos, Nigeria" />
            </FormRow>
          </div>
        </Section>

        {/* Invoice Defaults */}
        <Section title="Invoice Defaults">
          <div style={{ padding: "20px 24px" }}>
            <FormRow label="Default Currency">
              <select value={local.defaultCurrency} onChange={e => set("defaultCurrency", e.target.value)}>
                {Object.entries(CURRENCIES).map(([k, v]) => (
                  <option key={k} value={k}>{k} — {v.name} ({v.symbol})</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Default Tax Rate (%)" hint="This will pre-fill on new invoices">
              <input type="number" min="0" max="100" step="0.5" value={local.defaultTaxRate} onChange={e => set("defaultTaxRate", e.target.value)} />
            </FormRow>
          </div>
        </Section>
      </div>

      {/* Bank Details */}
      <Section title="Bank Details">
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>These details will appear at the bottom of every issued invoice for payment reference.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <FormRow label="Account Name">
              <input value={local.bankAccountName} onChange={e => set("bankAccountName", e.target.value)} placeholder="John Doe / Acme Corp" />
            </FormRow>
            <FormRow label="Account Number">
              <input value={local.bankAccountNumber} onChange={e => set("bankAccountNumber", e.target.value)} placeholder="0123456789" />
            </FormRow>
            <FormRow label="Bank Name">
              <input value={local.bankName} onChange={e => set("bankName", e.target.value)} placeholder="First Bank Nigeria" />
            </FormRow>
          </div>

          {/* Preview */}
          {(local.bankAccountName || local.bankAccountNumber || local.bankName) && (
            <div style={{ marginTop: 20, background: "#F7F5F0", borderRadius: 12, padding: "18px 20px", border: "1px solid #E8E5DF" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Preview — Invoice Footer</div>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                {[
                  { label: "Account Name", val: local.bankAccountName },
                  { label: "Account Number", val: local.bankAccountNumber },
                  { label: "Bank Name", val: local.bankName },
                ].filter(f => f.val).map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0D1B2A" }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={save} size="lg">Save Settings ✓</Btn>
      </div>
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [settings, setSettings] = useState(DEF_SETTINGS);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(null);
  const [viewInv, setViewInv] = useState(null);
  const [clientModal, setClientModal] = useState(null);

  // ── Load ──
  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          window.storage.get("inv2_settings"),
          window.storage.get("inv2_clients"),
          window.storage.get("inv2_invoices"),
        ]);
        if (results[0].status === "fulfilled" && results[0].value) setSettings(JSON.parse(results[0].value.value));
        if (results[1].status === "fulfilled" && results[1].value) setClients(JSON.parse(results[1].value.value));
        if (results[2].status === "fulfilled" && results[2].value) setInvoices(JSON.parse(results[2].value.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // ── Auto-save ──
  useEffect(() => { if (loaded) window.storage.set("inv2_settings", JSON.stringify(settings)).catch(() => {}); }, [settings, loaded]);
  useEffect(() => { if (loaded) window.storage.set("inv2_clients", JSON.stringify(clients)).catch(() => {}); }, [clients, loaded]);
  useEffect(() => { if (loaded) window.storage.set("inv2_invoices", JSON.stringify(invoices)).catch(() => {}); }, [invoices, loaded]);

  function notify(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function nav(t) { setTab(t); setInvoiceForm(null); setViewInv(null); }

  // ── Invoice ops ──
  function startNew() {
    setInvoiceForm({
      id: genId(),
      number: `INV-${String(invoices.length + 1).padStart(4, "0")}`,
      clientId: "", date: todayStr(), dueDate: "",
      currency: settings.defaultCurrency || "NGN",
      taxRate: settings.defaultTaxRate || "7.5",
      items: [{ id: genId(), description: "", qty: "1", price: "" }],
      notes: "", status: "draft",
    });
    setTab("create");
  }

  function saveInvoice(inv, status) {
    const data = { ...inv, status };
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === inv.id);
      if (idx >= 0) { const a = [...prev]; a[idx] = data; return a; }
      return [...prev, data];
    });
    notify(status === "unpaid" ? "Invoice issued successfully!" : "Saved as draft");
    setInvoiceForm(null);
    setTab("invoices");
  }

  function deleteInvoice(id) {
    setInvoices(prev => prev.filter(i => i.id !== id));
    notify("Invoice deleted");
    if (viewInv?.id === id) { setViewInv(null); setTab("invoices"); }
  }

  function markPaid(id) {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "paid" } : i));
    setViewInv(prev => prev?.id === id ? { ...prev, status: "paid" } : prev);
    notify("Invoice marked as paid ✓");
  }

  // ── Client ops ──
  function saveClient(data) {
    if (data.id) {
      setClients(prev => prev.map(c => c.id === data.id ? data : c));
      notify("Client updated");
    } else {
      setClients(prev => [...prev, { ...data, id: genId() }]);
      notify("Client added successfully");
    }
    setClientModal(null);
  }

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "invoices",  label: "Invoices",  icon: "📄" },
    { id: "clients",   label: "Clients",   icon: "👥" },
    { id: "settings",  label: "Settings",  icon: "⚙" },
  ];

  const activeTab = tab === "create" ? "invoices" : tab === "view" ? "invoices" : tab;

  if (!loaded) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EFECE5" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#C9841A", marginBottom: 8 }}>InvoiceOS</div>
          <div style={{ fontSize: 14, color: "#9CA3AF" }}>Loading your data...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{G}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── Sidebar ── */}
        <aside className="no-print" style={{ width: 230, background: "#0D1B2A", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Brand */}
          <div style={{ padding: "28px 22px 22px" }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#C9841A", marginBottom: 4 }}>InvoiceOS</div>
            {settings.companyName && (
              <div style={{ fontSize: 12, color: "#4A6582", lineHeight: 1.4 }}>{settings.companyName}</div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0" }}>
            {NAV_ITEMS.map(n => {
              const active = activeTab === n.id;
              return (
                <button key={n.id} onClick={() => nav(n.id)} style={{
                  display: "flex", alignItems: "center", gap: 11, width: "100%",
                  padding: "12px 22px", textAlign: "left", fontSize: 14,
                  background: active ? "rgba(201,132,26,.15)" : "transparent",
                  color: active ? "#C9841A" : "#6D8499",
                  fontWeight: active ? 600 : 400,
                  borderLeft: `3px solid ${active ? "#C9841A" : "transparent"}`,
                  transition: "all .15s",
                }}>
                  <span style={{ fontSize: 16 }}>{n.icon}</span>
                  {n.label}
                  {n.id === "invoices" && invoices.filter(i => i.status === "unpaid").length > 0 && (
                    <span style={{ marginLeft: "auto", background: "#C9841A", color: "#fff", borderRadius: 12, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                      {invoices.filter(i => i.status === "unpaid").length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* CTA */}
          <div style={{ padding: "16px 18px 28px" }}>
            <button onClick={startNew} style={{
              width: "100%", background: "#C9841A", color: "#fff",
              padding: "11px 0", borderRadius: 10, fontWeight: 700, fontSize: 14,
              transition: "opacity .15s",
            }}>
              + New Invoice
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto", background: "#EFECE5", minWidth: 0 }}>
          {tab === "dashboard" && (
            <Dashboard settings={settings} clients={clients} invoices={invoices}
              onNewInvoice={startNew}
              onViewInvoice={inv => { setViewInv(inv); setTab("view"); }} />
          )}
          {tab === "invoices" && (
            <InvoiceList invoices={invoices} clients={clients}
              onView={inv => { setViewInv(inv); setTab("view"); }}
              onDelete={deleteInvoice}
              onMarkPaid={markPaid}
              onNew={startNew} />
          )}
          {tab === "create" && invoiceForm && (
            <CreateInvoice form={invoiceForm} setForm={setInvoiceForm} clients={clients}
              onSave={saveInvoice}
              onCancel={() => { setInvoiceForm(null); setTab("invoices"); }} />
          )}
          {tab === "view" && viewInv && (
            <ViewInvoice invoice={viewInv} clients={clients} settings={settings}
              onClose={() => { setViewInv(null); setTab("invoices"); }}
              onMarkPaid={markPaid}
              onDelete={deleteInvoice} />
          )}
          {tab === "clients" && (
            <ClientsPage clients={clients} invoices={invoices}
              onAdd={() => setClientModal({ mode: "add", data: { name: "", email: "", phone: "", address: "" } })}
              onEdit={c => setClientModal({ mode: "edit", data: c })}
              onDelete={id => { setClients(prev => prev.filter(c => c.id !== id)); notify("Client removed"); }} />
          )}
          {tab === "settings" && (
            <SettingsPage settings={settings} setSettings={setSettings}
              onSave={() => notify("Settings saved successfully ✓")} />
          )}
        </main>
      </div>

      {/* Client Modal */}
      {clientModal && (
        <Modal onClose={() => setClientModal(null)}>
          <ClientForm data={clientModal.data} mode={clientModal.mode}
            onSave={saveClient} onClose={() => setClientModal(null)} />
        </Modal>
      )}

      <Toast t={toast} />
    </>
  );
}
