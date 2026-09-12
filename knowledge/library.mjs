import {ingestIntoStore} from './source-ingestion.mjs';
import {buildIndex} from './evidence-engine.mjs';

export function createKnowledgeStore() {
  return buildIndex([], new Map());
}

export function ingestKnowledgeDocument(document, store = createKnowledgeStore()) {
  return ingestIntoStore(document, store);
}
