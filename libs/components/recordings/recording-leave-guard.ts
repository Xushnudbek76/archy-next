export type LeaveGuardEnvironment = {
  page: EventTarget;
  links: EventTarget;
  navigation?: EventTarget;
  url: string;
  restore: () => void;
  confirm: () => boolean;
};

export function recordingLeaveEnvironment(): LeaveGuardEnvironment {
  const url = window.location.href;
  const state: unknown = window.history.state;
  return {
    page: window,
    links: document,
    navigation: (window as Window & { navigation?: EventTarget }).navigation,
    url,
    restore: () => window.history.pushState(state, '', url),
    confirm: () =>
      window.confirm(
        'Leave this document? Your unsaved recording will be lost. Save or download it first to keep it.',
      ),
  };
}

// Installed only while audio is unsaved. Keep native unload protection even when
// client-side navigation is intercepted by the Navigation API or Next links.
export function installRecordingLeaveGuard(environment: LeaveGuardEnvironment) {
  let confirmedLink = false;
  let approvalTimer: ReturnType<typeof setTimeout> | null = null;
  const unload = (event: Event) => {
    if (confirmedLink) return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = '';
  };
  const navigate = (event: Event) => {
    const destination = (
      event as Event & {
        destination?: { sameDocument?: boolean; url?: string };
      }
    ).destination;
    if (confirmedLink) return;
    if (destination?.url) {
      const next = new URL(destination.url, environment.url);
      const current = new URL(environment.url);
      if (
        next.origin === current.origin &&
        next.pathname === current.pathname &&
        next.search === current.search
      )
        return;
    }
    if (event.cancelable && destination?.sameDocument && !environment.confirm())
      event.preventDefault();
  };
  const back = (event: Event) => {
    if (environment.confirm()) return;
    event.stopImmediatePropagation();
    environment.restore();
  };
  const click = (event: Event) => {
    const mouse = event as MouseEvent;
    if (
      event.defaultPrevented ||
      mouse.button !== 0 ||
      mouse.metaKey ||
      mouse.ctrlKey ||
      mouse.shiftKey ||
      mouse.altKey
    )
      return;
    const target = event.target as Element | null;
    if (typeof target?.closest !== 'function') return;
    const link = target.closest<HTMLAnchorElement>('a[href]');
    if (
      !link ||
      link.hasAttribute('download') ||
      (link.target && link.target !== '_self')
    )
      return;
    const next = new URL(link.href, environment.url);
    const current = new URL(environment.url);
    if (
      next.origin !== current.origin ||
      (next.pathname === current.pathname && next.search === current.search)
    )
      return;
    if (!environment.confirm()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else {
      confirmedLink = true;
      if (approvalTimer) clearTimeout(approvalTimer);
      approvalTimer = setTimeout(() => {
        confirmedLink = false;
      }, 1000);
    }
  };
  environment.page.addEventListener('beforeunload', unload);
  environment.links.addEventListener('click', click, true);
  if (environment.navigation)
    environment.navigation.addEventListener('navigate', navigate);
  else {
    environment.page.addEventListener('popstate', back, true);
  }
  return () => {
    if (approvalTimer) clearTimeout(approvalTimer);
    environment.page.removeEventListener('beforeunload', unload);
    environment.navigation?.removeEventListener('navigate', navigate);
    environment.links.removeEventListener('click', click, true);
    environment.page.removeEventListener('popstate', back, true);
  };
}
