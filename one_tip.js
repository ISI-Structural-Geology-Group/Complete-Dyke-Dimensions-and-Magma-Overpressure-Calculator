let csvData = [];

document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result.trim(); // Remove trailing newlines
        parseCSV(text);
    };
    reader.readAsText(file);
});

function parseCSV(csvText) {
    const rows = csvText.split("\n").map(row => row.split(",").map(cell => cell.trim()));
    csvData = rows.slice(1).filter(row => row.length > 1); // Store data excluding headers

    populateDropdowns(rows[0]);
}

function populateDropdowns(headers) {
    const xDropdown = document.getElementById("xColumn");
    const yDropdown = document.getElementById("yColumn");

    xDropdown.innerHTML = "";
    yDropdown.innerHTML = "";

    headers.forEach((header, index) => {
        let optionX = new Option(header, index);
        let optionY = new Option(header, index);
        xDropdown.add(optionX);
        yDropdown.add(optionY);
    });
}

document.getElementById("processButton").addEventListener("click", function () {
    if (!csvData.length) {
        alert("No CSV file loaded!");
        return;
    }

    const xIndex = parseInt(document.getElementById("xColumn").value);
    const yIndex = parseInt(document.getElementById("yColumn").value);

    if (isNaN(xIndex) || isNaN(yIndex)) {
        alert("Select valid columns for X and Y.");
        return;
    }

    const xValues = csvData.map(row => parseFloat(row[xIndex])).filter(v => !isNaN(v));
    const yValues = csvData.map(row => parseFloat(row[yIndex])).filter(v => !isNaN(v));

    if (xValues.length < 2 || yValues.length < 2) {
        alert("Not enough numeric data for combinations.");
        return;
    }

    const combinations = (arr) => arr.flatMap((v, i) => arr.slice(i + 1).map(w => [v, w]));

    const comb1 = combinations(xValues);
    const comb2 = combinations(yValues);

    const results = comb1.map((pair, i) => ({
        x1: pair[0], x2: pair[1],
        y1: comb2[i][0], y2: comb2[i][1],
        x1_squared: pair[0] ** 2, x2_squared: pair[1] ** 2,
        y1_squared: comb2[i][0] ** 2, y2_squared: comb2[i][1] ** 2,
        A: (((comb2[i][1] ** 2) * (pair[0] ** 2) - (comb2[i][0] ** 2) * (pair[1] ** 2)) / ((comb2[i][1] ** 2) * (pair[0]) - (comb2[i][0] ** 2) * (pair[1]))),
        B2: (((((comb2[i][1] ** 2) * (pair[0] ** 2) - (comb2[i][0] ** 2) * (pair[1] ** 2)) / ((comb2[i][1] ** 2) * (pair[0]) - (comb2[i][0] ** 2) * (pair[1])))) * (comb2[i][0])) ** 2 / (((((comb2[i][1] ** 2) * (pair[0] ** 2) - (comb2[i][0] ** 2) * (pair[1] ** 2)) / ((comb2[i][1] ** 2) * (pair[0]) - (comb2[i][0] ** 2) * (pair[1])))) * (pair[0]) - pair[0] ** 2),
        // B: Math.sqrt((((((comb2[i][1] ** 2)*(pair[0] ** 2) - (comb2[i][0] ** 2)*(pair[1] ** 2)) / ((comb2[i][1] ** 2)*(pair[0] ) - (comb2[i][0] ** 2)*(pair[1]))))*(comb2[i][0]))**2/(((((comb2[i][1] ** 2)*(pair[0] ** 2) - (comb2[i][0] ** 2)*(pair[1] ** 2)) / ((comb2[i][1] ** 2)*(pair[0] ) - (comb2[i][0] ** 2)*(pair[1]))))*(pair[0])-pair[0]**2))
    })).filter(row => row.B2 > 0);

    const meanA = results.reduce((sum, row) => sum + row.A, 0) / results.length;
    const meanB = results.reduce((sum, row) => sum + Math.sqrt(row.B2), 0) / results.length;
    const meanB_A = meanB / meanA;
    const summaryResults = [{ A: meanA.toFixed(6), B: meanB.toFixed(6), "B/A": meanB_A.toFixed(6) }];

    // displayResults(results);
    displayResults(summaryResults);
});

function displayResults(data) {
    const table = document.getElementById("outputTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = "<tr><td>No data processed.</td></tr>";
        return;
    }

    const headers = Object.keys(data[0]);
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headers.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    data.forEach(row => {
        const tr = tbody.insertRow();
        headers.forEach(header => {
            const td = tr.insertCell();
            td.textContent = row[header];
        });
    });
}

let aspectRatio = null, youngModulus = null, poissonRatio = null;

function setAspectRatio() {
    aspectRatio = parseFloat(document.getElementById("aspectRatio").value);
    if (isNaN(aspectRatio)) {
        alert("Enter a valid number for Aspect Ratio!");
        return;
    }
    document.getElementById("aspectRatioValue").innerText = aspectRatio;
}

function setYoungModulus() {
    youngModulus = parseFloat(document.getElementById("youngModulus").value);
    if (isNaN(youngModulus)) {
        alert("Enter a valid number for Young’s modulus!");
        return;
    }
    document.getElementById("youngModulusValue").innerText = youngModulus;
}

function setPoissonRatio() {
    poissonRatio = parseFloat(document.getElementById("poissonRatio").value);
    if (isNaN(poissonRatio)) {
        alert("Enter a valid number for Poisson’s ratio!");
        return;
    }
    document.getElementById("poissonRatioValue").innerText = poissonRatio;
}

function calculateResult() {
    if (aspectRatio === null || youngModulus === null || poissonRatio === null) {
        alert("Please set all values before calculating!");
        return;
    }

    // Example calculation (Modify based on actual formula)
    const result = 500 * (youngModulus * aspectRatio) / (1 - poissonRatio ** 2);

    document.getElementById("resultValue").innerText = result.toFixed(6);
}
