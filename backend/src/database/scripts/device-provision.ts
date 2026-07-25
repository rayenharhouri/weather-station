/**
 * Mint a long-lived device JWT for an ESP32 station.
 *
 * Usage:
 *   npm run device:provision -- --tenant=enit --station=<uuid> [--device-id=esp32-001] [--expires-in=365d]
 *
 * Prints the signed token plus the topic the device should publish to.
 * The token is shown ONCE; capture it and flash it onto the device. There
 * is no recovery — re-provision (issuing a new token under the same claims)
 * if it's ever lost. Token rotation = re-provision + reflash; old tokens
 * keep working until they expire, which is acceptable for hardware.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';
import { Station } from '../../stations/entities/station.entity';

interface Args {
  tenant: string;
  station: string;
  deviceId?: string;
  expiresIn: string;
}

function parseArgs(argv: string[]): Args {
  const out: Record<string, string> = {};
  for (const tok of argv.slice(2)) {
    const m = tok.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  const missing = ['tenant', 'station'].filter((k) => !out[k]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`Missing required arguments: ${missing.join(', ')}`);
    printUsage();
    process.exit(1);
  }
  return {
    tenant: out['tenant'].trim().toLowerCase(),
    station: out['station'].trim(),
    deviceId: out['device-id']?.trim(),
    expiresIn: out['expires-in']?.trim() ?? '365d',
  };
}

function printUsage(): void {
  // eslint-disable-next-line no-console
  console.error(`
Usage:
  npm run device:provision -- --tenant=<slug> --station=<uuid> [--device-id=<label>] [--expires-in=365d]

Examples:
  npm run device:provision -- --tenant=enit --station=11111111-2222-3333-4444-555555555555
  npm run device:provision -- --tenant=enit --station=<uuid> --device-id=esp32-rooftop-A --expires-in=730d
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  const secret = process.env.DEVICE_JWT_SECRET;
  if (!secret || secret === 'dev-device-secret-change-me') {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠  DEVICE_JWT_SECRET is at its dev default. Tokens minted now will be invalid once you rotate the secret for production.',
    );
  }

  // Verify the tenant + station exist before signing. This catches typos
  // before someone flashes a token onto a board.
  await MasterDataSource.initialize();
  let tenant: Tenant | null;
  try {
    tenant = await MasterDataSource.getRepository(Tenant).findOne({
      where: { slug: args.tenant, active: true },
    });
  } finally {
    await MasterDataSource.destroy();
  }
  if (!tenant) {
    // eslint-disable-next-line no-console
    console.error(`Tenant '${args.tenant}' not found or inactive.`);
    process.exit(2);
  }

  const tenantDs = createTenantDataSource({
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    username: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    database: tenant.dbName,
  });
  await tenantDs.initialize();
  let station: Station | null;
  try {
    station = await tenantDs.getRepository(Station).findOne({ where: { id: args.station } });
  } finally {
    await tenantDs.destroy();
  }
  if (!station) {
    // eslint-disable-next-line no-console
    console.error(`Station '${args.station}' not found in tenant '${args.tenant}'.`);
    process.exit(2);
  }

  const jwt = new JwtService({});
  const token = jwt.sign(
    {
      tenantSlug: args.tenant,
      stationId: args.station,
      ...(args.deviceId ? { deviceId: args.deviceId } : {}),
    },
    {
      secret: secret ?? 'dev-device-secret-change-me',
      expiresIn: args.expiresIn,
    },
  );

  const topic = `tenants/${args.tenant}/stations/${args.station}/readings`;
  // eslint-disable-next-line no-console
  console.log(`
✅  Device token minted

  tenant       ${args.tenant}
  station      ${station.name}
  station id   ${args.station}
  device id    ${args.deviceId ?? '(unset)'}
  expires in   ${args.expiresIn}
  topic        ${topic}

  TOKEN (capture now — never shown again):

  ${token}

  Embed the token in every published payload:
    { "token": "<TOKEN>", "reading": { "recordedAt": "...", "temperatureC": 23.4, ... } }

  Publish to the topic above with QoS 1. Backend verifies token + matches its claims against the topic.
`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
