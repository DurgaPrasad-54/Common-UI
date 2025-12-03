import { NgModule, ModuleWithProviders, Injector } from '@angular/core';
import { TrackingProvider } from './tracking-provider';
import { MatomoTrackingService } from './matomo-tracking.service';
import { GATrackingService } from './ga-tracking.service';
import { AmritTrackingService } from './amrit-tracking.service';
import { TRACKING_PLATFORM, MATOMO_SITE_ID, MATOMO_URL, TRACKING_PROVIDER, TRACKING_ENABLED } from './tracking.tokens';
import { environment } from 'src/environments/environment';

@NgModule({})
export class TrackingModule {
  static forRoot(): ModuleWithProviders<TrackingModule> {
    return {
      ngModule: TrackingModule,
      providers: [
        { provide: TRACKING_PLATFORM, useValue: environment.tracking?.platform || 'matomo' },
        { provide: TRACKING_ENABLED, useValue: environment.tracking?.enabled ?? false },
        { provide: MATOMO_SITE_ID, useValue: environment.tracking?.siteId },
        { provide: MATOMO_URL, useValue: environment.tracking?.trackerUrl },
        {
          provide: TRACKING_PROVIDER,
          useFactory: (platform: string, injector: Injector) =>
            platform === 'matomo'
              ? injector.get(MatomoTrackingService)
              : injector.get(GATrackingService),
          deps: [TRACKING_PLATFORM, Injector],
        },
        MatomoTrackingService,
        GATrackingService,
        AmritTrackingService,
      ],
    };
  }
}

// Re-export the tokens from the module if needed elsewhere
export { TRACKING_PLATFORM, MATOMO_SITE_ID, MATOMO_URL, TRACKING_PROVIDER, TRACKING_ENABLED} from './tracking.tokens';