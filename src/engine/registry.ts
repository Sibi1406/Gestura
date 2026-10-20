import { bubbleSort } from './algorithms/bubbleSort';
import { insertionSort } from './algorithms/insertionSort';
import { mergeSort } from './algorithms/mergeSort';
import { quickSort } from './algorithms/quickSort';
import type { Algorithm } from './types';

export const ALGORITHMS = {
  bubbleSort: {
    id: 'bubbleSort', name: 'Bubble Sort', best: 'O(n)', average: 'O(n^2)',
    worst: 'O(n^2)', space: 'O(1)', stable: true,
    description: 'Repeatedly swaps adjacent out-of-order values.',
    run: bubbleSort,
    java: `for (int end = a.length - 1; end > 0; end--) {\n  boolean swapped = false;\n  for (int i = 0; i < end; i++) {\n    if (a[i] > a[i + 1]) { swap(a, i, i + 1); swapped = true; }\n  }\n  if (!swapped) break;\n}`,
    python: `for end in range(len(a) - 1, 0, -1):\n    swapped = False\n    for i in range(end):\n        if a[i] > a[i + 1]:\n            a[i], a[i + 1] = a[i + 1], a[i]\n            swapped = True\n    if not swapped:\n        break`,
  },
  insertionSort: {
    id: 'insertionSort', name: 'Insertion Sort', best: 'O(n)', average: 'O(n^2)',
    worst: 'O(n^2)', space: 'O(1)', stable: true,
    description: 'Grows a sorted prefix by inserting each next value.',
    run: insertionSort,
    java: `for (int i = 1; i < a.length; i++) {\n  int j = i;\n  while (j > 0 && a[j - 1] > a[j]) {\n    swap(a, j - 1, j);\n    j--;\n  }\n}`,
    python: `for i in range(1, len(a)):\n    j = i\n    while j > 0 and a[j - 1] > a[j]:\n        a[j - 1], a[j] = a[j], a[j - 1]\n        j -= 1`,
  },
  mergeSort: {
    id: 'mergeSort', name: 'Merge Sort', best: 'O(n log n)', average: 'O(n log n)',
    worst: 'O(n log n)', space: 'O(n)', stable: true,
    description: 'Splits the array, then merges sorted halves.',
    run: mergeSort,
    java: `void mergeSort(int[] a, int lo, int hi) {\n  if (lo >= hi) return;\n  int mid = (lo + hi) / 2;\n  mergeSort(a, lo, mid);\n  mergeSort(a, mid + 1, hi);\n  merge(a, lo, mid, hi);\n}`,
    python: `def merge_sort(a):\n    if len(a) < 2:\n        return a\n    mid = len(a) // 2\n    left = merge_sort(a[:mid])\n    right = merge_sort(a[mid:])\n    return merge(left, right)`,
  },
  quickSort: {
    id: 'quickSort', name: 'Quick Sort', best: 'O(n log n)', average: 'O(n log n)',
    worst: 'O(n^2)', space: 'O(log n) average, O(n) worst', stable: false,
    description: 'Partitions around a pivot and sorts both sides.',
    run: quickSort,
    java: `void quickSort(int[] a, int lo, int hi) {\n  if (lo >= hi) return;\n  int pivot = a[hi];\n  int boundary = lo;\n  for (int i = lo; i < hi; i++) {\n    if (a[i] <= pivot) swap(a, boundary++, i);\n  }\n  swap(a, boundary, hi);\n  quickSort(a, lo, boundary - 1);\n  quickSort(a, boundary + 1, hi);\n}`,
    python: `def quick_sort(a, lo, hi):\n    if lo >= hi:\n        return\n    pivot = a[hi]\n    boundary = lo\n    for i in range(lo, hi):\n        if a[i] <= pivot:\n            a[boundary], a[i] = a[i], a[boundary]\n            boundary += 1\n    a[boundary], a[hi] = a[hi], a[boundary]\n    quick_sort(a, lo, boundary - 1)\n    quick_sort(a, boundary + 1, hi)`,
  },
} satisfies Record<string, {
  id: string;
  name: string;
  best: string;
  average: string;
  worst: string;
  space: string;
  stable: boolean;
  description: string;
  run: Algorithm;
  java: string;
  python: string;
}>;

export type AlgorithmId = keyof typeof ALGORITHMS;
export const ALGORITHM_LIST = Object.values(ALGORITHMS);