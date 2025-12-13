let features = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 5;

function renderTablePage() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  filteredData.slice(start, end).forEach(item => {
    const p = item.properties;
    const tr = document.createElement("tr");
    tr.dataset.risk = p.risk_cemar;

    tr.innerHTML = `
      <td>${p.Langitude}</td>
      <td>${p.longitude}</td>
      <td>${p.keterangan}</td>
      <td>${p.risk_cemar}</td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("pageInfo").innerText =
    `Page ${currentPage} of ${Math.ceil(filteredData.length / rowsPerPage)}`;
}

// SEARCH
document.getElementById("searchInput").addEventListener("input", e => {
  const keyword = e.target.value.toLowerCase();
  filteredData = features.filter(f =>
    f.properties.keterangan.toLowerCase().includes(keyword) ||
    f.properties.risk_cemar.toLowerCase().includes(keyword)
  );
  currentPage = 1;
  renderTablePage();
});

// PAGINATION
document.getElementById("prevBtn").onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderTablePage();
  }
};

document.getElementById("nextBtn").onclick = () => {
  if (currentPage < Math.ceil(filteredData.length / rowsPerPage)) {
    currentPage++;
    renderTablePage();
  }
};

// LOAD DATA (INI KUNCI PERBAIKANNYA)
Promise.all([
  fetch("../data/highToxic.json"),
  fetch("../data/midToxic.json"),
  fetch("../data/lowToxic.json")
])
.then(responses => Promise.all(responses.map(r => r.json())))
.then(([high, mid, low]) => {
  features = [
    ...high.features,
    ...mid.features,
    ...low.features
  ];
  filteredData = [...features];
  renderTablePage();
})
.catch(err => console.error("ERROR LOAD JSON:", err));
