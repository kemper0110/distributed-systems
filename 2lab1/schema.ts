import {createClient} from "./client.js";

const schemaClient = createClient()

await schemaClient.execute(`
CREATE KEYSPACE IF NOT EXISTS shop
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3};
`, []);
console.log('✅ Keyspace "shop" created or already exists');

await schemaClient.execute(`
CREATE TABLE IF NOT EXISTS shop.transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  product_id UUID,
  product_name TEXT,
  price DECIMAL,
  purchase_date TIMESTAMP,
  region TEXT
);`, []);
console.log('✅ Table "transactions" created or already exists');

await schemaClient.execute(`CREATE INDEX IF NOT EXISTS ON shop.transactions (purchase_date);`, []);

await schemaClient.execute(`CREATE INDEX IF NOT EXISTS ON shop.transactions (product_name);`, []);

await schemaClient.execute(`CREATE INDEX IF NOT EXISTS ON shop.transactions (region);`, []);

console.log('✅ Schema created');

await schemaClient.shutdown()
