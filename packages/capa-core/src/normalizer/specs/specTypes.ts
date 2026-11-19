/**
 * Specification entry mapping a canonical AST feature path to UI feature taxonomy.
 */

import type { FeatureKind } from '../../types/capaTypes';

export interface FeatureSpec {
  major: string;
  middle: string;
  leaf: string;
  path: string;
  pathAlternatives?: string[];
  kind: FeatureKind;
  description?: string;
  bit?: number;
}
