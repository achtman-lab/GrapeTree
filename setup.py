"""A setuptools based setup module for Grapetree.

See:
https://packaging.python.org/en/latest/distributing.html
https://github.com/pypa/sampleproject
"""

from setuptools import setup, find_packages
from codecs import open
from os import path, walk
from grapetree.__main__ import __author_email__, __author__, __version__

def package_files(directory):
    paths = []
    for (pathz, directories, filenames) in walk(directory):
        for filename in filenames:
            paths.append(path.join('..', pathz, filename))
    return paths

here = path.abspath(path.dirname(__file__))

with open(path.join(here, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='grapetree',  
    version= __version__,  
    description='Web interface of GrapTree, which is a program for phylogenetic analysis.',
    long_description=long_description, 
    long_description_content_type='text/markdown',  
    url='https://github.com/martinSergeant/EnteroMSTree',
    author= __author__,  
    author_email= __author_email__, 
    classifiers=[  # Optional
        'Development Status :: 5 - Production/Stable',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
    ],
    py_modules=['MSTrees'],
    keywords='visulisation bioinformatics microbial genomics', 
    packages = ['grapetree'], 
    package_data={'templates':['*'],
                  'static': ['*']},
    install_requires=['DendroPy', 'numpy', 'Flask', 'networkx', 'numpy', 'psutil'],
    entry_points={
        'console_scripts': [
            'grapetree=grapetree.__main__:main',
        ],
    },
    scripts=['MSTrees.py'],
    include_package_data=True,
    project_urls={ 
        'Bug Reports': 'https://github.com/martinSergeant/EnteroMSTree/issues',
        'Source': 'https://github.com/martinSergeant/EnteroMSTree',
    },
)