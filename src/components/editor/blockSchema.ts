import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { sceneBlockFactory } from './blocks/sceneBlock';
import { beatBlockFactory } from './blocks/beatBlock';
import { resolveBlockFactory } from './blocks/resolveBlock';
import { snapshotBlockFactory } from './blocks/snapshotBlock';
import { rollBlockFactory } from './blocks/rollBlock';
import { truthRecordBlockFactory } from './blocks/truthRecordBlock';
import { investigationRecordBlockFactory } from './blocks/investigationRecordBlock';
import { nodeMentionSpec } from './blocks/nodeMention';

// Shared by every BlockNote document in the app (Case Notes and per-node
// content docs alike) — documents aren't portable across mismatched
// schemas, and a node's own page may reasonably want a Roll/Scene block too.
export const citrSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    scene: sceneBlockFactory(),
    beat: beatBlockFactory(),
    resolve: resolveBlockFactory(),
    snapshot: snapshotBlockFactory(),
    roll: rollBlockFactory(),
    truthRecord: truthRecordBlockFactory(),
    investigationRecord: investigationRecordBlockFactory(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    nodeMention: nodeMentionSpec,
  },
});
