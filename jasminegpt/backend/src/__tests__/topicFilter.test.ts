import {
  detectManagementTopics,
  filterChunksByTopic,
  chunkEvaluatesTopics,
} from '../services/router/topicFilter';
import type { GeneralChunk } from '../types';

describe('Topic Relevance Filter', () => {
  const dummyFertilizerChunk: GeneralChunk = {
    chunk_id: '1',
    category: 'Nutrition',
    filename: 'Impact of timely application of fertilizers on yield and economics of Jasmine.pdf',
    title: 'Impact of timely application of fertilizers on yield and economics of Jasmine',
    text: 'Application of NPK (120:240:240 g/plant/year) along with FYM significantly enhanced flower yield and nutrient uptake in Jasminum sambac.',
    hybrid_score: 0.85,
    species: 'Jasminum sambac',
  };

  const dummyINMChunk: GeneralChunk = {
    chunk_id: '2',
    category: 'Pruning', // Note: Misleading category in metadata!
    filename: 'Studies on integrated nutrient management for growth and yield of Jasminum sambac.pdf',
    title: 'Studies on integrated nutrient management for growth and yield of Jasminum sambac Ait. CV. Ramanathapuram gundumalli during off season',
    text: 'Integrated nutrient management (INM) involving 75% RDF + Vermicompost + Azospirillum + Phosphobacteria resulted in maximum flower yield and quality.',
    hybrid_score: 0.82,
    species: 'Jasminum sambac',
  };

  const dummyPruningChunk: GeneralChunk = {
    chunk_id: '3',
    category: 'Pruning',
    filename: 'Response of Growth and Flowering Characters of Jasminum sambac (L.) to Modified Planting System and Pruning Schedule.pdf',
    title: 'Response of Growth and Flowering Characters of Jasminum sambac (L.) to Modified Planting System and Pruning Schedule',
    text: 'Pruning in the last week of November with 45 cm pruning height recorded the highest number of productive shoots, flower bud yield, and plant spread.',
    hybrid_score: 0.80,
    species: 'Jasminum sambac',
  };

  const dummyPGRChunk: GeneralChunk = {
    chunk_id: '4',
    category: 'Cultivation',
    filename: 'Effect of different plant growth regulators on the growth, flowering, flower yield and quality of Jasmine.pdf',
    title: 'Effect of different plant growth regulators on the growth, flowering, flower yield and quality of Jasmine',
    text: 'Foliar application of GA3 at 50 ppm and NAA at 25 ppm or thiourea induced early flowering and maximum flower bud count.',
    hybrid_score: 0.78,
    species: 'Jasminum sambac',
  };

  const dummyIrrigationChunk: GeneralChunk = {
    chunk_id: '5',
    category: 'Irrigation',
    filename: 'Photosynthetic response to water stress and changes in metabolites in Jasminum sambac.pdf',
    title: 'Photosynthetic response to water stress and changes in metabolites in Jasminum sambac',
    text: 'Drip irrigation at 100% IW/CPE ratio under water stress conditions was evaluated for photosynthetic rate and stomatal conductance.',
    hybrid_score: 0.75,
    species: 'Jasminum sambac',
  };

  const dummyPackagingChunk: GeneralChunk = {
    chunk_id: '6',
    category: 'Cultivation',
    filename: 'Packaging technology for export of jasmine flowers.pdf',
    title: 'Packaging technology for export of jasmine flowers',
    text: 'Flowers packed in 60 micron polythene bags and stored at 7°C cold room showed extended shelf life.',
    hybrid_score: 0.72,
    species: 'Jasminum sambac',
  };

  const dummyPestChunk: GeneralChunk = {
    chunk_id: '7',
    category: 'Pest',
    filename: 'Studies on insect diversity in jasmine ecosystem.pdf',
    title: 'Studies on insect diversity in jasmine ecosystem',
    text: 'Bud worm (Hendicasis duplifascialis) and blossom midge (Contarinia maculipennis) were managed using integrated pest management and natural predator spiders.',
    hybrid_score: 0.79,
    species: 'Jasminum sambac',
  };

  test('detectManagementTopics identifies nutrient and fertilizer queries', () => {
    const topics = detectManagementTopics('What fertilizer and nutrient management practices have been evaluated?');
    expect(topics.some((t) => t.id === 'NUTRIENT_FERTILIZER')).toBe(true);
    expect(topics.some((t) => t.id === 'PRUNING_CANOPY')).toBe(false);
  });

  test('detectManagementTopics identifies pruning queries', () => {
    const topics = detectManagementTopics('When should I prune my jasmine plants and what pruning schedule is best?');
    expect(topics.some((t) => t.id === 'PRUNING_CANOPY')).toBe(true);
    expect(topics.some((t) => t.id === 'NUTRIENT_FERTILIZER')).toBe(false);
  });

  test('detectManagementTopics identifies pest queries', () => {
    const topics = detectManagementTopics('How to control blossom midge and bud worm pests?');
    expect(topics.some((t) => t.id === 'PEST_INSECT')).toBe(true);
  });

  test('filterChunksByTopic filters for fertilizer query (excludes pruning, PGR, irrigation, packaging)', () => {
    const allChunks = [
      dummyFertilizerChunk,
      dummyINMChunk,
      dummyPruningChunk,
      dummyPGRChunk,
      dummyIrrigationChunk,
      dummyPackagingChunk,
    ];

    const result = filterChunksByTopic(
      'What fertilizer and nutrient management practices have been evaluated?',
      allChunks,
    );

    expect(result.isTopicSpecific).toBe(true);
    expect(result.filteredChunks.length).toBe(2);
    expect(result.filteredChunks).toContainEqual(dummyFertilizerChunk);
    expect(result.filteredChunks).toContainEqual(dummyINMChunk); // Included even though category was "Pruning" in metadata
    expect(result.filteredChunks).not.toContainEqual(dummyPruningChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyPGRChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyIrrigationChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyPackagingChunk);
  });

  test('filterChunksByTopic filters for pruning query (excludes fertilizer, pest, irrigation)', () => {
    const allChunks = [
      dummyFertilizerChunk,
      dummyINMChunk,
      dummyPruningChunk,
      dummyPGRChunk,
      dummyIrrigationChunk,
      dummyPestChunk,
    ];

    const result = filterChunksByTopic(
      'What pruning schedules and pruning height are recommended for Jasminum sambac?',
      allChunks,
    );

    expect(result.isTopicSpecific).toBe(true);
    expect(result.filteredChunks).toContainEqual(dummyPruningChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyFertilizerChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyPestChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyIrrigationChunk);
  });

  test('filterChunksByTopic filters for pest management query', () => {
    const allChunks = [
      dummyFertilizerChunk,
      dummyPruningChunk,
      dummyPestChunk,
    ];

    const result = filterChunksByTopic(
      'What insecticides and pest management methods exist for bud worm and blossom midge?',
      allChunks,
    );

    expect(result.isTopicSpecific).toBe(true);
    expect(result.filteredChunks).toContainEqual(dummyPestChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyFertilizerChunk);
    expect(result.filteredChunks).not.toContainEqual(dummyPruningChunk);
  });

  test('General query with no narrow management topic returns all chunks', () => {
    const allChunks = [dummyFertilizerChunk, dummyPruningChunk, dummyPestChunk];
    const result = filterChunksByTopic('Tell me about jasmine cultivation in India', allChunks);
    expect(result.isTopicSpecific).toBe(false);
    expect(result.filteredChunks.length).toBe(3);
  });
});
