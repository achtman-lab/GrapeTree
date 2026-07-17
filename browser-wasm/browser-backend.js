'use strict';

(function exposeBrowserBackend(global) {
  const missingValues = new Set(['0', 'N', '-']);

  function sanitiseName(name) {
    return name.replace(/[() ,"';]/g, '_');
  }

  function parseProfile(text, handleMissing = 'pair_delete') {
    const lines = text.split(/\r?\n/);
    let alleleColumns = null;
    let format = null;
    let firstRecord = -1;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.trim()) continue;
      if (line.startsWith('#')) {
        if (!line.startsWith('##')) {
          alleleColumns = line.trim().split('\t')
            .map((column, id) => ({ column, id }))
            .filter(({ column, id }) => id > 0 && !column.startsWith('#') && !['st', 'st_id'].includes(column.toLowerCase()))
            .map(({ id }) => id);
        }
        continue;
      }
      format = line.startsWith('>') ? 'fasta' : 'profile';
      firstRecord = index;
      if (format === 'profile' && alleleColumns === null) {
        alleleColumns = line.trim().split('\t')
          .map((column, id) => ({ column, id }))
          .filter(({ column, id }) => id > 0 && !column.startsWith('#') && !['st', 'st_id'].includes(column.toLowerCase()))
          .map(({ id }) => id);
        firstRecord += 1;
      }
      break;
    }
    if (format === null) throw new Error('Profile input contains no sequence or profile records.');

    const names = [];
    const rawProfiles = [];
    if (format === 'fasta') {
      for (const line of lines.slice(firstRecord)) {
        if (line.startsWith('>')) {
          names.push(line.slice(1).trim().split(/\s+/)[0]);
          rawProfiles.push([]);
        } else if (rawProfiles.length) {
          rawProfiles.at(-1).push(...line.trim());
        }
      }
    } else {
      for (const line of lines.slice(firstRecord)) {
        if (!line.trim()) continue;
        const fields = line.trim().split('\t');
        if (!fields[0]) continue;
        names.push(fields[0]);
        rawProfiles.push(alleleColumns.map((column) => fields[column]));
      }
    }
    if (!names.length) throw new Error('Profile input contains no sequence or profile records.');
    if (new Set(rawProfiles.map((row) => row.length)).size !== 1) {
      throw new Error('Every profile must contain the same number of loci.');
    }

    const cleanNames = names.map(sanitiseName);
    const duplicate = cleanNames.find((name, index) => cleanNames.indexOf(name) !== index);
    if (duplicate) throw new Error(`Duplicate taxon names after sanitising: ${duplicate}`);

    let encoded = rawProfiles.map((row) => row.map((value) => String(value).toUpperCase()));
    for (let locus = 0; locus < encoded[0].length; locus += 1) {
      const values = [...new Set(encoded.map((row) => row[locus]))].sort();
      const ids = new Map(values.map((value, index) => [value, index + 1]));
      encoded = encoded.map((row) => row.map((value, index) => (
        index === locus ? (missingValues.has(value) ? 0 : ids.get(value)) : value
      )));
    }
    if (handleMissing === 'complete_delete') {
      const retained = encoded[0].map((_, locus) => encoded.every((row) => row[locus] !== 0));
      encoded = encoded.map((row) => row.filter((_, locus) => retained[locus]));
    }

    const order = cleanNames.map((_, index) => index).sort((left, right) => {
      for (let locus = encoded[0].length - 1; locus >= 0; locus -= 1) {
        if (encoded[left][locus] !== encoded[right][locus]) return encoded[left][locus] - encoded[right][locus];
      }
      return 0;
    });
    const uniqueNames = [];
    const uniqueProfiles = [];
    const embedded = {};
    for (const index of order) {
      const profile = encoded[index];
      if (!profile.some((value) => value > 0)) continue;
      const previous = uniqueProfiles.at(-1);
      if (previous && profile.every((value, locus) => value === previous[locus])) {
        embedded[uniqueNames.at(-1)].push(cleanNames[index]);
      } else {
        uniqueNames.push(cleanNames[index]);
        uniqueProfiles.push(profile);
        embedded[cleanNames[index]] = [cleanNames[index]];
      }
    }
    if (uniqueNames.length < 2) throw new Error('At least two distinct, non-empty profiles are required.');
    return { names: uniqueNames, profiles: uniqueProfiles, embedded };
  }

  function symmetricDistance(profiles, mode) {
    const size = profiles.length;
    const loci = profiles[0].length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));
    for (let right = 0; right < size; right += 1) {
      for (let left = 0; left < right; left += 1) {
        let comparable = 0;
        let differences = 0;
        for (let locus = 0; locus < loci; locus += 1) {
          const present = mode === 'as_allele' || (profiles[left][locus] > 0 && profiles[right][locus] > 0);
          if (!present) continue;
          comparable += 1;
          if (profiles[left][locus] !== profiles[right][locus]) differences += 1;
        }
        const distance = mode === 'pair_delete'
          ? ((differences + 0.01) * loci) / (comparable + 0.01)
          : differences;
        matrix[left][right] = distance;
        matrix[right][left] = distance;
      }
    }
    return matrix;
  }

  function asymmetricDistance(profiles, mode) {
    const size = profiles.length;
    const loci = profiles[0].length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));
    for (let target = 0; target < size; target += 1) {
      const targetPresence = profiles[target].filter((value) => value > 0).length;
      for (let source = 0; source < size; source += 1) {
        let differences = 0;
        for (let locus = 0; locus < loci; locus += 1) {
          if (profiles[target][locus] > 0 && profiles[source][locus] !== profiles[target][locus]) differences += 1;
        }
        matrix[source][target] = Math.fround(mode === 'absolute_distance'
          ? differences
          : differences * loci / targetPresence);
      }
    }
    return matrix;
  }

  function harmonicWeights(matrix, groupSizes) {
    const size = matrix.length;
    const raw = matrix.map((row) => {
      let sum = Math.fround(0);
      for (const value of row) {
        const denominator = Math.fround(Math.fround(value) + Math.fround(0.1));
        sum = Math.fround(sum + Math.fround(1 / denominator));
      }
      return Math.fround(size / sum);
    });
    const order = raw.map((_, index) => index).sort((left, right) => (
      raw[left] - raw[right]
      || groupSizes[right] - groupSizes[left]
      || left - right
    ));
    const weights = Array(size);
    // NumPy keeps this array as float32 because it is assigned back into the
    // float32 harmonic-score array. Reproduce that precision before Edmonds
    // and branch recrafting so close ties follow the native path.
    order.forEach((index, rank) => { weights[index] = Math.fround(rank / size); });
    return weights;
  }

  function eburstWeights(matrix, groupSizes) {
    const maximum = Math.max(...matrix.flat().map((value) => Math.trunc(value))) + 1;
    const counts = matrix.map((row, index) => {
      const bins = Array(maximum + 1).fill(0);
      row.forEach((value) => { bins[Math.trunc(value)] += 1; });
      bins[maximum] += 1;
      bins[0] += groupSizes[index];
      return bins;
    });
    const order = counts.map((_, index) => index).sort((left, right) => {
      for (let distance = 1; distance <= maximum; distance += 1) {
        if (counts[left][distance] !== counts[right][distance]) return counts[right][distance] - counts[left][distance];
      }
      return counts[right][0] - counts[left][0] || left - right;
    });
    const weights = Array(matrix.length);
    order.forEach((index, rank) => { weights[index] = rank / matrix.length; });
    return weights;
  }

  function symmetricTree(matrix, weights) {
    const parents = matrix.map((_, index) => index);
    const find = (node) => {
      while (parents[node] !== node) {
        parents[node] = parents[parents[node]];
        node = parents[node];
      }
      return node;
    };
    const edges = [];
    for (let target = 0; target < matrix.length; target += 1) {
      for (let source = 0; source < target; source += 1) {
        edges.push([source, target, Math.trunc(Math.round(matrix[source][target]) + Math.min(weights[source], weights[target]))]);
      }
    }
    edges.sort((left, right) => left[2] - right[2]);
    const tree = [];
    for (const edge of edges) {
      const left = find(edge[0]);
      const right = find(edge[1]);
      if (left === right) continue;
      parents[right] = left;
      tree.push(edge);
      if (tree.length === matrix.length - 1) break;
    }
    return tree;
  }

  function shortcutLinks(matrix, weights) {
    const cutoff = matrix.length < 3000 ? 2 : matrix.length < 10000 ? 5 : matrix.length < 30000 ? 10 : 20;
    const links = [];
    for (let target = 0; target < matrix.length; target += 1) {
      let best = null;
      for (let source = 0; source < matrix.length; source += 1) {
        if (matrix[source][target] >= cutoff + 1 || weights[source] >= weights[target]) continue;
        const score = matrix[source][target] + weights[source];
        if (best === null || score < best[2]) best = [source, target, score];
      }
      if (best !== null) links.push(best.map(Math.trunc));
    }
    return links;
  }

  function contemporary(inputA0, inputA1, inputB, inputC, loci) {
    const a0 = Math.max(Math.min(inputA0, loci - 0.5), 0.5);
    const a1 = Math.max(Math.min(inputA1, loci - 0.5), 0.5);
    const b = Math.max(Math.min(inputB, loci - 0.5), 0.5);
    const c = Math.max(Math.min(inputC, loci - 0.5), 0.5);
    if (b >= a0 + c && b >= a1 + c) return false;
    if (b === c) return true;
    const s11 = Math.sqrt(1 - a0 / loci);
    const s12 = (2 * loci - b - c) / (2 * Math.sqrt(loci * (loci - a0)));
    const v = 1 - (((loci - a1) * (loci - c) / loci) + (loci - b)) / (2 * loci);
    const s21 = 1 + a1 * v / (b - 2 * loci * v);
    const s22 = 1 + c * v / (b - 2 * loci * v);
    const p1 = a0 * Math.log(1 - s11 * s11)
      + (loci - a0) * Math.log(s11 * s11)
      + (b + c) * Math.log(1 - s11 * s12)
      + (2 * loci - b - c) * Math.log(s11 * s12);
    const p2 = a1 * Math.log(1 - s21)
      + (loci - a1) * Math.log(s21)
      + b * Math.log(1 - s21 * s22)
      + (loci - b) * Math.log(s21 * s22)
      + c * Math.log(1 - s22)
      + (loci - c) * Math.log(s22);
    return p1 >= p2;
  }

  function branchRecraft(inputBranches, matrix, weights, loci) {
    const branches = inputBranches.map((edge) => [...edge]).sort((left, right) => (
      matrix[left[0]][left[1]] - matrix[right[0]][right[1]]
      || Math.min(weights[left[0]], weights[left[1]]) - Math.min(weights[right[0]], weights[right[1]])
      || Math.max(weights[left[0]], weights[left[1]]) - Math.max(weights[right[0]], weights[right[1]])
    ));
    const nodes = [...new Set(branches.flatMap((edge) => edge.slice(0, 2)))];
    const groupId = Object.fromEntries(nodes.map((node) => [node, node]));
    const groups = Object.fromEntries(nodes.map((node) => [node, [node]]));
    const children = Object.fromEntries(nodes.map((node) => [node, []]));
    let index = 0;
    while (index < branches.length) {
      let [source, target] = branches[index];
      const sources = [...groups[groupId[source]]];
      const targets = [...groups[groupId[target]]];
      const tried = {};
      if (sources.length > 1) {
        const candidates = sources.map((node) => [weights[node], matrix[node][target], node]).sort(tupleCompare).slice(0, 3);
        for (const [, distance, node] of candidates) {
          if (node === source) break;
          if (distance < 1.5 * matrix[source][target] && contemporary(matrix[node][source], matrix[source][node], distance, matrix[source][target], loci)) {
            tried[source] = node; source = node; break;
          }
        }
        while (!(source in tried)) {
          tried[source] = source;
          const middle = children[source].filter((node) => !(node in tried) && matrix[node][target] < 2 * matrix[source][target])
            .map((node) => [weights[node], matrix[node][target], node]).sort(tupleCompare);
          for (const [, distance, node] of middle) {
            if (distance < matrix[source][target] && !contemporary(matrix[source][node], matrix[node][source], matrix[source][target], distance, loci)) {
              tried[source] = node; source = node; break;
            }
            if (distance >= matrix[source][target] && weights[node] < weights[source] && contemporary(matrix[node][source], matrix[source][node], distance, matrix[source][target], loci)) {
              tried[source] = node; source = node; break;
            }
            tried[node] = source;
          }
        }
      }
      if (targets.length > 1) {
        const candidates = targets.map((node) => [weights[node], matrix[source][node], node]).sort(tupleCompare).slice(0, 3);
        let lastCandidate = target;
        for (const [, distance, node] of candidates) {
          lastCandidate = node;
          if (node === target) break;
          if (distance < 1.5 * matrix[source][target] && contemporary(matrix[node][target], matrix[target][node], distance, matrix[source][target], loci)) {
            tried[target] = node; target = node; break;
          }
        }
        while (!(target in tried)) {
          tried[target] = target;
          const middle = children[target].filter((node) => !(node in tried) && matrix[source][node] < 2 * matrix[source][target])
            .map((node) => [weights[node], matrix[source][node], node]).sort(tupleCompare);
          for (const [, distance, node] of middle) {
            if (distance < matrix[source][target] && !contemporary(matrix[target][lastCandidate], matrix[lastCandidate][target], matrix[source][target], distance, loci)) {
              // The established Python routine uses the final candidate from
              // the preceding loop here, rather than the current middle node.
              tried[target] = lastCandidate; target = lastCandidate; break;
            }
            if (distance >= matrix[source][target] && weights[node] < weights[target] && contemporary(matrix[lastCandidate][target], matrix[target][lastCandidate], distance, matrix[source][target], loci)) {
              tried[target] = lastCandidate; target = lastCandidate; break;
            }
            tried[lastCandidate] = target;
          }
        }
      }
      const length = matrix[source][target];
      branches[index] = [source, target, length];
      if (index >= branches.length - 1 || branches[index + 1][2] >= length) {
        const oldTargetGroup = groupId[target];
        targets.forEach((node) => { groupId[node] = groupId[source]; });
        groups[groupId[source]].push(...(groups[oldTargetGroup] || []));
        delete groups[oldTargetGroup];
        children[source].push(target);
        children[target].push(source);
        index += 1;
      } else {
        const tail = branches.slice(index).sort((left, right) => left[2] - right[2]);
        branches.splice(index, tail.length, ...tail);
      }
    }
    return branches;
  }

  function tupleCompare(left, right) {
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return left.length - right.length;
  }

  function nativeEdmondsValue(distance, weight, diagonal = false) {
    const roundedDistance = diagonal
      ? Math.fround(0)
      : Math.fround(Math.fround(Math.round(distance)) + weight);
    return Number(Math.fround(roundedDistance + Math.fround(0.999995)).toFixed(5));
  }

  async function asymmetricTree(matrix, weights, runEdmonds) {
    const original = matrix.map((row) => [...row]);
    const working = matrix.map((row) => [...row]);
    const shortcuts = shortcutLinks(working, weights);
    const removed = new Set(shortcuts.map((edge) => edge[1]));
    for (const [source, target] of shortcuts) {
      for (let column = 0; column < working.length; column += 1) {
        if (working[source][column] > working[target][column]) working[source][column] = working[target][column];
      }
    }
    const presence = working.map((_, index) => index).filter((index) => !removed.has(index));
    if (presence.length <= 1) return { branches: shortcuts, original };
    const reduced = presence.map((source, row) => presence.map((target, column) => {
      // NumPy retains float32 precision here, then serialises five decimal
      // places before invoking Edmonds. Both details affect exact ties.
      return nativeEdmondsValue(working[source][target], weights[source], row === column);
    }));
    const wasmEdges = await runEdmonds(reduced);
    const branches = wasmEdges.map((edge) => [
      presence[edge.source], presence[edge.target], Math.trunc(edge.weight) - 1,
    ]);
    return { branches: branches.concat(shortcuts), original };
  }

  function symmetricLink(profiles, links, mode) {
    return links.map(([source, target]) => {
      let distance = 0;
      for (let locus = 0; locus < profiles[0].length; locus += 1) {
        const present = mode === 'as_allele' || (profiles[source][locus] > 0 && profiles[target][locus] > 0);
        if (present && profiles[source][locus] !== profiles[target][locus]) distance += 1;
      }
      return [source, target, distance];
    });
  }

  function networkToNewick(inputLinks, names, embedded) {
    let links = inputLinks.map((edge) => [...edge]).sort((left, right) => right[2] - left[2]);
    const oriented = [];
    const inUse = new Set([links[0][0]]);
    while (links.length) {
      const remain = [];
      for (const edge of links) {
        if (inUse.has(edge[0])) {
          oriented.push(edge); inUse.add(edge[1]);
        } else if (inUse.has(edge[1])) {
          oriented.push([edge[1], edge[0], edge[2]]); inUse.add(edge[0]);
        } else remain.push(edge);
      }
      if (remain.length === links.length) throw new Error('Tree links are disconnected.');
      links = remain;
    }
    const root = { id: oriented[0][0], distance: null, children: [] };
    const nodes = { [root.id]: root };
    for (const [source, target, distance] of oriented) {
      const child = { id: target, distance, children: [] };
      nodes[source].children.push(child);
      nodes[target] = child;
    }
    function serialise(node) {
      let body;
      if (node.children.length) {
        const own = leafText(names[node.id], 0, embedded);
        body = `(${node.children.map(serialise).concat(own).join(',')})`;
      } else {
        body = leafText(names[node.id], null, embedded);
      }
      return node.distance === null ? body : `${body}:${formatDistance(node.distance)}`;
    }
    return `${serialise(root)};`;
  }

  function leafText(name, forcedDistance, embedded) {
    const group = embedded[name];
    const base = group.length > 1 ? `(${group.map((member) => `${member}:0`).join(',')})` : name;
    return forcedDistance === null ? base : `${base}:${formatDistance(forcedDistance)}`;
  }

  function formatDistance(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  }

  function expandNumericNewick(newick, names, embedded) {
    return newick.replace(/(^|[(,])'?(\d+)'?(?=:)/g, (match, prefix, rawIndex) => {
      const name = names[Number(rawIndex)];
      if (name === undefined) throw new Error(`RapidNJ returned unknown taxon index: ${rawIndex}`);
      const group = embedded[name];
      const label = group.length > 1
        ? `(${group.map((member) => `${member}:0`).join(',')})`
        : name;
      return `${prefix}${label}`;
    });
  }

  function eteLegacyMidpointUnroot(newick) {
    const tokens = newick.match(/[^\s(),:;]+|[(),:;]/g);
    let position = 0;
    function parse(parent = null) {
      const node = { children: [], label: '', length: 0, parent };
      if (tokens[position] === '(') {
        position += 1;
        do {
          node.children.push(parse(node));
          if (tokens[position] === ',') position += 1;
          else break;
        } while (position < tokens.length);
        if (tokens[position] !== ')') throw new Error('RapidNJ returned invalid Newick.');
        position += 1;
        if (![':', ',', ')', ';'].includes(tokens[position])) {
          node.label = tokens[position++];
        }
      } else {
        node.label = tokens[position++];
      }
      if (tokens[position] === ':') {
        position += 1;
        node.length = Number(tokens[position++]);
      }
      return node;
    }
    const root = parse();
    const leaves = [];
    (function collect(node) {
      if (!node.children.length) leaves.push(node);
      node.children.forEach(collect);
    }(root));
    function pathToRoot(node) {
      const path = [];
      let distance = 0;
      while (node) {
        path.push([node, distance]);
        distance += node.length;
        node = node.parent;
      }
      return path;
    }
    function distance(left, right) {
      const leftPath = new Map(pathToRoot(left));
      for (const [node, rightDistance] of pathToRoot(right)) {
        if (leftPath.has(node)) return leftPath.get(node) + rightDistance;
      }
      return 0;
    }
    let first = leaves[0];
    let rootDistance = -Infinity;
    for (const leaf of leaves) {
      const value = distance(root, leaf);
      if (value > rootDistance) { first = leaf; rootDistance = value; }
    }
    let diameter = -Infinity;
    for (const leaf of leaves) {
      const value = distance(first, leaf);
      if (value > diameter) diameter = value;
    }
    let current = first;
    let climbed = 0;
    while (current) {
      climbed += current.length;
      if (climbed > diameter / 2) break;
      current = current.parent;
    }
    if (!current || current === root) current = root.children[0];
    current.length /= 2;

    function serialise(node) {
      const body = node.children.length
        ? `(${node.children.map(serialise).join(',')})${node.label}`
        : node.label;
      return node.parent ? `${body}:${formatDistance(node.length)}` : body;
    }
    return `${serialise(root)};`;
  }

  function neighbourJoiningNewick(inputMatrix) {
    let matrix = inputMatrix.map((row) => row.map((value) => Number(value.toFixed(6))));
    let nodes = matrix.map((_, index) => String(index));
    while (nodes.length > 3) {
      const size = nodes.length;
      const totals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
      let bestLeft = 0;
      let bestRight = 1;
      let bestScore = Infinity;
      for (let left = 0; left < size; left += 1) {
        for (let right = left + 1; right < size; right += 1) {
          const score = (size - 2) * matrix[left][right] - totals[left] - totals[right];
          if (score < bestScore) {
            bestScore = score; bestLeft = left; bestRight = right;
          }
        }
      }
      const pairDistance = matrix[bestLeft][bestRight];
      const leftLength = pairDistance / 2 + (totals[bestLeft] - totals[bestRight]) / (2 * (size - 2));
      const rightLength = pairDistance - leftLength;
      const joined = `(${nodes[bestLeft]}:${formatDistance(leftLength)},${nodes[bestRight]}:${formatDistance(rightLength)})`;
      const retained = nodes.map((_, index) => index).filter((index) => index !== bestLeft && index !== bestRight);
      const nextNodes = retained.map((index) => nodes[index]).concat(joined);
      const nextMatrix = Array.from({ length: size - 1 }, () => Array(size - 1).fill(0));
      for (let row = 0; row < retained.length; row += 1) {
        for (let column = 0; column < retained.length; column += 1) {
          nextMatrix[row][column] = matrix[retained[row]][retained[column]];
        }
        const joinedDistance = (
          matrix[retained[row]][bestLeft]
          + matrix[retained[row]][bestRight]
          - pairDistance
        ) / 2;
        nextMatrix[row][retained.length] = joinedDistance;
        nextMatrix[retained.length][row] = joinedDistance;
      }
      nodes = nextNodes;
      matrix = nextMatrix;
    }
    const [a, b, c] = nodes;
    const ab = matrix[0][1];
    const ac = matrix[0][2];
    const bc = matrix[1][2];
    const aLength = (ab + ac - bc) / 2;
    const bLength = (ab + bc - ac) / 2;
    const cLength = (ac + bc - ab) / 2;
    return `(${a}:${formatDistance(aLength)},${b}:${formatDistance(bLength)},${c}:${formatDistance(cLength)});`;
  }

  async function calculateProfile(text, options, runners) {
    const method = options.method || 'MSTreeV2';
    const mode = options.handleMissing || 'pair_delete';
    const parsed = parseProfile(text, mode);
    let matrix;
    let weights;
    let links;
    if (method === 'distance') {
      matrix = symmetricDistance(parsed.profiles, mode);
      if (mode !== 'absolute_distance') {
        matrix = matrix.map((row) => row.map((value) => value / parsed.profiles[0].length));
      }
      const expanded = parsed.names.flatMap((name, index) => (
        parsed.embedded[name].map((member) => ({ name: member, index }))
      )).sort((left, right) => left.index - right.index || left.name.localeCompare(right.name));
      return {
        method,
        names: expanded.map(({ name }) => name),
        matrix: expanded.map(({ index: row }) => expanded.map(({ index: column }) => matrix[row][column])),
      };
    }
    if (method === 'RapidNJ') {
      matrix = symmetricDistance(parsed.profiles, mode);
      const newick = eteLegacyMidpointUnroot(await runners.rapidNJ(matrix));
      return {
        method,
        names: parsed.names,
        newick: expandNumericNewick(newick, parsed.names, parsed.embedded),
      };
    }
    if (method === 'NJ') {
      matrix = symmetricDistance(parsed.profiles, mode);
      const newick = eteLegacyMidpointUnroot(neighbourJoiningNewick(matrix));
      return {
        method,
        names: parsed.names,
        newick: expandNumericNewick(newick, parsed.names, parsed.embedded),
      };
    }
    if (method === 'MSTree') {
      matrix = symmetricDistance(parsed.profiles, mode);
      weights = eburstWeights(matrix, parsed.names.map((name) => parsed.embedded[name].length));
      links = symmetricTree(matrix, weights);
    } else if (method === 'MSTreeV2') {
      matrix = asymmetricDistance(parsed.profiles, mode);
      weights = harmonicWeights(
        matrix,
        parsed.names.map((name) => parsed.embedded[name].length),
      );
      const result = await asymmetricTree(matrix, weights, runners.edmonds);
      links = branchRecraft(result.branches, result.original, weights, options.totalLoci || parsed.profiles[0].length);
    } else {
      throw new Error(`Browser backend does not yet support method: ${method}`);
    }
    links = symmetricLink(parsed.profiles, links, mode);
    return {
      method,
      names: parsed.names,
      links,
      newick: networkToNewick(links, parsed.names, parsed.embedded),
    };
  }

  global.GrapeTreeBrowserBackend = {
    calculateProfile,
    parseProfile,
    testHooks: Object.freeze({ branchRecraft, nativeEdmondsValue }),
  };
}(self));
