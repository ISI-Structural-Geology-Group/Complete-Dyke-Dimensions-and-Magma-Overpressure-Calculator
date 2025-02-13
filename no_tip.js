document.getElementById("fileInput").addEventListener("change", () => {
  const fileInput = document.getElementById("fileInput");

  if (!fileInput.files.length) {
    alert("Please upload a CSV file!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result.trim();
    const rows = csvData.split("\n").map(row => row.trim()).filter(row => row.length > 0).map(row => row.split(","));

    if (rows.length < 2) {
      alert("CSV must have at least one data row!");
      return;
    }

    const headers = rows[0]; // First row as column headers

    // Populate dropdowns with column names
    const col1Dropdown = document.getElementById("col1Select");
    const col2Dropdown = document.getElementById("col2Select");
    col1Dropdown.innerHTML = "";
    col2Dropdown.innerHTML = "";

    headers.forEach(header => {
      const option1 = new Option(header, header);
      const option2 = new Option(header, header);
      col1Dropdown.add(option1);
      col2Dropdown.add(option2);
    });

    // Prevent selecting the same column in both dropdowns
    col1Dropdown.addEventListener("change", () => {
      [...col2Dropdown.options].forEach(opt => opt.disabled = opt.value === col1Dropdown.value);
    });

    col2Dropdown.addEventListener("change", () => {
      [...col1Dropdown.options].forEach(opt => opt.disabled = opt.value === col2Dropdown.value);
    });
  };
  reader.readAsText(fileInput.files[0]);
});

document.getElementById("processBtn").addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  const col1Name = document.getElementById("col1Select").value; // Selected column name
  const col2Name = document.getElementById("col2Select").value; // Selected column name

  if (!fileInput.files.length) {
    alert("Please upload a CSV file!");
    return;
  }

  if (!col1Name || !col2Name || col1Name === col2Name) {
    alert("Please select two different columns.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result.trim();
    const rows = csvData.split("\n").map(row => row.trim()).filter(row => row.length > 0).map(row => row.split(","));

    const headers = rows[0]; // First row as column headers
    const col1Index = headers.indexOf(col1Name);
    const col2Index = headers.indexOf(col2Name);

    const data = rows.slice(1).map(row => ({
      x: parseFloat(row[col1Index]),
      y: parseFloat(row[col2Index])
    })).filter(row => !isNaN(row.x) && !isNaN(row.y));

    if (data.length < 5) {
      alert("Not enough numerical data for processing.");
      return;
    }

    const df1 = smoothElements(data);
    const df2 = smoothElements(df1);
    const df3 = smoothElements(df2);

    const results = [
      { cycle: 0, params: estimateParameters(data) },
      { cycle: 1, params: estimateParameters(df1) },
      { cycle: 2, params: estimateParameters(df2) },
      { cycle: 3, params: estimateParameters(df3) },
    ];

    let finalResult;


    // Check results[1] first
    if (
      (results[1].params["Gd"] >= 0.5 ||
        results[1].params["Gd"] > results[2].params["Gd"]) &&
      !isNaN(results[1].params["B/A"])
    ) {
      finalResult = results[1];
    }
    // If results[1] doesn't meet the condition, check results[2]
    else if (!isNaN(results[2].params["B/A"])) {
      finalResult = results[2];
    }
    // If neither results[1] nor results[2] is valid, use results[3]
    else {
      finalResult = results[3];
    }
    // finalResult = finalResult || results[3];

    displayResults(results, finalResult);
  };
  reader.readAsText(fileInput.files[0]);
});


function smoothElements(data) {
  return data.map((_, i) => {
    if (i < 2 || i >= data.length - 2) {
      return { ...data[i] };
    }
    const segment = data.slice(i - 2, i + 3);
    const yValues = segment.map(d => d.y);
    const isExtreme = data[i].y >= Math.max(...yValues) || data[i].y <= Math.min(...yValues);

    if (isExtreme) {
      const weights = [data[i + 1].x - data[i].x, data[i].x - data[i - 1].x];
      const values = [data[i - 1].y, data[i + 1].y];
      const weightedAverage = (values[0] * weights[0] + values[1] * weights[1]) / (weights[0] + weights[1]);
      return { x: data[i].x, y: weightedAverage };
    } else {
      return { ...data[i] };
    }
  });
}

function estimateParameters(data) {
  if (data.length < 5) {
    return { error: "Not enough data points for estimation" };
  }

  const dy = data.slice(2).map((_, i) => (data[i + 2].y - data[i].y) / (data[i + 2].x - data[i].x));
  const d2y = dy.slice(2).map((_, i) => (dy[i + 2] - dy[i]) / (data[i + 3].x - data[i + 1].x));
  const newval = d2y.map((d2, i) => data[i + 2].y * d2 + dy[i + 1] ** 2);
  const x_est = dy.map((d, i) => (data[i + 1].y * d) / avg(newval));

  const b_a_estimate = Math.sqrt(-avg(newval)).toFixed(6);
  const Gd = (d2y.filter(d => d < 0).length / (data.length - 4)).toFixed(6);
  const c = (median(data.slice(1, -1).map(d => d.x)) - median(x_est)).toFixed(6);
  const x_hat = data.map(d => d.x - c);
  const b = Math.sqrt(median(data.map((val, i) => (Math.sqrt(-avg(newval)) * x_hat[i]) ** 2 + data[i].y ** 2))).toFixed(6);
  const a = (b / Math.sqrt(-avg(newval))).toFixed(6);

  return { "B/A": b_a_estimate, Gd, A: (2 * a).toFixed(6), B: (2 * b).toFixed(6) };
}

function avg(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function displayResults(results, finalResult) {
  const table = document.getElementById("outputTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  // Define table headers for separate columns
  thead.innerHTML = `
      <tr>
        <th>Cycle</th>
        <th>G<sub>D</sub></th>
        <th>A</th>
        <th>B</th>
        <th>B/A</th>
      </tr>
    `;

  // Generate table rows with separate columns
  tbody.innerHTML = results.map(result =>
    `<tr>
        <td>${result.cycle}</td>
        <td>${result.params["Gd"]}</td>
        <td>${result.params["A"]}</td>
        <td>${result.params["B"]}</td>
        <td>${result.params["B/A"]}</td>
      </tr>`
  ).join("");

  // Append final result row
  const finalRow = document.createElement("tr");
  finalRow.innerHTML = `
      <td>Recommended</td>
      <td>${finalResult.params["Gd"]}</td>
      <td>${finalResult.params["A"]}</td>
      <td>${finalResult.params["B"]}</td>
      <td>${finalResult.params["B/A"]}</td>
    `;
  tbody.appendChild(finalRow);
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
    alert("Enter a valid number for Young&#39;s modulus!");
    return;
  }
  document.getElementById("youngModulusValue").innerText = youngModulus;
}

function setPoissonRatio() {
  poissonRatio = parseFloat(document.getElementById("poissonRatio").value);
  if (isNaN(poissonRatio)) {
    alert("Enter a valid number for Poisson&#39;s ratio!");
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

