from setuptools import setup

setup(
    name='GrapeTree',    # This is the name of your PyPI-package.
	description='Web interface of GrapTree, which is a program for phylogenetic analysis.',
	license='GPLv3',
	url='https://github.com/martinSergeant/EnteroMSTree',
    version='1.0',                          # Update the version number for new releases
    scripts=['GTree'],                  # The name of your scipt, and also the command you'll be using for calling it
	install_requires=['DendroPy', 'numpy', 'Flask', 'networkx'],
	include_package_data=True
)
