import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { readingFreshness, freshnessWindows, type SnapshotChannel, type SystemHealth } from '@minsakthi/contracts';
import { deviceStreamStatus } from '../../apps/web/src/live/status';
import { StatusSummary } from '../../apps/web/src/components/StatusSummary';

const now = Date.parse('2026-10-17T10:00:00Z');
const health: SystemHealth = { process:'healthy',broker:'connected',brokerSubscribed:true,database:'healthy',persistenceLagMs:0 };
function channel(ageMs: number, retained = false): SnapshotChannel {
  const receivedAt = new Date(now-ageMs).toISOString();
  return { rawChannelId:'channel1',displaySlot:1,label:'Channel 1',lastReceivedAt:receivedAt,
    freshness:readingFreshness({ receivedAt,retained,expectedIntervalMs:1000,nowMs:now }),
    lastSample:{ schemaVersion:1,eventId:'11111111-1111-4111-8111-111111111111',serverEpoch:'11111111-1111-4111-8111-111111111111',
      sequence:'1',siteId:'site',deviceId:'device',channelId:'channel1',receivedAt,deviceTimestamp:null,
      values:{ voltage:230,current:0,power:0,frequency:50,energyRaw:'0' },energyUnit:'unknown',quality:[],retained,persistence:'committed' } };
}

describe('ESP freshness and browser connection are separate',() => {
  it('expires live state during packet silence and recovers on the next zero-load packet',() => {
    expect(deviceStreamStatus([channel(0)],true,health).label).toBe('Live');
    expect(deviceStreamStatus([channel(1500)],true,health).label).toBe('No recent data');
    expect(deviceStreamStatus([channel(5000)],true,health).label).toBe('Offline (inferred)');
    expect(deviceStreamStatus([channel(0)],true,health).label).toBe('Live');
  });
  it('never treats retained or delayed history as live',() => {
    expect(deviceStreamStatus([channel(0,true)],true,health).tone).not.toBe('positive');
    expect(deviceStreamStatus([channel(60000)],true,health).tone).not.toBe('positive');
    expect(readingFreshness({receivedAt:new Date(now).toISOString(),nowMs:now,suspectDuplicate:true})).toBe('stale');
  });
  it('does not report an ESP power cut when the transport itself is down',() => {
    expect(readingFreshness({ receivedAt:new Date(now-60000).toISOString(),nowMs:now,transportAvailable:false })).toBe('stale');
    expect(deviceStreamStatus([channel(0)],true,{...health,broker:'disconnected'}).label).toBe('Connection interrupted');
    expect(deviceStreamStatus([channel(0)],false,health).label).toBe('Connection lost');
    expect(deviceStreamStatus([channel(0)],true,null).label).toBe('Checking');
  });
  it('respects a configured slower publisher and invalid timestamps',() => {
    expect(freshnessWindows(5000)).toEqual({staleAfterMs:6000,offlineAfterMs:10000});
    expect(readingFreshness({receivedAt:'invalid',nowMs:now})).toBe('unseen');
    expect(readingFreshness({receivedAt:null,nowMs:now,configured:false})).toBe('unconfigured');
  });
  it('keeps partial coverage explicit and never shows Live from default header props',() => {
    expect(deviceStreamStatus([channel(0),{...channel(60000),rawChannelId:'channel2'}],true,health).label).toBe('Live · Partial');
    const html = renderToStaticMarkup(React.createElement(StatusSummary));
    expect(html).not.toContain('>Live<');
    expect(html).toContain('Unknown');
    expect(renderToStaticMarkup(React.createElement(StatusSummary,{health,channels:[channel(60000)],socketConnected:true}))).toContain('Offline (inferred)');
  });
});
