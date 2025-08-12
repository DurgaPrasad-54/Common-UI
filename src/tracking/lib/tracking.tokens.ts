import { InjectionToken } from '@angular/core';
import { environment } from 'src/environments/environment'; 
import { TrackingProvider } from './tracking-provider';

export const TRACKING_PLATFORM = new InjectionToken<string>('tracking.platform', {
  providedIn: 'root',
  factory: () => environment.tracking.trackingPlatform,
});

export const TRACKING_ENABLED = new InjectionToken<boolean>('tracking.enabled', {
    providedIn: 'root',
    factory: () => environment.tracking.enabled,
  });

export const MATOMO_SITE_ID = new InjectionToken<number>('matomo.siteId', {
  providedIn: 'root',
  factory: () => environment.tracking.siteId, 
});

export const MATOMO_URL = new InjectionToken<string>('matomo.url', {
  providedIn: 'root',
  factory: () => environment.tracking.trackerUrl, 
});

export const TRACKING_PROVIDER = new InjectionToken<TrackingProvider>('tracking.provider');