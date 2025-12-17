import { useState, useEffect } from 'react';
import { getNearbyRetailers } from '../services/instacartAgentService';

interface Retailer {
  retailer_key: string;
  name: string;
  logo_url?: string;
}

export function useRetailerSelection() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved retailer preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('preferred_retailer');
    if (saved) {
      console.log('📦 Loaded saved retailer:', saved);
      setSelectedRetailer(saved);
    }
  }, []);

  // Save retailer preference to localStorage
  const selectRetailer = (retailerKey: string) => {
    console.log('✅ Setting preferred retailer:', retailerKey);
    setSelectedRetailer(retailerKey);
    localStorage.setItem('preferred_retailer', retailerKey);
  };

  // Fetch nearby retailers by postal code
  const fetchRetailers = async (postalCode: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching retailers for postal code:', postalCode);
      const result = await getNearbyRetailers(postalCode);
      
      if (result.retailers && Array.isArray(result.retailers)) {
        console.log('✅ Found retailers:', result.retailers.length);
        setRetailers(result.retailers);
        
        if (!selectedRetailer && result.retailers?.length) {
          selectRetailer(result.retailers[0].retailer_key);
        }
      } else {
        console.warn('⚠️ No retailers found in result');
        setRetailers([]);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load retailers';
      console.error('❌ Error fetching retailers:', errorMsg);
      setError(errorMsg);
      setRetailers([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    retailers,
    selectedRetailer,
    isLoading,
    error,
    selectRetailer,
    fetchRetailers,
  };
}