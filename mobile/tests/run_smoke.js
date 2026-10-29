const { mockDiscoveries, mockProfile, mockRoadmapDetail } = require('../src/api/mockData');
const { api } = require('../src/api/client');

async function run() {
  console.log('--- Running Mobile Smoke Tests ---');

  // Test 1: Profile
  const profile = await api.getProfile();
  if (!profile || profile.user_id !== '00000000-0000-0000-0000-000000000001') {
    throw new Error('Profile test failed');
  }
  console.log('✓ Profile API check passed');

  // Test 2: Discoveries
  const feed = await api.getDiscoveries();
  if (!feed || !feed.items || feed.items.length === 0) {
    throw new Error('Discoveries test failed');
  }
  console.log(`✓ Feed check passed (${feed.items.length} items loaded, live=${feed.live_count}, demo=${feed.seeded_count})`);

  // Test 3: Save action
  const id = feed.items[0].id;
  await api.setAction(id, 'saved');
  const saved = await api.getSaved();
  if (!saved.some(s => s.id === id)) {
    throw new Error('Save persistence test failed');
  }
  console.log('✓ Save discovery action passed');

  // Test 4: Roadmap status update
  const roadmap = await api.getRoadmapDetail('road-001');
  if (!roadmap || !roadmap.items || roadmap.items.length === 0) {
    throw new Error('Roadmap detail test failed');
  }
  const firstItem = roadmap.items[0];
  await api.updateRoadmapItemStatus('road-001', firstItem.id, 'done');
  const updated = await api.getRoadmapDetail('road-001');
  const target = updated.items.find(i => i.id === firstItem.id);
  if (!target || target.status !== 'done') {
    throw new Error('Roadmap status update failed');
  }
  console.log('✓ Roadmap status progression check passed');

  console.log('\nAll 4 mobile smoke checks passed successfully!');
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
