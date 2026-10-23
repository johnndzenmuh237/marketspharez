/* Admin review UI for withdrawals / KYC / upgrades (talks to the server API). */
(function (w) {
  const M = w.Marketsphare, mi = (n) => `<i class=mi-${n}></i>`;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  function det(r) {
    const d = r.data;
    if (r.type === "withdrawal") return `<div><b>$${Number(d.amount).toFixed(2)}</b> — ${d.method === "bank" ? "International Bank" : "Crypto"}</div>` + (d.method === "bank"
      ? `<div class="ms-muted">Bank: ${esc(d.bankName)} · Holder: ${esc(d.accountName)}<br>Account/IBAN: ${esc(d.accountNumber)} · SWIFT: ${esc(d.swift)} · ${esc(d.country)}</div>`
      : `<div class="ms-muted">${esc(d.coin)}<br>Wallet: ${esc(d.wallet)}</div>`);
    if (r.type === "upgrade") return `<div>Upgrade <b>${esc(d.from || "Free")}</b> → <b>${esc(d.plan)}</b></div>`;
    return `<div>${esc(d.fullName)} · ${esc(d.docType)}</div><div>` + ["selfie", "idFront", "idBack"].map((k) => d[k] ? `<img src="${d[k]}" data-zoom="1" title="${k}" style="height:90px;border-radius:8px;margin:6px 6px 0 0;border:1px solid var(--border-color);cursor:zoom-in">` : "").join("") + "</div>";
  }
  w.AdminRequests = { mount(el, types, title) {
    let tab = "pending", all = [], typing = false;
    function draw() {
      const list = all.filter((r) => (tab === "pending" ? r.status === "pending" : r.status !== "pending")), pc = all.filter((r) => r.status === "pending").length;
      el.innerHTML = `<div class="panel"><div class="panel-header"><h3>${title}</h3><div class="ms-tabs" style="margin:0"><button data-t="pending" class="${tab === "pending" ? "on" : ""}">Pending (${pc})</button><button data-t="done" class="${tab === "done" ? "on" : ""}">History</button></div></div>`
        + (list.length ? list.map((r) => `<div class="ms-card" style="margin:10px 0"><div class="ms-row"><b>${mi(r.type === "kyc" ? "shield" : r.type === "upgrade" ? "up" : "bank")} ${r.type.toUpperCase()} — ${esc(r.userName)}</b><span class="pill ${r.status === "pending" ? "pill-warning" : r.status === "approved" ? "pill-success" : "pill-danger"}">${r.status}</span></div>
          <div class="ms-muted">${r.id} · ${new Date(r.ts).toLocaleString()}</div>${det(r)}
          ${r.status === "pending" ? `<div class="ms-row"><input id="m-${r.id}" placeholder="Message to user (required to reject)" style="flex:1;min-width:200px;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-surface);color:var(--text-primary)"><button class="ms-b ok" data-go="approved" data-id="${r.id}">${mi("ok")}Approve</button><button class="ms-b bad" data-go="rejected" data-id="${r.id}">${mi("x")}Reject</button></div>` : `<div class="ms-muted">Message sent: ${esc(r.adminMessage || "—")}</div>`}</div>`).join("")
          : `<div class="ms-muted" style="padding:18px;text-align:center">Nothing here yet.</div>`) + "</div>";
    }
    async function load() { if (typing) return; try { all = await M.adminList(types); draw(); } catch (e) { el.innerHTML = '<div class="panel ms-muted">Could not load requests: ' + esc(e.message) + "</div>"; } }
    el.addEventListener("input", () => (typing = true));
    el.onclick = async (e) => {
      const t = e.target.closest("[data-t]"); if (t) { tab = t.dataset.t; typing = false; draw(); return; }
      const z = e.target.closest("[data-zoom]"); if (z) { const o = document.createElement("div"); o.className = "ms-ov on"; o.innerHTML = `<img src="${z.src}" style="max-width:92vw;max-height:90vh;border-radius:10px">`; o.onclick = () => o.remove(); document.body.appendChild(o); return; }
      const g = e.target.closest("[data-go]"); if (!g) return;
      const msg = (document.getElementById("m-" + g.dataset.id).value || "").trim();
      if (g.dataset.go === "rejected" && !msg) return alert("Please type a message explaining the rejection — the user will see it.");
      g.disabled = true;
      try { await M.adminReview(g.dataset.id, g.dataset.go, msg); typing = false; await load(); } catch (err) { alert(err.message); g.disabled = false; }
    };
    M.authReady.then(() => { load(); setInterval(load, 15000); });
  } };
})(window);
