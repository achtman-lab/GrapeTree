# Where GrapeTree is used

GrapeTree is used in genomic surveillance platforms, bacterial typing databases
and analysis pipelines. This page records publicly documented examples, with
particular attention to public-health and One Health applications.

Last checked: **3 October 2026**. This is a curated list, not a census of users.
An integration described in a paper or present in source code does not establish
which version a live service runs. The locations below identify the organisations
behind the software, not the countries covered by their surveillance or users.

## Summary table

“Embedded” means the platform includes the viewer or tree-building code.
“Pipeline” means an analysis workflow invokes GrapeTree, directly or through a
dependency. A derivative contains modified GrapeTree code. Related entries are
listed separately where their roles differ; they should not be added together
as independent national deployments.

| Platform or software | Organisation / location | Documented use of GrapeTree | Relationship | Sources |
| --- | --- | --- | --- | --- |
| **IRIDA-ARIES** | Istituto Superiore di Sanità (ISS), Italy | Includes an allele-profile minimum-spanning-tree workflow. Hosts Italy's national listeriosis surveillance system and STEC surveillance workflows. | Pipeline within a surveillance platform | [1](#source-1) |
| **GenPat / COHESIVE Information System (CIS)** | IZSAM / Italian Ministry of Health, Italy | Integrates GrapeTree into dashboards combining WGS results with epidemiological metadata. GenPat extends CIS for national animal, food and environmental pathogen surveillance. | Embedded; related platform family | [2](#source-2) |
| **ReporTree** | INSA, Portugal | Uses a modified GrapeTree backend for MST-based genetic clustering and links clusters with metadata. Portugal's National Reference Laboratory for Mycobacteria documents its use in the TB surveillance workflow. | Pipeline; modified dependency | [3](#source-3), [4](#source-4) |
| **Bonsai** | SMD Bioinformatics Lund / Genomic Medicine Sweden, Sweden | Includes GrapeTree-derived tree-building code and an interactive tree interface. GMS identifies Bonsai within its national genomics infrastructure work. | Embedded; derivative | [5](#source-5), [6](#source-6) |
| **BIGSdb / PubMLST** | University of Oxford, UK; international databases | Provides a GrapeTree plugin for selected isolates, loci or typing schemes and associated metadata. | Embedded plugin | [7](#source-7), [8](#source-8) |
| **Institut Pasteur BIGSdb** | Institut Pasteur, France | Its live plugin catalogue includes GrapeTree for generating and exploring genomic relationships with metadata. This is a deployment of BIGSdb, not an independent software family. | Embedded plugin | [9](#source-9) |
| **EnteroBase** | University of Warwick, UK; international database | Integrates GrapeTree with database workspaces, genomic relationships and metadata. | Embedded | [10](#source-10) |
| **BacWGSTdb 2.0** | Zhejiang University-led database, China | Constructs and visualises cgMLST minimum-spanning trees, with interactive tree layout and metadata controls, for bacterial source tracking. | Embedded | [11](#source-11) |
| **chewieSnake / GenoSalmSurv workflows** | German Federal Institute for Risk Assessment (BfR), Germany | chewieSnake documents GrapeTree tree generation from allele profiles. GenoSalmSurv training covers loading the resulting trees and metadata into GrapeTree. | Pipeline and downstream visualisation | [12](#source-12) |
| **Ridom SeqSphere+ / Ridom Typer** | Ridom, Germany; commercial software | Exports profiles and metadata and supports launching an installed GrapeTree to calculate and display large MSTs. This is an external application integration. | Export and launcher | [13](#source-13) |
| **SPREAD** | GenPat / IZSAM, Italy | Extends GrapeTree with geographical and temporal exploration and ReporTree outputs. Previously called GrapeTree Extended. Part of the GenPat/CIS software family. IZSAM also documents its use by INSA in Portugal and the ARIES team at ISS in Italy. | Derivative | [14](#source-14), [24](#source-24) |
| **vcf2mst** | GenPat / IZSAM, Italy | Converts variant data into profiles and invokes GrapeTree to generate an MST; developed for SARS-CoV-2 surveillance analysis. | Direct command-line dependency | [15](#source-15) |
| **bsProfile** | NCEZID-EDLB team repository | Documents repeated GrapeTree runs on resampled MLST profiles to estimate bootstrap support. Evidence of a small analysis workflow, not of a national platform deployment. | Direct command-line workflow | [16](#source-16) |

## Export and recommended downstream workflows

These tools explicitly support working with GrapeTree, but the evidence does not
show that their main application embeds or automatically runs it.

| Software | Organisation / location | Documented relationship | Sources |
| --- | --- | --- | --- |
| **LegioVue** | Public Health Agency of Canada, National Microbiology Laboratory, Canada | Its Legionella workflow recommends separate ReporTree/GrapeTree clustering and visualisation steps. The documentation explicitly says these steps currently run outside the Nextflow workflow. | [17](#source-17) |
| **MGTdb / MGT-local** | Lan laboratory, University of New South Wales, Australia | Exports multilevel genome typing assignments and allele profiles for GrapeTree; its paper demonstrates this workflow with Salmonella outbreak data. | [18](#source-18) |
| **PopPUNK** | Bacterial Population Genomics developers; international research software | Its visualisation command has a `--grapetree` option producing files for loading into GrapeTree. | [19](#source-19) |

## Indirect links, prototypes, announcements and unresolved references

| Platform or software | Organisation / location | What the evidence establishes | Status | Sources |
| --- | --- | --- | --- | --- |
| **BeONE data hub** | Statens Serum Institut (SSI), Denmark; One Health EJP collaboration | Its ReporTree service installs GrapeTree and exposes a GrapeTree analysis option. The repository says the application is for testing and feedback, not production use. | Implemented prototype; national deployment not established | [20](#source-20) |
| **AMD Platform / TB GIMS** | US Centers for Disease Control and Prevention | October 2024 meeting minutes announced state access to GrapeTree through the AMD Platform from spring 2025, for exploring TB whole-genome SNP comparisons and epidemiological data. | Announced; completed rollout not verified here | [21](#source-21) |
| **PulseNet 2.0** | US Centers for Disease Control and Prevention | The white paper names GrapeTree among visualisation applications envisaged for the platform. | Planned architecture; operational integration not verified here | [22](#source-22) |
| **Juno-SNP** | RIVM, Netherlands | The README names GrapeTree. However, the inspected `make_tree` rule invokes VCF-kit, while another rule invokes IQ-TREE. The README alone is insufficient evidence of current GrapeTree execution. | Conflicting documentation and implementation; excluded from confirmed integrations | [23](#source-23) |
| **MEDNET4OH** | IZSAM and Tunisia's Ministry of Health; AICS-funded collaboration with WHO | IZSAM identifies MEDNET4OH as a GENPAT version being developed for Tunisia's Ministry of Health. GENPAT and SPREAD have documented GrapeTree connections, but these sources do not specify the components included in MEDNET4OH. | Indirect platform-family link; GrapeTree/SPREAD deployment in Tunisia not established | [2](#source-2), [14](#source-14), [24](#source-24), [25](#source-25) |

## Evidence and citations

The numbered sources below support the table entries. Repository links with
commit identifiers preserve the inspected implementation. Papers document use
at publication; public repositories and documentation were checked on the date
above. No private deployment or runtime audit was performed.

<a id="source-1"></a>
1. **IRIDA-ARIES.** *IRIDA-ARIES Genomics, a key player in the One Health surveillance of diseases caused by infectious agents in Italy* (2023). [Full paper](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2023.1151568/full). Section 2.5 names the GrapeTree workflow; the results describe national listeriosis surveillance and outbreak investigations. This supports the Italian adaptation, not every IRIDA installation.

<a id="source-2"></a>
2. **GenPat/CIS.** One Health EJP MATRIX, [GENPAT practical example](https://sva-se.github.io/MATRIX-dashboards/docs/examples/#genpat-izs-italy). Describes the Ministry of Health remit, the integrated GrapeTree dashboard and the relationship between GenPat and CIS.

<a id="source-3"></a>
3. **ReporTree.** Mixão et al., *ReporTree: a surveillance-oriented tool to strengthen the linkage between pathogen genetic clusters and epidemiological data* (2023). [Paper](https://doi.org/10.1186/s13073-023-01196-1); [current dependency documentation](https://github.com/insapathogenomics/ReporTree#installation-and-dependencies); [modified GrapeTree repository](https://github.com/insapathogenomics/GrapeTree). The modified backend should not be assumed to track upstream releases automatically.

<a id="source-4"></a>
4. **Portuguese TB surveillance.** *Whole-genome sequencing-based surveillance system for Mycobacterium tuberculosis in Portugal* (2025). [Paper](https://doi.org/10.1016/j.tube.2025.102691); [INSA-hosted full text](https://repositorio.insa.pt/bitstreams/10fe0542-0d06-4e74-8cb2-61880405c3ef/download). Describes ReporTree and the GrapeTree MSTreeV2 algorithm in the National Reference Laboratory's surveillance workflow.

<a id="source-5"></a>
5. **Bonsai implementation.** [Tree-building module](https://github.com/SMD-Bioinformatics-Lund/bonsai/blob/4978dbeb5a02b1c0cf7998baaa0f0569d9f2b1e5/allele_cluster_service/allele_cluster_service/ms_trees.py) explicitly identifies its origin as a GrapeTree fork. The [tree template](https://github.com/SMD-Bioinformatics-Lund/bonsai/blob/4978dbeb5a02b1c0cf7998baaa0f0569d9f2b1e5/frontend/bonsai_app/blueprints/cluster/templates/tree.html) loads GrapeTree-derived viewer assets and constructs a `D3MSTree`.

<a id="source-6"></a>
6. **Bonsai national context.** Genomic Medicine Sweden, [national microbial surveillance infrastructure update, 11 June 2026](https://genomicmedicine.se/2026/06/11/datadrivet-smittskydd-framtidens-verktyg-mot-spridning-av-resistenta-bakterier/). Describes JASEN, Bonsai and MIMOSA in National Genomics Platform implementation. This establishes the programme context; it does not show that every Swedish region uses GrapeTree or which GrapeTree-derived features each deployment exposes.

<a id="source-7"></a>
7. **BIGSdb plugin.** [GrapeTree plugin documentation](https://bigsdb.readthedocs.io/en/latest/data_analysis/grapetree.html). Describes selecting isolates, loci/schemes and metadata and launching the interactive output.

<a id="source-8"></a>
8. **PubMLST.** Jolley, Bray and Maiden, *Open-access bacterial population genomics: BIGSdb software, the PubMLST.org website and their applications* (2018). [Full paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6192448/). Describes an integrated GrapeTree implementation through a BIGSdb plugin.

<a id="source-9"></a>
9. **Institut Pasteur.** [Live BIGSdb plugin catalogue](https://bigsdb.pasteur.fr/cgi-bin/bigsdb/bigsdb.pl?db=pubmlst_morganella_isolates&page=pluginSummary). Lists the GrapeTree analysis plugin and its interactive metadata functionality. This is evidence for the installation, not a claim about the completeness of national surveillance.

<a id="source-10"></a>
10. **EnteroBase.** [GrapeTree documentation](https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html). Describes the integrated workspace/data interaction and distinguishes the standalone version.

<a id="source-11"></a>
11. **BacWGSTdb.** Feng et al., *BacWGSTdb 2.0: a one-stop repository for bacterial whole-genome sequence typing and source tracking* (2021). [Full paper](https://academic.oup.com/nar/article/49/D1/D644/5917663). The cgMLST description explicitly names GrapeTree for tree construction and visualisation.

<a id="source-12"></a>
12. **chewieSnake/GenoSalmSurv.** BfR, [chewieSnake README](https://gitlab.com/bfr_bioinformatics/chewieSnake/-/blob/master/README.md); [GenoSalmSurv training: allele calling and GrapeTree visualisation](https://www.bfr.bund.de/cm/343/GSS_Screencasts_4_chewiesnake_CD.pdf). Evidence for the documented workflow, not a claim that all German surveillance uses this pipeline.

<a id="source-13"></a>
13. **Ridom.** [SeqSphere+ 10.0 instructions for large trees](https://www.ridom.de/seqsphere/ug/v100/FAQ%253AHow_to_use_GrapeTree_for_large_Minimum_Spanning_Trees%253F.html); [Ridom citations and licences](https://www.ridom.de/seqsphere/u/Citations.html). The instructions describe exporting data and automatically starting a separately installed GrapeTree. They also note possible differences from Ridom's own MST results.

<a id="source-14"></a>
14. **SPREAD.** [Project repository](https://github.com/genpat-it/spread); de Ruvo et al., *SPREAD: Spatiotemporal Pathogen Relationships and Epidemiological Analysis Dashboard* (2024), [paper](https://doi.org/10.12834/VetIt.3476.23846.1). Identifies GrapeTree as the basis of the application and describes its integration with mapping, time and ReporTree outputs.

<a id="source-15"></a>
15. **vcf2mst.** [Repository and command-line documentation](https://github.com/genpat-it/vcf2mst). Lists GrapeTree as a prerequisite and exposes a `-grapetree-bin` option. Di Pasquale et al., [SARS-CoV-2 surveillance application](https://doi.org/10.1186/s12864-021-08112-0) (2021).

<a id="source-16"></a>
16. **bsProfile.** [Repository](https://github.com/ncezid-biome/bsProfile). Its README invokes `grapetree --profile` on bootstrap profiles and the original profile matrix. The [organisation profile](https://github.com/ncezid-biome) identifies the EDLB BiRD and CIMS teams. This does not establish integration in AMD Platform or PulseNet.

<a id="source-17"></a>
17. **LegioVue.** [Clustering instructions](https://github.com/phac-nml/legiovue/blob/79ce90ef5188c97f32e847611c234a2d41b4b7b3/docs/clustering.md). Explicitly describes separate downstream steps, including `--analysis grapetree`, MSTreeV2 and loading Newick/metadata outputs into GrapeTree.

<a id="source-18"></a>
18. **MGTdb.** Kaur et al., *MGTdb: a web service and database for studying the global and local genomic epidemiology of bacterial pathogens* (2022). [Paper](https://doi.org/10.1093/database/baac094); [MGT-local repository](https://github.com/LanLab/MGT-local). Describes export for GrapeTree and demonstrates its use with Salmonella isolates. Export compatibility is not an embedded GrapeTree service.

<a id="source-19"></a>
19. **PopPUNK.** [Visualisation documentation](https://github.com/bacpop/PopPUNK/blob/master/docs/visualisation.rst). Describes `--grapetree` outputs for a separate GrapeTree visualisation session.

<a id="source-20"></a>
20. **BeONE.** SSI's [README](https://github.com/ssi-dk/beone-datahub/blob/895c60ad219a86730a6eb3be7bf9251ee385c561/README.md) states its testing/prototype status. The [ReporTree Dockerfile](https://github.com/ssi-dk/beone-datahub/blob/895c60ad219a86730a6eb3be7bf9251ee385c561/reportree/Dockerfile) installs GrapeTree and its INSA fork; the [analysis service](https://github.com/ssi-dk/beone-datahub/blob/895c60ad219a86730a6eb3be7bf9251ee385c561/reportree/rest_interface/main.py) handles the GrapeTree analysis option.

<a id="source-21"></a>
21. **CDC AMD Platform / TB GIMS.** [Advisory Council for the Elimination of Tuberculosis meeting minutes, 23–24 October 2024](https://www.cdc.gov/faca/media/pdfs/2025/07/acet-minutes-20241023-24.pdf). Announces a spring 2025 GrapeTree rollout to states. Announcement timing must not be treated as confirmation that rollout completed.

<a id="source-22"></a>
22. **CDC PulseNet 2.0.** [White paper](https://stacks.cdc.gov/view/cdc/138367/cdc_138367_DS1.pdf), “Data Visualization and Reporting”, PDF page 11. Names GrapeTree among envisaged applications; does not demonstrate a deployed integration.

<a id="source-23"></a>
23. **Juno-SNP discrepancy.** RIVM's [README](https://github.com/RIVM-bioinformatics/juno-snp/blob/463cd0c54eb1904b924d7ab834e4abbeda6812a4/README.md) names GrapeTree, but the [tree rules](https://github.com/RIVM-bioinformatics/juno-snp/blob/463cd0c54eb1904b924d7ab834e4abbeda6812a4/bin/rules/dm_n_viz.smk) invoke VCF-kit and IQ-TREE. The [environment file](https://github.com/RIVM-bioinformatics/juno-snp/blob/463cd0c54eb1904b924d7ab834e4abbeda6812a4/envs/vcfkit.yaml) is named `grapetree`, but does not list GrapeTree as a dependency. Maintainer clarification would be needed before presenting this as a current integration.

<a id="source-24"></a>
24. **IZSAM platform variants and SPREAD users.** IZSAM, [Computational Biology and Bioinformatics](https://www.izs.it/IZS/Organisation/Development-and-Territory/Computational-Biology-and-Bioinformatics). Lists MEDNET4OH among GENPAT variants under development for Tunisia's Ministry of Health, and identifies INSA and the ISS ARIES team as SPREAD users. This establishes the organisational and platform-family connection; it does not explicitly identify SPREAD or GrapeTree within MEDNET4OH.

<a id="source-25"></a>
25. **MEDNET4OH project and partners.** AICS Tunis, [project launch, 22 October 2024](https://tunisi.aics.gov.it/news/al-via-il-progetto-mednet-4oh-per-il-rafforzamento-della-sorveglianza-sanitaria-nel-mediterraneo/?lang=fr). Identifies IZSAM as implementer, Tunisia's Ministry of Public Health and WHO as partners, and development of a genomic platform as a central activity. Names participating Tunisian institutions including Institut Pasteur de Tunis and Charles Nicolle Hospital. The article does not name GrapeTree or SPREAD.

## Updating this list

Additions and corrections are welcome through a pull request or issue. Include
a public source that identifies the software, the organisation and the specific
GrapeTree functionality used. For a source-code citation, prefer a commit link.
Keep training events and individual research figures distinct from software
integrations, and distinguish national programmes from academic databases.
