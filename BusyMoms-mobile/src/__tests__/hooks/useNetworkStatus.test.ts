import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  it('should return network status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBeDefined();
    expect(typeof result.current.isConnected).toBe('boolean');
  });

  it('should return internet reachability status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isInternetReachable).toBeDefined();
  });

  it('should return network type', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.type).toBeDefined();
  });
});
