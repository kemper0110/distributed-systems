import {createClient} from "./client.js";
import {types} from "cassandra-driver";
import { fakerRU as faker } from '@faker-js/faker';

const client = createClient()

await client.connect();
console.log('🔌 Connected to Cassandra');
await insertData(100_000);
console.log('🎉 Data generation complete!');
await client.shutdown()

function generateFakeTransaction() {
    return {
        user_id: faker.string.uuid(),
        user_name: faker.person.fullName(),
        product_id: faker.string.uuid(),
        product_name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price({min: 10, max: 1000})),
        purchase_date: new Date(faker.date.between({from: '2023-01-01', to: '2024-12-31'})),
        region: faker.location.country()
    };
}

async function insertData(count: number) {
    const insertQuery = `INSERT INTO shop.transactions 
    (id, user_id, user_name, product_id, product_name, price, purchase_date, region) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const batch = [];
    for (let i = 0; i < count; i++) {
        const tx = generateFakeTransaction();
        batch.push({
            query: insertQuery,
            params: [
                types.Uuid.random(),
                tx.user_id,
                tx.user_name,
                tx.product_id,
                tx.product_name,
                tx.price,
                tx.purchase_date,
                tx.region
            ]
        });

        if (batch.length > 100) {
            await client.batch(batch, {prepare: true});
            console.log(`✅ Inserted ${i + 1} records`);
            batch.length = 0;
        }
    }

    if (batch.length > 0) {
        await client.batch(batch, {prepare: true});
        console.log(`✅ Inserted ${count} records total`);
    }
}