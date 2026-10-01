# Importing Ridom SeqSphere+ data

SeqSphere+ has a dedicated GrapeTree export. In the comparison table, choose
**File → Export profile and metadata files for GrapeTree (TSV)**. This produces
two files:

1. the profile TSV contains allele calls and is used to calculate the tree;
2. the metadata TSV contains epidemiological fields and is loaded after the
   tree, or passed to the JSON export command.

Create both the tree and a reusable visualisation from the command line:

```bash
grapetree --profile seqsphere-profile.tsv --n_proc 4 > tree.nwk
grapetree --json --treefile tree.nwk \
  --meta seqsphere-metadata.tsv > ms_tree.json
```

The browser workflow is **Load Files → tree.nwk → metadata TSV**. Do not use a
generic comparison-table CSV as the profile: it mixes metadata and typing
fields and is not the dedicated GrapeTree schema.

For a large table, first verify the command-line calculation before opening
the browser. `grapetree --check --profile seqsphere-profile.tsv` gives a rough
resource estimate. SeqSphere+'s own documentation reports that thousands of
samples require several gigabytes and recommends filtering samples with more
than 10% missing loci before tree calculation. Differences from SeqSphere+'s
own MST can still occur because its missing-data and tie-breaking choices are
not necessarily the same as GrapeTree's.

Current SeqSphere+ instructions are maintained by Ridom at
<https://www.ridom.de/seqsphere/ug/v105/FAQ%253AHow_to_use_GrapeTree_for_large_Minimum_Spanning_Trees%253F.html>.
