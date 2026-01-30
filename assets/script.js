// --- DATA INJECTION ---
const DB = {{INJECT_DATA}};


// State
let activeGene = 'CYP2D6';
let activeSamples = new Set(Object.keys(DB.genes.CYP2D6));
let viewMode = 'aggregate'; // or 'focus'

document.addEventListener('DOMContentLoaded', init);

function init() {
	setupSidebar();
	setupViews();
	renderAll();

	// Event Listeners
	document.getElementById('view-mode').addEventListener('change', (e) => {
		viewMode = e.target.value;
		renderAll();
	});
}

// --- SIDEBAR LOGIC ---
function setupSidebar() {
	const list = document.getElementById('sample-list');
	const allIds = Object.keys(DB.genes.CYP2D6).sort();

	// Render Checkboxes
	allIds.forEach(id => {
		const div = document.createElement('div');
		div.className = 'sample-item';
		div.innerHTML = `<input type="checkbox" value="${id}" checked> <span>${id}</span>`;
		div.querySelector('input').addEventListener('change', (e) => {
			if (e.target.checked) activeSamples.add(id);
			else activeSamples.delete(id);
			renderAll();
		});
		list.appendChild(div);
	});

	// Filter Buttons
	document.getElementById('btn-all').onclick = () => {
		document.querySelectorAll('.sample-item input').forEach(c => c.checked = true);
		allIds.forEach(id => activeSamples.add(id));
		renderAll();
	};
	document.getElementById('btn-none').onclick = () => {
		document.querySelectorAll('.sample-item input').forEach(c => c.checked = false);
		activeSamples.clear();
		renderAll();
	};

	// Search
	document.getElementById('search-box').addEventListener('keyup', (e) => {
		const term = e.target.value.toLowerCase();
		document.querySelectorAll('.sample-item').forEach(item => {
			const txt = item.innerText.toLowerCase();
			item.style.display = txt.includes(term) ? 'flex' : 'none';
		});
	});
}

// --- VIEW SCAFFOLDING ---
function setupViews() {
	const container = document.getElementById('views-container');
	const genes = ['CYP2D6', 'CYP2D7', 'CYP2D8'];

	genes.forEach(gene => {
		const div = document.createElement('div');
		div.id = `view-${gene}`;
		div.className = `view-section ${gene === 'CYP2D6' ? 'active' : ''}`;
		div.innerHTML = `<div id="content-${gene}"></div>`;
		container.appendChild(div);
	});
}

function switchTab(gene) {
	activeGene = gene;
	// UI Update
	document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
	Array.from(document.querySelectorAll('.tab-btn')).find(b => b.innerText === gene).classList.add('active');

	document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
	document.getElementById(`view-${gene}`).classList.add('active');

	renderAll();
}

// --- RENDERING CORE ---
function renderAll() {
	const container = document.getElementById(`content-${activeGene}`);
	const data = DB.genes[activeGene];
	const visibleIds = Array.from(activeSamples).sort();

	if (viewMode === 'aggregate') {
		renderAggregate(container, data, visibleIds);
	} else {
		renderFocus(container, data, visibleIds);
	}
}

function renderAggregate(container, data, ids) {
	// 1. Coverage Plot
	// 2. Data Table

	container.innerHTML = `
		<div class="card">
			<h3>Coverage Traces (${ids.length} selected)</h3>
			<div id="plot-${activeGene}" style="height:400px;"></div>
		</div>
		<div class="card">
			<h3>Population Statistics</h3>
			<div style="overflow-x:auto;">
				<table id="table-${activeGene}">
					<thead>
						<tr>
							<th>Sample ID</th>
							<th>Mean Cov</th>
							<th>Cov SD</th>
							<th>Read Len</th>
							<th>Top 5 Reads</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</div>
	`;

	// Fill Table
	const tbody = container.querySelector('tbody');
	const traces = [];

	ids.forEach(id => {
		const s = data[id];
		if (!s) return;

		// Table
		tbody.innerHTML += `
			<tr>
				<td style="color:#8ab4f8; font-weight:bold;">${id}</td>
				<td>${s.cov_mean}</td>
				<td>${s.cov_sd}</td>
				<td>${s.len_mean}</td>
				<td>${s.top5.join(', ')}</td>
			</tr>
		`;

		// Plot Trace
		traces.push({
			y: s.trace,
			name: id,
			type: 'scatter',
			mode: 'lines',
			opacity: 0.6,
			line: { width: 1 }
		});
	});

	Plotly.newPlot(`plot-${activeGene}`, traces, {
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		font: { color: '#9aa0a6' },
		margin: { t: 20, l: 40, r: 20, b: 40 },
		xaxis: { gridcolor: '#3c4043' },
		yaxis: { gridcolor: '#3c4043' }
	});
}

function renderFocus(container, data, ids) {
	if (ids.length === 0) {
		container.innerHTML = "<p>No samples selected.</p>";
		return;
	}

	let html = '<div style="display:grid; gap:20px;">';

	ids.forEach(id => {
		const s = data[id];
		html += `
			<div class="card" style="border-left: 4px solid #8ab4f8;">
				<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
					<h2 style="margin:0; color:white;">${id}</h2>
					<span style="color:#8ab4f8;">${activeGene}</span>
				</div>
				
				<div class="focus-stat-grid">
					<div class="stat-box">
						<div class="stat-val">${s.cov_mean}</div>
						<div class="stat-desc">Mean Coverage</div>
					</div>
					<div class="stat-box">
						<div class="stat-val">${s.len_mean}</div>
						<div class="stat-desc">Avg Read Length</div>
					</div>
					 <div class="stat-box" style="grid-column: span 2">
						<div class="stat-val" style="font-size:1rem; word-break:break-all;">${s.top5.join(' | ')}</div>
						<div class="stat-desc">Top 5 Longest Reads</div>
					</div>
				</div>

				<div id="mini-plot-${id}" style="height:200px; margin-top:20px;"></div>
			</div>
		`;
	});
	html += '</div>';
	container.innerHTML = html;

	// Render Mini Plots
	ids.forEach(id => {
		const s = data[id];
		Plotly.newPlot(`mini-plot-${id}`, [{
			y: s.trace,
			type: 'scatter',
			mode: 'lines',
			fill: 'tozeroy',
			line: { color: '#8ab4f8' }
		}], {
			paper_bgcolor: 'rgba(0,0,0,0)',
			plot_bgcolor: 'rgba(0,0,0,0)',
			margin: { t: 0, l: 30, r: 10, b: 20 },
			xaxis: { visible: false },
			yaxis: { gridcolor: '#3c4043' }
		}, { displayModeBar: false });
	});
}
