import { tenantFilter } from './tenant-filter.util';

describe('tenantFilter', () => {
  describe('happy path', () => {
    it('returns { tenantId } for a valid tenant ID', () => {
      expect(tenantFilter('org_123')).toEqual({ tenantId: 'org_123' });
    });

    it('returns the exact tenantId string without transformation', () => {
      const id = 'org_abc_XYZ_456';
      expect(tenantFilter(id)).toEqual({ tenantId: id });
    });
  });

  describe('guard — invalid tenantId', () => {
    it('throws when tenantId is an empty string', () => {
      expect(() => tenantFilter('')).toThrow();
    });

    it('throws when tenantId is whitespace only', () => {
      expect(() => tenantFilter('   ')).toThrow();
    });
  });
});
