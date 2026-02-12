const EVENTBRITE_BASE_URL = 'https://www.eventbriteapi.com/v3/events/search/';
const EVENTBRITE_TOKEN = process.env.EXPO_PUBLIC_EVENTBRITE_TOKEN;

export type DogEvent = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  venueName: string;
  area: string;
  url: string;
};

type SearchInput = {
  dateIso: string;
  area: string;
};

export type DogEventSearchResult = {
  events: DogEvent[];
  source: 'eventbrite' | 'sample';
  reason?: 'token-missing' | 'api-failed';
  errorMessage?: string;
};

type EventbriteAddress = {
  localized_address_display?: string;
  localized_area_display?: string;
  city?: string;
  region?: string;
  country?: string;
};

type EventbriteVenue = {
  name?: string;
  address?: EventbriteAddress;
};

type EventbriteEvent = {
  id?: string;
  name?: { text?: string };
  description?: { text?: string };
  url?: string;
  start?: { utc?: string; local?: string };
  end?: { utc?: string; local?: string };
  venue?: EventbriteVenue;
};

type EventbriteSearchResponse = {
  events?: EventbriteEvent[];
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUtcRange(dateIso: string) {
  const startLocal = new Date(`${dateIso}T00:00:00`);
  const endLocal = new Date(`${dateIso}T23:59:59`);
  return {
    start: startLocal.toISOString(),
    end: endLocal.toISOString(),
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeText(value?: string | null) {
  return value?.trim() ?? '';
}

function normalizeArea(parts: Array<string | undefined>) {
  const values = parts.map((part) => safeText(part)).filter(Boolean);
  return Array.from(new Set(values)).join(' ');
}

function eventOccursOnDate(dateIso: string, startAt: string) {
  const parsed = new Date(startAt);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return toIsoDate(parsed) === dateIso;
}

function mapEventbriteEvent(item: EventbriteEvent): DogEvent | null {
  const id = safeText(item.id);
  const title = safeText(item.name?.text);
  const startAt = safeText(item.start?.local) || safeText(item.start?.utc);
  const endAt = safeText(item.end?.local) || safeText(item.end?.utc);
  const venueName = safeText(item.venue?.name);
  const area = normalizeArea([
    item.venue?.address?.localized_area_display,
    item.venue?.address?.city,
    item.venue?.address?.region,
    item.venue?.address?.country,
    item.venue?.address?.localized_address_display,
  ]);

  if (!id || !title || !startAt) {
    return null;
  }

  return {
    id,
    title,
    description: stripHtml(safeText(item.description?.text)),
    startAt,
    endAt: endAt || startAt,
    venueName,
    area,
    url: safeText(item.url),
  };
}

function fallbackEvents(dateIso: string, area: string): DogEvent[] {
  const areaName = area.trim() || 'Tokyo';
  const short = areaName.length > 28 ? `${areaName.slice(0, 28)}...` : areaName;
  return [
    {
      id: `sample-${dateIso}-1`,
      title: `${short} Morning Dog Run Meetup`,
      description: 'Community walk and off-leash social hour for small and medium dogs.',
      startAt: `${dateIso}T09:30:00`,
      endAt: `${dateIso}T11:00:00`,
      venueName: 'Central Dog Park',
      area: areaName,
      url: 'https://www.eventbrite.com/',
    },
    {
      id: `sample-${dateIso}-2`,
      title: `${short} Dog Health Mini Seminar`,
      description: 'Vet talk on seasonal care, hydration, and emergency tips.',
      startAt: `${dateIso}T13:00:00`,
      endAt: `${dateIso}T14:30:00`,
      venueName: 'Pet Wellness Studio',
      area: areaName,
      url: 'https://www.eventbrite.com/',
    },
    {
      id: `sample-${dateIso}-3`,
      title: `${short} Sunset Owner Networking`,
      description: 'Owner community meetup to exchange local dog-friendly spots and tips.',
      startAt: `${dateIso}T17:00:00`,
      endAt: `${dateIso}T18:30:00`,
      venueName: 'Riverside Cafe Terrace',
      area: areaName,
      url: 'https://www.eventbrite.com/',
    },
  ];
}

async function fetchEventbriteEvents(dateIso: string, area: string): Promise<DogEvent[]> {
  if (!EVENTBRITE_TOKEN) {
    throw new Error('EVENTBRITE_TOKEN_MISSING');
  }

  const { start, end } = toUtcRange(dateIso);
  const params = new URLSearchParams({
    q: 'dog',
    sort_by: 'date',
    page_size: '50',
    expand: 'venue',
    'start_date.range_start': start,
    'start_date.range_end': end,
  });

  const normalizedArea = area.trim();
  if (normalizedArea) {
    params.set('location.address', normalizedArea);
  }

  const response = await fetch(`${EVENTBRITE_BASE_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`EVENTBRITE_REQUEST_FAILED: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as EventbriteSearchResponse;
  const normalizedKeyword = normalizedArea.toLowerCase();

  const mapped = (payload.events ?? [])
    .map((item) => mapEventbriteEvent(item))
    .filter((item): item is DogEvent => Boolean(item))
    .filter((item) => eventOccursOnDate(dateIso, item.startAt))
    .filter((item) => {
      if (!normalizedKeyword) return true;
      const haystack = `${item.area} ${item.venueName} ${item.title}`.toLowerCase();
      return haystack.includes(normalizedKeyword);
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  return mapped;
}

export async function searchDogEvents(input: SearchInput): Promise<DogEventSearchResult> {
  const dateIso = input.dateIso.trim();
  if (!isIsoDate(dateIso)) {
    throw new Error('dateIso must be YYYY-MM-DD.');
  }

  const area = input.area.trim();

  if (!EVENTBRITE_TOKEN) {
    return {
      events: fallbackEvents(dateIso, area),
      source: 'sample',
      reason: 'token-missing',
    };
  }

  try {
    const events = await fetchEventbriteEvents(dateIso, area);
    return {
      events,
      source: 'eventbrite',
    };
  } catch (error) {
    return {
      events: fallbackEvents(dateIso, area),
      source: 'sample',
      reason: 'api-failed',
      errorMessage: error instanceof Error ? error.message : 'Event search failed.',
    };
  }
}
