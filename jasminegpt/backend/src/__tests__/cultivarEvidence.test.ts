import { extractEntities, resolveFollowup } from '../services/router/contextResolver';
import { reconcileSourcesAndEvidence } from '../services/conversation/citationReconciler';
import type { SourceDoc } from '../types';

describe('Cross-Cultivar Evidence Handling', () => {
  test('extractEntities identifies various cultivars including Baramasi, Mysuru Mallige, and Ramanathapuram Gundumalli', () => {
    expect(extractEntities('I grow Jasminum sambac cv. Ramanathapuram Gundumalli').cultivar).toBe('Ramanathapuram Gundumalli');
    expect(extractEntities('What pruning schedule is best for Baramasi jasmine?').cultivar).toBe('Baramasi');
    expect(extractEntities('Fertigation schedule for Mysuru Mallige').cultivar).toBe('Mysuru Mallige');
    expect(extractEntities('I have Double Mogra jasmine plants').cultivar).toBe('Double Mogra');
  });

  test('resolveFollowup retains cultivar from memory or explicit query', () => {
    const memory = { species: 'Jasminum sambac', cultivar: 'Ramanathapuram Gundumalli' };
    const turns = [{ role: 'user' as const, content: 'I grow Ramanathapuram Gundumalli' }];

    const res = resolveFollowup('What is the recommended pruning schedule?', turns, memory);
    expect(res.cultivar).toBe('Ramanathapuram Gundumalli');
  });

  test('reconcileSourcesAndEvidence reconciles both direct and related cultivar evidence citations', () => {
    const directSource: SourceDoc = {
      documentId: 'chunk-1',
      title: 'Studies on integrated nutrient management for growth and yield of Jasminum sambac Ait. CV. Ramanathapuram gundumalli',
      authors: 'Author A',
      year: 2020,
      species: 'Jasminum sambac',
    };

    const relatedSource: SourceDoc = {
      documentId: 'chunk-2',
      title: 'Effect of different level and time of pruning on growth and flowering in Mogra (Jasminum sambac) var. Local',
      authors: 'Author B',
      year: 2018,
      species: 'Jasminum sambac',
    };

    const content = `
### 1. Direct Answer
For Ramanathapuram Gundumalli, integrated nutrient management was evaluated for off-season yield, while pruning trials on related cultivars offer comparative context.

### 2. Evidence from Retrieved Studies

#### Direct Evidence (Ramanathapuram Gundumalli)
- **Paper Title**: Studies on integrated nutrient management for growth and yield of Jasminum sambac Ait. CV. Ramanathapuram gundumalli (Author A, 2020)
  - **Key Finding**: INM application enhanced off-season flowering.
  - **Experimental Conditions**: cv. Ramanathapuram Gundumalli.
  - **Reported Outcome**: High flower yield.

#### Related Cultivar Evidence (Local Mogra)
- **Paper Title**: Effect of different level and time of pruning on growth and flowering in Mogra (Jasminum sambac) var. Local (Author B, 2018)
  - **Key Finding**: 40 cm pruning improved flowering under Local Mogra experimental conditions.
  - **Experimental Conditions**: cv. Local Mogra.

### 3. Research Scope
These findings apply strictly to the specific cultivars and experimental conditions evaluated in the respective studies.
`;

    const result = reconcileSourcesAndEvidence(content, [directSource, relatedSource]);
    expect(result.sourceCount).toBe(2);
    expect(result.reconciledSources).toContainEqual(directSource);
    expect(result.reconciledSources).toContainEqual(relatedSource);
  });
});
