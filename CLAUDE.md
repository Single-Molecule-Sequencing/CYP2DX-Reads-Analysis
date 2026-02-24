# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CypScope is a diagnostic tool for assessing sequencing quality across three CYP450 gene regions (CYP2D6, CYP2D7, CYP2D8) on chromosome 22. It processes BAM files in parallel and generates a self-contained HTML dashboard with interactive Plotly coverage traces and per-sample statistics.

## Architecture

```
cypscope          ← Main executable (Python 3, 157 lines)
assets/
  template.html   ← HTML skeleton with injection points (/*INJECT_CSS*/, //INJECT_JS, {{INJECT_DATA}})
  style.css       ← Material Design dark theme
  script.js       ← Client-side state management + Plotly rendering (228 lines)
```

**Pipeline**: Glob BAMs → ProcessPoolExecutor → per-BAM metrics (pysam) → aggregate JSON → inject into HTML template → single self-contained file.

**Two view modes**: Aggregate (population-level coverage overlay) and Focus (per-sample drill-down with stat boxes).

## Common Commands

```bash
# Setup
conda env create -f env.yml && conda activate cypscope

# Run analysis
./cypscope -i /path/to/bam_folder -o report.html
./cypscope -i /path/to/bam_folder -o report.html -t 8  # explicit thread count
```

## Key Patterns

- **Welford's online algorithm** for streaming mean/variance of read lengths (single-pass, O(1) memory)
- **Min-heap** for top-5 longest reads (O(n log 5) instead of full sort)
- **Asset injection**: CSS + JS + JSON data compiled into a single HTML file (no server, works offline)
- **Hard-coded regions**: CYP2D6 (chr22:42126499-42130810), CYP2D7 (chr22:42139500-42143500), CYP2D8 (chr22:42148000-42152000)

## Dependencies

**Conda**: python, pysam, numpy (see `env.yml`)
**Client-side**: Plotly 2.24.1 via CDN
