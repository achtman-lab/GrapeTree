"""Portable exports for GrapeTree visualisations and tree networks."""

import csv
import io
import json
from pathlib import Path

import networkx as nx
from ete3 import Tree


def read_text(path):
    return Path(path).read_text(encoding='utf-8')


def parse_metadata(text):
    if not text:
        return {}, []

    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return {}, []
    delimiter = ',' if ',' in lines[0] and '\t' not in lines[0] else '\t'
    reader = csv.DictReader(lines, delimiter=delimiter)
    headers = reader.fieldnames or []
    if not headers:
        raise ValueError('Metadata has no header row')
    identifier = 'ID' if 'ID' in headers else headers[0]
    metadata = {}
    for row_number, row in enumerate(reader, 2):
        node_id = (row.get(identifier) or '').strip()
        if not node_id:
            raise ValueError(
                'Metadata row {0} has no {1} value'.format(
                    row_number, identifier
                )
            )
        if node_id in metadata:
            raise ValueError('Duplicate metadata ID: {0}'.format(node_id))
        normalised = {key: value or '' for key, value in row.items()}
        normalised['ID'] = node_id
        metadata[node_id] = normalised
    return metadata, headers


def visualisation_document(newick, metadata_text=None):
    """Return a minimal JSON document accepted by the existing browser UI."""
    # Parse before writing the document so malformed trees fail at the CLI.
    Tree(newick, format=1)
    metadata, headers = parse_metadata(metadata_text)
    options = {
        'nothing': {
            'label': 'No Category',
            'coltype': 'character',
            'grouptype': 'size',
            'colorscheme': 'category',
            'minnum': 0,
            'category_num': 30,
        }
    }
    for header in headers:
        options[header] = {
            'label': header,
            'coltype': 'character',
            'grouptype': 'size',
            'colorscheme': 'category',
            'minnum': 0,
            'category_num': 30,
        }

    return {
        'nwk': newick.strip(),
        'layout_algorithm': 'greedy',
        'metadata': metadata,
        'metadata_options': options,
        'initial_category': headers[1] if len(headers) > 1 else 'nothing',
        'category_num': 30,
    }


def tree_network(newick):
    tree = Tree(newick, format=1)
    graph = nx.Graph()
    identifiers = {}
    hypothetical_index = 0
    for node in tree.traverse('preorder'):
        if node.is_leaf():
            node_id = node.name
            if not node_id:
                raise ValueError('Tree contains an unnamed leaf')
            hypothetical = False
        else:
            node_id = '_hypo_{0}'.format(hypothetical_index)
            hypothetical_index += 1
            hypothetical = True
        if node_id in graph:
            raise ValueError('Tree contains a duplicate node name: {0}'.format(node_id))
        identifiers[node] = node_id
        graph.add_node(
            node_id,
            label=node_id,
            hypothetical=hypothetical,
        )
        if node.up is not None:
            graph.add_edge(
                identifiers[node.up],
                node_id,
                distance=float(node.dist),
            )
    return graph


def network_document(newick, output_format):
    graph = tree_network(newick)
    if output_format == 'graphml':
        return '\n'.join(nx.generate_graphml(graph)) + '\n'
    if output_format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output, lineterminator='\n')
        writer.writerow(['source', 'target', 'distance'])
        for source, target, data in graph.edges(data=True):
            writer.writerow([source, target, data['distance']])
        return output.getvalue()
    if output_format == 'json':
        document = {
            'nodes': [
                {'id': node_id, **attributes}
                for node_id, attributes in graph.nodes(data=True)
            ],
            'links': [
                {
                    'source': source,
                    'target': target,
                    'distance': attributes['distance'],
                }
                for source, target, attributes in graph.edges(data=True)
            ],
        }
        return json.dumps(document, indent=2, sort_keys=True) + '\n'
    raise ValueError('Unknown network format: {0}'.format(output_format))
