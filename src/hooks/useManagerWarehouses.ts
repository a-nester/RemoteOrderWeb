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
        const all = await OrganizationService.getWarehouses();
        if (user?.role === 'manager' && user.warehouseId) {
          const filtered = all.filter((w) => w.id === user.warehouseId);
          setWarehouses(filtered);
        } else {
          setWarehouses(all);
        }
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
