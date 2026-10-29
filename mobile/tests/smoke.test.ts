import assert from 'assert';
import { mockDiscoveries, mockProfile, mockRoadmapDetail } from '../src/api/mockData';
import { api } from '../src/api/client';

async function runMobileSmokeTests() {
  console.log('--- Running Mobile App v2 Smoke Verification ---');

  // 1. Auth smoke verification (T3.11, T4.19)
  const authRes = await api.login('student@university.edu', 'secret123');
  assert(authRes.access_token !== undefined, 'Access token should be issued');
  console.log('✓ 1. Auth login smoke check passed');

  // 2. Domain selection verification (T3.12, T4.19)
  const domains = await api.getDomains();
  assert(domains.length === 3, '3 launch domains available');
  const aiDomain = domains.find(d => d.slug === 'ai-engineering');
  assert(aiDomain !== undefined, 'AI Engineering domain present');
  console.log('✓ 2. Domain catalog smoke check passed');

  // 3. Roadmap retrieval & prerequisite ordering (T3.13, T4.19)
  const roadmap = await api.getCurrentRoadmap();
  assert(roadmap.items.length > 0, 'Roadmap items exist');
  const firstItem = roadmap.items[0];
  console.log(`✓ 3. Domain roadmap check passed (${roadmap.items.length} competencies)`);

  // 4. Roadmap status update persistence (T3.13, T4.13)
  await api.updateRoadmapItemStatus(firstItem.id, 'done');
  const updatedRoadmap = await api.getCurrentRoadmap();
  const updatedItem = updatedRoadmap.items.find((i: any) => i.id === firstItem.id);
  assert(updatedItem?.status === 'done', 'Roadmap item marked done');
  console.log('✓ 4. Roadmap status progression check passed');

  // 5. Suggestions on request & evidence check (T3.4, T4.1, T4.19)
  const suggestions = await api.getSuggestions(roadmap.id);
  assert(suggestions.suggestions.length > 0, 'Suggestions returned');
  const firstSuggestion = suggestions.suggestions[0];
  assert(firstSuggestion.evidence_level !== undefined, 'Evidence level present');
  assert(firstSuggestion.score_reason.length > 0, 'Score reason present');
  console.log(`✓ 5. Suggestions retrieval check passed (${suggestions.suggestions.length} candidate discoveries)`);

  // 6. Learn dossier & video gate check (T3.7, T4.2, T4.19)
  const learnDossier = await api.getSkillLearn(firstItem.slug || firstItem.skill_id);
  assert(learnDossier.name !== undefined, 'Skill dossier name present');
  assert(Array.isArray(learnDossier.videos), 'Videos array present');
  console.log('✓ 6. Learn competency dossier check passed');

  // 7. Personal notes autosave check (T3.8, T4.2)
  await api.saveUserNote(firstItem.skill_id, 'Smoke test note content');
  const userNote = await api.getUserNote(firstItem.skill_id);
  assert(userNote.content === 'Smoke test note content', 'Personal note saved and verified');
  console.log('✓ 7. Personal field note autosave check passed');

  console.log('\nAll v2 mobile smoke tests passed successfully!');
}

runMobileSmokeTests().catch((err) => {
  console.error('Mobile smoke test failed:', err);
  process.exit(1);
});
