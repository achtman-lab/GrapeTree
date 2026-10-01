const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// These are parser-level checks; the review UI suite covers actual file loading.
const context = { self: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,
  '../../browser-wasm/browser-backend.js'), 'utf8'), context);
const parse = context.self.GrapeTreeBrowserBackend.parseProfile;

test('a truncated profile row cannot fabricate an allele', () => {
  expect(() => parse('#Strain\tA\tB\na\t1\t1\nb\t2\n')).toThrow(/missing locus column/);
  expect(() => parse('#Strain\tA\tB\na\t1\t1\nb\t2\t\n')).toThrow(/missing locus column/);
});

test('explicit missing alleles and ignored metadata columns remain valid', () => {
  const result = parse('#Strain\tA\t#Note\tB\na\t1\t\t1\nb\t2\t\t-\n');
  expect([...result.names].sort()).toEqual(['a', 'b']);
  expect(result.profiles.flat()).toContain(0);
});

test('FASTA whitespace is ignored as in the Python parser', () => {
  const compact = parse('>a\nACGT\n>b\nATGT\n');
  const wrapped = parse('>a description\nAC GT\n>b description\nAT\tGT\n');
  expect(JSON.stringify(wrapped)).toEqual(JSON.stringify(compact));
});
