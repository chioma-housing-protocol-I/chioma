import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollRestoration } from '../useScrollRestoration';

const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

function searchParamsOf(qs: string) {
  return new URLSearchParams(qs);
}

describe('useScrollRestoration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockUsePathname.mockReturnValue('/properties');
    mockUseSearchParams.mockReturnValue(searchParamsOf(''));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not scroll when there is no saved position for this route', () => {
    renderHook(() => useScrollRestoration());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('restores the saved scroll position for the current path and query', () => {
    sessionStorage.setItem('scroll-position:/properties?', '420');

    renderHook(() => useScrollRestoration());

    expect(window.scrollTo).toHaveBeenCalledWith(0, 420);
  });

  it('keys the saved position by path and query string separately', () => {
    sessionStorage.setItem('scroll-position:/properties?city=Lagos', '300');
    mockUseSearchParams.mockReturnValue(searchParamsOf('city=Lagos'));

    renderHook(() => useScrollRestoration());

    expect(window.scrollTo).toHaveBeenCalledWith(0, 300);
  });

  it('does not restore a position saved under a different query string', () => {
    sessionStorage.setItem('scroll-position:/properties?city=Lagos', '300');
    mockUseSearchParams.mockReturnValue(searchParamsOf('city=Abuja'));

    renderHook(() => useScrollRestoration());

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('saves the scroll position on scroll, keyed by the current route', () => {
    renderHook(() => useScrollRestoration());

    Object.defineProperty(window, 'scrollY', { value: 650, writable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(sessionStorage.getItem('scroll-position:/properties?')).toBe('650');
  });

  it('ignores a non-numeric saved value instead of throwing', () => {
    sessionStorage.setItem('scroll-position:/properties?', 'not-a-number');

    expect(() => renderHook(() => useScrollRestoration())).not.toThrow();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('removes the scroll listener on unmount', () => {
    const { unmount } = renderHook(() => useScrollRestoration());
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
