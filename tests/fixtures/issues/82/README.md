# Issue 82 regression fixture

`ST5210_problem.chew` is the public profile attachment from
<https://github.com/achtman-lab/GrapeTree/issues/82>. It contains resequenced
technical pairs whose allele mismatches are small but whose missing calls are
not nested between runs.

The fixture deliberately locks both established results. MSTree uses pairwise
overlap and keeps several replicate paths short. MSTreeV2's directed
missing-data distance also counts loci present only in the target direction;
for this fixture those directed replicate distances are much larger, producing
the reported star. This is a documented algorithm choice, not a candidate for
an unreviewed silent topology change.
