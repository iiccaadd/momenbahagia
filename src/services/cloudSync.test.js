import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMemories } from './cloudSync.js';

const strip = 'https://x.supabase.co/storage/v1/object/public/media/memories/strip-123.jpeg';

test('remote row without strip keeps the local photo', () => {
  const local = [{ id: 'm1', stripImage: strip, createdAt: '2026-11-11T10:00:00Z' }];
  const remote = [{ id: 'm1', stripImage: null, likesCount: 3, createdAt: '2026-11-11T10:00:00Z' }];
  const [m] = mergeMemories(local, remote);
  assert.equal(m.stripImage, strip);
  assert.equal(m.likesCount, 3);
});

test('pinned memories come first, then newest', () => {
  const merged = mergeMemories([], [
    { id: 'old-pinned', isPinned: true, createdAt: '2026-11-11T08:00:00Z' },
    { id: 'new', createdAt: '2026-11-11T12:00:00Z' },
    { id: 'older', createdAt: '2026-11-11T09:00:00Z' },
  ]);
  assert.deepEqual(merged.map((m) => m.id), ['old-pinned', 'new', 'older']);
});

test('legacy dummy memories are dropped', () => {
  assert.deepEqual(mergeMemories([{ id: 'mem-1788501512659-ltcny3' }], []), []);
});
