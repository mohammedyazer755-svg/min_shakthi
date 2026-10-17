import React, { useState, useEffect, useCallback } from 'react';
import type { IncidentRecord } from '@minsakthi/contracts';
import { IncidentList } from './IncidentList';
import { IncidentDetail } from './IncidentDetail';
import { API_BASE } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useRouter } from '../../router';

export interface PowerEventInvestigatorProps {
  selectedDevice?: string;
  initialIncidentId?: string;
}

export const PowerEventInvestigator: React.FC<PowerEventInvestigatorProps> = ({
  selectedDevice,
  initialIncidentId,
}) => {
  const { user, accessToken } = useAuth();
  const { queryParams } = useRouter();

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incidentIdParam = initialIncidentId || queryParams.get('incidentId');

  const fetchIncidents = useCallback(async () => {
    if (!user?.siteId || !accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const devParam = selectedDevice ? `?deviceId=${encodeURIComponent(selectedDevice)}` : '';
      const res = await fetch(`${API_BASE}/api/v1/sites/${user.siteId}/incidents${devParam}`, {
        credentials: 'include',
        headers: { Authorization:`Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load power incidents');
      }

      const data = (await res.json()) as { incidents?: IncidentRecord[] };
      const list = data.incidents || [];
      setIncidents(list);

      // If URL has incidentId or initialIncidentId specified, automatically select it
      if (incidentIdParam) {
        const found = list.find((inc) => inc.id === incidentIdParam);
        if (found) {
          setSelectedIncident(found);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.siteId, accessToken, selectedDevice, incidentIdParam]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  if (selectedIncident) {
    return (
      <IncidentDetail
        incident={selectedIncident}
        onBack={() => setSelectedIncident(null)}
        onRefresh={fetchIncidents}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <IncidentList
        incidents={incidents}
        isLoading={isLoading}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
        onRefresh={fetchIncidents}
      />
    </div>
  );
};

export { IncidentList } from './IncidentList';
export { IncidentDetail } from './IncidentDetail';
export { IncidentReplay } from './IncidentReplay';
export default PowerEventInvestigator;
