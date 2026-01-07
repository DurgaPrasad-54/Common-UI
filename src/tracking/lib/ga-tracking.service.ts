declare let gtag: (
  command: 'config' | 'set' | 'event' | 'js',
  targetId: string | Date,
  config?: any
) => void;

import { Injectable, Inject } from '@angular/core';
import { TrackingProvider } from './tracking-provider';
import { MATOMO_SITE_ID, TRACKING_ENABLED } from './tracking.tokens';

@Injectable()
export class GATrackingService implements TrackingProvider {
  private isScriptLoaded = false;
  private isInitialized = false;
  private initQueue: (() => void)[] = [];

  constructor(
    @Inject(MATOMO_SITE_ID) private gaTrackingId: string,
    @Inject(TRACKING_ENABLED) private trackingEnabled: boolean
  ) {
    this.initializeDataLayer();
  }

  private initializeDataLayer() {
    const _w = window as any;
    if (!_w.dataLayer) {
      _w.dataLayer = [];
    }
    if (!_w.gtag) {
      _w.gtag = function() {
        _w.dataLayer.push(arguments);
      };
    }
  }

  private executeWhenReady(callback: () => void) {
    if (this.isScriptLoaded) {
      callback();
    } else {
      this.initQueue.push(callback);
    }
  }

  private processQueue() {
    while (this.initQueue.length > 0) {
      const callback = this.initQueue.shift();
      if (callback) callback();
    }
  }

  init(gaTrackingId?: string | number, trackerUrl?: string) {
    if (!this.trackingEnabled) {
      console.log('GA Tracking is disabled');
      return;
    }

    const finalTrackingId = gaTrackingId?.toString() || this.gaTrackingId?.toString();

    if (!finalTrackingId || typeof finalTrackingId !== 'string') {
      console.error('GATrackingService: Invalid tracking ID:', finalTrackingId);
      return;
    }

    console.log('Initializing GA with tracking ID:', finalTrackingId);

    this.loadGtagScript(finalTrackingId).then(() => {
      const _w = window as any;
      _w.gtag('js', new Date());
      _w.gtag('config', finalTrackingId, {
        page_title: document.title,
        page_location: window.location.href,
        send_page_view: true
      });

      this.isInitialized = true;
      console.log('GA initialized successfully');
      this.processQueue();
    });
  }

  private loadGtagScript(trackingId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isScriptLoaded) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${trackingId}"]`);
      if (existingScript) {
        this.isScriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      
      script.onload = () => {
        this.isScriptLoaded = true;
        console.log('GA script loaded successfully');
        resolve();
      };

      script.onerror = (error) => {
        console.error('Failed to load Google Analytics script:', error);
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  setUserId(userId: string) {
    if (!this.trackingEnabled) return;
    
    if (!userId || userId === '' || userId === 'undefined' || userId === 'null') {
      console.error('GATrackingService: Invalid userId:', userId);
      return;
    }

    this.executeWhenReady(() => {
      if (typeof gtag !== 'undefined') {
        gtag('config', this.gaTrackingId, {
          user_id: userId
        });
        console.log('GA User ID set:', userId);
      } else {
        console.error('gtag not available for setUserId');
      }
    });
  }

  pageView(path: string) {
    if (!this.trackingEnabled) return;
    
    if (!path || typeof path !== 'string') {
      console.error('GATrackingService: Invalid path:', path);
      return;
    }

    this.executeWhenReady(() => {
      if (typeof gtag !== 'undefined') {
        gtag('config', this.gaTrackingId, {
          page_path: path,
          page_title: document.title,
          page_location: window.location.origin + path
        });
        console.log('GA Page view tracked:', path);
      } else {
        console.error('gtag not available for pageView');
      }
    });
  }

  event(category: string, action: string, label?: string, value?: number) {   
    if (!this.trackingEnabled) {
      return;
    }

    if (!category || typeof category !== 'string') {
      console.error('GATrackingService: Invalid category:', category);
      return;
    }

    if (!action || typeof action !== 'string') {
      console.error('GATrackingService: Invalid action:', action);
      return;
    }

    this.executeWhenReady(() => {
      if (typeof gtag !== 'undefined') {
        const eventParams: any = {
          event_category: category
        };

        if (label && typeof label === 'string') {
          eventParams.event_label = label;
        }

        if (value !== undefined && typeof value === 'number') {
          eventParams.value = value;
        }

        gtag('event', action, eventParams);
        console.log('GA Event tracked:', { category, action, label, value });
      } else {
        console.error('gtag not available for event tracking!');
      }
    });
  }
}