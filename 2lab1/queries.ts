import {client} from "./client.js";

async function getTotalSalesByPeriod(startDate, endDate) {
    const query = `
    SELECT SUM(price) as total_sales
    FROM transactions
    WHERE purchase_date >= ? AND purchase_date <= ?
    ALLOW FILTERING
  `;

    const result = await client.execute(query, [startDate, endDate], { prepare: true });
    console.log(`\n📊 Total sales from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}: $${result.rows[0].total_sales}`);
}

async function getMostPopularProducts(limit = 10) {
    const query = `
    SELECT product_name, COUNT(*) as count
    FROM transactions
    GROUP BY product_name
    LIMIT ?
  `;

    // Cassandra не поддерживает GROUP BY без партиционирования — обойдем через приложение
    const all = await client.execute('SELECT product_name FROM transactions', [], { prepare: true });
    const counts = {};
    all.rows.forEach(row => {
        counts[row.product_name] = (counts[row.product_name] || 0) + 1;
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    console.log(`\n🏆 Top ${limit} Popular Products:`);
    sorted.forEach(([product, count], i) => {
        console.log(`${i + 1}. ${product} — ${count} purchases`);
    });
}

async function getPurchasesByRegion() {
    const result = await client.execute('SELECT region FROM transactions', [], { prepare: true });
    const regions = {};
    result.rows.forEach(row => {
        regions[row.region] = (regions[row.region] || 0) + 1;
    });

    console.log('\n🌍 Purchases by Region:');
    Object.entries(regions)
        .sort((a, b) => b[1] - a[1])
        .forEach(([region, count]) => {
            console.log(`${region}: ${count} purchases`);
        });
}

async function runQueries() {
    try {
        await client.connect();

        const start = new Date('2024-01-01');
        const end = new Date('2024-12-31');
        await getTotalSalesByPeriod(start, end);

        await getMostPopularProducts(5);

        await getPurchasesByRegion();

    } catch (err) {
        console.error('❌ Query error:', err);
    } finally {
        await client.shutdown();
    }
}

runQueries();