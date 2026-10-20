export type Step =
  | { type: 'compare'; i: number; j: number; line?: number }
  | { type: 'swap'; i: number; j: number; line?: number }
  | { type: 'overwrite'; index: number; value: number; line?: number }
  | { type: 'pivot'; index: number; line?: number }
  | { type: 'range'; lo: number; hi: number; line?: number }
  | { type: 'markSorted'; index: number; line?: number }
  | { type: 'done' };

export type BarStatus =
  | 'idle'
  | 'comparing'
  | 'swapping'
  | 'pivot'
  | 'sorted'
  | 'inRange';

export type Bar = {
  id: string;
  value: number;
  status: BarStatus;
};

export type BarState = Bar[];

export type Algorithm = (input: number[]) => Generator<Step>;

export type IndexCounters = {
  comparisons: number[];
  writes: number[];
  swaps: number;
  totalWrites: number;
};