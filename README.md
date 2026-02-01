# CypScope

CypScope is a specialized diagnostic tool for assessing sequencing quality and read integrity across the difficult-to-resolve **CYP2D6**, **CYP2D7**, and **CYP2D8** gene regions. It provides an interactive HTML-based dashboard, allowing validation on data sufficiency for downstream variant calling or infer decisions on resequencing.

## Targets

The analysis diagnoses sequencing performance in the following genomic coordinates (hg38/GRCh38):

* **CYP2D6:** `chr22:42126499-42130810`
* **CYP2D7:** `chr22:42140203-42144577`
* **CYP2D8:** `chr22:42149886-42155001`

## Metrics

CypScope calculates the following diagnostic metrics using memory-efficient streaming algorithms:

* **Coverage:**
  * **Mean Coverage:** Assesses overall sequencing depth.
  * **Coverage SD:** Diagnoses uneven amplification or capture bias.
  * **Trace Visualization:** An interactive depth-per-position plot to spot dropouts or coverage spikes.

* **Read Lengths:**
  * **Mean Read Length:** Validates if the sequencing technology achieved expected read lengths in these regions.
  * **Length SD:** Measures the consistency of read lengths.

* **Top 5 Longest Reads:**
  * Identifies the longest contiguous reads.

## Manifest

### Core Script

**`cypscope`**: The main driver script. It handles parallel BAM processing, diagnostic metric calculation, and report compilation.

### Assets

* **`assets/template.html`**: The HTML skeleton for the interactive dashboard.
* **`assets/style.css`**: Defines the visual theme and layout.
* **`assets/script.js`**: Contains the client-side logic for dynamic filtering, data aggregation, and Plotly visualization.

## Usage

```bash
# Create environment
conda env create -f env.yml
conda activate cypscope
```

```bash
# Run analysis
cypscope -i /path/to/bam_folder -o report.html -t 8
```
