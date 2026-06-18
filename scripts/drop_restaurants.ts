import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const fks = await db.execute(sql`
      SELECT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.table_constraints rc2 ON rc.unique_constraint_name = rc2.constraint_name
      WHERE rc2.table_name = 'restaurants'
    `);
    for (const row of fks.rows as any[]) {
      console.log('Dropping FK:', row.constraint_name, 'on', row.table_name);
      await db.execute(sql.raw(`ALTER TABLE "${row.table_name}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`));
    }
    await db.execute(sql`DROP TABLE IF EXISTS restaurants CASCADE`);
    console.log('✅ Dropped restaurants');
    await db.execute(sql`DROP TABLE IF EXISTS restaurant_sections CASCADE`);
    console.log('✅ Dropped restaurant_sections');
    await db.execute(sql`DROP TABLE IF EXISTS restaurant_wallets CASCADE`);
    console.log('✅ Dropped restaurant_wallets');
    await db.execute(sql`DROP TABLE IF EXISTS restaurant_earnings CASCADE`);
    console.log('✅ Dropped restaurant_earnings');
    await db.execute(sql`DROP TABLE IF EXISTS restaurant_users CASCADE`);
    console.log('✅ Dropped restaurant_users');
    // Make cart.restaurant_id nullable if it isn't already
    const col = await db.execute(sql`SELECT is_nullable FROM information_schema.columns WHERE table_name='cart' AND column_name='restaurant_id'`);
    if ((col.rows[0] as any)?.is_nullable === 'NO') {
      await db.execute(sql`ALTER TABLE cart ALTER COLUMN restaurant_id DROP NOT NULL`);
      console.log('✅ Made cart.restaurant_id nullable');
    }
    console.log('Done!');
    process.exit(0);
  } catch(e: any) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
run();
