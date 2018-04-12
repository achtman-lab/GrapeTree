"""A setuptools based setup module for Grapetree.

See:
https://packaging.python.org/en/latest/distributing.html
https://github.com/pypa/sampleproject
"""

from setuptools import setup, find_packages
from codecs import open
from os import path

here = path.abspath(path.dirname(__file__))

with open(path.join(here, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()
    
setup(
    name='grapetree',  
    version='1.1.8',  
    description='Web interface of GrapTree, which is a program for phylogenetic analysis.',
    long_description=long_description, 
    long_description_content_type='text/markdown',  
    url='https://github.com/martinSergeant/EnteroMSTree',
    author='EnteroBase development team',  
    author_email='zhemin.zhou@warwick.ac.uk', 
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
    packages=['grapetree'], 
    install_requires=['DendroPy', 'numpy', 'Flask', 'networkx', 'numpy', 'psutil'],
    entry_points={
        'console_scripts': [
            'grapetree=main:main',
        ],
    },
    scripts=['MSTrees.py'],
    project_urls={ 
        'Bug Reports': 'https://github.com/martinSergeant/EnteroMSTree/issues',
        'Source': 'https://github.com/martinSergeant/EnteroMSTree',
    },
)