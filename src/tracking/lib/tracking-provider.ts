export interface TrackingProvider {
    init(siteId?: number | string, trackerUrl?: string): void;
    setUserId(userId: string): void;
    pageView(path: string): void;
    event(
      category: string,
      action: string,
      label?: string,
      value?: number
    ): void;
  }