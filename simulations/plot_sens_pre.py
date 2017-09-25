import numpy as np
from numpy import median
import matplotlib as mpl
mpl.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.lines as mlines
import pandas as pd
import collections
import sys

sum_file = sys.argv[1]

df = pd.read_csv(sum_file,header=None,sep='\t')

df = df[df[4] <= 0.007]
#del df[4]


#colors = iter(mpl.cm.rainbow(np.linspace(0, 1, 4)))

colors = ["Blues","Greens","Purples","Reds"]

x = df.groupby(1, sort=False)
fig, ax = plt.subplots(figsize=(6,4))
counter = 0
colorhash = collections.OrderedDict()
for name, group in x:
    df_sel = df.loc[df[1] == name]
    agg = df_sel.groupby(pd.cut(df_sel[0],(0,0.00008,0.0008,0.008,0.08,0.8))).aggregate(np.mean)
    cmap = colors[counter]
    norm = mpl.colors.LogNorm(vmin=0.000008, vmax=0.5)
    ax.plot(agg[3], agg[7], lw=1, color='grey',zorder = 1,label=name)
    cax = ax.scatter(agg[3], agg[7], cmap=mpl.cm.Greys, norm=norm, c=agg[4], zorder=0, s=0)
    ax.scatter(agg[3],agg[7], cmap = cmap, norm = norm, c=agg[4], zorder = 2, s=90)
    map = mpl.cm.get_cmap(colors[counter])
    colorhash[name] = map(0.7)
    counter += 1



# The following two lines generate custom fake lines that will be used as legend entries:
markers = [plt.Line2D([0, 0], [0, 0], color=color, marker='o', linestyle='') for color in colorhash.values()]
ax.legend(markers, colorhash.keys(), numpoints=1, loc='upper left', markerscale=1.2,frameon=True)


ax.grid(b=False)
ax.set_xlabel('precision (true positive rate)')
ax.set_ylabel('sensitivity (positive predictive value)')
plt.xlim([0.8, 1.0])
plt.ylim([0.5, 1.05])


fig.subplots_adjust(right=0.8)
cbar_ax = fig.add_axes([0.85, 0.15, 0.05, 0.7])
fig.colorbar(cax, cax=cbar_ax, label="substitution rate")

fig.savefig("rates.pdf")

#plt.show()