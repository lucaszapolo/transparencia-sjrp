
import axios from 'axios';

async function testOtherCity() {
    const ids = ['sao-jose-do-rio-preto', 'sao-paulo', 'campinas'];
    console.log('--- Testing Jan 2026 (2026/1) ---');
    for (const id of ids) {
        const url = `https://transparencia.tce.sp.gov.br/api/json/despesas/${id}/2026/1`;
        try {
            const res = await axios.get(url, { timeout: 10000 });
            console.log(`${id}: ${Array.isArray(res.data) ? res.data.length : 'Error'} records`);
        } catch (e: any) {
            console.log(`${id} failed: ${e.message}`);
        }
    }
}

testOtherCity();
