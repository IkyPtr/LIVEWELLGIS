let features = [];
let filteredData = [];

let currentPage = 1;
const rowsPerPage = 10;

function renderTablePage() {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    const pageData = filteredData.slice(start, end);

    pageData.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${item.properties.Kecamatan}</td>
            <td>${item.properties.Longtitude}</td>
            <td>${item.properties.Langitude}</td>
            <td>${item.properties.Bau}</td>
            <td>${item.properties.PH}</td>
            <td>${item.properties.Rasa}</td>
            <td>${item.properties.Warna}</td>
        `;

        tbody.appendChild(tr);
    });

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    document.getElementById("pageInfo").innerText =
        `Page ${currentPage} of ${totalPages}`;
}

// Pagination buttons
function setupPaginationButtons() {
    document.getElementById("prevBtn").onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTablePage();
        }
    };

    document.getElementById("nextBtn").onclick = () => {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTablePage();
        }
    };
}

// SEARCH FILTER
function setupSearchFilter() {
    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.toLowerCase();

        filteredData = features.filter(f => {
            const p = f.properties;

            return (
                (p.Kecamatan || "").toLowerCase().includes(keyword) ||
                (p.Bau || "").toLowerCase().includes(keyword) ||
                (p.Warna || "").toLowerCase().includes(keyword) ||
                (p.Rasa || "").toLowerCase().includes(keyword) ||
                String(p.PH || "").includes(keyword)
            );
        });

        currentPage = 1;
        renderTablePage();
    });
}

// Load JSON
fetch("./data/waterData.json")
    .then(res => res.json())
    .then(data => {
        features = data.features;
        filteredData = [...features]; // awalnya sama
        setupPaginationButtons();
        setupSearchFilter();
        renderTablePage();
    })
    .catch(err => console.error("Error loading data:", err));
