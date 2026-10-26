import fs from 'node:fs';
import path from 'node:path';

const ASSETS_DIR = path.join(__dirname, '../../../src/assets');
const DATASETS_SUBDIR = path.join('datasets', 'openops_tables_connection');

describe.each(['aws', 'azure'])(
  '%s benchmark dashboard datasets',
  (provider) => {
    const datasetsDir = path.join(
      ASSETS_DIR,
      `${provider}-benchmark-dashboard`,
      DATASETS_SUBDIR,
    );
    const datasetFiles = fs
      .readdirSync(datasetsDir)
      .filter((file) => file.endsWith('.yaml'));

    it('includes the three benchmark datasets', () => {
      expect(datasetFiles).toHaveLength(3);
    });

    // In analytics, a Postgres dataset's catalog replaces the database name in the
    // connection URI. The tables database name differs per environment, so the
    // dataset must not set one and must fall back to the connection's database.
    it.each(datasetFiles)('%s does not set a catalog', (file) => {
      const content = fs.readFileSync(path.join(datasetsDir, file), 'utf8');

      expect(content).not.toMatch(/^catalog:/m);
    });
  },
);
