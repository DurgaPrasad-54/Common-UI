import { Injectable, Inject } from '@angular/core';
import { TrackingProvider } from './tracking-provider';
import { MATOMO_SITE_ID, MATOMO_URL, TRACKING_ENABLED } from './tracking.tokens';

@Injectable()
export class MatomoTrackingService implements TrackingProvider {
  private isScriptLoaded = false;
  private isInitialized = false;

  constructor(
    @Inject(MATOMO_SITE_ID) private siteId: number,
    @Inject(MATOMO_URL) private trackerUrl: string,
    @Inject(TRACKING_ENABLED) private trackingEnabled: boolean
  ) {
    this.initializePaqQueue();
  }

  private initializePaqQueue() {
    const _w = window as any;
    if (!_w._paq) {
      _w._paq = [];
    }
  }

  init(siteId?: number, trackerUrl?: string) {
    
    if (!this.trackingEnabled) {
      return;
    }

    const finalSiteId = siteId || this.siteId;
    const finalTrackerUrl = trackerUrl || this.trackerUrl;

    if (!finalSiteId || typeof finalSiteId !== 'number') {
      console.error('MatomoTrackingService: Invalid siteId:', finalSiteId);
      return;
    }

    if (!finalTrackerUrl || typeof finalTrackerUrl !== 'string') {
      console.error('MatomoTrackingService: Invalid trackerUrl:', finalTrackerUrl);
      return;
    }

    const _w = window as any;
    const _paq = _w._paq;

    if (!_paq) {
      console.error('_paq queue is not available!');
      return;
    }

    _paq.push(['setTrackerUrl', finalTrackerUrl + 'matomo.php']);
    _paq.push(['setSiteId', finalSiteId]);
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);

    this.loadMatomoScript(finalTrackerUrl);
    this.isInitialized = true;

  }

  private loadMatomoScript(trackerUrl: string) {
    if (this.isScriptLoaded) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = trackerUrl + 'matomo.js';
    
    script.onload = () => {
      this.isScriptLoaded = true;
    };

    script.onerror = (error) => {
      console.error('Failed to load Matomo script:', error);
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }
  }

  setUserId(userId: string) {
    if (!this.trackingEnabled) return;
    
    if (!userId || userId === '' || userId === 'undefined' || userId === 'null') {
      console.error('MatomoTrackingService: Invalid userId:', userId);
      return;
    }

    const _paq = (window as any)._paq;
    if (!_paq) {
      console.error('_paq not available for setUserId');
      return;
    }
    
    _paq.push(['setUserId', userId]);
  }

  pageView(path: string) {
    if (!this.trackingEnabled) return;
    
    if (!path || typeof path !== 'string') {
      console.error('MatomoTrackingService: Invalid path:', path);
      return;
    }

    const _paq = (window as any)._paq;
    if (!_paq) {
      console.error('_paq not available for pageView');
      return;
    }
    
    _paq.push(['setCustomUrl', path]);
    _paq.push(['trackPageView']);
  }

  event(category: string, action: string, label?: string, value?: number) {   
    if (!this.trackingEnabled) {
      return;
    }

    const _paq = (window as any)._paq;
    if (!_paq) {
      console.error('_paq not available for event tracking!');
      return;
    }
    
    if (!category || typeof category !== 'string') {
      console.error('MatomoTrackingService: Invalid category:', category);
      return;
    }

    if (!action || typeof action !== 'string') {
      console.error('MatomoTrackingService: Invalid action:', action);
      return;
    }

    const args: (string | number)[] = ['trackEvent', category, action];
    if (label && typeof label === 'string') {
      args.push(label);
    }
    if (value !== undefined && typeof value === 'number') {
      args.push(value);
    }
    _paq.push(args);
  }
}