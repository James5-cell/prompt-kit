// Unit Test Suite for Tag Filtering Logic

import assert from 'assert';

// 1. Logic under test (exact matches of tagFilter.ts functions)
function normalizeTag(tag) {
  return (tag || '').trim().toLowerCase();
}

function aggregateTags(prompts) {
  const tagMap = new Map();
  prompts.forEach((p) => {
    if (p.tagNames && p.tagNames.length > 0) {
      p.tagNames.forEach((name) => {
        const clean = (name || '').trim();
        if (!clean) return;
        const normalized = normalizeTag(clean);
        const existing = tagMap.get(normalized);
        if (existing) {
          existing.count += 1;
        } else {
          tagMap.set(normalized, { name: clean, count: 1 });
        }
      });
    }
  });

  return Array.from(tagMap.entries())
    .map(([id, val]) => ({
      id,
      name: val.name,
      promptCount: val.count,
    }))
    .sort((a, b) => b.promptCount - a.promptCount || a.name.localeCompare(b.name));
}

function filterPromptsByTags(prompts, activeTagIds) {
  if (!activeTagIds || activeTagIds.length === 0) {
    return prompts;
  }
  const normalizedActiveTags = activeTagIds.map(normalizeTag);
  return prompts.filter((p) => {
    const promptTags = (p.tagNames ?? []).map(normalizeTag);
    return normalizedActiveTags.some((activeTag) => promptTags.includes(activeTag));
  });
}

// 2. Mock Data
const mockPrompts = [
  { id: '1', title: 'A', tagNames: ['TypeScript', 'React', '  frontend '] },
  { id: '2', title: 'B', tagNames: ['typescript', 'Node.js'] },
  { id: '3', title: 'C', tagNames: ['python', 'AI'] },
  { id: '4', title: 'D', tagNames: [] },
  { id: '5', title: 'E', tagNames: ['React', 'Frontend'] }
];

console.log('🧪 Starting Tag Filter Unit Tests...');

try {
  // Test 1: Normalize Tag
  assert.strictEqual(normalizeTag('  React  '), 'react');
  assert.strictEqual(normalizeTag(''), '');
  assert.strictEqual(normalizeTag(null), '');
  console.log('✅ Test 1 Passed: Tag Normalization is correct.');

  // Test 2: Aggregate Tags (casing de-duplication and count)
  const tags = aggregateTags(mockPrompts);
  
  // 'react' has count 2 (from 1 & 5)
  // 'typescript' has count 2 (from 1 & 2)
  // 'frontend' has count 2 (from 1 & 5)
  // 'node.js' has count 1
  // 'python' has count 1
  // 'ai' has count 1
  
  const reactTag = tags.find(t => t.id === 'react');
  assert.strictEqual(reactTag.promptCount, 2);
  
  const tsTag = tags.find(t => t.id === 'typescript');
  assert.strictEqual(tsTag.promptCount, 2);

  // Sorting should put count 2 before count 1
  assert.ok(tags[0].promptCount >= tags[tags.length - 1].promptCount);
  console.log('✅ Test 2 Passed: Dynamic Tag Aggregation is correct.');

  // Test 3: Filter Prompts by Tags (OR logic)
  // Empty active tag IDs returns all prompts
  assert.strictEqual(filterPromptsByTags(mockPrompts, []).length, mockPrompts.length);
  
  // Filter by 'typescript' returns A (TypeScript) and B (typescript)
  const tsFiltered = filterPromptsByTags(mockPrompts, ['typescript']);
  assert.strictEqual(tsFiltered.length, 2);
  assert.ok(tsFiltered.some(p => p.id === '1'));
  assert.ok(tsFiltered.some(p => p.id === '2'));

  // Filter by 'react' and 'ai' (OR logic) returns A (React), C (AI), and E (React)
  const orFiltered = filterPromptsByTags(mockPrompts, ['react', 'ai']);
  assert.strictEqual(orFiltered.length, 3);
  assert.ok(orFiltered.some(p => p.id === '1'));
  assert.ok(orFiltered.some(p => p.id === '3'));
  assert.ok(orFiltered.some(p => p.id === '5'));
  
  console.log('✅ Test 3 Passed: Prompt OR filtering logic is correct.');
  console.log('🎉 All Tag Filter Unit Tests Passed Successfully!');

} catch (error) {
  console.error('❌ Tag Filter Unit Test Failed:', error);
  process.exit(1);
}
