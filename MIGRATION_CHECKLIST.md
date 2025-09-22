# Qdrant 384D Vector Migration Checklist

## Pre-Migration Steps
- [ ] Backup current .env file
- [ ] Ensure QDRANT_URL and QDRANT_API_KEY are correct
- [ ] Test current system is working
- [ ] Note down current collection stats
- [ ] Create backup directory: mkdir -p backups

## Migration Process
- [ ] Run tests: `node scripts/test-enhanced-categorization.js`
- [ ] Run migration: `node scripts/migrate-to-384d-vectors.js`
- [ ] Verify migration completed successfully
- [ ] Check backup files were created
- [ ] Verify new collection has expected data

## Post-Migration Configuration
- [ ] Update .env file:
  - [ ] QDRANT_COLLECTION=places_v2
  - [ ] EMBEDDING_DIM=384
- [ ] Update embedding configuration
- [ ] Test new collection with sample queries
- [ ] Verify filtering works correctly
- [ ] Check performance improvements

## Testing & Validation
- [ ] Test search functionality
- [ ] Test category filtering
- [ ] Test quality filtering  
- [ ] Test itemType filtering
- [ ] Verify data quality
- [ ] Check search speed improvement

## Production Deployment
- [ ] Deploy updated code to staging
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor performance metrics
- [ ] Clean up old collection (after verification)

## Rollback Plan (if needed)
- [ ] Restore .env to use 'places' collection
- [ ] Revert EMBEDDING_DIM to 768
- [ ] Restart application
- [ ] Verify old system works
- [ ] Keep backup files until issue resolved

## Success Metrics
- [ ] 50% reduction in storage usage
- [ ] 2x faster search performance
- [ ] Improved filtering accuracy (>85%)
- [ ] All tests passing
- [ ] No functionality regression

## Notes
- Migration typically takes 10-30 minutes depending on data size
- Backup files are stored in ./backups/ directory
- Old collection name: 'places'
- New collection name: 'places_v2'
- Vector dimension: 768D → 384D
