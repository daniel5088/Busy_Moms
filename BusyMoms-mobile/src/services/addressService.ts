import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

export interface Address {
  id: string;
  user_id: string;
  address_type: 'home' | 'work' | 'other';
  display_name: string | null;
  street_address: string;
  apartment_unit: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

class AddressService {
  async getAddresses(userId: string): Promise<Address[]> {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting addresses:', error);
      throw error;
    }
  }

  async getAddress(addressId: string): Promise<Address | null> {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', addressId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting address:', error);
      throw error;
    }
  }

  async getDefaultAddress(userId: string): Promise<Address | null> {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting default address:', error);
      throw error;
    }
  }

  async createAddress(address: Omit<Address, 'id' | 'created_at' | 'updated_at'>): Promise<Address> {
    try {
      // If this is being set as default, unset any existing default
      if (address.is_default) {
        await this.unsetAllDefaults(address.user_id);
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert(address)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  async updateAddress(addressId: string, updates: Partial<Address>): Promise<Address> {
    try {
      // If setting as default, unset any existing default
      if (updates.is_default) {
        const address = await this.getAddress(addressId);
        if (address) {
          await this.unsetAllDefaults(address.user_id);
        }
      }

      const { data, error } = await supabase
        .from('addresses')
        .update(updates)
        .eq('id', addressId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  async deleteAddress(addressId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  async setDefaultAddress(addressId: string): Promise<boolean> {
    try {
      const address = await this.getAddress(addressId);
      if (!address) {
        throw new Error('Address not found');
      }

      // Unset all defaults for this user
      await this.unsetAllDefaults(address.user_id);

      // Set this address as default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }

  private async unsetAllDefaults(userId: string): Promise<void> {
    const { error } = await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    if (error) throw error;
  }

  async validateAddress(address: Partial<Address>): Promise<{
    valid: boolean;
    formatted?: Address;
    error?: string;
  }> {
    try {
      // Call the edge function for address validation (if available)
      // For now, just basic validation
      const requiredFields = ['street_address', 'city', 'state_province', 'postal_code', 'country'];
      const missingFields = requiredFields.filter(field => !address[field as keyof Address]);

      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        };
      }

      return {
        valid: true,
      };
    } catch (error) {
      console.error('Error validating address:', error);
      return {
        valid: false,
        error: 'Failed to validate address',
      };
    }
  }

  formatAddress(address: Address): string {
    const parts = [address.street_address];
    if (address.apartment_unit) {
      parts.push(address.apartment_unit);
    }
    parts.push(`${address.city}, ${address.state_province} ${address.postal_code}`);
    parts.push(address.country);
    return parts.join(', ');
  }

  formatShortAddress(address: Address): string {
    return `${address.city}, ${address.state_province}`;
  }
}

export const addressService = new AddressService();
