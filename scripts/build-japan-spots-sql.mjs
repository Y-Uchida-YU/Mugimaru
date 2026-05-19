import fs from 'node:fs/promises';
import path from 'node:path';

const endpoint = process.env.OVERPASS_ENDPOINT ?? 'https://overpass-api.de/api/interpreter';
const cwd = process.cwd();
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputArg
  ? path.resolve(cwd, outputArg.replace('--output=', ''))
  : path.resolve(cwd, 'supabase/seed/spots_japan.sql');

const timeoutSec = Number(process.env.OVERPASS_TIMEOUT_SEC ?? '240');

const JP_AREA = 'area["ISO3166-1"="JP"][admin_level=2]->.jp;';

const queryDefinitions = [
  {
    type: 'dogrun',
    query: `
[out:json][timeout:${timeoutSec}];
${JP_AREA}
(
  node["leisure"="dog_park"](area.jp);
  way["leisure"="dog_park"](area.jp);
  relation["leisure"="dog_park"](area.jp);
  node["leisure"="dog_run"](area.jp);
  way["leisure"="dog_run"](area.jp);
  relation["leisure"="dog_run"](area.jp);
);
out center tags;
`,
  },
  {
    type: 'vet',
    query: `
[out:json][timeout:${timeoutSec}];
${JP_AREA}
(
  node["amenity"="veterinary"](area.jp);
  way["amenity"="veterinary"](area.jp);
  relation["amenity"="veterinary"](area.jp);
);
out center tags;
`,
  },
  {
    type: 'shop',
    query: `
[out:json][timeout:${timeoutSec}];
${JP_AREA}
(
  node["shop"~"^(pet|pet_grooming|pet_supplies)$"](area.jp);
  way["shop"~"^(pet|pet_grooming|pet_supplies)$"](area.jp);
  relation["shop"~"^(pet|pet_grooming|pet_supplies)$"](area.jp);
);
out center tags;
`,
  },
  {
    type: 'cafe',
    query: `
[out:json][timeout:${timeoutSec}];
${JP_AREA}
(
  node["amenity"~"^(cafe|restaurant|fast_food)$"]["dog"~"^(yes|designated)$"](area.jp);
  way["amenity"~"^(cafe|restaurant|fast_food)$"]["dog"~"^(yes|designated)$"](area.jp);
  relation["amenity"~"^(cafe|restaurant|fast_food)$"]["dog"~"^(yes|designated)$"](area.jp);
  node["amenity"~"^(cafe|restaurant|fast_food)$"]["pets"~"^(yes|designated)$"](area.jp);
  way["amenity"~"^(cafe|restaurant|fast_food)$"]["pets"~"^(yes|designated)$"](area.jp);
  relation["amenity"~"^(cafe|restaurant|fast_food)$"]["pets"~"^(yes|designated)$"](area.jp);
);
out center tags;
`,
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseLatLng(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (
    element.center &&
    typeof element.center.lat === 'number' &&
    typeof element.center.lon === 'number'
  ) {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }

  return null;
}

function buildAddress(tags) {
  const parts = [
    tags['addr:postcode'],
    tags['addr:province'] ?? tags['addr:state'],
    tags['addr:city'],
    tags['addr:suburb'],
    tags['addr:street'],
    tags['addr:housenumber'],
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(' ');
  return tags.address ?? tags['addr:full'] ?? null;
}

function buildName(type, tags, id) {
  const named = tags.name ?? tags['name:ja'] ?? tags['name:en'];
  if (named && named.trim()) return named.trim();

  if (type === 'dogrun') return `Dog Run ${id}`;
  if (type === 'vet') return `Veterinary Clinic ${id}`;
  if (type === 'shop') return `Pet Shop ${id}`;
  return `Pet Friendly Place ${id}`;
}

async function runQuery(definition, attempt = 1) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: definition.query,
  });

  if (!response.ok) {
    const body = await response.text();
    const retryable = response.status >= 500 || response.status === 429;
    if (retryable && attempt < 4) {
      await sleep(attempt * 1500);
      return runQuery(definition, attempt + 1);
    }

    throw new Error(
      `[${definition.type}] Overpass error ${response.status} ${response.statusText}: ${body.slice(0, 300)}`
    );
  }

  return response.json();
}

async function main() {
  const dataset = new Map();

  for (const definition of queryDefinitions) {
    console.log(`Fetching ${definition.type} from Overpass...`);
    const json = await runQuery(definition);

    if (!Array.isArray(json.elements)) {
      throw new Error(`[${definition.type}] Overpass response is missing elements.`);
    }

    for (const element of json.elements) {
      const latLng = parseLatLng(element);
      if (!latLng) continue;

      const tags = element.tags ?? {};
      const sourceId = `osm:${element.type}/${element.id}`;
      const address = buildAddress(tags);
      const website = tags.website ?? tags.contact_website ?? tags['contact:website'] ?? null;
      const phone = tags.phone ?? tags['contact:phone'] ?? null;

      dataset.set(sourceId, {
        source_id: sourceId,
        source: 'osm',
        source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        name: buildName(definition.type, tags, element.id),
        type: definition.type,
        latitude: latLng.latitude,
        longitude: latLng.longitude,
        address,
        phone,
        website,
        metadata: {
          osm_type: element.type,
          osm_id: element.id,
          tags,
          importer: 'overpass-japan-seed-v1',
        },
      });
    }

    console.log(`Fetched ${definition.type}: ${json.elements.length} raw elements`);
    await sleep(500);
  }

  const rows = Array.from(dataset.values());
  console.log(`Total unique spots: ${rows.length}`);

  if (rows.length === 0) {
    throw new Error('No spots were collected. SQL generation aborted.');
  }

  const chunks = [];
  const chunkSize = 1000;
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }

  const sqlParts = [];
  sqlParts.push('-- Generated by scripts/build-japan-spots-sql.mjs');
  sqlParts.push(`-- Generated at: ${new Date().toISOString()}`);
  sqlParts.push('-- Source: OpenStreetMap Overpass API');
  sqlParts.push('begin;');

  for (const chunk of chunks) {
    const values = chunk
      .map((row) => {
        const metadataJson = JSON.stringify(row.metadata);
        return `(${[
          sqlString(row.name),
          sqlString(row.type),
          row.latitude,
          row.longitude,
          sqlString(row.source),
          sqlString(row.source_id),
          sqlString(row.source_url),
          sqlString(row.address),
          sqlString(row.phone),
          sqlString(row.website),
          `${sqlString(metadataJson)}::jsonb`,
          'null',
          'null',
        ].join(', ')})`;
      })
      .join(',\n');

    sqlParts.push(`
insert into public.spots (
  name,
  type,
  latitude,
  longitude,
  source,
  source_id,
  source_url,
  address,
  phone,
  website,
  metadata,
  created_by_external_id,
  created_by_name
)
values
${values}
on conflict (source_id) do update set
  name = excluded.name,
  type = excluded.type,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  source = excluded.source,
  source_url = excluded.source_url,
  address = excluded.address,
  phone = excluded.phone,
  website = excluded.website,
  metadata = excluded.metadata,
  updated_at = now();`);
  }

  sqlParts.push('commit;');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${sqlParts.join('\n\n')}\n`, 'utf8');

  console.log(`SQL written: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
