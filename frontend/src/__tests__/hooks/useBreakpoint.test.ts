/**
 * Tests for useBreakpoint hook (Wave 0, Plan 13-01)
 *
 * Covers all 6 width thresholds defined in UI-SPEC:
 * 320, 767 → 'mobile'
 * 768, 1023 → 'tablet'
 * 1024 → 'desktop'
 * 0 → 'mobile' (SSR/first-render guard)
 */

import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// We mock Dimensions.get so that useWindowDimensions returns our controlled width
const dimensionsSpy = jest.spyOn(Dimensions, 'get');

function setWidth(width: number) {
  dimensionsSpy.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('useBreakpoint', () => {
  afterEach(() => {
    dimensionsSpy.mockReset();
  });

  it('returns "mobile" for width 320', () => {
    setWidth(320);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
  });

  it('returns "mobile" for width 767', () => {
    setWidth(767);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
  });

  it('returns "tablet" for width 768', () => {
    setWidth(768);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('tablet');
  });

  it('returns "tablet" for width 1023', () => {
    setWidth(1023);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('tablet');
  });

  it('returns "desktop" for width 1024', () => {
    setWidth(1024);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('desktop');
  });

  it('returns "mobile" for width 0 (SSR/first-render guard)', () => {
    setWidth(0);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
  });
});
