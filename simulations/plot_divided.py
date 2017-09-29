import numpy as np
from numpy import median
import matplotlib as mpl
mpl.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.lines as mlines
import pandas as pd
import collections
import sys
from matplotlib.ticker import FormatStrFormatter

sum_file = sys.argv[1]

df = pd.read_csv(sum_file,header=None,sep='\t')
df = df[df[5] <= 0.007]


colors = ["Blues","Greens","Purples","Reds"]

x = df.groupby(1, sort=False)

fig, (ax1, ax2) = plt.subplots(1, 2,figsize=(6,4))
counter = 0
colorhash = collections.OrderedDict()
for name, group in x:
     df_sel = df.loc[df[1] == name]
     df_sel_b = df_sel.loc[df_sel[2] == 'balanced']
     df_sel_u = df_sel.loc[df_sel[2] == 'unbalanced']
     agg_b = df_sel_b.groupby(pd.cut(df_sel_b[0],(0,0.00008,0.0008,0.008,0.08,0.8))).aggregate(np.mean)
     agg_u = df_sel_u.groupby(pd.cut(df_sel_u[0],(0,0.00008,0.0008,0.008,0.08,0.8))).aggregate(np.mean)

     cmap = colors[counter]
     norm = mpl.colors.LogNorm(vmin= 0.000008, vmax=0.5)
     #fake plot for colorbar
     cax = ax1.scatter(agg_b[4], agg_b[9], cmap=mpl.cm.Greys, norm=norm, c=agg_b[5], zorder=0, s=0)

     ax1.plot(agg_b[4], agg_b[9], lw=1, color='grey',zorder = 1,label=name)
     ax1.scatter(agg_b[4],agg_b[9], cmap = cmap, norm = norm, c=agg_b[5], zorder = 2, s=90)
     ax2.plot(agg_u[4], agg_u[9], lw=1, color='grey', zorder=1, label=name)
     ax2.scatter(agg_u[4], agg_u[9], cmap=cmap, norm=norm, c=agg_u[5], zorder=2, s=90)
     map = mpl.cm.get_cmap(colors[counter])
     colorhash[name] = map(0.7)
     counter += 1


# The following two lines generate custom fake lines that will be used as legend entries:
markers = [plt.Line2D([0, 0], [0, 0], color=color, marker='o', linestyle='') for color in colorhash.values()]
ax1.legend(markers, colorhash.keys(), numpoints=1, loc='upper left', prop={'size': 6}, markerscale=1,frameon=True)
ax2.legend(markers, colorhash.keys(), numpoints=1, loc='upper left', prop={'size': 6}, markerscale=1,frameon=True)

ax1.grid(b=False)
ax1.set_title('balanced quartets')
ax1.set_xlabel('precision (true positive rate)')
ax1.set_ylabel('sensitivity (positive predictive value)')

ax2.grid(b=False)
ax2.set_title('unbalanced quartets')
ax2.set_xlabel('precision (true positive rate)')
#ax2.set_ylabel('sensitivity (positive predictive value)')


ax1.xaxis.set_major_formatter(FormatStrFormatter('%.2f'))

for ax in fig.axes:
    mpl.pyplot.sca(ax)
    plt.xticks(rotation=50)
    plt.xlim([0.65, 1.03])
    plt.ylim([0.4, 1.03])
    plt.tight_layout()

fig.subplots_adjust(right=0.8)
cbar_ax = fig.add_axes([0.85, 0.15, 0.05, 0.7])
fig.colorbar(cax, cax=cbar_ax, label="substitution rate")

fig.savefig("./divided_rates.pdf", format="pdf")


#plt.show()