import React from 'react';
import { Cpu } from 'lucide-react';

export interface DeviceSelectorProps {
  selectedDevice: string;
  onSelectDevice: (deviceId: string) => void;
  availableDevices: string[];
  disabled?: boolean;
  className?: string;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  selectedDevice,
  onSelectDevice,
  availableDevices,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <label htmlFor="device-selector-input" className="sr-only">
        Select target hardware device
      </label>
      <div className="relative inline-flex items-center">
        <Cpu className="w-4 h-4 absolute left-3 pointer-events-none" aria-hidden="true" style={{ color: 'var(--accent)' }} />
        <select
          id="device-selector-input"
          value={selectedDevice}
          onChange={(e) => onSelectDevice(e.target.value)}
          disabled={disabled}
          className="appearance-none pl-9 pr-8 py-2 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors focus:outline-none"
          style={{
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
          }}
        >
          {availableDevices.map((dev) => (
            <option key={dev} value={dev}>
              {dev}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2" style={{ color: 'var(--text-secondary)' }}>
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
