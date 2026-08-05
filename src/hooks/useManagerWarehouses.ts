import { useEffect, useState } from 'react';
import { OrganizationService } from '../services/organization.service';
import { useAuthStore } from '../store/auth.store';

export const useManagerWarehouses = () => {
  const { user } = useAuthStore();
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await OrganizationService.getWarehouses();
        setWarehouses(data);
      } catch (e) {
        console.error('Failed to load warehouses', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  return { warehouses, loading };
};
