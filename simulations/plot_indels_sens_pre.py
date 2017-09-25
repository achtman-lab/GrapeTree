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
df[0] = df[0].apply(lambda x: str(x)[13:-1])
df[4] = df[4].apply(lambda x: int(x.split(".")[2]))

df["rate"], df["type"] = zip(*df[0].str.split('.').tolist())
df['rate'] = df['rate'].apply(lambda x: int(x))
del df[0]

df = df.rename(columns={1: 'Method'})

badseq = df.loc[df['type'] == 'badseq']
badsite = df.loc[df['type'] == 'badsite']
random = df.loc[df['type'] == 'random']


colors = ["Blues","Greens","Oranges","Purples","Reds"]


x = random.groupby('Method', sort=False)


fig, ax = plt.subplots(figsize=(6, 4))
counter = 0
colorhash = collections.OrderedDict()
for name, group in x:
    df_sel = random.loc[df['Method'] == name]
    agg = df_sel.groupby(pd.cut(df_sel['rate'], (0, 1600, 3200, 4800, 6400, 8001))).aggregate(np.mean)
    cmap = colors[counter]
    norm = mpl.colors.Normalize(vmin=0.00001, vmax=8500)
    # fake plot for colorbar
    cax = ax.scatter(agg[3], agg[7], cmap=mpl.cm.Greys, norm=norm, c=agg[4], zorder=0, s=0)

    ax.plot(agg[3], agg[7], lw=1, color='grey', zorder=1, label=name)
    ax.scatter(agg[3], agg[7], cmap=cmap, norm=norm, c=agg[4], zorder=2, s=90)

    map = mpl.cm.get_cmap(colors[counter])
    colorhash[name] = map(0.7)
    counter += 1
# The following two lines generate custom fake lines that will be used as legend entries:
markers = [plt.Line2D([0, 0], [0, 0], color=color, marker='o', linestyle='') for color in colorhash.values()]
ax.legend(markers, colorhash.keys(), numpoints=1, loc='upper left', prop={'size': 8}, markerscale=1,frameon=True)

ax.grid(b=False)
ax.set_title('random')
ax.set_xlabel('precision (true positive rate)')
ax.set_ylabel('sensitivity (positive predictive value)')

fig.subplots_adjust(right=0.8)
cbar_ax = fig.add_axes([0.85, 0.15, 0.05, 0.7])
fig.colorbar(cax, cax=cbar_ax, label="rate of missing values")
fig.savefig("indels_random.pdf",bbox_inches='tight')
#plt.show()



####################################################################

x = badsite.groupby('Method', sort=False)
fig, ax = plt.subplots(figsize=(6, 4))
counter = 0
colorhash = collections.OrderedDict()
for name, group in x:
    df_sel = badsite.loc[df['Method'] == name]
    agg = df_sel.groupby(pd.cut(df_sel['rate'], (0, 8, 16, 24, 32, 41))).aggregate(np.mean)
    cmap = colors[counter]
    norm = mpl.colors.Normalize(vmin=0.00001, vmax=41)
    # fake plot for colorbar
    cax = ax.scatter(agg[3], agg[7], cmap=mpl.cm.Greys, norm=norm, c=agg[4], zorder=0, s=0)

    ax.plot(agg[3], agg[7], lw=1, color='grey', zorder=1, label=name)
    ax.scatter(agg[3], agg[7], cmap=cmap, norm=norm, c=agg[4], zorder=2, s=90)

    map = mpl.cm.get_cmap(colors[counter])
    colorhash[name] = map(0.7)
    counter += 1
# The following two lines generate custom fake lines that will be used as legend entries:
markers = [plt.Line2D([0, 0], [0, 0], color=color, marker='o', linestyle='') for color in colorhash.values()]
ax.legend(markers, colorhash.keys(), numpoints=1, loc='upper left', prop={'size': 8}, markerscale=1,frameon=True)

ax.grid(b=False)
ax.set_title('badsite')
ax.set_xlabel('precision (true positive rate)')
ax.set_ylabel('sensitivity (positive predictive value)')

fig.subplots_adjust(right=0.8)
cbar_ax = fig.add_axes([0.85, 0.15, 0.05, 0.7])
fig.colorbar(cax, cax=cbar_ax, label="rate of missing values")
fig.savefig("indels_badsite.pdf",bbox_inches='tight')
#plt.show()


####################################################################

x = badseq.groupby('Method', sort=False)
fig, ax = plt.subplots(figsize=(6, 4))
counter = 0
colorhash = collections.OrderedDict()
for name, group in x:
    df_sel = badseq.loc[df['Method'] == name]
    agg = df_sel.groupby(pd.cut(df_sel['rate'], (0, 400, 800, 1200, 1600, 2000))).aggregate(np.mean)
    cmap = colors[counter]
    norm = mpl.colors.Normalize(vmin=0.00001, vmax=2001)
    # fake plot for colorbar
    cax = ax.scatter(agg[3], agg[7], cmap=mpl.cm.Greys, norm=norm, c=agg[4], zorder=0, s=0)

    ax.plot(agg[3], agg[7], lw=1, color='grey', zorder=1, label=name)
    ax.scatter(agg[3], agg[7], cmap=cmap, norm=norm, c=agg[4], zorder=2, s=90)

    map = mpl.cm.get_cmap(colors[counter])
    colorhash[name] = map(0.7)
    counter += 1
# The following two lines generate custom fake lines that will be used as legend entries:
markers = [plt.Line2D([0, 0], [0, 0], color=color, marker='o', linestyle='') for color in colorhash.values()]
ax.legend(markers, colorhash.keys(), numpoints=1, loc='upper left', prop={'size': 8}, markerscale=1,frameon=True)

ax.grid(b=False)
ax.set_title('badseq')
ax.set_xlabel('precision (true positive rate)')
ax.set_ylabel('sensitivity (positive predictive value)')

fig.subplots_adjust(right=0.8)
cbar_ax = fig.add_axes([0.85, 0.15, 0.05, 0.7])
fig.colorbar(cax, cax=cbar_ax, label="rate of missing values")
fig.savefig("indels_badseq.pdf",bbox_inches='tight')
#plt.show()


