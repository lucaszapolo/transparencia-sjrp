
import axios from 'axios';

async function testUrl() {
    const periods = [
        { y: 2026, m: 1 },
        { y: 2026, m: 2 },
        { y: 2025, m: 1 }
    ];
    const id = 'sao-jose-do-rio-preto';
    for (const p of periods) {
        const url = `https://transparencia.tce.sp.gov.br/api/json/despesas/${id}/${p.y}/${p.m}`;
        console.log(`Testing ${url}...`);
        try {
            const res = await axios.get(url, { timeout: 10000 });
            console.log(`Period: ${p.y}/${p.m} -> Success! Records: ${Array.isArray(res.data) ? res.data.length : 'Not an array'}`);
        } catch (e: any) {
            console.log(`Period: ${p.y}/${p.m} -> Failed: ${e.message}`);
        }
    }
}

testUrl();
