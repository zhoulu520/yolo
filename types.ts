
export enum TreeState {
  CLOSED = 'CLOSED',
  SCATTERED = 'SCATTERED'
}

export interface HandData {
  isOpen: boolean;
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number };
  detected: boolean;
}

export interface OrnamentData {
  initialPos: [number, number, number];
  treePos: [number, number, number];
  scatterPos: [number, number, number];
  type: 'sphere' | 'box' | 'cone';
  color: string;
  size: number;
}
