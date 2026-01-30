#!/usr/bin/env python3
# cyp2dx.py
# Generate an HTML report summarizing coverage and read length statistics from BAM files.

import argparse
import glob
import heapq
import json
import numpy as np
import os
import pysam
import sys
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, as_completed


##########
# config #
##########

REGIONS = {
	"CYP2D6": "chr22:42126499-42130810",
	"CYP2D7": "chr22:42140203-42144577",
	"CYP2D8": "chr22:42149886-42155001"
}

SCRIPT_NAME = os.path.basename(__file__)


#########
# funcs #
#########

def parse_region(region_str):
	c, spans = region_str.split(':')
	s, e = map(int, spans.split('-'))
	return c, s - 1, e


def process_bam(bam_path):
	filename = os.path.basename(bam_path)
	sample_id = filename.split('-')[0]

	results = {}
	try:
		bam = pysam.AlignmentFile(bam_path, "rb")
		for gene, coords in REGIONS.items():
			contig, start, end = parse_region(coords)

			# 1. Coverage
			cov_stats = bam.count_coverage(contig, start, end)
			total_depth = np.sum(cov_stats, axis=0)

			if total_depth.size > 0:
				trace = total_depth.tolist()
				mean_cov = float(np.mean(total_depth))
				sd_cov = float(np.std(total_depth))
			else:
				trace, mean_cov, sd_cov = [], 0.0, 0.0

			# 2. Read Lengths & Top 5
			n, mean, m2 = 0, 0.0, 0.0
			top5 = []

			for read in bam.fetch(contig, start, end):
				l = read.query_length
				n += 1
				delta = l - mean
				mean += delta / n
				m2 += delta * (l - mean)

				if len(top5) < 5:
					heapq.heappush(top5, l)
				else:
					heapq.heappushpop(top5, l)

			results[gene] = {
				'cov_mean': round(mean_cov, 2),
				'cov_sd': round(sd_cov, 2),
				'len_mean': round(mean, 2),
				'len_sd': round((m2/(n-1))**0.5, 2) if n > 1 else 0.0,
				'top5': sorted(top5, reverse=True),
				'trace': trace
			}
		bam.close()
		return sample_id, results
	except Exception as e:
		return sample_id, {'error': str(e)}


########
# args #
########

parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input', required=True, 
	help="BAM folder")
parser.add_argument('-o', '--output', default="CYP2DX_Reads_Diagnostics.html", 
	help="Output HTML file [%(default)s]")
parser.add_argument('-j', '--workers', type=int, default=os.cpu_count(), 
	help="Number of worker threads [%(default)i]")
args = parser.parse_args()


########
# main #
########

# Verify Assets
asset_dir = os.path.join(os.path.dirname(__file__), 'assets')
assets = {
	'html': os.path.join(asset_dir, 'template.html'),
	'css': os.path.join(asset_dir, 'style.css'),
	'js': os.path.join(asset_dir, 'script.js')
}
for p in assets.values():
	if not os.path.exists(p):
		sys.exit(f"Missing asset: {p}")

# Process
bams = glob.glob(os.path.join(args.input, "*.bam"))
data = {"genes": {g: {} for g in REGIONS}, "meta": {"count": len(bams)}}

print(f"[{SCRIPT_NAME}] Processing {len(bams)} BAMs with {args.workers} threads...")

with ProcessPoolExecutor(max_workers=args.workers) as exe:
	futures = {exe.submit(process_bam, b): b for b in bams}
	for fut in as_completed(futures):
		sid, res = fut.result()
		if 'error' not in res:
			for g in REGIONS:
				data["genes"][g][sid] = res[g]
		else:
			print(f"[{SCRIPT_NAME}] Failed: {sid} - {res['error']}")

# Merge Assets into Single File
print(f"[{SCRIPT_NAME}] Building report...")
with open(assets['html']) as f:
	html = f.read()
with open(assets['css']) as f:
	css = f.read()
with open(assets['js']) as f:
	js = f.read()

# Inject
final = html.replace("/*INJECT_CSS*/", css)
final = final.replace("//INJECT_JS", js)
final = final.replace("{{INJECT_DATA}}", json.dumps(data))

with open(args.output, "w") as f:
	f.write(final)
print(f"[{SCRIPT_NAME}] Done: {args.output}")
